# 接口名称：管理后台概览统计

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/dashboard/summary`
- **方法 (Method)**：`GET`
- **功能描述**：返回 Dashboard 首页的今日请求、token、估算成本和基础资源数量。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`

**Query:**
- `date` (String, 选填): 统计日期，格式 `YYYY-MM-DD`，默认今天

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 解析 `date`，未传则使用当前日期。
3. 查询 `daily_usage_stats` 当日全局汇总。
4. 查询活跃用户数、活跃 API Key 数、活跃上游账号数。
5. 查询最近 10 条 `usage_logs`。
6. 组装 Dashboard 响应。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": {
    "request_count": 128,
    "total_tokens": 52000,
    "estimated_cost_micro_usd": 123456,
    "active_users": 6,
    "active_api_keys": 8,
    "active_upstream_accounts": 3,
    "recent_logs": []
  }
}
```

**错误响应 (示例):**
```json
{
  "code": 4000,
  "message": "日期格式不正确"
}
```
