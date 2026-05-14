# 接口名称：更新上游账号

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/upstream-accounts/:id`
- **方法 (Method)**：`PUT`
- **功能描述**：更新上游账号配置、状态和分组绑定。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`
- `Content-Type`: `application/json`

**Path:**
- `id` (Integer, 必填): 上游账号 ID

**Body (JSON):**
- `name` (String, 选填)
- `credential` (String, 选填): 传入时替换凭证
- `base_url` (String, 选填，可为 null)
- `priority` (Integer, 选填)
- `status` (String, 选填): `active` / `disabled` / `error`
- `group_ids` (Array<Integer>, 选填): 覆盖绑定分组

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 查询账号是否存在且未删除。
3. 校验状态和分组。
4. 如果传入 `credential`，重新加密保存。
5. 在事务中更新账号和分组绑定。
6. 更新后清理调度相关 KV 缓存。
7. 记录 `audit_logs`：`upstream_account.update`。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "status": "active"
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
