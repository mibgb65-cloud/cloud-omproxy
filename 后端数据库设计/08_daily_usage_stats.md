# 表名：`daily_usage_stats` (每日用量聚合表)

## 1. 基本信息
- **表描述**：按天聚合用户/API Key/模型维度用量，降低 dashboard 查询压力。
- **字符集**：D1/SQLite 默认 UTF-8。
- **排序规则**：按 D1/SQLite 默认规则处理。
- **核心业务逻辑**：网关请求完成后同步或异步累加当日统计。

## 2. 字段定义 (Schema)

| 字段名 (Field) | 类型 (Type) | 必填 (NN) | 默认值 (Default) | 注释与业务规则 (Comment/Rules) |
| :------------- | :---------- | :-------- | :---------------- | :----------------------------- |
| `id` | INTEGER | 是 | 自增 | 主键 |
| `stat_date` | TEXT | 是 | 无 | 日期，格式 `YYYY-MM-DD` |
| `user_id` | INTEGER | 否 | NULL | 用户维度，NULL 表示全局汇总 |
| `api_key_id` | INTEGER | 否 | NULL | API Key 维度 |
| `model` | TEXT | 否 | NULL | 模型维度 |
| `request_count` | INTEGER | 是 | 0 | 请求数 |
| `input_tokens` | INTEGER | 是 | 0 | 输入 token |
| `output_tokens` | INTEGER | 是 | 0 | 输出 token |
| `cache_tokens` | INTEGER | 是 | 0 | 缓存 token |
| `estimated_cost_micro_usd` | INTEGER | 是 | 0 | 估算成本 |
| `updated_at` | TEXT | 是 | `CURRENT_TIMESTAMP` | 更新时间 |

## 3. 索引定义 (Indexes)

- **主键索引**：`id`
- **唯一索引 (Unique)**：`uk_daily_usage_dimension` (`stat_date`, `user_id`, `api_key_id`, `model`)
- **普通索引 (Normal)**：`idx_daily_usage_stat_date` (`stat_date`)
- **普通索引 (Normal)**：`idx_daily_usage_user_date` (`user_id`, `stat_date`)

## 4. 关联关系与特殊说明 (Relations & Notes)
1. 由于 SQLite 唯一索引对 NULL 的处理特殊，实现时可将全局汇总的空维度规范化为 `0` 或空字符串。
2. 第一版可在写 `usage_logs` 后同步 upsert，当流量变大再迁移到队列/定时聚合。
