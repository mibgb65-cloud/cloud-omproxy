# 接口名称：用量日志列表

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/usage-logs`
- **方法 (Method)**：`GET`
- **功能描述**：分页查询网关请求明细。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`

**Query:**
- `page` (Integer, 选填)
- `page_size` (Integer, 选填)
- `user_id` (Integer, 选填)
- `api_key_id` (Integer, 选填)
- `platform` (String, 选填)
- `model` (String, 选填)
- `start_time` (String, 选填)
- `end_time` (String, 选填)

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 校验时间范围和分页参数。
3. 查询 `usage_logs`，按 `created_at DESC` 排序。
4. 可左连接用户和 API Key 展示名称。
5. 返回分页结果。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": 1,
        "user_id": 2,
        "platform": "openai",
        "model": "gpt-4.1",
        "input_tokens": 100,
        "output_tokens": 200,
        "estimated_cost_micro_usd": 3000,
        "status_code": 200,
        "created_at": "2026-05-14T00:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20
  }
}
```

**错误响应 (示例):**
```json
{
  "code": 4000,
  "message": "时间范围不正确"
}
```
