# 接口名称：更新系统设置

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/settings`
- **方法 (Method)**：`PUT`
- **功能描述**：更新站点、网关、备份等系统配置。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`
- `Content-Type`: `application/json`

**Body (JSON):**
- `site` (Object, 选填): 站点设置
- `gateway` (Object, 选填): 网关设置
- `backup` (Object, 选填): 备份设置

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 校验各设置项类型和允许范围。
3. 对每个设置项执行 upsert 到 `settings`。
4. 清理 `SETTINGS_CACHE`。
5. 记录 `audit_logs`：`settings.update`，敏感字段脱敏。

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
  "code": 4000,
  "message": "默认分组不存在"
}
```
