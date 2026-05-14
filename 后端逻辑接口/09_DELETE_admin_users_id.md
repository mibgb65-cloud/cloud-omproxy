# 接口名称：删除用户

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/users/:id`
- **方法 (Method)**：`DELETE`
- **功能描述**：软删除家庭成员账号。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`

**Path:**
- `id` (Integer, 必填): 用户 ID

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 禁止删除当前登录管理员自己。
3. 查询用户是否存在且未删除。
4. 将 `users.deleted_at` 设置为当前时间，`status` 设置为 `disabled`。
5. 将该用户下所有 API Key 设置为 `disabled`，并清理 KV 缓存。
6. 记录 `audit_logs`：`user.delete`。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": {
    "success": true
  }
}
```

**错误响应 (示例):**
```json
{
  "code": 4091,
  "message": "不能删除当前登录管理员"
}
```
