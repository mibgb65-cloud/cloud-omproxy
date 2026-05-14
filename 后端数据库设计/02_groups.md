# 表名：`groups` (分组表)

## 1. 基本信息
- **表描述**：存储家庭成员 API Key 的默认分组和上游账号池分组。
- **字符集**：D1/SQLite 默认 UTF-8。
- **排序规则**：按 D1/SQLite 默认规则处理。
- **核心业务逻辑**：API Key 绑定一个分组；网关根据分组选择可用上游账号。

## 2. 字段定义 (Schema)

| 字段名 (Field) | 类型 (Type) | 必填 (NN) | 默认值 (Default) | 注释与业务规则 (Comment/Rules) |
| :------------- | :---------- | :-------- | :---------------- | :----------------------------- |
| `id` | INTEGER | 是 | 自增 | 主键 |
| `name` | TEXT | 是 | 无 | 分组名称，全局唯一 |
| `description` | TEXT | 否 | NULL | 分组说明 |
| `default_platform` | TEXT | 否 | NULL | 默认平台：`anthropic` / `openai` / `gemini`，NULL 表示按 endpoint 判断 |
| `status` | TEXT | 是 | `'active'` | `active` / `disabled` |
| `sort_order` | INTEGER | 是 | 100 | 后台展示排序 |
| `created_at` | TEXT | 是 | `CURRENT_TIMESTAMP` | 创建时间 |
| `updated_at` | TEXT | 是 | `CURRENT_TIMESTAMP` | 更新时间 |
| `deleted_at` | TEXT | 否 | NULL | 软删除时间 |

## 3. 索引定义 (Indexes)

- **主键索引**：`id`
- **唯一索引 (Unique)**：`uk_groups_name` (`name`)
- **普通索引 (Normal)**：`idx_groups_status` (`status`)
- **普通索引 (Normal)**：`idx_groups_sort_order` (`sort_order`)

## 4. 关联关系与特殊说明 (Relations & Notes)
1. `api_keys.group_id` 逻辑关联本表 `id`。
2. `account_groups.group_id` 逻辑关联本表 `id`。
3. 禁用分组后，该分组下 API Key 不允许继续网关请求。
