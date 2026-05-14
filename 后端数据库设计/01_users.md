# 表名：`users` (用户表)

## 1. 基本信息
- **表描述**：存储管理员和内部用户账号。
- **字符集**：D1/SQLite 默认 UTF-8。
- **排序规则**：按 D1/SQLite 默认规则处理。
- **核心业务逻辑**：管理员手动创建内部用户，内部用户通过分配的 API Key 使用网关；不开放公开注册。

## 2. 字段定义 (Schema)

| 字段名 (Field) | 类型 (Type) | 必填 (NN) | 默认值 (Default) | 注释与业务规则 (Comment/Rules) |
| :------------- | :---------- | :-------- | :---------------- | :----------------------------- |
| `id` | INTEGER | 是 | 自增 | 主键 |
| `email` | TEXT | 是 | 无 | 登录邮箱，全局唯一 |
| `display_name` | TEXT | 是 | 无 | 展示名称，例如内部用户昵称 |
| `password_hash` | TEXT | 是 | 无 | 管理后台登录密码 hash；内部用户可为空字符串但字段保留 |
| `role` | TEXT | 是 | `'member'` | `admin` / `member` |
| `status` | TEXT | 是 | `'active'` | `active` / `disabled` |
| `daily_request_limit` | INTEGER | 否 | NULL | 每日请求数上限，NULL 表示不限制 |
| `daily_cost_limit_micro_usd` | INTEGER | 否 | NULL | 每日估算成本上限，单位 micro USD，NULL 表示不限制 |
| `created_at` | TEXT | 是 | `CURRENT_TIMESTAMP` | 创建时间，ISO 字符串 |
| `updated_at` | TEXT | 是 | `CURRENT_TIMESTAMP` | 更新时间 |
| `deleted_at` | TEXT | 否 | NULL | 软删除时间 |

## 3. 索引定义 (Indexes)

- **主键索引**：`id`
- **唯一索引 (Unique)**：`uk_users_email` (`email`)
- **普通索引 (Normal)**：`idx_users_status` (`status`)
- **普通索引 (Normal)**：`idx_users_deleted_at` (`deleted_at`)

## 4. 关联关系与特殊说明 (Relations & Notes)
1. `api_keys.user_id`、`usage_logs.user_id` 逻辑关联本表 `id`。
2. 默认查询必须排除 `deleted_at IS NOT NULL` 的记录。
3. 第一版只允许管理员创建用户，不提供公开注册接口。
