# Private Family Gateway 技术栈选择模板

适用项目：基于 `E:\go\sub2api` 思路复刻一个小型 Cloudflare Worker 私用网关，服务 10 人以内家庭成员，不做收费，但记录使用情况。

文档目的：在开始编码前明确技术选择、取舍理由、边界和后续可升级路径。

## 1. 项目定位

### 使用场景

- 私人/家庭使用，用户数预计 10 人以内。
- 管理员购买并维护若干上游账号。
- 家人通过分配的 API Key 调用网关。
- 不开放公开注册。
- 不做充值、支付、返利、套餐售卖。
- 需要记录每个人的请求、模型、token 和估算成本。
- 需要基础后台管理账号、API Key、上游账号和用量。

### 非目标

- 不复刻完整商业运营系统。
- 不做支付系统。
- 不做邀请码、优惠码、返利。
- 不做复杂 OAuth 用户登录。
- 不做代理池和 TLS 指纹伪装。
- 不做完整运维大屏。
- 不做在线自更新、回滚、重启。

## 2. 推荐技术栈总览

| 层级 | 推荐选择 | 状态 | 选择理由 |
| --- | --- | --- | --- |
| Runtime | Cloudflare Workers | 推荐 | 部署简单，适合轻量 API 网关和全球边缘转发 |
| 语言 | TypeScript | 推荐 | Worker 原生支持好，类型安全，生态成熟 |
| HTTP 框架 | Hono | 推荐 | 轻量，适合 Workers，路由和中间件清晰 |
| 数据库 | Cloudflare D1 | 推荐 | 存用户、账号、API Key、用量日志等关系数据 |
| 缓存 | Cloudflare KV | 推荐 | 存 API Key 缓存、设置缓存、短期限流计数 |
| 对象存储 | Cloudflare R2 | 可选 | 用于备份、导出文件、长期日志归档 |
| 强一致协调 | Durable Objects | 暂缓 | 只有严格并发/RPM 才需要，第一版可不做 |
| 异步任务 | `ctx.waitUntil` | 推荐 | 用量日志异步落库，降低网关响应延迟 |
| 队列 | Cloudflare Queues | 暂缓 | 目前用户量小，等日志量变大再引入 |
| 定时任务 | Cron Triggers | 可选 | 用于每日统计、清理、备份 |
| 管理前端 | Vue 3 + Vite SPA | 已选 | 贴近原 Sub2API 技术栈，后台和其他页面统一使用 Vue |
| 构建/部署 | Wrangler | 推荐 | Cloudflare 官方 Worker CLI |
| 单元测试 | Vitest | 推荐 | TypeScript 项目轻量测试方案 |

## 3. 后端技术选择

### Runtime

```text
选择：Cloudflare Workers
```

理由：

- 网关主要是 HTTP 请求鉴权、上游转发、流式响应、日志记录，符合 Worker 模型。
- 不需要自建服务器、Docker、systemd。
- 家庭小规模使用，维护成本比 VPS 后端低。

限制：

- Worker 无本地文件系统持久化。
- 长连接、严格并发锁、复杂后台任务需要额外设计。
- 无法完整复刻 Go 自定义 HTTP client 的代理拨号和 TLS 指纹能力。

### 语言

```text
选择：TypeScript
```

理由：

- Cloudflare Workers 对 TypeScript 支持完善。
- API 网关代码需要较多协议对象、配置对象和数据库 DTO，类型能减少错误。
- 后续可用 `wrangler types` 根据绑定生成 Worker 环境类型。

### HTTP 框架

```text
选择：Hono
备选：itty-router / 原生 fetch handler
```

推荐 Hono 的理由：

- 路由、中间件、错误处理写法清晰。
- 适合 Cloudflare Workers。
- 比完整 Node Web 框架轻。
- 方便拆分模块：`auth`、`admin`、`gateway`、`usage`。

不选原生 fetch handler 的原因：

- 项目会有多组兼容接口，例如 `/v1/messages`、`/v1/responses`、`/v1beta/models/*`，原生路由会很快变乱。

## 4. 数据与存储选择

### D1

```text
选择：Cloudflare D1
用途：主关系数据库
```

建议表：

- `users`
- `api_keys`
- `upstream_accounts`
- `groups`
- `account_groups`
- `usage_logs`
- `settings`
- `daily_usage_stats`
- `audit_logs`

适合存：

- 用户和管理员。
- 家人的 API Key。
- 上游账号配置。
- 分组和账号绑定。
- 每次请求的用量记录。
- 每日聚合统计。

注意：

- D1 是 SQLite 风格，不是 PostgreSQL。
- 原 Sub2API 的 PostgreSQL 数组、JSONB、复杂索引和部分 SQL 需要重写。
- 用量日志不要无限制复杂查询，第一版应增加按天聚合表。

### KV

```text
选择：Cloudflare KV
用途：缓存和短期状态
```

建议 namespace：

- `API_KEY_CACHE`
- `SETTINGS_CACHE`
- `RATE_LIMIT`
- `GATEWAY_STATE`

适合存：

- API Key hash 到用户/分组信息的缓存。
- 公共设置缓存。
- 简单短窗口请求计数。
- 上游账号短期错误状态。

不适合存：

- 强一致余额。
- 精确并发。
- 必须立刻全局一致的状态。

### R2

```text
选择：可选，建议第一版启用基础备份
用途：备份、导出、长期归档
```

R2 是 Cloudflare 的对象存储，可以理解成 Cloudflare 版本的 S3。它不负责实时查询，不替代 D1 数据库；它适合放“文件”。

在本项目里的“R2 备份”指：

- 定期把 D1 里的关键数据导出成文件，上传到 R2。
- 管理员可以手动导出配置和用量记录，保存到 R2。
- 如果误删数据或迁移环境，可以从 R2 下载备份文件再恢复。
- 后续如果有大量历史用量日志，可以把旧日志从 D1 归档到 R2，减少 D1 查询压力。

适合存：

- D1 备份导出文件，例如 `backup-2026-05-14.json`。
- 用量 CSV 导出，例如 `usage-2026-05.csv`。
- 上游账号配置导出文件，但敏感字段必须加密或脱敏。
- 长期日志归档。
- 后续自定义 Markdown 页面和图片。

第一版建议：

- 启用一个 `BACKUPS` bucket。
- 先做“手动备份到 R2”和“下载备份文件”。
- 定时自动备份可以放到第二阶段，用 Cron Triggers 做。
- 不把 API Key 明文、上游 token 明文直接写进备份文件。

### Durable Objects

```text
选择：暂缓
触发条件：需要严格并发、严格 RPM、WebSocket hub
```

暂缓理由：

- 10 人以内家庭使用，简单限额通常够用。
- Durable Objects 会增加架构复杂度。

后续引入场景：

- 同一时间请求必须严格限制。
- 某个上游账号不能超过固定并发。
- 需要实时 WebSocket 管理大屏。

### Queues

```text
选择：暂缓
触发条件：用量日志量变大，或需要可靠异步重试
```

第一版替代：

- 用 `ctx.waitUntil()` 异步写 `usage_logs`。

后续引入场景：

- D1 写入压力变大。
- 需要失败重试。
- 需要批量聚合日志。

## 5. 认证与权限

### 用户体系

```text
选择：管理员手动创建用户和 API Key
```

第一版功能：

- 管理员登录。
- 管理员创建家庭成员用户。
- 每个用户分配一个或多个 API Key。
- 用户不需要自助注册。

### 管理员登录

```text
选择：邮箱/用户名 + 密码 + JWT Cookie
```

建议：

- 密码 hash 存 D1。
- access token 短有效期。
- refresh token 可选，第一版可以只做简单管理会话。

### API Key 鉴权

```text
选择：Bearer API Key
```

建议：

- API Key 只展示一次。
- D1 只存 hash，不存明文。
- KV 缓存 hash 查询结果。
- 支持禁用、删除、last_used_at。

## 6. 网关协议范围

### 第一版建议支持

- `/health`
- `/v1/messages`
- `/v1/models`
- `/v1/chat/completions`
- `/v1/responses`
- `/responses`
- `/v1beta/models`
- `/v1beta/models/:model`
- `/v1beta/models/*modelAction`

### 第一版暂缓

- OpenAI Images。
- Antigravity 专用接口。
- Responses WebSocket/Reatime。
- Claude token count。
- 复杂 fallback 分组。

### 流式响应

```text
选择：支持 SSE 透明转发
```

理由：

- Claude、OpenAI、Gemini 常见客户端都依赖流式输出。
- 对实际体验影响很大。

## 7. 调度策略

### 第一版策略

```text
选择：简单账号池调度
```

规则：

1. 根据 API Key 找到用户和默认分组。
2. 根据请求路径判断目标平台：Anthropic / OpenAI / Gemini。
3. 查询该分组下 active 的上游账号。
4. 排除短期 error/cooldown 的账号。
5. 按优先级和最近使用时间选择账号。
6. 请求失败时尝试下一个账号。
7. 记录最终使用的账号和错误。

### 暂不做

- 严格并发锁。
- 粘性会话。
- 复杂模型路由。
- 用户分组倍率。
- 上游账号负载因子。

## 8. 用量记录

### 第一版记录字段

- `request_id`
- `user_id`
- `api_key_id`
- `upstream_account_id`
- `platform`
- `endpoint`
- `model`
- `input_tokens`
- `output_tokens`
- `cache_tokens`
- `estimated_cost`
- `status_code`
- `duration_ms`
- `is_stream`
- `error_message`
- `created_at`

### 统计视图

- 今日请求数。
- 今日 token。
- 今日估算成本。
- 按用户统计。
- 按 API Key 统计。
- 按模型统计。
- 最近请求日志。

### 成本处理

```text
选择：只估算，不扣费
```

理由：

- 家庭使用不需要商业计费。
- 估算成本足够发现谁用得多、哪个模型贵。

## 9. 管理后台

### 第一版页面

- 登录页。
- Dashboard：今日请求、今日 token、今日估算成本。
- 用户管理：家庭成员列表、创建、禁用。
- API Key 管理：创建、禁用、删除、复制一次。
- 上游账号管理：创建、禁用、测试。
- 用量记录：按用户、模型、时间过滤。
- 设置页：默认平台、模型价格、基础开关。

### 前端技术选择

已选：

```text
Vue 3 + Vite SPA
```

理由：

- 原 Sub2API 前端就是 Vue/Vite，复刻时更容易借鉴页面结构和交互习惯。
- 管理后台、登录页、用量页、设置页都统一用 Vue，避免多个前端方案混杂。
- 私用后台虽然规模小，但 Vue SPA 的维护体验比手写 HTML 更好。

建议配套：

- Vue 3
- Vite
- Vue Router
- Pinia
- TypeScript
- Tailwind CSS 或轻量组件库，第一版优先少依赖

## 10. 代码组织建议

```text
src/
  index.ts
  app.ts
  env.ts
  routes/
    health.ts
    auth.ts
    admin.ts
    gateway.ts
    usage.ts
  services/
    auth-service.ts
    api-key-service.ts
    account-service.ts
    scheduler-service.ts
    gateway-service.ts
    usage-service.ts
  repositories/
    user-repo.ts
    api-key-repo.ts
    account-repo.ts
    usage-repo.ts
    setting-repo.ts
  storage/
    d1.ts
    kv.ts
  upstream/
    anthropic.ts
    openai.ts
    gemini.ts
  utils/
    crypto.ts
    response.ts
    errors.ts
migrations/
test/
```

## 11. 配置模板

### Wrangler bindings

```jsonc
{
  "name": "private-family-gateway",
  "main": "src/index.ts",
  "compatibility_date": "2026-05-14",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "family_gateway",
      "database_id": "replace-me"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "API_KEY_CACHE",
      "id": "replace-me"
    },
    {
      "binding": "SETTINGS_CACHE",
      "id": "replace-me"
    },
    {
      "binding": "RATE_LIMIT",
      "id": "replace-me"
    }
  ],
  "r2_buckets": [
    {
      "binding": "BACKUPS",
      "bucket_name": "family-gateway-backups"
    }
  ],
  "vars": {
    "APP_ENV": "production"
  }
}
```

### Secrets

使用 secret，不写入仓库：

- `JWT_SECRET`
- `ADMIN_BOOTSTRAP_TOKEN`
- 上游账号密钥如果不存 D1 加密字段，也可作为 secret 管理

## 12. 第一版验收标准

- 管理员可以登录。
- 管理员可以创建家庭成员。
- 管理员可以给每个家庭成员创建 API Key。
- 管理员可以配置至少一个 Anthropic/OpenAI/Gemini 上游账号。
- 客户端可以通过分配的 API Key 调用网关。
- 支持非流式和流式响应。
- 每次请求能记录到 D1。
- Dashboard 能看到按用户统计的请求量、token、估算成本。
- 上游账号失败时可切换到另一个可用账号。
- 部署到 Cloudflare Workers 后可通过自定义域名访问。

## 13. 暂缓清单

- 支付系统。
- 订阅系统。
- 兑换码和优惠码。
- 邀请返利。
- 公开注册。
- 第三方 OAuth 登录。
- 内容风控。
- 完整运维中心。
- 代理池。
- TLS 指纹模板。
- 数据管理 daemon。
- WebSocket 实时监控。
- 严格并发和强一致 RPM。

## 14. 后续升级路径

### 当用量日志变多

- 增加 `daily_usage_stats` 聚合。
- 增加 Cron Trigger 每日聚合。
- 将明细日志按月归档到 R2。

### 当需要限制误用

- 增加每日请求数上限。
- 增加每日估算成本上限。
- 增加用户级开关。
- 必要时再加 RPM。

### 当并发冲突明显

- 引入 Durable Objects 管理账号并发和调度锁。

### 当异步写入不稳定

- 引入 Cloudflare Queues 处理用量落库和失败重试。

## 15. 待你确认的选择

请确认或修改下面几项：

- [x] 管理后台：Vue + Vite SPA
- [ ] 第一版支持 Anthropic
- [ ] 第一版支持 OpenAI
- [ ] 第一版支持 Gemini
- [x] 第一版启用 R2 基础备份
- [ ] 第一版只做每日上限，不做 RPM
- [ ] 第一版加入简单 RPM
- [ ] 第一版暂不引入 Durable Objects

## 16. 参考资料

- Cloudflare Workers storage options: https://developers.cloudflare.com/workers/platform/storage-options/
- Cloudflare Workers TypeScript: https://developers.cloudflare.com/workers/languages/typescript/
- Cloudflare Workers Hono guide: https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/hono/
- Wrangler configuration: https://developers.cloudflare.com/workers/wrangler/configuration/
