# 表名：`api_keys` (API Key 表)

## 1. 基本信息
- **表描述**：存储分配给家庭成员的网关访问密钥。
- **字符集**：D1/SQLite 默认 UTF-8。
- **排序规则**：按 D1/SQLite 默认规则处理。
- **核心业务逻辑**：API Key 只展示一次，数据库只保存 hash；网关通过 Bearer API Key 鉴权。

## 2. 字段定义 (Schema)

| 字段名 (Field) | 类型 (Type) | 必填 (NN) | 默认值 (Default) | 注释与业务规则 (Comment/Rules) |
| :------------- | :---------- | :-------- | :---------------- | :----------------------------- |
| `id` | INTEGER | 是 | 自增 | 主键 |
| `user_id` | INTEGER | 是 | 无 | 逻辑关联 `users.id` |
| `group_id` | INTEGER | 否 | NULL | 逻辑关联 `groups.id` |
| `name` | TEXT | 是 | 无 | Key 名称 |
| `key_hash` | TEXT | 是 | 无 | API Key hash，全局唯一 |
| `key_prefix` | TEXT | 是 | 无 | 展示用前缀，例如 `sk-pfg-abc123` |
| `status` | TEXT | 是 | `'active'` | `active` / `disabled` |
| `last_used_at` | TEXT | 否 | NULL | 最近使用时间 |
| `expires_at` | TEXT | 否 | NULL | 过期时间，NULL 表示不过期 |
| `created_at` | TEXT | 是 | `CURRENT_TIMESTAMP` | 创建时间 |
| `updated_at` | TEXT | 是 | `CURRENT_TIMESTAMP` | 更新时间 |
| `deleted_at` | TEXT | 否 | NULL | 软删除时间 |

## 3. 索引定义 (Indexes)

- **主键索引**：`id`
- **唯一索引 (Unique)**：`uk_api_keys_hash` (`key_hash`)
- **普通索引 (Normal)**：`idx_api_keys_user_id` (`user_id`)
- **普通索引 (Normal)**：`idx_api_keys_group_id` (`group_id`)
- **普通索引 (Normal)**：`idx_api_keys_status` (`status`)

## 4. 关联关系与特殊说明 (Relations & Notes)
1. 任何接口都不得返回 `key_hash`。
2. 创建成功时仅返回一次明文 API Key；刷新页面后不能再次查看明文。
3. KV 中可缓存 `key_hash -> user/group/status`，禁用或删除时必须清理缓存。
