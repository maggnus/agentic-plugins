---
name: web-clone
en_name: Website Clone
zh_name: 网站复刻
description: >
  网站复刻 / 克隆方法论。USE WHEN 用户说 复刻网站、克隆网站、clone website、抄个站、仿站、
  照着这个站做一个、reproduce site、还原某个网页效果、把这个站搬下来改成我的、
  复刻某个交互/WebGL/Canvas/Three.js 效果。提供「先拿真源码 → 判路径 → 逆向拆解 →
  搭工程 → 替换内容」的可移植决策树，覆盖静态站 / React-Vue-Next 内容站 /
  WebGL-Canvas 重前端站三大分支，并强制核对任何 AI 二手分析里的可执行代码。
triggers:
  - "网站复刻"
  - "复刻网站"
  - "clone website"
  - "reproduce site"
  - "仿站"
metadata:
  author: jane (xiaoer)
  version: "1.6.1"
  use_case: 个人本地复刻/学习网站，沉淀自 website-clones 克隆中枢
craft:
  mode: prototype
  scenario: web-clone
  surface: web
  design_system:
    requires: false
---

> **craft-design adaptation.** Run the bundled scripts directly with `node` from this
> entry's directory. They drive an installed Chrome, Edge or Chromium over the
> DevTools protocol and need no daemon; the `CRAFT_*` environment variables are
> optional overrides and can be left unset. There is no daemon-owned CDP session:
> if the host sandbox blocks launching the browser, ask the user to allow it or to
> run the command, rather than installing Playwright or downloading Chromium.

# Web Clone · 网站复刻方法论

把"复刻一个网站"做成可重复的流程。在工作室中，默认在当前项目目录工作：`NOTES.md`、`RECON/`、`CLONE_REPORT.md`、`CLONE_AUDIT.md` 和最终可预览的 `index.html` 都应写在当前项目内，除非用户明确指定外部工作目录。

**环境准备（跑任何 `scripts/` 前先看）**：
- 本 skill 的脚本会被 stage 到项目内 `.craft-skills/<插件目录>/scripts/`（skill 前言里有确切路径）。文中命令写的 `node scripts/xxx.mjs` 按该路径解析，例如 `node .craft-skills/<插件目录>/scripts/recon-site.mjs ...`；`RECON/`、`assets/` 等产物仍写到项目根。
- 脚本内置基于 Chrome DevTools Protocol 的零依赖控制层，直接复用系统已有的 Chrome、Edge 或 Chromium；无需启动 Electron 客户端，也支持纯 `craft` CLI。Agent 沙箱内会通过本地 daemon 创建临时 CDP 会话，避免沙箱阻止 Chrome 子进程。**禁止在用户项目里执行 `npm install playwright` 或下载 Chromium。** 若预检报告没有兼容浏览器，直接说明缺少系统浏览器或通过 `CRAFT_BROWSER_EXECUTABLE_PATH` 指定路径，不要改为目测，也不要反复安装依赖。源码开发环境若已经提供 `CRAFT_PLAYWRIGHT_PACKAGE`，脚本仍兼容该运行时，但它不是产品链路的前置条件。

## Sections

This entry was split by craft-design so that only the needed parts are read.
Read every section the task depends on before building; the list keeps the
original order, and the final checks are part of the contract.

| Section | Size |
|---|---|
| [头号铁律：真源码至上，绝不信 AI 推测的代码](sections/01-ai.md) | 1 KB |
| [决策树（按顺序走，不许跳）](sections/02-section.md) | 6 KB |
| [资产与颜色保真（硬性门槛，违反=复刻失败）](sections/03-section.md) | 2 KB |
| [逆向拆解 WebGL/Canvas 重前端（核心手艺）](sections/04-webgl-canvas.md) | 1 KB |
| [许可与署名（clone 前必查）](sections/05-clone.md) | 1 KB |
| [产物规范](sections/06-section.md) | 1 KB |
| [内置脚本](sections/07-section.md) | 2 KB |
| [能力边界（默认口径）](sections/08-section.md) | 1 KB |
| [旗舰案例](sections/09-section.md) | 1 KB |
