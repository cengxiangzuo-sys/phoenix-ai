# Phoenix Windows test CI

2026-11-18: Created private repository https://github.com/cengxiangzuo-sys/phoenix-ai and added origin, preserving upstream.

The separate manual phoenix-windows.yml workflow uses Windows 2022 x64, Node 24, locked pnpm dependencies, unsigned NSIS packaging, SHA256 checksums, a 60-minute timeout and three-day artifact retention. It does not auto-trigger, publish releases, call models or use signing services. The official self-hosted workflow is unchanged.

Phoenix unsigned Windows builds reuse the local unsigned environment, with app ID ai.phoenix.desktop, Phoenix AI product name and Phoenix icon. They do not embed DeepSeek release policy. Signed builds retain existing validation requirements.

Local checks: desktop-package-environment, windows-package-preset and package-target: 98 tests passed. No Windows CI run or EXE yet. Installation, credentials, chat and office GUI on Windows are NOT validated. The Mac development app is unchanged.

Pending: GitHub CLI device authorization for local Git upload; inspect tracked content for secrets and user data before pushing. Do not upload default-workspace or development profiles. Check available Actions allowance and spending controls before dispatch.
