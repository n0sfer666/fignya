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

- `spikes/<id>-<name>/` — выбрасываемый код без TDD, каждый спайк самодостаточен (свой
  `package.json`/`Cargo.toml`, свой README с runbook и ожидаемым выводом).
- Продакшен-код — после фиксации стека, по TDD.
