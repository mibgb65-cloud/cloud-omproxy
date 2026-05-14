# 表名：`audit_logs` (审计日志表)

## 1. 基本信息
- **表描述**：记录管理员对用户、API Key、上游账号、设置、备份的关键操作。
- **字符集**：D1/SQLite 默认 UTF-8。
- **排序规则**：按 D1/SQLite 默认规则处理。
- **核心业务逻辑**：用于排查误操作和记录配置变更历史。

## 2. 字段定义 (Schema)

| 字段名 (Field) | 类型 (Type) | 必填 (NN) | 默认值 (Default) | 注释与业务规则 (Comment/Rules) |
| :------------- | :---------- | :-------- | :---------------- | :----------------------------- |
| `id` | INTEGER | 是 | 自增 | 主键 |
| `actor_user_id` | INTEGER | 否 | NULL | 操作人，系统任务可为 NULL |
| `action` | TEXT | 是 | 无 | 例如 `user.create`、`account.disable` |
| `resource_type` | TEXT | 是 | 无 | 资源类型 |
| `resource_id` | TEXT | 否 | NULL | 资源 ID |
| `detail_json` | TEXT | 否 | NULL | 变更摘要 JSON，敏感字段脱敏 |
| `ip` | TEXT | 否 | NULL | 客户端 IP |
| `user_agent` | TEXT | 否 | NULL | User-Agent |
| `created_at` | TEXT | 是 | `CURRENT_TIMESTAMP` | 创建时间 |

## 3. 索引定义 (Indexes)

- **主键索引**：`id`
- **普通索引 (Normal)**：`idx_audit_logs_created_at` (`created_at`)
- **普通索引 (Normal)**：`idx_audit_logs_actor` (`actor_user_id`)
- **复合索引 (Composite)**：`idx_audit_logs_resource` (`resource_type`, `resource_id`)

## 4. 关联关系与特殊说明 (Relations & Notes)
1. 审计日志只追加，不提供编辑。
2. 查询默认按 `created_at DESC`。
3. 备份导出时可包含审计日志，但敏感字段必须保持脱敏。
