# Раунд 4, срез 2 — правка свойств из инспектора через Command API (статус: ЗАКОММИЧЕН 908c686…376b870 + docs, не запушен; T2 зелёный, ждёт T3 пользователя 26-10-14; ветка `feat/selection-inspector`)

## Решения (опрос 26-10-14)

- Изменяемый документ живёт в **importer** (`utilityProcess`): он уже держит весь `NodeMap`, поиск, миниатюры и повторное
  открытие экрана видят правку. Renderer модели не держит.
- Свойства: W/H, solid-заливка, opacity, gap, padding, corner radius, текст, font-size/weight.
- Command API в памяти + undo/redo (⌘Z / ⌘⇧Z ловит renderer, пункты меню Edit без акселератора). В `.fig` и на диск
  ничего не пишется.

## Адрес правки

`Edit.target: NodeId[]` — та же цепочка, что у поиска и `findTarget`: `[хранимый узел]` — правка самого узла;
`[инстанс, …вложенные инстансы, слой]` — оверрайд внешнего развёрнутого инстанса с `path = target.slice(1)`
(как `nestedScope`: промежуточные фреймы компонента в путь не входят). Правка мейн-компонента меняет все инстансы.
Правка W/H внутри инстанса пишет в оверрайд весь итоговый бокс (`left/top/width/height` отрисованного), иначе
`hasOwnBox` выключит подгонку под ресайз и слой сдвинется.

## Структура

```
packages/model/src/
  document.ts        + EditableDocument (nodes: Map) — импорт отдаёт его, importer правит без `as`
  edit.ts            Edit { target, style?: StylePatch, text? }, EditChange { screenId, target }, EDIT_KEYS
  edited-node.ts     editedNode(nodes, edit) → новый хранимый узел target[0] (свой стиль/текст или оверрайд)
  edit-history.ts    createEditHistory(nodes) → apply / undo / redo; запись = { target, before, after }
  css-input.ts       разбор ввода: px, 1–4 стороны, цвет (#rgb/#rrggbb/#rrggbbaa/rgb()/rgba()), десятичное число
  style-patch-guard.ts  isStylePatch: ключи EDIT_KEYS, диапазоны значений, непустой — для поля и для main
  edit-noop.ts       isNoopEdit: правка не меняет отрисованные значения → в историю не идёт
  edit-fields.ts     css-имя поля → Edit; fieldEdit(field, input, renderedNode, target)
  edit-defaults.ts   дефолты незаданных полей правки для инспектора
  inspect.ts         + строка text у текста, поля правки без значения — с дефолтом (opacity 1, radius 0, gap/padding у flex)
packages/fig-import  FigImport.document: EditableDocument
apps/desktop/
  importer/          edit / undo / redo → edited { change | undefined } или refused; история — после load
  main/edit-guards.ts  Edit из renderer: unknown → проверка (цепочка id, ключи EDIT_KEYS, формы значений, длина текста)
  main/document-editor.ts  edit / undo / redo над loaded; applied(change) на каждую принятую правку
  main/edit-ipc.ts     document:edit (invoke), document:history (undo/redo из renderer); меню зовёт editor напрямую
  main/index.ts        applied → thumbnails.touched + changed (ревизия) + document:changed в окно
  main/screen-revisions.ts  ревизия экрана в памяти; touch() / edited() — была ли правка вообще
  main/thumbnails.ts   changed(screenId): ревизия экрана; кэш читают экраны с ревизией 0; после первой правки не пишется
  shared/api.ts, preload  edit(edit), onChanged(change), step("undo" | "redo")
  shared/urls.ts       thumbUrl + rev (сброс кэша картинки браузера)
  renderer/src/canvas/edit-target.ts  выделенный элемент ↔ Edit.target (editTarget / findEditTarget — точный адрес)
  renderer/src/canvas/page-canvas.ts  changed: перерисовать живой экран, вернуть ТЕКУЩЕЕ выделение; ревизия в src миниатюры
  renderer/src/inspector-field.tsx    поле правки: Enter/blur — применить, Esc — откат, ошибка разбора — красная рамка
  renderer/src/history-step.ts        ⌘Z / ⌘⇧Z: вне полей → step в main, в поле → execCommand (undo поля)
spikes/live-cdp/run-edit.sh  (edit-flow.ts, ui.ts) клик → правка поля → DOM/инспектор → ⌘Z → исходное → ⌘⇧Z
```

## DoD

- Поля из «Свойства» в инспекторе редактируемы; Enter/blur применяет, Esc возвращает, неверный ввод не уходит в документ.
- Правка видна в живом экране сразу, выделение остаётся на слое, инспектор показывает новое значение.
- Внутри инстанса правка — оверрайд этого инстанса (другие инстансы того же компонента не меняются), бокс не прыгает.
- ⌘Z / ⌘⇧Z откатывают и повторяют правки по одной, в том числе после закрытия экрана.
- Закрыли экран — миниатюра показывает правку; повторное открытие — тоже; поиск по id находит слой.
- Vitest на синтетике: edited-node, edit-history, css-input, edit-fields, edit-target, edit-guards, importer-handler (edit/undo/redo),
  protocol-guards, thumbnails changed. `bun run types` чисто.
- Runbook — шаг 11 в `apps/desktop/README.md`; CDP-прогон `run-edit.sh`.

Не входит: сохранение на диск, мультивыделение, правка нескольких paint, drag-ресайз хэндлами, миниатюры других экранов
при правке мейн-компонента (обновятся после перезапуска — хвост).

## Проверка

T1 + Vitest (TDD), T2: сборка + `bash spikes/live-cdp/run-edit.sh <tag>`. T3 — пользователь по runbook шаг 11.
Score ≥ 60 → `code-reviewer` до коммита.

## Эстафета сессий

Как в `round4-selection.md`: в конце сессии — статус в заголовке, «Сделано / дальше», мини-промпт следующей сессии.

## Сделано / дальше

Сделано (26-10-14): весь DoD кодом. Проверки: `bun run types` чисто, `bun run test` код 0 (486), сборка, CDP
`run-edit.sh edit6` — all checks passed (32). `code-reviewer`: 2 high, 3 medium, 11 low — все исправлены:
выделение после перерисовки не прыгает на цель правки; дисковый кэш миниатюр выключается после первой правки (правка
мейн-компонента меняла чужие экраны и попадала в кэш между запусками); ⌘Z в поле — undo поля; строки инспектора на `Index`
(фокус переживает перерисовку); диапазоны в `isStylePatch`; отказ importer — красная рамка; пустышки не в истории; строгий
разбор (`#` обязателен, только десятичные); `findEditTarget` вместо первого совпадения по id; IME; раскладки.
Повторное ревью: 2 medium, 3 low — исправлены: кэш миниатюр читают неправленые экраны; ⌘Z в поле сразу после Enter
откатывает документ (набор применён), с непримененным набором — поле; поля пересоздаются при смене слоя; отрицательный
бокс инстанса зажимается в 0; документ «правлен» после любой принятой правки, не только привязанной к экрану.
Ревью третьим проходом — PASS, 0 находок. Коммиты: 908c686 model, 96c335b desktop, 376b870 spikes, затем docs.

Дальше: T3 пользователя — `apps/desktop/README.md` шаг 11 (особо: ⌘Z в поле поиска/инспектора, ⌘Z сразу после Enter, нет двойного undo через меню
с `registerAccelerator: false`, клик по другому слою во время правки). Дефекты — чинить первыми, регресс-тестом.

Хвосты:
- Миниатюры других экранов при правке мейн-компонента не обновляются до перезапуска (в этой сессии).
- W/H корня экрана не двигают рамку экрана на холсте (`Page.screens` статичны).
- Пункт меню Edit → Undo мышью при фокусе в поле откатывает документ, а не поле.
- Ввод значения, равного дефолту (`0` в `gap` без gap), пишет явное значение и попадает в историю.
- Каждая правка живого экрана — полный рендер DOM экрана; на больших экранах может тормозить автоповтор ⌘Z.
- Из среза 1: нажатие ⌘ без движения мыши не меняет hover; порог двойного клика 500 мс зашит в код.
- CDP-клавиши (`Input.dispatchKeyEvent`) не доходят до акселераторов нативного меню — меню проверяет только пользователь.
