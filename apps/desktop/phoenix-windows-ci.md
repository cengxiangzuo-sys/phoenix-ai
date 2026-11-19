# Phoenix Windows test CI

2026-11-18: Created private repository https://github.com/cengxiangzuo-sys/phoenix-ai and added origin, preserving upstream.

The separate manual phoenix-windows.yml workflow uses Windows 2022 x64, Node 24, locked pnpm dependencies, unsigned NSIS packaging, SHA256 checksums, a 60-minute timeout and three-day artifact retention. It does not auto-trigger, publish releases, call models or use signing services. The official self-hosted workflow is unchanged.

Phoenix unsigned Windows builds reuse the local unsigned environment, with app ID ai.phoenix.desktop, Phoenix AI product name and Phoenix icon. They do not embed DeepSeek release policy. Signed builds retain existing validation requirements.

Local checks before dispatch: desktop-package-environment, windows-package-preset and package-target: 98 tests passed. The branded packaged-application regression added after the first run then passed together with the related packaging checks: 88 tests passed, followed by all five TypeScript gates.

The first Windows run, [44463453705](https://github.com/cengxiangzuo-sys/phoenix-ai/actions/runs/44463453705), produced the NSIS file but exposed a real branded smoke-test bug: the verifier still tried to launch `DeepSeek Harness.exe` instead of `Phoenix AI.exe`. Commit `66edd882e4` resolves packaged paths from the selected brand and covers Windows, Apple Silicon and upstream identities.

The follow-up Windows run, [44466836809](https://github.com/cengxiangzuo-sys/phoenix-ai/actions/runs/44466836809), passed on 2026-11-19 in 17 minutes 16 seconds. Locked dependency installation, packaging configuration tests, the complete unsigned package and packaged-runtime smoke, installer discovery, SHA-256 recording and artifact upload all passed. Its retained artifact is `phoenix-windows-x64-2`; retention expires on 2026-11-22.

Verified output:

- Installer: `phoenix-ai-0.2.2-rc.1-win-x64-unsigned.exe` (331,128,677 bytes)
- SHA-256: `244035c8433e4cfaf466f4d45c3dd3fd0bb2a1fc62e823fd11ce1fdf8869a03b`
- The downloaded archive passed ZIP integrity validation, and an independent macOS `shasum -a 256` matched the checksum recorded on the Windows runner.
- No model API was called during this build or verification.

Known limit: this proves Windows-native compilation, packaging and packaged-runtime smoke on the GitHub Windows runner. Installation prompts, application navigation, credentials, chat and office GUI have not yet been exercised interactively on a real Windows desktop. The installer is intentionally unsigned, so Windows may display an unknown-publisher warning. The Mac development app is unchanged.

`default-workspace` and local development profiles remain untracked and were not uploaded.
