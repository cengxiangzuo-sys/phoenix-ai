# Phoenix AI interface

English | [中文](README.zh.md)

The Phoenix welcome card, sidebar identity, and application identity are integrated into this workspace's Harness desktop client. Build with `DSH_CLIENT_BRAND=phoenix` and `DSH_CLIENT_TITLE='Phoenix AI'`; the default Harness configuration retains the official interface. The welcome card uses the native session, model selection, and composer. “Start chatting” focuses the native composer.

The runnable development app is at `../apps/desktop/.desktop-build/phoenix-development/Phoenix AI Dev.app`. It has separate `home`, `electron-user-data`, and `project` directories. This development app depends on the current source workspace and prepared local runtime; it is not a portable release. This iteration produces no DMG and makes no paid model calls.

`index.html` remains a clickable static design preview; its chat content is not sent to a model. The user-provided brand board is at `/Volumes/John/Phoenix/UI设计/凤凰 AI 品牌 UI 展示板.png`. The original sheets `assets/huolong-original-sheet.webp`, `assets/xiaohuoren-original-sheet.webp`, and the standing pose `assets/huolong-welcome-pose.png` are preserved. The app welcome card uses the transparent character cutout `assets/huolong-welcome-cutout.png` derived from that pose, retains a dark brown base with an orange gradient, and crops the feet to emphasize the upper body. The flame SVG is a layout mark for this workspace; final brand assets still need comparison with the originals.

## Verification

- The Phoenix client build, build check, and relevant unit tests pass.
- The development app starts on macOS Apple Silicon. The actual interface shows the native sidebar, session area, model selector, composer, and Phoenix welcome card.
- No model request was sent in this iteration. A complete native chat or paid API flow is outside this UI acceptance result.
