# 表名：`settings` (系统设置表)

## 1. 基本信息
- **表描述**：存储站点、网关、备份等系统配置。
- **字符集**：D1/SQLite 默认 UTF-8。
- **排序规则**：按 D1/SQLite 默认规则处理。
- **核心业务逻辑**：后台设置页读取和更新配置；常用设置可缓存到 KV。

## 2. 字段定义 (Schema)

| 字段名 (Field) | 类型 (Type) | 必填 (NN) | 默认值 (Default) | 注释与业务规则 (Comment/Rules) |
| :------------- | :---------- | :-------- | :---------------- | :----------------------------- |
| `key` | TEXT | 是 | 无 | 主键，例如 `site.name` |
| `value_json` | TEXT | 是 | 无 | JSON 字符串 |
| `description` | TEXT | 否 | NULL | 设置说明 |
| `is_secret` | INTEGER | 是 | 0 | 1 表示敏感配置，接口默认不返回明文 |
| `updated_by_user_id` | INTEGER | 否 | NULL | 最近更新人 |
| `created_at` | TEXT | 是 | `CURRENT_TIMESTAMP` | 创建时间 |
| `updated_at` | TEXT | 是 | `CURRENT_TIMESTAMP` | 更新时间 |

## 3. 索引定义 (Indexes)

- **主键索引**：`key`
- **普通索引 (Normal)**：`idx_settings_is_secret` (`is_secret`)

## 4. 关联关系与特殊说明 (Relations & Notes)
1. 更新设置后必须清理 `SETTINGS_CACHE`。
2. 第一版不要把上游凭证放在本表，统一放在 `upstream_accounts.credential_ciphertext`。
