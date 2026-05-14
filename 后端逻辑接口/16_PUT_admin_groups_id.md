# 接口名称：更新分组

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/groups/:id`
- **方法 (Method)**：`PUT`
- **功能描述**：更新分组基础信息和状态。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`
- `Content-Type`: `application/json`

**Path:**
- `id` (Integer, 必填): 分组 ID

**Body (JSON):**
- `name` (String, 选填)
- `description` (String, 选填)
- `default_platform` (String, 选填，可为 null)
- `status` (String, 选填): `active` / `disabled`
- `sort_order` (Integer, 选填)

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 查询分组是否存在且未删除。
3. 校验名称唯一和枚举字段。
4. 更新 `groups`。
5. 清理相关 API Key 和设置缓存。
6. 记录 `audit_logs`：`group.update`。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "name": "Default",
    "status": "active"
  }
}
```

**错误响应 (示例):**
```json
{
  "code": 4040,
  "message": "分组不存在"
}
```
