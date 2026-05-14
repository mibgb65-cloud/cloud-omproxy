# 接口名称：API Key 列表

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/api-keys`
- **方法 (Method)**：`GET`
- **功能描述**：分页查询内部用户 API Key。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`

**Query:**
- `page` (Integer, 选填)
- `page_size` (Integer, 选填)
- `user_id` (Integer, 选填)
- `group_id` (Integer, 选填)
- `status` (String, 选填): `active` / `disabled`

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 查询 `api_keys`，默认 `deleted_at IS NULL`。
3. 左连接 `users` 和 `groups` 取展示名称。
4. 不返回 `key_hash`。
5. 按 `created_at DESC` 返回分页结果。

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
        "user_name": "User",
        "group_id": 1,
        "group_name": "Default",
        "name": "Home Key",
        "key_prefix": "sk-pfg-abc123",
        "status": "active",
        "last_used_at": null
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
  "code": 4011,
  "message": "登录已失效"
}
```
