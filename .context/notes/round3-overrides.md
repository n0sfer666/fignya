# Раунд 3 — оверрайды инстансов (статус: реализовано, T2 и ревью пройдены, ждёт T3 пользователя)

Скоуп (согласован 26-09-25): `symbolOverrides` + component properties (bool/text/swap) + размеры
(`size` оверрайда, `derivedSymbolData` size/transform). Память importer — не ограничение сейчас.
Проверка: T2 агентом (Vitest на синтетике, доля резолва путей на реальном файле, bench до/после),
T3 — пользователь сверяет 3–4 экрана с Figma. Score ≥ 60 → `code-reviewer`.

## Замер ROI Navigator (83 360 инстансов)

- `symbolOverrides` 210 641: size 81k, fillPaints 54k, font* ~34k, textData 16.6k, strokePaints/радиусы
  ~12k, overriddenSymbolID 4k, visible 2.2k (1.9k — скрыть). `guidPath` 1: 80%, 2: 18%, 3–5: 1.5%.
- Props: 86k назначений на инстансах (+15k внутри оверрайдов): bool 50k, text 18k (`textValue.characters`),
  swap 14k (`guidValue`). Ссылки на узлах `componentPropRefs {defID, componentPropNodeField}`:
  VISIBLE 15k, OVERRIDDEN_SYMBOL_ID 7.6k, TEXT_DATA 4.7k.
- `derivedSymbolData` 650k записей: size 212k, transform 166k, геометрия — не берём.
- `overrideKey` только у 64k узлов; ключ узла для `guidPath` = `overrideKey ?? guid`.

## Дизайн

- Модель: `Override { path: NodeId[]; style?; text?; hidden?; paths?; componentId? }` — path из id узлов
  (границы вложенных инстансов + цель), style — diff (ключ с `undefined` снимает свойство).
- Импорт: пути резолвятся по уровням длины; своп на уровне L (оверрайд, prop, свой оверрайд вложенного
  инстанса) известен до резолва уровня L+1. Поля слоёв сливаются: overrides → props → derived.
  Патч = diff `convertNode(цель)` и `convertNode(цель ⊕ поля)`, база мемоизирована.
- Рендер: scope (путь → Override) относительно текущего раскрытия; вход во вложенный инстанс —
  его свои оверрайды, поверх — внешние с префиксом его id (внешний выигрывает).
- `screenModel` добавляет цели свопов.
- Путь `[overrideKey самого SYMBOL]` = сам инстанс, пропускается (`ComponentKeys.self`): без этого
  доля резолва была 87.6% вместо 99.4%.

## Замеры до / после (ROI Navigator)

| | до | после |
|---|---|---|
| bench `importMs` | 5732–5807 | 9185–9552 |
| bench `maxRssMb` | 1489–1688 | 2574–2938 |
| bench `heapAfterGcMb` | 285 | 385 |
| Electron, строка `imported … in` | ~7500 мс | ~12900–13800 мс |
| importer max RSS | ~0.9 ГБ | ~1.46–1.66 ГБ |

Резолв: 860 450 источников, не найдено 5 348 (0.6%, у 1 461 инстанса), ~1.8k из них — ключи соседнего
варианта. Модель: 240 382 оверрайда (`style` 175k, `hidden` 46k, `text` 38k, `componentId` 20k,
`paths` 17k; до фиксов ревью было 254k — лишние no-op патчи вложенных путей); p50 узлов модели экрана 748 → 767 (цели свопов).
Профиль (+3.5 с): резолв 860k путей ~1.3 с, 312k целей с изменёнными полями × 2 `convertNode`,
slimming derived. `JSON.stringify` в `sameValue` заменён структурным сравнением (−0.4 с).

## Сделано / дальше

- [x] kept-fields: slim overrides/derived/props/refs/overrideKey (рекурсивный `Shape`)
- [x] fig-import: component-keys, resolve, patch, convertNode ctx
- [x] model: Override, applyOverride/mergeOverride, styleDiff, sameValue, swap targets в screenModel
- [x] render-dom: scope
- [x] тесты (мутации: уровень depth+1, приоритет prop, внутренний своп, merge scope — ловятся),
  inspect, bench до/после, runbook
- [x] ревью `code-reviewer` (FAIL → фиксы): база вложенного пути = сырьё ⊕ поля вложенных инстансов
  по суффиксу (внешний выигрывает) — без этого сброс к значению компонента терялся; своп переносит
  унаследованные поля от нового корня (`swap-rebase.ts`, кроме `OWN_FIELDS`) — на файле 9.5k из
  20k свопов меняют стиль контейнера; текст без `characters` не перетирает базу; циклы резолвера —
  `instance-resolver-cache.ts`
- [x] повторное ревью (FAIL → фиксы): изменение оверрайда сравнивается с уже перенесённой базой
  (`base.raw`), иначе внешнее поле, равное сырью, терялось после внутреннего свопа; размещение
  в родителе (`stackPositioning`, `stackChildPrimaryGrow`, `stackChildAlignSelf`) — собственное поле
  инстанса; своп на компонент, которого нет в файле, не выдаётся (на файле 16 таких). Taste не брали:
  кеш резолвера в цикле A→B→A запоминает B без свопов A — Figma рекурсию компонентов запрещает.
- [x] T3 пользователем (runbook п. 6) — провален 26-09-25: «не совпадают почти все ноды, нет подписей».
  Причины и фиксы: fill-потомки без `flex-basis: 0` (переполнение, экран сдвинут влево); auto-width
  тексты переносились; props только из legacy `value` (в файле ~8k назначений лишь в `varValue` →
  плейсхолдеры «Content», видимые скрытые слои, несвопнутые иконки); обводка по сторонам рисовалась
  рамкой. После фиксов: 245 900 оверрайдов (+5.5k), bench ~10–11 с (база 9.9 с, в пределах шума).
  Ревью (FAIL → фиксы): independent-обводка при `strokeWeight` 0 и `OUTSIDE`, fill в wrap-родителе,
  ENDING без `maxLines` (по высоте бокса), устаревший ENDING у auto-width, `display` у line-clamp —
  через ключ `display`, не неявно из `lineClamp`. Taste (хелпер пути `rec`, лишний `flexShrink`) не брали.
- [ ] Сверка нода за нодой с эталонами пользователя (`~/_dev/fignya-ref/<id>.png`, вне репо)
- Известное ограничение: placement ребёнка (`absolute` vs поток) считается от сырья родителя и не
  учитывает оверрайд `stackMode` родителя в инстансе.
- Дальше (не делалось): ленивый резолв оверрайдов по экрану вместо всего файла при импорте —
  вернёт ~3.5 с и память; устаревшие оверрайды соседнего варианта; `variableModeBySetMap` внутри
  `symbolOverrides` не учитывается (на файле встречается только пустым); оверрайд `arcData`, меняющий вид эллипса (div ↔ SVG), не поддержан.
- Derived-геометрия векторов инстансов сделана 26-09-25: `paths`-оверрайдов 17k → 134k (масштабированные
  иконки, перекраски); пути сравниваются с допуском 0.025 (`convert/same-paths.ts`), иначе шум
  округления давал ещё ~13k.
