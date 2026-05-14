# GitHub + Cloudflare Dashboard 部署

推荐把这个项目按 `Cloudflare Workers Builds + GitHub 集成` 的方式部署。这样项目提交到 GitHub 后，自己和别人 fork 的用户都可以在 Cloudflare Dashboard 里完成首次部署，不需要先在本地跑 `wrangler deploy`。

## 适用场景

- 你要把项目公开到 GitHub，方便别人 fork。
- 部署者希望主要在 Cloudflare Dashboard 里操作。
- 前端 Vue 后台和 Worker API 一起部署到同一个 Worker。
- D1、KV、R2 使用部署者自己的 Cloudflare 资源。

## 部署前准备

在 Cloudflare Dashboard 中先创建这些资源。

### D1

| 用途 | 推荐名称 | Worker 绑定名 |
| --- | --- | --- |
| 主数据库 | `cloud_omproxy` | `DB` |

创建后，把 D1 的 `database_id` 填到 `worker/wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "cloud_omproxy"
database_id = "你的 D1 database_id"
```

### KV

| 用途 | 推荐名称 | Worker 绑定名 |
| --- | --- | --- |
| API Key 缓存 | `cloud_omproxy_api_key_cache` | `API_KEY_CACHE` |
| 设置缓存 | `cloud_omproxy_settings_cache` | `SETTINGS_CACHE` |
| 频率限制 | `cloud_omproxy_rate_limit` | `RATE_LIMIT` |
| 网关状态 | `cloud_omproxy_gateway_state` | `GATEWAY_STATE` |

创建后，把每个 KV namespace 的 `id` 填到 `worker/wrangler.toml`。

### R2

| 用途 | 推荐名称 | Worker 绑定名 |
| --- | --- | --- |
| 备份文件 | `cloud-omproxy-backups` | `BACKUPS` |

R2 绑定使用 bucket 名称：

```toml
[[r2_buckets]]
binding = "BACKUPS"
bucket_name = "cloud-omproxy-backups"
```

## GitHub 仓库准备

部署者 fork 项目后，需要提交自己的 `worker/wrangler.toml` 资源 ID。

不要提交任何 Secret。下面这些只能在 Cloudflare Dashboard 里填：

```text
JWT_SECRET
CREDENTIAL_SECRET
ADMIN_BOOTSTRAP_TOKEN
```

建议同时设置 Node 版本：

```text
NODE_VERSION=22
```

## Cloudflare Dashboard 配置

在 Cloudflare Dashboard 里选择从 GitHub 仓库创建 Worker，构建配置按下面填写。

```text
Root directory:
worker

Build command:
npm ci && npm --prefix ../web ci && npm run build && npm --prefix ../web run build

Deploy command:
npx wrangler deploy
```

这些命令的作用：

- `npm ci` 安装 Worker 依赖。
- `npm --prefix ../web ci` 安装 Vue 后台依赖。
- `npm run build` 校验 Worker TypeScript。
- `npm --prefix ../web run build` 构建 Vue 后台到 `web/dist`。
- `npx wrangler deploy` 部署 Worker，并通过 `worker/wrangler.toml` 的 `[assets]` 托管 Vue 后台。

## 初始化数据库

首次部署后，需要执行 D1 初始化 SQL。

最少命令行方式：

```powershell
cd worker
npx wrangler d1 migrations apply cloud_omproxy --remote
```

如果你想尽量使用 Dashboard，也可以打开 D1 控制台，把 `worker/migrations/0001_initial.sql` 的内容复制进去执行。

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

这个仓库可以直接公开，但要提醒部署者：

- `worker/wrangler.toml` 里的资源 ID 必须换成自己的。
- Cloudflare Secrets 不能提交到 GitHub。
- D1 migration 需要在首次部署后执行一次。
- 如果更换 R2 bucket 名称，`worker/wrangler.toml` 也要同步修改。

