# 接口名称：获取备份下载地址

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/backups/:id/download-url`
- **方法 (Method)**：`GET`
- **功能描述**：生成指定备份文件的临时下载地址。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`

**Path:**
- `id` (Integer, 必填): 备份记录 ID

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 查询 `backups`，必须为 `completed`。
3. 检查 R2 object 是否存在。
4. 第一版可返回后端代理下载接口地址；如后续支持签名 URL，再返回 R2 临时地址。
5. 记录 `audit_logs`：`backup.download_url`。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": {
    "download_url": "/api/v1/admin/backups/1/download",
    "expires_in": 300
  }
}
```

**错误响应 (示例):**
```json
{
  "code": 4040,
  "message": "备份文件不存在"
}
```
