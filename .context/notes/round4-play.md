# Раунд 4, срез 4 — Play: переход по клику (статус: КОД ГОТОВ 26-10-14, ждёт T3 пользователя по runbook шаг 13; dcb4d21…docs, не запушен; ветка `feat/selection-inspector`)

## Решения (опрос 26-10-14)

- Play — отдельный режим поверх всего окна, как Present в Figma: View → **Play** (⌥⌘↩), без живого экрана пункт серый;
  старт — открытый живой экран. Esc — выход на холст (живой экран и выделение как были).
- Охват: только ON_CLICK → NAVIGATE (INTERNAL_NODE), переход мгновенный; анимации, overlay, swap state, BACK из файла — нет.
- Экран вписан по ширине окна (масштаб ≤ 1), высокий — скроллится по вертикали, всё за рамкой обрезано.
- Клик мимо связи на 0,5 с обводит все хотспоты; над хотспотом курсор-рука; ←/Backspace — предыдущий экран истории Play;
  шапка — имя экрана и подсказка клавиш.
- Экспорт связей не несёт (экспорт по-прежнему один экран).
- Рендер Play — тот же `renderScreen` (shadow root), не `<iframe>` из architecture.md: шрифты документа и `fignya://` уже
  работают, изоляции скриптов не нужно.

## Данные (ROI Navigator, 26-10-14)

`prototypeInteractions` у 19 696 узлов + 1 281 оверрайд; у каждого взаимодействия одно действие. 19,8k — `SWAP_STATE`
(интерактивные компоненты: MOUSE_ENTER 10,9k, ON_HOVER 7,4k, ON_CLICK 754), NAVIGATE — 61 в узлах + 134 в оверрайдах.
Цели NAVIGATE: экран той же страницы 50, другой страницы 7, в оверрайдах экран 71; удалённая цель / `0xFFFFFFFF:0xFFFFFFFF` —
4 + 62. Инстанс копирует взаимодействия компонента в свой узел (те же `id`), наследовать от корня компонента не нужно.
Оверрайдов с пустым списком (снять связь) — 0; частичные записи оверрайда (без `event`) — только у SWAP_STATE.

## Структура

```
packages/model/src/node.ts        link?: NodeId у NodeBase и Override
packages/model/src/override.ts    applyOverride переносит link
packages/fig-import/src/convert/link.ts   linkOf(raw): первая ON_CLICK→NAVIGATE (не isDeleted, валидный guid)
packages/fig-import/src/convert/convert-node.ts, override-patch.ts   link узла и оверрайда
packages/fig-import/src/fig/kept-fields.ts   prototypeInteractions (event.interactionType, actions[], isDeleted)
apps/desktop/
  shared/api.ts            play:available / play:request
  main/app-menu.ts         View → Play (id play-screen, ⌥⌘↩, registerAccelerator: false)
  main/menu-availability.ts  пункт меню доступен при живом экране (экспорт и Play)
  renderer/src/play/       play-key, play-history, play-link, play-hotspots, play-fit, play-view + play.css (оверлей), play-session, play-binding
spikes/live-cdp/run-play.sh  Play на живом экране: хотспоты, переход, назад, выход
```

## DoD

- ⌥⌘↩ / View → Play на открытом экране → оверлей с экраном (с правками среза 2); без экрана пункт серый, клавиша молчит.
- Клик по слою со связью → целевой экран (в том числе с другой страницы); вложенный хотспот побеждает внешний.
- Связь с удалённой целью или не на экран — не хотспот. Клик мимо — подсветка хотспотов 0,5 с.
- ←/Backspace — назад по истории; на первом экране ничего. Esc — выход, холст с живым экраном как был.
- Vitest на синтетике: link (fig-import), kept-fields, override, play-*, app-menu. `bun run types`, `bun run test` код 0.
- Runbook — шаг 13 в `apps/desktop/README.md`; CDP-прогон `run-play.sh`.

## Проверка

T1 + Vitest (TDD), T2: сборка + `run-play.sh`. T3 — пользователь по runbook шаг 13. Score ≈ 60 → `code-reviewer` до коммита.

## Эстафета сессий

Как в `round4-selection.md`: в конце сессии — статус в заголовке, «Сделано / дальше», мини-промпт следующей сессии.

## Сделано / дальше

Сессия 26-10-14: код по DoD, Vitest (553 зелёных), `bun run types` 0, сборка, `run-play.sh play2` — все проверки (play1 упал
на сценарии: Escape после поиска снимал выделение до Play; сценарий снимает холст прямо перед Play). Импорт ROI: 7,9–8,7 с до,
8,7–8,9 с после — в шуме; `link` у 57 узлов (все на экраны), в оверрайдах 1 (55 из 56 оверрайдов-NAVIGATE на экран — оверрайд корня
компонента, связь уже у инстанса). Runbook — шаг 13 (`apps/desktop/README.md`), закрытие окна — теперь 14.
`code-reviewer`: 1 medium + 6 low исправлены — окно под оверлеем `inert`, фокус возвращается при выходе; зум холста и экспорт
в Play молчат (`bindPlay` → `onPlaying`); ввод во время загрузки экрана игнорируется; незагрузившийся старт — выход;
`scrollbar-gutter: stable`; тесты гонок. Taste (общая точка `registerMenuAvailability`, `FLASH` в hotspots, ⌥⌃↩ на macOS) — нет.
CDP: `play4` и `export exp13` — все проверки.

Дальше: T3 пользователя по шагу 13; дефекты — первыми, регресс-тестом. Затем — план раунда 4 в `decisions.md` (MVP закрыт?).

Хвосты:
- Частичная запись оверрайда без `event` (меняет только цель/переход) заменяет список целиком — связь такой записи
  потеряется; в ROI Navigator у NAVIGATE таких нет. Слияние по `id` взаимодействия — если появятся.
- Оверрайд, снимающий связь (пустой список), не выражается: `link` оверрайда только задаёт. В ROI Navigator 0.
- `kept-fields` держит `prototypeInteractions` целиком (~21k записей в ROI, в основном SWAP_STATE) — фильтр по значению
  в форме полей не выражается; память importer не замерялась.
- Масштаб < 1 CDP не проверяет (окно стенда 1440 = ширина экрана) — только T3.
- `styles.css` — 307 строк ещё до среза (жёсткий лимит 250); стили Play вынесены в `play/play.css`.
- Backlog: SWAP_STATE (hover/click → вариант компонента) — 19,8k взаимодействий в ROI Navigator, главная доля прототипа.

Мини-промпт следующей сессии: «Итог моего T3 по apps/desktop/README.md шаг 13 (Play); дефекты — чинить первыми, регресс-тестом;
затем следующий срез по плану раунда 4 в decisions.md».
