# 接口名称：备份列表

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/backups`
- **方法 (Method)**：`GET`
- **功能描述**：分页查询 R2 备份记录。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`

**Query:**
- `page` (Integer, 选填)
- `page_size` (Integer, 选填)
- `status` (String, 选填): `pending` / `completed` / `failed`

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 查询 `backups`，按 `created_at DESC` 排序。
3. 返回分页结果，不直接读取 R2 文件内容。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": 1,
        "file_name": "backup-2026-05-14.json",
        "file_size": 2048,
        "status": "completed",
        "created_at": "2026-05-14T00:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20
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
