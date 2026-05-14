# 接口名称：用量统计

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/usage-stats`
- **方法 (Method)**：`GET`
- **功能描述**：按用户、模型、日期返回聚合用量统计。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`

**Query:**
- `start_date` (String, 必填): `YYYY-MM-DD`
- `end_date` (String, 必填): `YYYY-MM-DD`
- `dimension` (String, 选填): `user` / `model` / `day`，默认 `day`

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 校验日期范围，限制最大跨度避免 D1 慢查询。
3. 优先查询 `daily_usage_stats`。
4. 按 `dimension` 聚合请求数、token、估算成本。
5. 返回图表友好的数组结构。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": {
    "dimension": "day",
    "items": [
      {
        "label": "2026-05-14",
        "request_count": 128,
        "total_tokens": 52000,
        "estimated_cost_micro_usd": 123456
      }
    ]
  }
}
```

**错误响应 (示例):**
```json
{
  "code": 4000,
  "message": "日期范围过大"
}
```
