# 接口名称：更新 API Key

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/api-keys/:id`
- **方法 (Method)**：`PUT`
- **功能描述**：更新 API Key 名称、分组、状态或过期时间。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`
- `Content-Type`: `application/json`

**Path:**
- `id` (Integer, 必填): API Key ID

**Body (JSON):**
- `name` (String, 选填)
- `group_id` (Integer, 选填，可为 null)
- `status` (String, 选填): `active` / `disabled`
- `expires_at` (String, 选填，可为 null)

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 查询 API Key 是否存在且未删除。
3. 如果传入 `group_id`，校验分组有效。
4. 更新允许字段和 `updated_at`。
5. 清理 `API_KEY_CACHE` 中该 Key 的缓存。
6. 记录 `audit_logs`：`api_key.update`。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "status": "active"
  }
}
```

**错误响应 (示例):**
```json
{
  "code": 4040,
  "message": "API Key 不存在"
}
```
