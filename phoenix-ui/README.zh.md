# Phoenix AI 界面

[English](README.md) | 中文

Phoenix 的欢迎卡片、侧栏标识和应用身份已接入此工作区的 Harness 桌面客户端。构建配置使用 `DSH_CLIENT_BRAND=phoenix` 和 `DSH_CLIENT_TITLE='Phoenix AI'`；默认 Harness 配置仍使用官方界面。欢迎卡片沿用原生会话、模型选择和输入框，“开始对话”会聚焦原生输入框。

当前可直接打开的开发版位于 `../apps/desktop/.desktop-build/phoenix-development/Phoenix AI Dev.app`。它使用独立的 `home`、`electron-user-data` 和 `project` 目录；这是依赖当前源码工作区与本机已准备运行时的开发应用，不是可转移的发行包。本轮不生成 DMG，也不调用付费模型。

`index.html` 保留为可点击的静态设计预览，其中聊天内容不会发送到模型。用户提供的品牌展示板位于 `/Volumes/John/Phoenix/UI设计/凤凰 AI 品牌 UI 展示板.png`；`assets/huolong-original-sheet.webp`、`assets/xiaohuoren-original-sheet.webp` 和站姿原图 `assets/huolong-welcome-pose.png` 均保留。应用欢迎卡片使用由站姿图生成的透明角色素材 `assets/huolong-welcome-cutout.png`，保持深棕底色并加入橙色渐变，裁切脚部以突出上半身。火焰 SVG 是当前工作区的布局标识，最终品牌资产仍需与原图核对。

## 本轮验证

- Phoenix 客户端构建与构建检查通过；相关单元测试通过。
- macOS Apple Silicon 上的开发应用已启动，实际界面可见原生侧栏、会话区、模型选择、输入框及 Phoenix 欢迎卡片。
- 本轮未发送模型请求；原生聊天与付费 API 的完整流程不属于本次界面验收结果。
