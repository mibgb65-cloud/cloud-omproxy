# 接口名称：删除上游账号

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/upstream-accounts/:id`
- **方法 (Method)**：`DELETE`
- **功能描述**：软删除上游账号并解除分组绑定。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`

**Path:**
- `id` (Integer, 必填): 上游账号 ID

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 查询账号是否存在且未删除。
3. 在事务中设置 `deleted_at`、`status = disabled`，删除 `account_groups` 绑定。
4. 清理调度缓存。
5. 记录 `audit_logs`：`upstream_account.delete`。

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
  "code": 4040,
  "message": "上游账号不存在"
}
```
