# Раунд 5, срез 2 — SWAP_STATE в Play (статус: КОД ГОТОВ, ждёт T3)

## Решения (опрос 26-10-14)

См. `decisions.md` → «Раунд 5, срез 2». Коротко: ON_HOVER / MOUSE_ENTER / MOUSE_LEAVE / ON_CLICK, смена мгновенная,
оверрайды и правки переезжают по именам слоёв, состояние живёт до ухода с экрана.

## Данные (ROI Navigator, 26-10-14)

Скрипты `spikes/live-cdp/swap-scan.ts` (события, держатели, цели), `swap-carry.ts` (перенос оверрайдов по именам).
SWAP_STATE: MOUSE_ENTER 10 906, ON_HOVER 7 397, ON_CLICK 758, MOUSE_LEAVE 666, ON_PRESS 57, прочие 45. Держатели: инстанс вне
варианта 13 877, инстанс внутри варианта 3 763, корень варианта 2 051, фрейм внутри варианта 137. Цель — соседний вариант
своего набора у всех, кроме 13 удалённых. Пример: `515:17808` Button `471:5328` (Default) → `471:5340` (Hover).

## Структура

```
packages/model/src/swap.ts            SwapEvent (hover|enter|leave|click), Swap { on, to }
packages/model/src/node.ts            swaps?: Swap[] у NodeBase и Override; applyOverride переносит
packages/model/src/state-targets.ts   варианты-цели смен; screen-model замыкает их
packages/model/src/variant-twin.ts    twinPath: путь слоя в соседнем варианте по цепочке имён (n-й среди тёзок)
packages/model/src/variant-style.ts   variantStylePatch: не-боксовые ключи, равные старому варианту, — от нового
packages/model/src/swap-variant.ts    swapVariant(nodes, outer, path, to): новый внешний инстанс
packages/fig-import/src/convert/      swaps.ts (swapsOf), interaction-target.ts, overlay-fields.ts (слияние
                                      prototypeInteractions по id), swap-rebase, instance-overrides, override-patch
packages/render-dom/src/rerender.ts   перерисовка внешнего инстанса по запомненному контексту ветки
apps/desktop/renderer/src/play/       play-swaps (swaps элемента, держатель), play-click (link | swap), play-variants
                                      (модель экрана, swap/restore), play-hover (hover/enter/leave по composedPath)
spikes/live-cdp/                      swap-flow.ts + run-swap.sh (T2), swap-scan.ts, swap-carry.ts (данные)
```

## DoD

- Play: наведение на интерактивный инстанс (ON_HOVER, MOUSE_ENTER) → вариант-цель; уход с ON_HOVER → вариант до наведения;
  MOUSE_LEAVE → его цель; клик (ON_CLICK) → вариант-цель. Курсор-рука и подсветка при клике мимо — и у клик-смен.
- Текст, иконки, скрытые слои и правки инстанса остаются в новом варианте, где имена слоёв совпадают; корень берёт фон и
  прочий стиль нового варианта, позиция и размер — свои.
- Вложенный интерактивный инстанс меняется независимо; фрейм внутри варианта меняет свой инстанс.
- Переход и ← — экран как в файле; Esc — холст и живой экран без изменений.
- Vitest на синтетике (swapsOf, override, screen-model, variant-twin, swap-variant, перерисовка, состояние Play);
  `bun run types`, `bun run test` код 0; сборка.
- Runbook — шаг 15 в `apps/desktop/README.md` (закрытие окна — 16); CDP-прогон с замером времени смены.

## Проверка

T1 + Vitest (TDD), T2: сборка + CDP-прогон. T3 — пользователь по runbook шаг 15. Score ≈ 65 (несколько пакетов, новая
механика) → `code-reviewer` до коммита.

## Эстафета сессий

Как в `round4-selection.md`: в конце сессии — статус в заголовке, «Сделано / дальше», мини-промпт следующей сессии.

## Сделано / дальше

Сессия 26-10-14 (1): опрос, разведка данных, решения. PR #3 (`feat/document-save` → `feat/selection-inspector`) открыт.

Сессия 26-10-14 (2): код по структуре выше, TDD на синтетике. `bun run types`, `bun run test` (117 файлов, 628 тестов),
сборка `apps/desktop` — код 0. T2 `run-swap.sh swap2`: 13 hover-смен из 13 с другим содержимым, 13 откатов, обработчик
≤ 1,3 мс, клик-смена без перехода. Runbook — шаг 15, закрытие окна — 16. Ревью `code-reviewer`: FAIL (1 medium, 7 low),
всё исправлено (см. `decisions.md`): откат hover снимком + LIFO, без фолбэка смен к компоненту, flash на неприменимой
клик-смене, слияние взаимодействий с тестами, масштаб вложенной смены закреплён тестом, +6 тестов Play. После правок:
types/test (118 файлов, 640 тестов), сборка — код 0, T2 `swap4` — 13/13 смен и точных откатов, обработчик ≤ 1 мс.
Коммиты на `feat/swap-state`: 2bfd88f (model), 16d9fd1 (fig-import), 0e0805e (render-dom), f9b7f46 (desktop + runbook),
fe353cb (spikes), затем docs.

Замер замыкания моделей по целям смен (408 экранов ROI): узлов p50 785 → 826, JSON p50 638 → 682 КБ, p95 +15%,
максимум +69% (3,3 МБ); картинок столько же (максимум 8), построение ≤ 3 мс p95 — миниатюры не дорожают.

Дальше: T3 пользователем по шагу 15 → правки по дефектам → статус ЗАКРЫТ. Перед закрытием раунда 5 сверить статусы
`round5-save.md` и этой заметки.

## Хвосты

- Фрейм-держатель ON_HOVER откатывается, когда курсор уходит с целевого инстанса, а не с фрейма.
- После смены внешнего инстанса адреса вложенных держателей другие: повторный MOUSE_ENTER на том же месте возможен.
- Оверрайды stored-инстансов промежуточных уровней при переводе не учитываются (только внешние и самого вложенного).
- ~10k оверрайдов ROI не ложатся по именам (слой нового варианта привязан к другому пропу) — данные файла.
- ON_PRESS, AFTER_TIMEOUT и прочие события не поддерживаются.

## Промпт следующей сессии

T3 по `apps/desktop/README.md` шаг 15 (делает пользователь) → починить дефекты → статус ЗАКРЫТ, `.context/README.md`,
dev-log. PR `feat/swap-state` — по решению пользователя (стеком на `feat/document-save` или после мержа #2/#3).
