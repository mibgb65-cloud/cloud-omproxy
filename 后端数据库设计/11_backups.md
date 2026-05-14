# 表名：`backups` (备份记录表)

## 1. 基本信息
- **表描述**：记录上传到 R2 的备份文件元数据。
- **字符集**：D1/SQLite 默认 UTF-8。
- **排序规则**：按 D1/SQLite 默认规则处理。
- **核心业务逻辑**：D1 保存备份索引，R2 保存实际文件。

## 2. 字段定义 (Schema)

| 字段名 (Field) | 类型 (Type) | 必填 (NN) | 默认值 (Default) | 注释与业务规则 (Comment/Rules) |
| :------------- | :---------- | :-------- | :---------------- | :----------------------------- |
| `id` | INTEGER | 是 | 自增 | 主键 |
| `backup_type` | TEXT | 是 | `'manual'` | `manual` / `scheduled` / `usage_export` |
| `object_key` | TEXT | 是 | 无 | R2 object key，全局唯一 |
| `file_name` | TEXT | 是 | 无 | 展示文件名 |
| `file_size` | INTEGER | 是 | 0 | 文件大小，字节 |
| `checksum_sha256` | TEXT | 否 | NULL | 文件校验值 |
| `status` | TEXT | 是 | `'pending'` | `pending` / `completed` / `failed` |
| `created_by_user_id` | INTEGER | 否 | NULL | 创建人，定时任务可为 NULL |
| `error_message` | TEXT | 否 | NULL | 失败摘要 |
| `created_at` | TEXT | 是 | `CURRENT_TIMESTAMP` | 创建时间 |
| `completed_at` | TEXT | 否 | NULL | 完成时间 |

## 3. 索引定义 (Indexes)

- **主键索引**：`id`
- **唯一索引 (Unique)**：`uk_backups_object_key` (`object_key`)
- **普通索引 (Normal)**：`idx_backups_created_at` (`created_at`)
- **普通索引 (Normal)**：`idx_backups_status` (`status`)

## 4. 关联关系与特殊说明 (Relations & Notes)
1. 删除备份时需要先删 R2 object，再删除或标记本表记录。
2. 第一版只做手动备份和下载 URL，不做自动恢复。
