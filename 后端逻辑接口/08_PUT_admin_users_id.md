# 接口名称：更新用户

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/users/:id`
- **方法 (Method)**：`PUT`
- **功能描述**：更新家庭成员或管理员账号信息。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`
- `Content-Type`: `application/json`

**Path:**
- `id` (Integer, 必填): 用户 ID

**Body (JSON):**
- `display_name` (String, 选填)
- `role` (String, 选填): `admin` / `member`
- `status` (String, 选填): `active` / `disabled`
- `password` (String, 选填): 传入时重置密码
- `daily_request_limit` (Integer, 选填，可为 null)
- `daily_cost_limit_micro_usd` (Integer, 选填，可为 null)

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 查询用户是否存在且未删除。
3. 校验枚举字段。
4. 如果更新密码，对新密码做 hash。
5. 更新 `users` 表的允许字段和 `updated_at`。
6. 如果禁用用户，清理该用户 API Key 相关 KV 缓存。
7. 记录 `audit_logs`：`user.update`。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": {
    "id": 2,
    "display_name": "Family",
    "status": "active"
  }
}
```

**错误响应 (示例):**
```json
{
  "code": 4040,
  "message": "用户不存在"
}
```
