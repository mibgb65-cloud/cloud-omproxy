# 接口名称：健康检查

## 1. 基本信息
- **路径 (Path)**：`/health`
- **方法 (Method)**：`GET`
- **功能描述**：检查 Worker 服务是否可用。
- **前置条件**：无。

## 2. 请求参数 (Request)
**Header:** 无

**Query:** 无

## 3. 核心处理逻辑 (Step-by-Step)
1. 返回固定 JSON，不访问 D1/KV/R2。
2. 响应必须尽量轻量，供 Cloudflare、监控或浏览器直接访问。

## 4. 响应格式 (Response)
**成功响应 (200 OK):**
```json
{
  "status": "ok"
}
```

**错误响应 (示例):**
```json
{
  "status": "error"
}
```
