# GitHub + Cloudflare Dashboard 部署

推荐使用 `Cloudflare Workers Builds + GitHub 集成`。项目提交到 GitHub 后，部署者可以直接在 Cloudflare Dashboard 里导入仓库完成首次部署。

当前仓库采用开源友好的自动资源创建方式：

- D1 绑定名：`DB`
- KV 绑定名：`CACHE`
- R2 绑定名：`BACKUPS`
- 不在仓库里提交 D1 database ID 或 KV namespace ID
- 部署时由 Wrangler 自动创建或绑定资源

## Cloudflare Dashboard 配置

导入 GitHub 仓库后，创建 Worker 时填写：

```text
Root directory:
worker

Build command:
npm ci && npm --prefix ../web ci && npm run build && npm --prefix ../web run build

Deploy command:
npx wrangler deploy
```

建议添加构建变量：

```text
NODE_VERSION=22
```

## 自动创建的资源

`worker/wrangler.toml` 已声明这些绑定：

```toml
[[d1_databases]]
binding = "DB"
database_name = "cloud_omproxy"
migrations_dir = "migrations"

[[kv_namespaces]]
binding = "CACHE"

[[r2_buckets]]
binding = "BACKUPS"
bucket_name = "cloud-omproxy-backups"
```

部署时 Wrangler 会为当前 Cloudflare 账号 provision 缺失资源。这样别人 fork 仓库后，不会用到你的 D1、KV 或 R2。

## 运行时 Secrets

Worker 创建成功后，进入：

```text
Worker -> Settings -> Variables and Secrets
```

添加这些 Secrets：

```text
JWT_SECRET
CREDENTIAL_SECRET
ADMIN_BOOTSTRAP_TOKEN
```

不要把这些值提交到 GitHub。

## 初始化数据库

首次部署后，需要执行 D1 migration。

命令行方式：

```powershell
cd worker
npx wrangler d1 migrations apply cloud_omproxy --remote
```

如果只想使用 Dashboard，可以打开 Cloudflare D1 控制台，找到自动创建的 `cloud_omproxy` 数据库，把 `worker/migrations/0001_initial.sql` 的内容复制进去执行。

## 初始化管理员

数据库初始化后，请求这个接口创建第一个管理员：

```http
POST https://你的 Worker 域名/api/v1/setup/bootstrap-admin
Authorization: Bearer <ADMIN_BOOTSTRAP_TOKEN>
Content-Type: application/json

{
  "email": "admin@example.com",
  "display_name": "Admin",
  "password": "change-me"
}
```

成功后访问 Worker 域名即可打开 Vue 管理后台。

## 开源分享说明

这个仓库可以公开分享。部署者只需要：

- fork 仓库
- 在 Cloudflare Dashboard 导入仓库
- 设置运行时 Secrets
- 首次部署后执行 D1 migration

仓库里不需要保存账号专属的 D1/KV/R2 ID。
