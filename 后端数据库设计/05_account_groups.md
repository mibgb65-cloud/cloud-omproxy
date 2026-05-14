# 表名：`account_groups` (账号分组绑定表)

## 1. 基本信息
- **表描述**：维护上游账号与分组之间的多对多关系。
- **字符集**：D1/SQLite 默认 UTF-8。
- **排序规则**：按 D1/SQLite 默认规则处理。
- **核心业务逻辑**：一个分组可绑定多个上游账号，一个上游账号也可服务多个分组。

## 2. 字段定义 (Schema)

| 字段名 (Field) | 类型 (Type) | 必填 (NN) | 默认值 (Default) | 注释与业务规则 (Comment/Rules) |
| :------------- | :---------- | :-------- | :---------------- | :----------------------------- |
| `account_id` | INTEGER | 是 | 无 | 逻辑关联 `upstream_accounts.id` |
| `group_id` | INTEGER | 是 | 无 | 逻辑关联 `groups.id` |
| `priority` | INTEGER | 是 | 100 | 分组内优先级，越小越优先 |
| `created_at` | TEXT | 是 | `CURRENT_TIMESTAMP` | 创建时间 |

## 3. 索引定义 (Indexes)

- **联合主键**：(`account_id`, `group_id`)
- **普通索引 (Normal)**：`idx_account_groups_group_id` (`group_id`)
- **普通索引 (Normal)**：`idx_account_groups_priority` (`priority`)

## 4. 关联关系与特殊说明 (Relations & Notes)
1. 调度账号时必须先按 `group_id` 找到绑定账号，再过滤账号平台和状态。
2. 删除账号或分组时，业务代码需要同步清理绑定关系。
