# 接口名称：创建手动备份

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/backups`
- **方法 (Method)**：`POST`
- **功能描述**：手动导出 D1 关键数据并上传到 R2。
- **前置条件**：携带有效管理员 JWT，已绑定 R2 bucket。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`
- `Content-Type`: `application/json`

**Body (JSON):**
- `include_usage_logs` (Boolean, 选填): 是否包含明细用量日志，默认 false

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 创建 `backups` 记录，状态为 `pending`。
3. 查询 D1 关键表数据。
4. 对敏感字段执行脱敏或加密：API Key 不导出明文，上游凭证不裸写。
5. 生成 JSON 备份文件和 SHA256。
6. 上传到 R2 `BACKUPS` bucket。
7. 更新 `backups.status = completed`。
8. 记录 `audit_logs`：`backup.create`。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "status": "completed",
    "file_name": "backup-2026-05-14.json"
  }
}
```

**错误响应 (示例):**
```json
{
  "code": 5001,
  "message": "备份上传失败"
}
```
