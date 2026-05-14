# Sub2API Cloudflare Worker 复刻功能选择清单

来源项目：`E:\go\sub2api`

目标：先列出 Sub2API 现有功能，并按 Cloudflare Worker + KV + D1 + R2 的部署方式拆成可选择模块。你选择范围后，再开始写代码。

## 前提假设

- “复刻”按重新实现 TypeScript/Cloudflare Worker 版本处理，不直接移植 Go/Gin/Ent/Vue 后端代码。
- D1 承接原 PostgreSQL 关系数据；KV 承接原 Redis 的缓存、短期状态、限流计数；R2 承接原本地文件、页面资源、备份文件。
- Worker 是无状态运行时，长事务、强一致并发锁、后台任务、系统升级、任意代理拨号、TLS 指纹伪装等能力需要降级、改造，或引入 Durable Objects / Queues / Cron Triggers。
- 第一阶段建议先做“可部署可用的 API 网关 + 管理最小闭环”，再逐步补支付、运维大屏、复杂风控和数据管理。

## 如何选择

在你要做的项目前标记 `[x]`，不做的保持 `[ ]`。建议至少选择一个“复刻方案”。

## 复刻方案

- [ ] A. 最小可用网关：API Key、上游账号池、分组、基础转发、用量记录、简易管理 API。
- [ ] B. 标准网关后台：A + 用户登录、用户 API Key 自助、余额/订阅、基础管理前端。
- [ ] C. 接近原版核心：B + OAuth 账号接入、模型路由、监控、支付、公告、兑换码。
- [ ] D. 尽量完整复刻：C + 运维中心、备份恢复、风控、渠道监控、邀请返利、数据管理。

建议先选 B 或 C。D 的范围很大，并且部分原版能力不适合纯 Worker 运行时。

## 功能清单

### 1. 网关核心

源项目对应：`/v1`、`/v1beta`、`/responses`、`/backend-api/codex`、`/antigravity/*`

- [ ] 健康检查 `/health`
- [ ] Claude 兼容接口 `/v1/messages`
- [ ] Claude token 计数 `/v1/messages/count_tokens`
- [ ] Claude 模型列表 `/v1/models`
- [ ] Claude 用量接口 `/v1/usage`
- [ ] OpenAI Chat Completions `/v1/chat/completions` 和 `/chat/completions`
- [ ] OpenAI Responses `/v1/responses`、`/responses`、`/backend-api/codex/responses`
- [ ] OpenAI Responses 子路径转发，例如 `/v1/responses/compact`
- [ ] OpenAI Images `/v1/images/generations`、`/v1/images/edits`
- [ ] Gemini 原生兼容 `/v1beta/models`、`/v1beta/models/:model`、`/v1beta/models/*modelAction`
- [ ] Antigravity 专用模型列表 `/antigravity/models`
- [ ] Antigravity Claude 路由 `/antigravity/v1/messages`
- [ ] Antigravity Gemini 路由 `/antigravity/v1beta/models/*`
- [ ] 流式响应 SSE 转发
- [ ] Responses WebSocket / Realtime 风格 GET `/responses`
- [ ] 请求体大小限制
- [ ] `client_request_id` / 请求追踪 ID
- [ ] 按 API Key 识别用户、分组、订阅状态
- [ ] 未分组 API Key 拦截
- [ ] 上游平台自动派发：Anthropic / OpenAI / Gemini / Antigravity
- [ ] 入站 endpoint 标准化和上游 endpoint 推导
- [ ] 上游错误格式兼容：Anthropic / OpenAI / Google

Cloudflare 存储映射：

- D1：`api_keys`、`users`、`groups`、`accounts`、`usage_logs`
- KV：API Key 鉴权缓存、分组缓存、短期限流计数、请求幂等状态
- R2：无直接依赖

注意：

- Worker 可以做 HTTP fetch 与 SSE 流转发；WebSocket 和长连接需要单独验证实现策略。
- 原项目支持很多热路径优化和错误回退，第一版可以先保留协议兼容和基础失败切换。

### 2. 上游账号池与调度

源项目对应：账号、分组、调度、速率、冷却、粘性会话、模型路由相关服务。

- [ ] 上游账号 CRUD：名称、平台、类型、凭证、状态
- [ ] 支持 Anthropic API Key / OAuth 账号
- [ ] 支持 OpenAI API Key / OAuth 账号
- [ ] 支持 Gemini OAuth / API Key 账号
- [ ] 支持 Antigravity OAuth 账号
- [ ] 账号分组绑定
- [ ] 账号优先级
- [ ] 账号并发限制
- [ ] 用户并发限制
- [ ] API Key 并发限制
- [ ] 分组 RPM 限制
- [ ] 用户 RPM 限制
- [ ] 用户在分组内的倍率覆盖
- [ ] 用户在分组内的 RPM 覆盖
- [ ] 账号负载因子
- [ ] 粘性会话
- [ ] 账号失败冷却
- [ ] 429 / 529 / 401 / 403 等错误处理策略
- [ ] 临时不可调度状态
- [ ] 自动恢复账号状态
- [ ] 账号测试
- [ ] 批量创建、批量更新、批量刷新、批量清错
- [ ] OpenAI / Gemini / Antigravity token 刷新
- [ ] 账号配额与套餐等级刷新
- [ ] OpenAI 隐私设置
- [ ] Antigravity 默认模型映射
- [ ] 模型白名单
- [ ] 模型路由：按模型命中指定账号
- [ ] fallback 分组
- [ ] invalid request fallback 分组

Cloudflare 存储映射：

- D1：账号、分组、绑定关系、冷却状态、模型路由配置
- KV：账号调度快照、token 缓存、冷却缓存、粘性会话缓存
- R2：批量导入/导出文件可选

注意：

- 强一致并发计数用 KV 会有误差。若要严格并发限制，建议额外选择 Durable Objects。
- 原项目的 SOCKS/HTTP 代理和 TLS 指纹模板不适合直接在 Worker 内完整复刻。

### 3. 用户认证与账号体系

源项目对应：`/api/v1/auth/*`、`/api/v1/user/*`

- [ ] 邮箱密码注册
- [ ] 登录
- [ ] 登录二次验证 `/auth/login/2fa`
- [ ] JWT access token / refresh token
- [ ] 刷新 token
- [ ] 登出
- [ ] 撤销全部会话
- [ ] 当前用户 `/auth/me`
- [ ] 邮箱验证码
- [ ] 邮箱验证注册
- [ ] 忘记密码
- [ ] 重置密码
- [ ] 用户资料查看和修改
- [ ] 修改密码
- [ ] 账号状态：active / disabled
- [ ] 管理员 / 普通用户角色
- [ ] 简单模式 / 后端模式访问限制
- [ ] TOTP 状态、设置、启用、禁用
- [ ] 通知邮箱绑定、验证码、开关、移除
- [ ] 邮箱身份绑定
- [ ] 第三方身份解绑

第三方 OAuth：

- [ ] LinuxDo 登录 / 注册 / 绑定
- [ ] GitHub 登录 / 注册
- [ ] Google 登录 / 注册
- [ ] WeChat 登录 / 注册 / 绑定
- [ ] WeChat 支付授权回调
- [ ] 通用 OIDC 登录 / 注册 / 绑定
- [ ] OAuth pending completion 流程

Cloudflare 存储映射：

- D1：用户、身份绑定、pending auth、TOTP、会话元数据
- KV：验证码、OAuth state、短期 pending session、refresh token 黑名单
- R2：无直接依赖

注意：

- 邮件发送不能依赖传统 SMTP socket，Worker 版建议接 HTTP 邮件服务 API。

### 4. 用户侧 API Key 与自助功能

源项目对应：`/api/v1/keys`、`/groups/available`、`/channels/available`

- [ ] 用户创建 API Key
- [ ] 用户自定义 API Key
- [ ] API Key 列表分页
- [ ] 查看单个 API Key
- [ ] 更新 API Key 名称、分组、状态
- [ ] 删除 API Key
- [ ] API Key 过期时间
- [ ] API Key quota / quota_used
- [ ] API Key 5h / 1d / 7d 限额
- [ ] API Key IP 白名单
- [ ] API Key IP 黑名单
- [ ] API Key last_used_at
- [ ] 用户可用分组
- [ ] 用户分组费率
- [ ] 用户可用渠道

Cloudflare 存储映射：

- D1：API Key 主数据、限额窗口、分组绑定
- KV：API Key 鉴权缓存、限额窗口计数缓存
- R2：无直接依赖

### 5. 计费、余额、订阅与用量

源项目对应：usage、billing、subscription、pricing。

- [ ] 按 token 记录输入、输出、cache creation、cache read
- [ ] 区分 cache creation 5m / 1h
- [ ] 记录请求模型、上游模型、endpoint、上游 endpoint
- [ ] 记录 stream / non-stream
- [ ] 记录首 token 延迟和总耗时
- [ ] 记录 user agent / request id
- [ ] 余额扣费
- [ ] 分组倍率扣费
- [ ] 用户-分组倍率覆盖
- [ ] 账号倍率
- [ ] 订阅额度扣费
- [ ] 余额和订阅双计费模式
- [ ] 幂等扣费与去重
- [ ] billing header
- [ ] 图片生成计费
- [ ] OpenAI service tier 计费
- [ ] 价格表和模型价格管理
- [ ] 用户用量列表
- [ ] 用户用量详情
- [ ] 用户用量统计
- [ ] 用户 dashboard stats / trend / models / api-key usage
- [ ] 管理员全局用量列表
- [ ] 管理员全局用量统计
- [ ] 管理员用量清理任务
- [ ] dashboard 聚合表和回填

Cloudflare 存储映射：

- D1：`usage_logs`、聚合表、余额流水、订阅、价格配置、幂等记录
- KV：热路径余额/订阅/API Key 缓存，短期扣费幂等键
- R2：大规模日志归档可选

注意：

- D1 适合中小规模结构化用量查询；高频大流量日志可能需要按日聚合、采样或归档到 R2。

### 6. 订阅、兑换码、优惠码

源项目对应：`/subscriptions`、`/redeem`、`/promo-codes`

- [ ] 用户订阅列表
- [ ] 用户活跃订阅
- [ ] 用户订阅进度
- [ ] 用户订阅汇总
- [ ] 管理员分配订阅
- [ ] 管理员批量分配订阅
- [ ] 延长订阅
- [ ] 重置订阅额度
- [ ] 撤销订阅
- [ ] 按用户/分组查看订阅
- [ ] 用户兑换码兑换
- [ ] 用户兑换历史
- [ ] 管理员生成兑换码
- [ ] 管理员创建并立即兑换
- [ ] 兑换码导出
- [ ] 兑换码统计
- [ ] 兑换码批量删除 / 过期
- [ ] 注册优惠码验证
- [ ] 优惠码 CRUD
- [ ] 优惠码使用记录

Cloudflare 存储映射：

- D1：订阅、兑换码、优惠码、使用记录
- KV：兑换/校验短期防刷
- R2：兑换码导出文件可选

### 7. 支付系统

源项目对应：`/api/v1/payment/*`、`/api/v1/admin/payment/*`

- [ ] 支付开关与用户支付配置
- [ ] 购买前 checkout info
- [ ] 套餐列表
- [ ] 支付渠道列表
- [ ] 支付限制
- [ ] 创建订单
- [ ] 查询我的订单
- [ ] 查询单个订单
- [ ] 取消订单
- [ ] 订单验证
- [ ] public resume token 订单恢复
- [ ] 退款申请
- [ ] 管理员支付 dashboard
- [ ] 管理员订单列表和详情
- [ ] 管理员取消订单
- [ ] 管理员重试履约
- [ ] 管理员处理退款
- [ ] 支付套餐 CRUD
- [ ] 支付提供商实例 CRUD
- [ ] EasyPay webhook
- [ ] Alipay webhook
- [ ] WeChat Pay webhook
- [ ] Stripe webhook
- [ ] Airwallex webhook

Cloudflare 存储映射：

- D1：订单、套餐、支付提供商、退款、审计日志
- KV：支付回调幂等、resume token、短期订单状态缓存
- R2：支付附件/审计快照可选

注意：

- Webhook 签名校验可以在 Worker 内完成。
- 支付回调后的异步履约建议配合 Queues，纯同步也能先做但抗失败能力较弱。

### 8. 管理后台基础模块

源项目对应：`/api/v1/admin/*` 和前端 `/admin/*`

- [ ] 管理员 dashboard stats
- [ ] dashboard realtime metrics
- [ ] 用量趋势
- [ ] 模型统计
- [ ] 分组统计
- [ ] API Key 趋势
- [ ] 用户趋势
- [ ] 用户消费排名
- [ ] 用户管理 CRUD
- [ ] 用户余额调整
- [ ] 用户并发调整
- [ ] 用户 API Key 查看
- [ ] 用户用量查看
- [ ] 用户余额历史
- [ ] 用户替换分组
- [ ] 用户 RPM 状态
- [ ] 用户批量并发调整
- [ ] 用户属性定义 CRUD
- [ ] 用户属性批量查询和更新
- [ ] 分组 CRUD
- [ ] 分组排序
- [ ] 分组用量汇总
- [ ] 分组容量汇总
- [ ] 分组费率覆盖
- [ ] 分组 RPM 覆盖
- [ ] 分组 API Key 查看
- [ ] 公告 CRUD
- [ ] 公告已读状态
- [ ] 系统设置读取/更新
- [ ] SMTP 测试
- [ ] 发送测试邮件
- [ ] 管理员 API Key 管理
- [ ] overload cooldown 设置
- [ ] 429 cooldown 设置
- [ ] stream timeout 设置
- [ ] rectifier 设置
- [ ] beta policy 设置
- [ ] web search emulation 设置和测试

Cloudflare 存储映射：

- D1：管理实体和设置
- KV：设置缓存、dashboard 快照缓存
- R2：导入导出文件可选

### 9. 渠道、监控与风控

源项目对应：channels、channel-monitors、risk-control。

- [ ] 渠道 CRUD
- [ ] 渠道默认模型价格
- [ ] 用户可见渠道
- [ ] 渠道监控任务 CRUD
- [ ] 手动运行渠道监控
- [ ] 渠道监控历史
- [ ] 用户查看渠道监控状态
- [ ] 渠道监控模板 CRUD
- [ ] 模板应用到监控任务
- [ ] 定时测试计划 CRUD
- [ ] 账号下定时测试计划列表
- [ ] 定时测试结果
- [ ] 内容审核配置
- [ ] 内容审核 API Key 测试
- [ ] 内容审核状态
- [ ] 内容审核日志
- [ ] 用户解封
- [ ] 删除 flagged hash
- [ ] 清空 flagged hashes
- [ ] 错误透传规则 CRUD

Cloudflare 存储映射：

- D1：渠道、监控任务、监控历史、风控配置和日志
- KV：监控最近状态、风控 hash 快速查询
- R2：大体积审核/监控日志归档可选

注意：

- 定时监控需要 Cloudflare Cron Triggers。
- 并发跑大量监控建议配合 Queues。

### 10. 运维中心

源项目对应：`/api/v1/admin/ops/*`

- [ ] 实时并发统计
- [ ] 用户并发统计
- [ ] 账号可用性
- [ ] 实时流量汇总
- [ ] 告警规则 CRUD
- [ ] 告警事件查询和状态更新
- [ ] 告警静默
- [ ] 邮件通知配置
- [ ] runtime alert 设置
- [ ] runtime logging 设置
- [ ] advanced settings
- [ ] metric thresholds
- [ ] QPS WebSocket
- [ ] legacy error logs
- [ ] 错误详情和重试记录
- [ ] 错误请求重试
- [ ] upstream error 查询和重试
- [ ] request drilldown
- [ ] system logs
- [ ] system logs cleanup
- [ ] system log ingestion health
- [ ] ops dashboard snapshot-v2
- [ ] throughput trend
- [ ] latency histogram
- [ ] error trend / distribution
- [ ] OpenAI token stats

Cloudflare 存储映射：

- D1：错误日志、告警、请求明细、聚合指标
- KV：实时计数、短期 dashboard 快照
- R2：长期日志归档

注意：

- 原版运维中心很重，Worker 第一版建议只做错误日志 + dashboard 快照，不建议一开始完整复刻。

### 11. 代理、TLS 指纹与外部连接

源项目对应：proxies、tls-fingerprint-profiles、proxyutil。

- [ ] 代理 CRUD
- [ ] 代理测试
- [ ] 代理质量检查
- [ ] 代理统计
- [ ] 代理关联账号
- [ ] 代理批量创建 / 删除
- [ ] TLS 指纹模板 CRUD

Cloudflare 存储映射：

- D1：代理配置、TLS 指纹模板配置
- KV：代理健康缓存
- R2：无直接依赖

注意：

- Worker `fetch` 不等价于 Go 自定义 HTTP client，不能直接完整复刻 SOCKS5、住宅代理拨号、TLS 指纹伪装。
- 如果你必须保留这些能力，需要外接一个自建代理/调度服务，Worker 只负责调用它。

### 12. 数据管理、备份和自定义页面

源项目对应：backup、data-management、pages。

- [ ] 自定义 Markdown 页面 `/api/v1/pages/:slug`
- [ ] 页面图片 `/api/v1/pages/:slug/images/*filename`
- [ ] 管理员页面列表
- [ ] S3/R2 备份配置
- [ ] 手动创建备份
- [ ] 备份列表
- [ ] 备份详情
- [ ] 删除备份
- [ ] 备份下载 URL
- [ ] 备份恢复
- [ ] 定时备份配置
- [ ] 数据管理 agent health
- [ ] 数据源 profile CRUD
- [ ] S3 profile CRUD
- [ ] 创建备份 job
- [ ] 备份 job 列表和详情

Cloudflare 存储映射：

- D1：页面配置、备份元数据、数据源配置
- KV：页面权限缓存
- R2：Markdown、图片、备份文件

注意：

- 原项目的数据管理 daemon 不适合直接搬到 Worker；可先改成 Worker API + R2 + Cron/Queues。

### 13. 邀请返利

源项目对应：affiliate。

- [ ] 用户查看自己的邀请返利信息
- [ ] 用户转出返利额度
- [ ] 管理员邀请记录列表
- [ ] 管理员返利记录列表
- [ ] 管理员转账记录列表
- [ ] 专属用户返利设置
- [ ] 批量设置返利比例
- [ ] 用户返利概览
- [ ] 清除用户返利设置
- [ ] OAuth 注册携带 affiliate code

Cloudflare 存储映射：

- D1：邀请关系、返利记录、转账记录、用户返利设置
- KV：邀请码校验缓存
- R2：导出文件可选

### 14. 系统管理与部署

源项目对应：setup、system、embedded frontend。

- [ ] 初始化向导 `/setup`
- [ ] 创建首个管理员
- [ ] 初始化默认设置
- [ ] 初始化默认分组和价格
- [ ] 公共设置 `/api/v1/settings/public`
- [ ] 前端静态资源托管
- [ ] 前端运行时设置注入
- [ ] CSP / CORS / 安全响应头
- [ ] 后端模式 public route 限制
- [ ] 系统版本接口
- [ ] 检查更新
- [ ] 在线更新
- [ ] 回滚
- [ ] 重启服务

Cloudflare 存储映射：

- D1：安装状态、设置、版本信息
- KV：公共设置缓存、HTML 设置注入缓存
- R2：前端构建产物可选；也可用 Workers Assets / Pages

注意：

- Worker 不能像 systemd 服务一样自我更新、回滚、重启。版本发布建议走 Wrangler/GitHub Actions，管理端只展示版本。

## 建议的第一阶段 MVP

如果目标是尽快在 Cloudflare 上跑通，建议第一阶段选择：

- [ ] 网关核心：Claude `/v1/messages`、OpenAI `/v1/responses`、OpenAI `/v1/chat/completions`、Gemini `/v1beta/models/*`
- [ ] API Key 鉴权、用户、分组、账号池
- [ ] 基础调度：按分组、平台、账号状态、优先级选择账号
- [ ] SSE 流式转发
- [ ] 用量日志和基础余额扣费
- [ ] 管理员登录
- [ ] 管理 API：用户、API Key、分组、账号、用量
- [ ] 简单前端或 API-only 管理方式
- [ ] D1 schema + migrations
- [ ] KV 缓存 API Key 和短期限流
- [ ] R2 先只用于备份或暂不使用

暂缓：

- [ ] 支付
- [ ] 完整 OAuth
- [ ] 复杂并发强一致控制
- [ ] 运维中心全量图表
- [ ] 代理 / TLS 指纹
- [ ] 数据管理 daemon
- [ ] 在线自更新

## 迁移优先级建议

P0，必须先完成：

- API Key 鉴权
- 用户/管理员
- 分组
- 上游账号
- 网关转发
- 流式响应
- 用量记录
- D1 migrations

P1，形成可运营闭环：

- 余额扣费
- 订阅
- 管理前端
- 公告
- 兑换码
- 模型价格
- 基础 dashboard

P2，增强运营：

- 支付
- OAuth 账号接入
- 渠道监控
- 定时测试
- 备份恢复
- 邀请返利

P3，完整化但成本高：

- 运维中心全量能力
- 内容审核风控
- 数据管理 agent 替代方案
- 严格并发控制
- WebSocket 实时指标
- 代理/TLS 指纹外接服务

## 数据模型粗拆

第一阶段 D1 表建议：

- `users`
- `auth_identities`
- `sessions`
- `groups`
- `accounts`
- `account_groups`
- `api_keys`
- `usage_logs`
- `settings`
- `model_prices`
- `balance_transactions`
- `subscriptions`
- `idempotency_records`

第一阶段 KV namespace 建议：

- `AUTH_CACHE`
- `API_KEY_CACHE`
- `RATE_LIMIT`
- `GATEWAY_STATE`
- `SETTINGS_CACHE`

R2 bucket 建议：

- `assets`：自定义页面图片、静态上传文件
- `backups`：D1 导出、配置导出、日志归档

可选 Cloudflare 能力：

- Durable Objects：严格并发、WebSocket hub、账号调度锁
- Queues：异步用量落库、支付履约、备份任务、监控任务
- Cron Triggers：定时清理、聚合、备份、渠道监控

## 明确不建议第一版完整照搬的能力

- systemd / Docker / Go 二进制在线升级
- 本地文件系统页面存储
- PostgreSQL 专属 SQL、数组、JSONB、BRIN/trgm 等索引能力
- Redis 强依赖的原子并发控制
- 自定义 HTTP client 的代理拨号和 TLS 指纹能力
- 大规模实时运维大屏的所有细节

## 你接下来可以这样回复

示例：

```text
选择方案 B。
额外勾选：支付 Stripe、兑换码、公告。
暂不做：OAuth、代理、TLS 指纹、运维中心。
前端先做简单管理页，后面再补完整 Vue 后台。
```

我收到选择后，会先给出实现计划和 D1/KV/R2 数据设计，再开始写代码。
