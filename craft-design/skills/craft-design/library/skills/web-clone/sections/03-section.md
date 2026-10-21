## 资产与颜色保真（硬性门槛，违反=复刻失败）

复刻最常见的翻车方式不是结构错，而是**字体不对、图片没下、颜色目测**。以下三条是铁律，`audit-clone.mjs --recon --strict` 会机器校验：

1. **字体必须自托管真字体，禁止系统字体近似。**
   原站的字体文件几乎都在第三方 CDN（Typekit / Google Fonts / 品牌自有 CDN），带防盗链——所以必须用 `asset-harvest.mjs --url`（真浏览器网络栈）抓，不能裸 curl。产物 `assets/fonts/fonts.css` 已把 @font-face 改写成本地路径，页面直接 `<link rel="stylesheet" href="assets/fonts/fonts.css">`，然后 `font-family` 逐字照抄 recon JSON 里 `palette.*.fontFamily` / `fontFaces[].family` 的值。写 `-apple-system` / `"Helvetica Neue"` 兜底链顶替原站自定义字体 = 直接不合格。
2. **图片必须落地本地真图，禁止渐变/SVG 占位顶替。**
   `asset-harvest.mjs --url` 会滚动全页把懒加载图、srcset 变体、CSS 背景图全部按 `asset-manifest.json`（originalUrl → localPath）落到 `assets/images/`。构建页面时照 manifest 机械替换引用；某张图下载失败就换 `--recon` 兜底源或从 `RECON/network` 捕获里捞，实在拿不到才允许占位并在 NOTES.md 写明。
3. **颜色必须照抄 recon 的计算值，禁止目测。**
   `RECON/original-recon.json` 的 `palette`（body/header/nav/main/footer/buttons 的 computed backgroundColor/color/borderColor）和 `rootVariables` 就是标准答案；`original-summary.md` 里也有摘要。写 CSS 变量时直接复制这些值——footer 是 `rgb(17,17,17)` 就写 `#111111`，不许写"看起来差不多"的 `#0a0a0a`。
4. **滚动体感必须一致，禁止默认原生滚动了事。**
   recon 的 `frameworks`（lenis / gsap 检测）+ `motion`（`htmlScrollBehavior` / `scroll-snap` 规则数 / sticky·fixed 元素数）就是原站的滚动配方：原站用惯性平滑滚动库就上同款（Lenis 等）或等效实现；有 `scroll-snap` 就还原 snap；sticky 导航、视差、滚动触发动画逐个对齐。验收时用 `interaction-probe.mjs` 的滚动序列截图对照原站，滚动中途的状态（吸顶阴影、进场动画触发点）也要像。

### Step 6 · 替换成 用户自己的内容

目标永远是"做用户自己的站"，不是搬一个一模一样的。替换三件套：文字（`index.html`/`data/*.json`/`content/*.md`）、媒体（`public`/`assets`）、品牌色（CSS 变量 / Tailwind theme）。结构非平凡就写 REPLACE_GUIDE.md。

**做过 `design-dna.json`（视觉/爆改模式）的**：这一步就是它的兑现——**DNA 留着、内容换掉**。把 `design_system` 落成 CSS 自定义属性、按 `design_style` 做主观取舍、按 `visual_effects.effect_intensity` 选实现层级（lightweight CSS / medium Canvas+GSAP / heavy Three.js）；素材优先用 `asset-harvest.mjs` 取原站真图，别 AI 重绘近似。生成流程见 `references/design-dna.md`。
