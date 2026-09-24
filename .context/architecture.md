# Архитектура

```
Shell (Electron | Tauri)
  UI (TS + SolidJS): панели, слои, инспектор, палитра команд
  Canvas: DOM-рендерер (vanilla TS)
    live-слой: открытый экран → DOM (Shadow DOM на фрейм)
    tile-слой: миниатюры/снапшоты остальных экранов
    overlay: выделение, хэндлы, снаппинг
  Play-режим: экран в <iframe>, interactions → state machine
Command API — единая точка правки (UI, ИИ-агенты, MCP, плагины)
Core (Rust)
  fig-import: kiwi + zstd → FigTree → Document Model
  Document Model: узлы = HTML-элементы + CSS-свойства; компоненты/инстансы/оверрайды;
    переменные → CSS custom properties
  Storage (+ Loro), Fonts, AI-адаптеры, MCP-сервер, Export (HTML/CSS → Tailwind/React)
```

## Репозиторий

- bun workspaces: `packages/model` (типы + model→CSS), `packages/fig-import` (.fig → model),
  `packages/render-dom` (model → DOM экрана в Shadow DOM), `apps/desktop` (Electron + Solid).
- Пакеты экспортируют TS-исходники (`exports: ./src/index.ts`), desktop бандлит их electron-vite.
- Документ живёт в процессе импорта (`utilityProcess`, `apps/desktop/importer/`): он читает `.fig`
  потоково по квантам (20 мс работы / 20 мс паузы) и шлёт прогресс. Main держит только `Page[]` и
  `cacheKey`, `ScreenModel` и картинки запрашивает у импортера (`main/import-client.ts`, протокол —
  `importer/protocol.ts`). Renderer получает `Page[]` по IPC, `ScreenModel` экрана — по клику,
  прогресс импорта — событием `document:progress`.
  Картинки и миниатюры — протокол `fignya://image/<hash>`, `fignya://thumb/<screenId>`.
  Миниатюры: одно offscreen-окно (thumb.html + render-dom) + `capturePage`, последовательная
  очередь, кэш в userData.

- `spikes/<id>-<name>/` — выбрасываемый код без TDD, каждый спайк самодостаточен (свой
  `package.json`/`Cargo.toml`, свой README с runbook и ожидаемым выводом).
- Продакшен-код — после фиксации стека, по TDD.
