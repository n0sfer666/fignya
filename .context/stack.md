# Стек

**Домен:** desktop (web-рендер внутри нативного shell) — ближе всего `web` + `systems`.

| Слой | Выбор | Статус |
|---|---|---|
| Core: парсер `.fig`, модель, шрифты, ИИ-рантайм, MCP | Rust (napi-rs + WASM для тестов) | решено |
| Редактор и рендер | TypeScript strict, vanilla, без VDOM | решено |
| Панели UI | SolidJS | решено |
| Shell | Electron (pinned Chromium) или Tauri 2 (WKWebView на macOS) | **решает S1** |
| Хранение / история | свой открытый формат + CRDT Loro | план |

Спайки: Bun 1.3, TypeScript 7 (`tsc`), `kiwi-schema` + `fzstd` + `fflate` для `.fig`,
Electron 44, Tauri 2 (Rust 1.98).
