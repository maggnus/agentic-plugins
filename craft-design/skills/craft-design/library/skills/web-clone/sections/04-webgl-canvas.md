## 逆向拆解 WebGL/Canvas 重前端（核心手艺）

把交互站拆成**技术支柱**，逐柱定位真实实现 + 标行号：渲染（WebGL/着色器算法）、合成（SVG filter / 多 canvas / 后期）、物理、交互、音频。然后才去核对任何二手分析。

**逆向特效时三件套纪律**（治"边抠边美化、最后既不像也说不清"）：
1. **证据分级**：每条结论标 `SOURCE`（真源码/source-map/运行时 dump/帧捕获）、`PARTIAL`（名字/切片，待证）、`GUESS`（视觉拟合/魔数）。**未标=GUESS，照抄前必须升级到 SOURCE。**
2. **no-compensation**：严禁靠调亮度/速度/位置/噪声去掩盖时序/坐标/状态错误；拟合值仍标 GUESS，写明要拿到什么证据才能升级。
3. **baseline-first 闸门**：先用真实 draw call/shader/uniform 做"最小原样可复现 RAW REPLAY"→ 逐帧比对通过 → **才允许**重构工程化。
详见 `references/effect-extraction.md`（含运行时捕获兜底 + 何时委托 web-shader-extractor）。

**可迁移的高级范式**（值得攒着）：
- **位移图折射 DOM**：离屏 WebGL 算出 RG=位移/B=菲涅尔的"位移图"，再用 SVG `<filter><feDisplacementMap scale=N>` 拿它去扭曲真实的、活的、可交互的 HTML——折射的是真 DOM，WebGL 全程不碰 DOM 像素。这是 marbles 的灵魂，也是 Three.js `MeshPhysicalMaterial(transmission)` 做不到的事（它只能做"玻璃球外观"，做不出"折射整个网页"）。

详细方法 + marbles 真架构逐项拆解 → `references/reverse-engineering.md`、`references/marbles-case.md`。
