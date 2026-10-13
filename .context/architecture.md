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
  потоково по квантам (20 мс работы / 20 мс паузы) и шлёт прогресс. Main держит только `Page[]`,
  `cacheKey` и шрифты документа, `ScreenModel` и картинки запрашивает у импортера (`main/import-client.ts`, протокол —
  `importer/protocol.ts`). Оверрайды инстансов резолвятся лениво (геттер `overrides`, structured
  clone его вызывает); после `ready` импортер дорезолвит их квантами в фоне и отпускает поддеревья
  компонентов. Renderer получает `Page[]` по IPC, `ScreenModel` экрана — по клику,
  прогресс импорта — событием `document:progress`.
  Картинки и миниатюры — протокол `fignya://image/<hash>`, `fignya://thumb/<screenId>`.
  Миниатюры: одно offscreen-окно (thumb.html + render-dom) + `capturePage`, последовательная
  очередь (тег — страница + экран + уровень резкости), кэш в userData. Порядок: активная страница >
  кадры в окне > уровень (меньший первым) > FIFO. Renderer при смене страницы шлёт `thumb:page`: main
  снимает не начатые задания других страниц (запрос → 404 без лога), поздние задания чужих страниц идут
  после заданий активной и без ретрая. После жеста (`sharpen`, 200 мс) renderer шлёт `thumb:focus`
  {tier, screenIds} кадров в окне: впереди их base и нужный уровень, устаревшие уровни — нет. `load`
  миниатюр `sharpen` не откладывает (`settle-timer.ts`: жест — `restart`, load — `ensure`). Ретрай
  отрисовки встаёт в очередь заново, а не держит слот.
  Вылет за рамку: импортер даёт экрану без clip `Screen.content` (`content-bounds.ts`: видимые потомки до
  обрезающих FRAME/INSTANCE/SYMBOL, инстанс — своим боксом, слои целиком дальше 6000 px от рамки отброшены; нет — рамка, `contentOf`). Миниатюра (PNG с альфой) и img
  на холсте — по content, живой host режется `clip-path` по нему; фон и обводка `.screen`, клик и фокус — по
  рамке, fit страницы — по content.
  Шрифты: importer после `settled` шлёт `fonts` (семейства/начертания текстов и оверрайдов) в main
  (`LoadedDocument.fonts`), renderer берёт их через `fonts:usage`, отсеивает установленные (замер
  canvas) и закэшированные, показывает недостающие; загрузка — IPC `fonts:download` → main
  (`font-library`) → `fignya://font/<file>`. `@font-face` вставляется в document главного и
  thumb-окна при старте из кэша (`fonts:faces`) и по событию `fonts:changed`.
  Поиск: ⌘F (`renderer/src/search-box.tsx`) → IPC `document:search` → importer `search`/`found` →
  `searchDocument` (`packages/model`): массив матчеров, сейчас только по id (`parseNodeQuery`: `a:b`, `a-b`,
  ссылка с `node-id`, `I…;…` слой инстанса → цепочка id), `locateNode` — путь имён, `place` (страница и экран-предок
  головы цепочки), `hidden` (сама, предки, оверрайды инстансов по звеньям цепочки). `collectHits`: матчеру — остаток
  лимита, дубли по `target` отбрасываются. Новый критерий (имя, текст, компонент, стиль) — ещё один матчер и значение
  `SearchHit.match`; обход `overrides` резолвит весь файл — текст оверрайдов искать только после `settled`. Renderer:
  ввод с debounce (`search-runner.ts`, устаревшие ответы отбрасываются), Enter до ответа ищет сразу и берёт первый.
  Выбор: страница → экран живым DOM → `canvas.mark(screenId, target)` (`find-target.ts`: цепочка `[data-id]` в shadow
  root целиком или ничего) → выделение этой ноды и вписать её.
  Выделение (раунд 4, только чтение): `canvas/live-selection.ts` держит выделение и hover живого экрана; жесты отдают
  `composedPath` pointerdown, ⌘ и двойной клик (`double-click.ts`, 500 мс); `hit-node.ts` — самый глубокий `[data-id]` пути в
  shadow root; `pick.ts` — уровень как в Figma (клик — общий префикс цепочки с родителем выделения, двойной — шаг
  вглубь, ⌘ — hit). Рамки `.node-selection`/`.node-hover` — `outline-box.ts` в координатах кадра (ResizeObserver и `fonts`
  `loadingdone` — перемер). Инспектор (`renderer/src/inspector.tsx`) читает итоговую ноду элемента из `renderedNode(el)`
  (render-dom запоминает в WeakMap ноду после оверрайдов и подгонки под ресайз + компонент инстанса) и раскладывает
  `cssDeclarations` по секциям (`inspect`, `packages/model`). Модели в renderer нет: данные инспектора — только то, что
  отрисовано.

- `spikes/<id>-<name>/` — выбрасываемый код без TDD, каждый спайк самодостаточен (свой
  `package.json`/`Cargo.toml`, свой README с runbook и ожидаемым выводом).
- Продакшен-код — после фиксации стека, по TDD.
