# 接口名称：删除分组

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/groups/:id`
- **方法 (Method)**：`DELETE`
- **功能描述**：软删除未被使用的分组。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`

**Path:**
- `id` (Integer, 必填): 分组 ID

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 查询分组是否存在。
3. 检查是否有未删除 API Key 仍绑定该分组。
4. 检查是否有账号分组绑定仍使用该分组。
5. 若被使用，返回 `409 Conflict`。
6. 设置 `deleted_at`，记录审计日志。

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
  "code": 4090,
  "message": "分组仍被 API Key 或账号使用"
}
```
