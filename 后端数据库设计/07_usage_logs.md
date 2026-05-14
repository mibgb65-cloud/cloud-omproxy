# 表名：`usage_logs` (用量日志表)

## 1. 基本信息
- **表描述**：记录每一次网关请求的用量、耗时、状态和估算成本。
- **字符集**：D1/SQLite 默认 UTF-8。
- **排序规则**：按 D1/SQLite 默认规则处理。
- **核心业务逻辑**：用于家庭成员使用情况追踪，不参与余额扣费。

## 2. 字段定义 (Schema)

| 字段名 (Field) | 类型 (Type) | 必填 (NN) | 默认值 (Default) | 注释与业务规则 (Comment/Rules) |
| :------------- | :---------- | :-------- | :---------------- | :----------------------------- |
| `id` | INTEGER | 是 | 自增 | 主键 |
| `request_id` | TEXT | 是 | 无 | 网关生成或透传的请求 ID |
| `user_id` | INTEGER | 是 | 无 | 逻辑关联 `users.id` |
| `api_key_id` | INTEGER | 是 | 无 | 逻辑关联 `api_keys.id` |
| `group_id` | INTEGER | 否 | NULL | 逻辑关联 `groups.id` |
| `upstream_account_id` | INTEGER | 否 | NULL | 逻辑关联 `upstream_accounts.id` |
| `platform` | TEXT | 是 | 无 | 目标平台 |
| `endpoint` | TEXT | 是 | 无 | 入站 endpoint |
| `upstream_endpoint` | TEXT | 否 | NULL | 上游 endpoint |
| `model` | TEXT | 否 | NULL | 请求模型 |
| `input_tokens` | INTEGER | 是 | 0 | 输入 token |
| `output_tokens` | INTEGER | 是 | 0 | 输出 token |
| `cache_read_tokens` | INTEGER | 是 | 0 | 缓存读取 token |
| `cache_write_tokens` | INTEGER | 是 | 0 | 缓存写入 token |
| `estimated_cost_micro_usd` | INTEGER | 是 | 0 | 估算成本，单位 micro USD |
| `status_code` | INTEGER | 是 | 0 | 返回给客户端的状态码 |
| `duration_ms` | INTEGER | 否 | NULL | 请求耗时 |
| `is_stream` | INTEGER | 是 | 0 | 0=非流式，1=流式 |
| `error_message` | TEXT | 否 | NULL | 错误摘要 |
| `created_at` | TEXT | 是 | `CURRENT_TIMESTAMP` | 创建时间 |

## 3. 索引定义 (Indexes)

- **主键索引**：`id`
- **普通索引 (Normal)**：`idx_usage_logs_created_at` (`created_at`)
- **复合索引 (Composite)**：`idx_usage_logs_user_created` (`user_id`, `created_at`)
- **复合索引 (Composite)**：`idx_usage_logs_api_key_created` (`api_key_id`, `created_at`)
- **复合索引 (Composite)**：`idx_usage_logs_model_created` (`model`, `created_at`)

## 4. 关联关系与特殊说明 (Relations & Notes)
1. 写入可通过 `ctx.waitUntil()` 异步执行，但失败需要记录到 Worker 日志。
2. 大量历史明细后续可按月归档到 R2。
3. 查询列表必须默认按 `created_at DESC`。
