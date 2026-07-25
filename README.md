# StreamerHelper Web

StreamerHelper 的 Web 管理界面，用于查看运行状态、管理主播与任务、浏览录制内容、处理 B 站投稿和维护系统配置。

[本地开发](#本地开发) · [页面范围](#页面范围) · [配置](#配置) · [命令参考](#命令参考) · [生产部署](#生产部署)

后端接口位于 [web-server](https://github.com/StreamerHelper/web-server)，完整部署由 [infra](https://github.com/StreamerHelper/infra) 管理。

## 页面范围

| 路径 | 内容 |
| --- | --- |
| `/dashboard` | 系统概况、近期任务和运行状态 |
| `/streamers` | 主播配置、平台信息和录制策略 |
| `/jobs` | 录制与处理任务、日志和状态控制 |
| `/content` | 录制分段、字幕和媒体文件 |
| `/bilibili` | B 站登录、上传与投稿管理 |
| `/settings` | 录制、存储、轮询和上传配置 |
| `/system` | 服务状态与系统维护 |

平台配置覆盖 B 站、虎牙、斗鱼和抖音。

## 技术栈

| 范围 | 实现 |
| --- | --- |
| 框架 | Next.js 16、React 19 |
| 语言 | TypeScript |
| 样式 | Tailwind CSS 4 |
| 数据请求 | TanStack Query 5 |
| 表单与校验 | React Hook Form、Zod |
| 组件基础 | Radix UI |

应用使用 Next.js App Router，并以 `standalone` 模式生成生产构建。

## 本地开发

### 环境要求

- Node.js 20+
- pnpm 10+
- 运行在 `http://localhost:7001` 的 StreamerHelper Backend

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

浏览器打开 http://localhost:3000。

只开发界面时可以单独运行前端；需要完整的数据库、队列和对象存储时，使用 [infra 的本地联调模式](https://github.com/StreamerHelper/infra#本地联调)。

## 配置

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:7001` | 开发环境 Backend 地址 |

Next.js 会将 `/api/:path*` 重写到该地址。生产环境由 Nginx 在同一域名下代理 `/api`，无需在浏览器中直接暴露 Backend。

本地覆盖示例：

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:7001 pnpm dev
```

不要在 `NEXT_PUBLIC_*` 变量中保存密钥；此类变量会进入浏览器构建产物。

## 命令参考

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 创建生产构建 |
| `pnpm start` | 启动生产构建 |
| `pnpm lint` | 执行 ESLint |

提交前至少执行：

```bash
pnpm lint
pnpm build
```

## 代码结构

| 路径 | 内容 |
| --- | --- |
| `app/` | 页面、布局和路由 |
| `components/` | 页面组件与通用 UI |
| `hooks/` | 数据查询和交互逻辑 |
| `lib/` | API 客户端、类型和工具函数 |
| `public/` | 静态资源 |

页面组件不应直接拼接生产服务地址；API 访问统一经过共享客户端和 `/api` 代理。

## 生产部署

生产镜像和 Nginx 路由由 [StreamerHelper Infra](https://github.com/StreamerHelper/infra) 维护：

```bash
git clone https://github.com/StreamerHelper/infra.git
cd infra
npm ci
./bin/configure init
./bin/control up
```

更新前端与后端应用：

```bash
./bin/control update app
```

## License

[MIT](https://github.com/StreamerHelper/StreamerHelper/blob/main/LICENSE)
