# 接口名称：获取当前管理员信息

## 1. 基本信息
- **路径 (Path)**：`/api/v1/auth/me`
- **方法 (Method)**：`GET`
- **功能描述**：返回当前登录管理员信息，供前端刷新登录状态。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`

**Query:** 无

## 3. 核心处理逻辑 (Step-by-Step)
1. 解析 JWT，获取 `user_id`。
2. 查询 `users` 表，必须满足 `role = 'admin'`、`status = 'active'`、`deleted_at IS NULL`。
3. 若用户不存在或被禁用，返回 `401 Unauthorized`。
4. 返回管理员基础信息，不返回 `password_hash`。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "email": "admin@example.com",
    "display_name": "Admin",
    "role": "admin",
    "status": "active"
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
