# 接口名称：读取系统设置

## 1. 基本信息
- **路径 (Path)**：`/api/v1/admin/settings`
- **方法 (Method)**：`GET`
- **功能描述**：读取管理后台设置页需要的系统配置。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`

**Query:** 无

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验管理员 JWT。
2. 优先读取 `SETTINGS_CACHE`。
3. 缓存未命中则查询 `settings`。
4. `is_secret = 1` 的设置只返回掩码，不返回明文。
5. 返回结构化设置对象。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "code": 0,
  "data": {
    "site": {
      "name": "Private Gateway"
    },
    "gateway": {
      "default_group_id": 1
    },
    "backup": {
      "r2_enabled": true
    }
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
