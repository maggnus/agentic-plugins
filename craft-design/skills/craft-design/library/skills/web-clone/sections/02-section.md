## 决策树（按顺序走，不许跳）

### Step 0 · 先建标准工程骨架

```bash
node scripts/init-clone.mjs <站名> --url <原站URL> --in-place
```

该脚本会在当前项目内创建 `NOTES.md`、`RECON/screenshots/`，避免每次手工漏掉产物。

### Step 1 · 先去 GitHub 搜源码，别急着抓站

```bash
unset SSL_CERT_FILE   # macOS 怪癖，bash 前先解
# 按站名/产品名搜
SSL_CERT_FILE=/etc/ssl/cert.pem gh api "search/repositories?q=<关键词>" \
  | jq -r '.items[] | "\(.full_name) ⭐\(.stargazers_count) \(.description)"' | head -10
# vercel.app/netlify.app/github.io 的 URL slug 常常就是 仓库名 / 部署者用户名
```
- 单文件站（github.io / 纯 HTML）→ 直接抓 raw：`curl -sL https://raw.githubusercontent.com/<user>/<repo>/main/index.html`
- **找到源码且许可允许 → 跳 Step 4 直接 clone。** 教训：先搜 GitHub 能省 30 分钟弯路。

### Step 2 · 没找到源码 → 浏览器侦察（探针）

使用内置的零依赖 CDP 浏览器控制层跑探针抽信号（框架 / `window.THREE` / canvas 数 / 平滑滚动库 / 字体 / scrollHeight）。截图 1440/768/390 三档 + 侦察 JSON 存 `RECON/`。

优先用内置脚本跑标准侦察：

```bash
node scripts/recon-site.mjs \
  --url <原站URL> \
  --out RECON \
  --label original

# 真浏览器全程滚动，把页面真实用到的图片/字体/媒体（含第三方 CDN、防盗链资产）
# 全部拔到本地，并生成 assets/fonts/fonts.css（自托管 @font-face）+ URL→本地路径映射。
node scripts/asset-harvest.mjs \
  --url <原站URL> \
  --recon RECON/original-recon.json \
  --out assets \
  --manifest RECON/asset-manifest.json

node scripts/network-capture.mjs \
  --url <原站URL> \
  --out RECON/network \
  --label original

node scripts/route-crawl.mjs \
  --url <原站URL> \
  --out RECON/routes \
  --label original \
  --max-pages 25 \
  --max-depth 2

node scripts/interaction-probe.mjs \
  --url <原站URL> \
  --out RECON/interactions \
  --label original

node scripts/sourcemap-hunt.mjs \
  --recon RECON/original-recon.json \
  --out RECON/sourcemaps
```

`--wait` 仅表示页面导航完成后的额外稳定等待，不是导航超时。导航超时只可用 `--navigation-timeout <毫秒>` 调整；同一错误不要通过增大 `--wait` 盲目重试。

> 登录态私域站需要使用当前环境里已登录的浏览器上下文；localhost / 无登录公开站直接用内置 CDP 探针。

### Step 2.5 · 先给复杂度定级，别盲目承诺

根据侦察结果先写一版"复刻前预判"：复杂度 L1-L6、推荐模式（忠实复刻 / 视觉复刻 / 内容爆改）、预计可还原范围、明确不克隆的部分。分级和评分规则见 `references/assessment.md`。

**模式选择纪律（用户没回答确认项时的默认）**：用户说的是"复刻/克隆这个网站"，默认就是**忠实复刻**——还原度是这个场景的第一目标。不许因为"原站是商业站/有版权内容"就自作主张降级成视觉复刻、换占位品牌、用排版块替代摄影图：那会被用户直接感知为"图片没抓下来、字体不对、颜色不还原"。正确姿势是**先忠实复刻到位**（真图真字体真色值全部落地），把版权/商标风险写进 NOTES.md 的"部署前须替换清单"，替换动作留给 Step 6 由用户决定。只有用户明确要"做我自己的站/换成我的品牌"时才走视觉复刻/内容爆改。同理，**不许因为"目标站是风控敏感的 SPA"就跳过脚本侦察**——`recon-site.mjs`/`asset-harvest.mjs` 用的就是真浏览器，先跑再说，跑不通再降级并如实记录。

**若模式是「视觉复刻」或「内容爆改」** → 顺手产出结构化设计身份 `design-dna.json`，把"那个站的感觉"变成可版本化、可对照的 token 规范，让 Step 6 替换时"DNA 留着、内容换掉"有据可依：

```bash
node scripts/dna-scaffold.mjs \
  --recon RECON/original-recon.json \
  --out   RECON/design-dna.json \
  --name  "<站名>"
```

脚本会把侦察到的字体/色候选/框架特效信号 best-effort 预填，其余字段人工 Analyze 补全。三维结构（design_system / design_style / visual_effects）、完整 schema、适用边界见 `references/design-dna.md`。
> ⚠️ **「忠实复刻」分支不要用 DNA**：真源码就是真相，别让"近似风格"的 DNA 稀释逐字节铁律。

### Step 3 · 按侦察结果选路径

| 侦察结果 | 走哪条路 |
|---|---|
| 静态 HTML/CSS，无框架 | `wget --mirror` 抓镜像 → 删追踪脚本 → 改文案 |
| React / Vue / Next（内容为主） | 重建模板（如 `ai-website-cloner-template`，Node 24+），灌内容 |
| SPA / SaaS / 数据驱动页面 | 先跑 `network-capture.mjs` 保存 API fixtures → 本地 JSON/mock server 替身 |
| 多页面官网 / 产品站 | 先跑 `route-crawl.mjs` 做路由地图 → 每类页面抽模板 → 统一替换内容 |
| 复杂交互站 | 先跑 `interaction-probe.mjs` 记录 hover/click/scroll/canvas drag 状态 → 按状态补交互，不许只截首屏 |
| **WebGL / Canvas / Three.js 重前端** | **深度逆向真源码（见下）→ 忠实复刻 或 找同类开源 3D 模板换内容**。单文件原生站常常逐字节保留=最忠实复刻。**找不到真源码时走运行时帧捕获 + baseline 闸门**，纪律见 `references/effect-extraction.md`（可委托 web-shader-extractor） |
| **静态构建站（Astro/Vite SSG/Hugo），含重 WebGL** | **`mirror-site.mjs` 全量镜像部署资产 → 自托管字体 + 删追踪 → 本地 web 根服务 = 真源码 1:1 忠实复刻**。对静态站，"拿到真源码"="镜像部署资产整套"。配方见 `references/static-mirror.md`。范例：oryzo.ai（Lusion，L6，高斯泼溅，hero 像素 diff 5/5） |
| 用现成开源主题的站（Astro/Hugo 主题） | 去对应主题市场找源主题（**仅限套用现成主题的站**；定制站走上一行的全量镜像，别来这行） |

L4-L6 复杂站按 `references/complex-playbooks.md` 走，不要只用普通官网流程。

### Step 4 · 在当前项目里搭工程

```bash
# 当前项目目录就是复刻工作区。
pwd
# git 源码：clone 到 source/ 或直接放入当前目录；单文件：放进来。原始源码留一份只读基准 index-original.html
# 检查 Node 版本（package.json engines），nvm use 对应版本，钉 .nvmrc
```

### Step 5 · 删追踪 + 写元信息 + 验证

- **删追踪**：Google Analytics（`gtag` / `googletagmanager`）、像素、热图——逐行精确切除（GA 块常在 `<head>` 顶部）。
- **预览适配**：交付前必须把项目根资源引用改成相对路径，避免 `/reference-assets/...` 在文件预览里打到应用根导致裸 HTML：

```bash
node scripts/craft-preview-rewrite.mjs --project .
```

- **写 NOTES.md**（必须）：包含复杂度、复刻模式、原站 vs 克隆站对比、保真度评分、已知缺口。模板见 `references/deliverables.md`。
- **复杂站写 TEARDOWN.md**（技术拆解）。所有结论标真源码行号。
- **复刻后评分**：按 `references/assessment.md` 给结构 / 视觉 / 交互 / 响应式 / 内容替换 / 功能完整度打分。分数要能被截图、源码、运行结果支撑。
- **浏览器真验证**（硬要求，不许只看代码就说"应该能跑"）：起本地服务器 → 浏览器打开 → 抓 console（不能有 JS/WebGL 编译错误）→ 截图对照原站。诚实记录验证不了的部分（如合成 PointerEvent `isTrusted=false` 触发不了拖拽，要如实写，别伪造"拖动成功"）。

复刻完成后再跑一次克隆站侦察，并生成自动对比报告：

```bash
node scripts/recon-site.mjs \
  --url http://127.0.0.1:<端口>/ \
  --out RECON \
  --label clone

node scripts/route-crawl.mjs \
  --url http://127.0.0.1:<端口>/ \
  --out RECON/routes-clone \
  --label clone \
  --max-pages 25 \
  --max-depth 2

node scripts/interaction-probe.mjs \
  --url http://127.0.0.1:<端口>/ \
  --out RECON/interactions-clone \
  --label clone

node scripts/compare-recon.mjs \
  --original RECON/original-recon.json \
  --clone RECON/clone-recon.json \
  --visual-diff RECON/visual-diff-1440.json \
  --original-routes RECON/routes/original-route-map.json \
  --clone-routes RECON/routes-clone/clone-route-map.json \
  --original-interactions RECON/interactions/original-interactions.json \
  --clone-interactions RECON/interactions-clone/clone-interactions.json \
  --out CLONE_REPORT.md

node scripts/visual-diff.mjs \
  --original RECON/screenshots/original-1440.png \
  --clone RECON/screenshots/clone-1440.png \
  --out RECON/visual-diff-1440.json \
  --diff RECON/screenshots/visual-diff-1440.png

# --recon + --strict: 字体/图片/颜色保真硬门槛，有硬伤 exit 2 —— 修完重跑，
# 不通过不许交付。
node scripts/audit-clone.mjs \
  --project . \
  --brand "<原站品牌名>" \
  --recon RECON/original-recon.json \
  --strict \
  --out CLONE_AUDIT.md
```
