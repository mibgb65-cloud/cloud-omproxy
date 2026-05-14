# 接口名称：创建用户

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/users`
- **方法 (Method)**：`POST`
- **功能描述**：管理员创建内部用户或额外管理员。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`
- `Content-Type`: `application/json`

**Body (JSON):**
- `email` (String, 必填): 邮箱，全局唯一
- `display_name` (String, 必填): 展示名称
- `role` (String, 必填): `admin` / `member`
- `password` (String, 选填): 管理员账号必填，成员账号可不填
- `status` (String, 选填): 默认 `active`
- `daily_request_limit` (Integer, 选填): 每日请求上限
- `daily_cost_limit_micro_usd` (Integer, 选填): 每日估算成本上限

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 校验邮箱格式、角色枚举和状态枚举。
3. 如果 `role = admin`，必须传入 `password`。
4. 查询 `users.email` 是否已存在未删除记录。
5. 对密码做 hash；成员未传密码时写入空字符串。
6. 插入 `users` 表。
7. 记录 `audit_logs`：`user.create`。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": {
    "id": 2,
    "email": "user@example.com",
    "display_name": "User",
    "role": "member",
    "status": "active"
  }
}
```

**错误响应 (示例):**
```json
{
  "code": 4090,
  "message": "邮箱已存在"
}
```
