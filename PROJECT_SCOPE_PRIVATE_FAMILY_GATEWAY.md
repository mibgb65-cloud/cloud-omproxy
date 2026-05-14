# Private Family Gateway 已确认项目范围

## 项目定位

做一个小型私用 AI API 网关，部署在 Cloudflare Workers 上，供 10 人以内家庭成员使用。

目标不是商业运营系统，而是：

- 管理员统一维护上游账号。
- 家庭成员各自使用分配的 API Key。
- 不收费、不充值、不售卖套餐。
- 记录每个人的请求量、模型、token、估算成本。
- 提供基础 Vue 管理后台。

## 已确认技术栈

| 层级 | 选择 |
| --- | --- |
| Runtime | Cloudflare Workers |
| 语言 | TypeScript |
| HTTP 框架 | Hono |
| 前端 | Vue 3 + Vite SPA |
| 路由 | Vue Router |
| 状态管理 | Pinia |
| 数据库 | Cloudflare D1 |
| 缓存 | Cloudflare KV |
| 对象存储 | Cloudflare R2 |
| 部署工具 | Wrangler |
| 测试 | Vitest |

## 已确认存储用途

### D1

存结构化业务数据：

- 用户
- API Key
- 上游账号
- 分组
- 账号分组绑定
- 用量日志
- 每日聚合统计
- 设置
- 审计日志

### KV

存缓存和短期状态：

- API Key 鉴权缓存
- 设置缓存
- 简单限流计数
- 上游账号短期错误状态

### R2

启用基础备份：

- 手动导出 D1 关键数据到 R2
- 下载备份文件
- 用量 CSV 导出
- 后续再做 Cron 自动备份

备份注意事项：

- 不把 API Key 明文写进备份。
- 不把上游 token 明文裸写进备份。
- 敏感字段需要加密或脱敏。

## 第一版功能范围

### 网关

- `/health`
- `/v1/messages`
- `/v1/models`
- `/v1/chat/completions`
- `/v1/responses`
- `/responses`
- `/v1beta/models`
- `/v1beta/models/:model`
- `/v1beta/models/*modelAction`
- SSE 流式响应转发
- Bearer API Key 鉴权
- 上游账号失败时切换到其他可用账号

### 管理后台

使用 Vue 3 + Vite 实现：

- 登录页
- Dashboard
- 用户管理
- API Key 管理
- 上游账号管理
- 用量记录
- 设置页
- 备份页

### 用户与 API Key

- 管理员登录
- 管理员手动创建家庭成员
- 每个成员可分配一个或多个 API Key
- API Key 只展示一次
- D1 只存 API Key hash
- 支持禁用、删除、last_used_at

### 上游账号

- 创建、更新、禁用、删除
- 支持 Anthropic
- 支持 OpenAI
- 支持 Gemini
- 账号测试
- 简单优先级
- 简单失败冷却

### 用量记录

记录：

- 用户
- API Key
- 上游账号
- 平台
- endpoint
- 模型
- token
- 估算成本
- 状态码
- 耗时
- 是否流式
- 错误信息
- 创建时间

统计：

- 今日请求数
- 今日 token
- 今日估算成本
- 按用户统计
- 按模型统计
- 最近请求记录

## 第一版暂不做

- 支付系统
- 订阅系统
- 兑换码
- 优惠码
- 邀请返利
- 公开注册
- 第三方 OAuth 登录
- 内容风控
- 完整运维中心
- 代理池
- TLS 指纹模板
- 数据管理 daemon
- WebSocket 实时管理大屏
- 严格并发控制
- 强一致 RPM
- 自动更新、回滚、重启

## 后续可升级项

- Cron 自动备份到 R2
- 每日请求数上限
- 每日估算成本上限
- 简单 RPM
- Durable Objects 严格并发控制
- Queues 异步用量落库
- 更完整的 dashboard 图表
