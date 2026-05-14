# 表名：`model_prices` (模型价格表)

## 1. 基本信息
- **表描述**：存储模型 token 价格，用于家庭用量成本估算。
- **字符集**：D1/SQLite 默认 UTF-8。
- **排序规则**：按 D1/SQLite 默认规则处理。
- **核心业务逻辑**：第一版只估算成本，不执行扣费。

## 2. 字段定义 (Schema)

| 字段名 (Field) | 类型 (Type) | 必填 (NN) | 默认值 (Default) | 注释与业务规则 (Comment/Rules) |
| :------------- | :---------- | :-------- | :---------------- | :----------------------------- |
| `id` | INTEGER | 是 | 自增 | 主键 |
| `platform` | TEXT | 是 | 无 | `anthropic` / `openai` / `gemini` |
| `model` | TEXT | 是 | 无 | 模型名称或通配模式 |
| `input_price_micro_usd_per_token` | INTEGER | 是 | 0 | 输入 token 单价，单位 micro USD |
| `output_price_micro_usd_per_token` | INTEGER | 是 | 0 | 输出 token 单价 |
| `cache_read_price_micro_usd_per_token` | INTEGER | 是 | 0 | 缓存读取 token 单价 |
| `cache_write_price_micro_usd_per_token` | INTEGER | 是 | 0 | 缓存写入 token 单价 |
| `status` | TEXT | 是 | `'active'` | `active` / `disabled` |
| `created_at` | TEXT | 是 | `CURRENT_TIMESTAMP` | 创建时间 |
| `updated_at` | TEXT | 是 | `CURRENT_TIMESTAMP` | 更新时间 |

## 3. 索引定义 (Indexes)

- **主键索引**：`id`
- **唯一索引 (Unique)**：`uk_model_prices_platform_model` (`platform`, `model`)
- **普通索引 (Normal)**：`idx_model_prices_status` (`status`)

## 4. 关联关系与特殊说明 (Relations & Notes)
1. 用量入库时根据 `platform + model` 匹配价格；未匹配时成本记 0 并保留 token。
2. 使用 micro USD 避免浮点精度问题。
