# Стек

**Домен:** desktop (web-рендер внутри нативного shell) — ближе всего `web` + `systems`.

| Слой | Выбор | Статус |
|---|---|---|
| Core: парсер `.fig`, модель, шрифты, ИИ-рантайм, MCP | Rust (napi-rs + WASM для тестов) | решено |
| Редактор и рендер | TypeScript strict, vanilla, без VDOM | решено |
| Панели UI | SolidJS | решено |
| Shell | Electron (pinned Chromium) | решено S1, см. `decisions.md` |
| Хранение / история | свой открытый формат + CRDT Loro | план |

Каркас (раунд 3): bun workspaces, Vitest 5 + happy-dom, electron-vite 5 (vite 7), solid-js 1.9,
Electron 44; ядро пока на TS (`packages/*`), перенос в Rust — позже.

Спайки: Bun 1.3, TypeScript 7 (`tsc`), `kiwi-schema` + `fzstd` + `fflate` для `.fig`,
Electron 44, Tauri 2 (Rust 1.98).
