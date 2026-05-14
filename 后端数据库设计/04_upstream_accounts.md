# 表名：`upstream_accounts` (上游账号表)

## 1. 基本信息
- **表描述**：存储 Anthropic、OpenAI、Gemini 等上游账号配置。
- **字符集**：D1/SQLite 默认 UTF-8。
- **排序规则**：按 D1/SQLite 默认规则处理。
- **核心业务逻辑**：网关根据平台、分组、状态、优先级选择可用账号转发请求。

## 2. 字段定义 (Schema)

| 字段名 (Field) | 类型 (Type) | 必填 (NN) | 默认值 (Default) | 注释与业务规则 (Comment/Rules) |
| :------------- | :---------- | :-------- | :---------------- | :----------------------------- |
| `id` | INTEGER | 是 | 自增 | 主键 |
| `name` | TEXT | 是 | 无 | 账号显示名称 |
| `platform` | TEXT | 是 | 无 | `anthropic` / `openai` / `gemini` |
| `auth_type` | TEXT | 是 | `'api_key'` | `api_key` / `oauth`，第一版优先 API Key |
| `credential_ciphertext` | TEXT | 是 | 无 | 加密后的上游凭证 |
| `credential_meta_json` | TEXT | 否 | NULL | 凭证元信息 JSON，不放明文 token |
| `base_url` | TEXT | 否 | NULL | 自定义上游 Base URL，NULL 使用默认官方地址 |
| `priority` | INTEGER | 是 | 100 | 越小优先级越高 |
| `status` | TEXT | 是 | `'active'` | `active` / `disabled` / `error` |
| `cooldown_until` | TEXT | 否 | NULL | 简单失败冷却结束时间 |
| `failure_count` | INTEGER | 是 | 0 | 连续失败次数 |
| `last_error_message` | TEXT | 否 | NULL | 最近错误摘要 |
| `last_used_at` | TEXT | 否 | NULL | 最近调度时间 |
| `created_at` | TEXT | 是 | `CURRENT_TIMESTAMP` | 创建时间 |
| `updated_at` | TEXT | 是 | `CURRENT_TIMESTAMP` | 更新时间 |
| `deleted_at` | TEXT | 否 | NULL | 软删除时间 |

## 3. 索引定义 (Indexes)

- **主键索引**：`id`
- **普通索引 (Normal)**：`idx_upstream_accounts_platform` (`platform`)
- **普通索引 (Normal)**：`idx_upstream_accounts_status` (`status`)
- **复合索引 (Composite)**：`idx_upstream_accounts_sched` (`platform`, `status`, `priority`, `last_used_at`)

## 4. 关联关系与特殊说明 (Relations & Notes)
1. `account_groups.account_id`、`usage_logs.upstream_account_id` 逻辑关联本表 `id`。
2. `credential_ciphertext` 必须使用 Worker secret 派生密钥加密。
3. R2 备份中不得裸写明文凭证。
