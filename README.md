# One Object Web

参照 One User 的 React / Vite / shadcn（radix-nova）后台布局。包含 Cloudflare R2、AWS S3、阿里云 OSS、腾讯云 COS 的多存储接入、文件列表、普通上传、分片上传/暂停/恢复、应用密钥和接入说明；所有业务数据来自真实后端接口。

- 原生 fetch 统一封装：`src/lib/http.ts`；页面调用置于各自 `api.ts`。
- TanStack Query 管理服务端状态；TanStack Table 管理文件表格。
- React Hook Form / Zod 管理表单；Jotai 管理客户端 UI 与上传任务状态。
- 路由按需加载；移动端侧栏使用 Sheet，宽表格保留横向滚动。
- S3 凭证与应用密钥不写入浏览器持久存储。应用 Token 由服务端保存，并持续显示在授权列表中。
- 授权管理配置应用名称、操作权限和桶，文件夹可选、留空默认 `one-object/`，新 Token 默认不过期。支持编辑、启用/停用、删除和轮换；轮换保留授权 ID、文件归属、范围和有效期，旧 Token 立即失效。移动端使用抽屉和合并列表，创建时间在一个月内显示相对时间，达到一个月后显示完整日期。
- `/guide` 是独立公开 API 文档页，无需登录，不占用 `/docs`。示例使用当前站点地址，可下载自包含的 `SKILL.md`。账号菜单通过 `/api/auth/account` 跳转到后端配置的 One User 账号页。

```bash
pnpm install
pnpm lint
pnpm build
```

开发时只需运行后端 `make dev`，会依次启动本项目 Vite 和后端，浏览器访问 `http://127.0.0.1:27525`。后端在 `ENV=dev|development` 下将页面与资源代理到 Vite（27526），API、登录与回调仍由后端处理，HMR 直接连接 27526。无需构建、复制 web-dist 或修改 One User 回调。生产环境仍托管构建产物；`pnpm build` 包含 TypeScript 检查。

小于 100 MB（100,000,000 字节）的新文件使用普通 PUT，达到阈值使用分片上传。普通上传中止后重试会重传整个文件；分片上传保留已确认分片。刷新后从服务端恢复任务并重新选择原文件。HTTP 统一使用 fetch，分片进度按服务端已确认字节更新，普通上传显示进行中状态；100% 表示云端与后端已确认完成。

完整接入约定见 [integrations/README.md](../integrations/README.md)。发布仍由 one-action 执行，不从这里直接部署。

## Web 环境配置

多桶授权支持负载均衡和可选权重（1–1000）；空权重按 1，按文件名哈希分配，全部留空时均分。路径和权重均可不填。

与 One Browser 一致，dev、stage、prod 分别使用 `.env.development`、`.env.stage`、`.env.production`。`pnpm dev` 加载 development，`pnpm build:stage` 加载 stage，`pnpm build` 加载 production。

开发代理默认指向 `http://127.0.0.1:27525`，可通过 `VITE_DEV_BACKEND_URL` 覆盖。`VITE_BASE_URL` 控制资源基础路径；接口保持同源。环境文件只存放公开配置。

Vite 从 package.json 读取应用名称和版本，可使用 `VITE_APP_NAME`、`VITE_APP_VERSION`、`VITE_BUILD_TIME` 覆盖，并生成 `app-version.json`。`pnpm lint` 使用与 One Browser 相同的 Oxlint 规则，警告也视为失败。

## One User 管理框架复用

管理框架直接迁自 `one-user/web`：AppShell 侧栏与多页签、主题/语言 Provider、ResourceTable、响应式弹窗、角色编辑与权限树管理。品牌、权限前缀、用户资料、接口合同和 Object 模块已改写；不迁移密码、验证码、OAuth 服务端或应用审核模块。

- `/dashboard`：可访问模块入口；`/dashboard/files`（文件与上传）、`keys`、`storage`、`integration` 为 Object 业务。
- `/dashboard/users|roles|permissions|login-events|operation-logs`：通用管理页面，目录与路由一一对应。
- `/dashboard/account`：当前统一登录身份。
- 原 `/files`、`/uploads`、`/keys`、`/storage`、`/integration` 自动跳转，原 Logo、登录入口和 PWA 继续使用。

菜单读取后端有效权限和权限树；前端路由与操作按钮做权限检查，后端仍为授权依据。权限每 30 秒刷新，页面聚焦时也重新读取。用户和日志使用与 One User 相同的表格；每批加载 50 条，支持加载更多，再在已加载数据内筛选和分页。少于 10 条时不显示分页。

`src/views/dashboard/{users,roles,permissions}/api.ts` 对齐 Object 的 PUT/集合响应合同；用户绑定 One User sub，不在 Object 创建密码。数据时间统一使用 date-fns，页面显示本地时区 `yyyy-MM-dd HH:mm:ss`；构建时间保留毫秒和时区，可继续用 `VITE_BUILD_TIME` 覆盖。

对象存储菜单包含“厂商接入”和“文件管理”。支持同厂商多个 Bucket；文件列表可按接入筛选，上传时选择已启用的接入。配置密钥不回显，编辑时可保留或成对轮换凭证。上传分片和合并遇到临时错误最多重试三次，新建上传不会自动重试。

文件页支持可输入路径的地址栏、目录层级和递归文件视图，云端文件按 50 项游标分页；左侧厂商/桶目录每页 12 个接入。桶内搜索为当前页筛选。上传队列支持多文件顺序处理、暂停、继续、重试和清除已结束项；关闭弹窗继续上传，离开文件页或刷新会停止本地队列，已创建的未完成任务可重新选择原文件恢复。

上传前按分片计算 SHA-256，通过 `/api/uploads/reuse` 核对已有任务。仅复用相同用户、应用、存储接入、文件名、大小和分片布局的已完成文件；云端 HEAD 的大小与 ETag 必须匹配已记录对象。命中显示“秒传完成”，不生成重复文件；外部导入且没有分片摘要的对象、不同分片布局或改名文件仍正常上传。秒传前仍需要本地读取文件进行校验。

## 项目结构与文件限制

- `src/views/dashboard/` 对应控制台路由：account、files、buckets、storage、keys、integration、users、roles、permissions、login-events、operation-logs。
- `files/uploads/` 持有上传 API、传输实现、任务类型及任务卡片。
- `src/components/app-shell/` 按导航、页签和身份操作拆分；`ui/sidebar/` 保持原公开导出。
- 页面弹窗和列定义留在各自 `components/`，语言消息按语言及上传职责拆分。
- `useLocalAtom` 为组件实例建立独立 Jotai 状态；表单、URL、服务端状态仍由各自原有机制管理。
- `pnpm check:structure` 检查源码与测试的单文件 500 行上限（包含 TS、TSX 和 CSS）。

## 网页更新检测

生产构建通过 `public/app-update-checker.worker.js` 对固定应用首页发起 `HEAD`（`cache: no-store`），首次记录 ETag，后续 ETag 变化才提示刷新；不比较版本号或 Last-Modified。缺少 ETag、请求失败均不提示更新；HEAD 不受支持时回退 GET。

打开页面、返回可见标签页、网络恢复和页面可见时每分钟检查一次。开发模式禁用检查；点击更新后刷新，未保存内容需先保存。后端为首页 HEAD 返回基于实际 HTML 内容的 SHA-256 ETag；独立静态托管或代理也必须保留首页 ETag。
