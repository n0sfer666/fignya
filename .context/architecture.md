# Архитектура

```
Shell (Electron | Tauri)
  UI (TS + SolidJS): панели, слои, инспектор, палитра команд
  Canvas: DOM-рендерер (vanilla TS)
    live-слой: открытый экран → DOM (Shadow DOM на фрейм)
    tile-слой: миниатюры/снапшоты остальных экранов
    overlay: выделение, хэндлы, снаппинг
  Play-режим: тот же shadow-root рендер поверх окна, ON_CLICK → NAVIGATE по `link`
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
  Правка (раунд 4, срез 2): поле инспектора (`inspector-field.tsx`) → `fieldEdit` (`packages/model/edit-fields.ts`,
  разбор `css-input.ts`) → `Edit { target, style?, text? }`; `target` — `canvas/edit-target.ts`: цепочка развёрнутых
  инстансов + слой, как у поиска. `window.fignya.edit` → main (`edit-ipc.ts`, `edit-guards.ts` + `isStylePatch` проверяют недоверенный
  ввод; `edit-guards.ts` в `shared/`, им же importer проверяет sidecar) → importer (`createEditHistory`: `editedNode` пишет стиль/текст узла или оверрайд внешнего инстанса, снимки до/после
  для undo/redo) → `EditChange { screenId, target }` → main бампит ревизию миниатюры (`screen-revisions.ts`) и шлёт
  `document:changed` → `page-canvas.changed`: миниатюра с `r=` (у живого экрана — при закрытии), живой экран
  перерисовывается, текущее выделение возвращается по точному адресу (`findEditTarget`). ⌘Z/⌘⇧Z — `history-step.ts` в
  renderer → `document:history`; меню Edit → `document-editor.ts` напрямую. Строки инспектора — `Index`: поле в фокусе
  переживает перерисовку; при смене слоя (`Show keyed` по цепочке id) поля создаются заново.
  Экспорт (раунд 4, срез 3): меню File → Export Screen… (`app-menu.ts`, id `export-screen`; доступность шлёт renderer через
  `export:available` при открытии/закрытии живого экрана) → `export:request` → `export-live.ts`: модель экрана из importer
  (с правками) → `screenImages` (хэши, которые реально отрисованы) → main `export:images` (имена `<hash>.<ext>` по сигнатуре)
  → `exportScreen` (`packages/render-dom`: тот же `renderRoot`, `classStyles` переносит `style` в общие `.nN`, CSS страницы —
  `HOST_CSS` + `NODE_CSS`, как в shadow root) → main `export:screen` (`export-guards.ts` проверяет ввод) → диалог →
  `exportFiles` (картинки из документа, начертания семейств экрана из кэша шрифтов → `fonts/` + `@font-face` перед CSS) →
  `writeExport` (атомарно, чужие файлы папки не трогает) → Finder. Наследуемое (цвет и шрифт UI) живой экран получает от
  приложения, экспорт — от браузера; узлы с текстом задают их явно.
  Play (раунд 4, срез 4): fig-import `linkOf` → `link` узла/оверрайда (`kept-fields` держит `prototypeInteractions`); меню
  View → Play (`play-screen`, ⌥⌘↩ без регистрации акселератора) доступно по `play:available` (`menu-availability.ts`, общий с
  экспортом) → `play:request` или клавиша в renderer → `play-binding.ts` → `startPlay` (`renderer/src/play/`): оверлей в
  `document.body`, `renderScreen` через тот же `openScreen`, `markHotspots` (атрибут + стиль в shadow root), `linkAt` по
  `composedPath` (глубокий слой побеждает), история Play, keydown в capture с `stopImmediatePropagation` — холст клавиш не видит.
  Сохранение (раунд 5, срез 1): правки живут sidecar-ом `<file>.fig.fignya` рядом с `.fig` (JSON `fignya-edits` v1,
  `base` — размер + SHA-256 исходника, `edits` — `compactEdits`: одна правка на адрес узла). Importer при открытии
  (`index.ts` → `fingerprint.ts`, `sidecar-store.ts`) зовёт `openEditSession`: база совпала — `restoreEdits` накатывает правки
  на узлы и они становятся seed истории (undo до них не доходит), не совпала или файл не читается — `stale`, правки не
  применяются; `ready.restored` → main `reportRestored` (лог + предупреждение `document-dialogs.ts`). Первый Save при `stale` или
  пропущенных правках копирует старый файл в `.fignya.bak`, затем атомарно пишет новый. Ответы `edited`/`saved` несут `dirty` (сравнение compact-правок
  с сохранёнными) → `document-editor.ts` → `setDocumentEdited` (macOS). File → Save (`save-document`, ⌘S) → `save-binding.ts`;
  `close-guard.ts` перехватывает `close` окна (и ⌘Q) при `dirty`: Save / Don't Save / Cancel. Ключ кэша миниатюр включает
  `restored.key` (хэш восстановленных правок), без правок — прежний ключ.

- `spikes/<id>-<name>/` — выбрасываемый код без TDD, каждый спайк самодостаточен (свой
  `package.json`/`Cargo.toml`, свой README с runbook и ожидаемым выводом).
- Продакшен-код — после фиксации стека, по TDD.
