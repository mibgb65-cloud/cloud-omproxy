# 接口名称：管理员登出

## 1. 基本信息
- **路径 (Path)**：`/api/v1/auth/logout`
- **方法 (Method)**：`POST`
- **功能描述**：退出管理后台登录状态。
- **前置条件**：携带有效管理员 JWT。

## 2. 请求参数 (Request)
**Header:**
- `Authorization`: `Bearer <admin_jwt>`

**Body (JSON):** 无

## 3. 核心处理逻辑 (Step-by-Step)
1. 校验 JWT；若无效返回 `401 Unauthorized`。
2. 第一版采用无状态 JWT，服务端只记录审计日志，不维护会话表。
3. 记录 `audit_logs`：`auth.logout`。
4. 返回成功；前端负责清理本地 token。

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
  "code": 4011,
  "message": "登录已失效"
}
```
