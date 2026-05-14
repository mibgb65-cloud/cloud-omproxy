# 接口名称：用户列表

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/users`
- **方法 (Method)**：`GET`
- **功能描述**：分页查询内部用户和管理员账号。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`

**Query:**
- `page` (Integer, 选填): 页码，默认 1
- `page_size` (Integer, 选填): 每页数量，默认 20
- `keyword` (String, 选填): 邮箱或展示名模糊搜索
- `status` (String, 选填): `active` / `disabled`
- `role` (String, 选填): `admin` / `member`

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 校验分页参数范围。
3. 拼接查询条件，必须包含 `deleted_at IS NULL`。
4. 查询 `users` 列表和总数。
5. 不返回 `password_hash`。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": 2,
        "email": "user@example.com",
        "display_name": "User",
        "role": "member",
        "status": "active",
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
  "code": 4011,
  "message": "登录已失效"
}
```
