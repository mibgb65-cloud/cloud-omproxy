# 接口名称：分组列表

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/groups`
- **方法 (Method)**：`GET`
- **功能描述**：查询 API Key 和上游账号使用的分组。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`

**Query:**
- `status` (String, 选填): `active` / `disabled`

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 查询 `groups`，默认 `deleted_at IS NULL`。
3. 按 `sort_order ASC, id ASC` 排序。
4. 可附带统计：API Key 数、绑定账号数。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "name": "Default",
      "description": "默认私有分组",
      "default_platform": null,
      "status": "active",
      "sort_order": 100
    }
  ]
}
```

**错误响应 (示例):**
```json
{
  "code": 4011,
  "message": "登录已失效"
}
```
