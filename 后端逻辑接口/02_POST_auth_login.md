# 接口名称：管理员登录

## 1. 基本信息
- **路径 (Path)**：`/api/v1/auth/login`
- **方法 (Method)**：`POST`
- **功能描述**：管理员使用邮箱和密码登录 Vue 管理后台。
- **前置条件**：`users` 表已存在 `role = admin` 的账号。

## 2. 请求参数 (Request)
**Header:**
- `Content-Type`: `application/json`

**Body (JSON):**
- `email` (String, 必填): 管理员邮箱
- `password` (String, 必填): 明文密码，仅用于本次校验

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验 `email` 和 `password` 非空。
2. 查询 `users` 表：`email = {email}`、`role = 'admin'`、`deleted_at IS NULL`。
3. 若用户不存在、被禁用或角色不是管理员，返回 `401 Unauthorized`。
4. 使用密码 hash 算法校验密码。
5. 生成短期管理员 JWT，payload 包含 `user_id`、`role`、`iat`、`exp`。
6. 记录 `audit_logs`：`auth.login`。
7. 返回管理员基础信息和 token。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": {
    "token": "jwt-string",
    "user": {
      "id": 1,
      "email": "admin@example.com",
      "display_name": "Admin",
      "role": "admin"
    }
  }
}
```

**错误响应 (示例):**
```json
{
  "code": 4010,
  "message": "邮箱或密码错误"
}
```
