# Phoenix AI 界面预览

依据用户提供的 `凤凰 AI 品牌 UI 展示板.png` 制作的独立可点击视觉预览。此目录从官方 DeepSeek Harness 的干净 `master` 建立在 `phoenix/ui-first-pass` 分支；没有修改 Harness Agent、模型、会话或凭据代码。

直接用浏览器打开 `index.html`。导航、浅深主题、窄窗口菜单、快捷提示和输入交互可操作。输入内容只在当前页面临时显示，不会调用模型，也不写入 Harness 会话。知识库、工具箱和设置是界面占位，接入原生服务前不会声称功能已完成。

品牌参考图位于 `/Volumes/John/Phoenix/UI设计/凤凰 AI 品牌 UI 展示板.png`。`assets/huolong-original-sheet.webp`、`assets/xiaohuoren-original-sheet.webp` 和用户指定的站姿图 `assets/huolong-welcome-pose.png` 均完整保留。首页使用从站姿图生成的透明角色素材 `assets/huolong-welcome-cutout.png`，在原有深棕色调上加入从左至右的火焰橙渐变；角色占欢迎区右半边，下半身由卡片裁切。此素材是站姿图的衍生图，最终品牌资产仍需与原图核对。左上角的火焰 SVG 仅是界面布局图标，尚未替代原版标准 Logo。
