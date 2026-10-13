# Формат .fig (как читаем)

- ZIP (store): `canvas.fig`, `images/<sha1-hex>` (без расширения, тип по сигнатуре), `meta.json`, thumbnail.
- `canvas.fig`: `fig-kiwi` (8 байт) + u32 версия + чанки `[u32 LE size][bytes]`.
  Чанк 0 — kiwi-схема (deflate raw), чанк 1 — данные (zstd; различать по magic `28 b5 2f fd`).
- Сообщение: `nodeChanges[]` (плоский список), `blobs[].bytes`.
- Декодирование потоковое (`fig/read-message.ts`): верхний `Message` разбирается вручную по id полей,
  `nodeChanges` — по одному узлу скомпилированным `decodeNodeChange`, из узла сразу остаётся только
  allowlist `fig/kept-fields.ts` (у `symbolData` — `symbolID` и `symbolOverrides`, у `textData` —
  `characters`, у `derivedSymbolData` — `guidPath`, `size`, `transform`, `fillGeometry`/`strokeGeometry`
  (`commandsBlob`, `windingRule`) — геометрия векторов в масштабированных инстансах). Прочие
  derived-поля (`derivedTextData`) — основная масса сырья, в память не попадают.
- Узел: `guid {sessionID, localID}`, `parentIndex {guid, position}` — порядок детей = сортировка
  строк `position`. `transform` m00..m12 (m02/m12 — смещение от родителя), `size {x,y}`.
- Auto layout: `stackMode` HORIZONTAL/VERTICAL, `stackSpacing`, `stackHorizontalPadding`/`stackVerticalPadding` —
  левый/верхний отступ, `stackPaddingRight/Bottom` — правый/нижний (нет поля = 0, а не копия левого/верхнего:
  на ROI Navigator 148 из 148 hug-фреймов), `stackPrimary/CounterAlignItems`,
  `stackChildPrimaryGrow`, `stackChildAlignSelf`, `stackPositioning: ABSOLUTE`. При `stackPrimaryAlignItems`
  SPACE_BETWEEN/SPACE_EVENLY Figma игнорирует `stackSpacing` (gap 0). Отрицательный `stackSpacing`
  (865 узлов: сегмент-контролы −1, стопки аватаров −4…−8) — дети внахлёст: CSS `gap` < 0 не бывает,
  поэтому модель хранит gap как есть, `cssText` его не выводит, render-dom даёт flow-детям после
  первого отрицательный margin по главной оси (в `cssText` — ни gap, ни margin: только render-dom).
  В `stackWrap: WRAP` отрицательный gap клампится к 0. `stackReverseZIndex: true` (11 из 865 контейнеров
  с отрицательным gap) — первый ребёнок сверху: стиль `stackOrder: "first-on-top"`, render-dom даёт
  детям `z-index` n−i, а самому контейнеру `isolation: isolate` — иначе эти `z-index` уходят в контекст предка
  и дети рисуются поверх поздних соседей предков (`13160:88951`: бейджи «+33%» поверх диалога). `stackWrap: WRAP` (только у
  HORIZONTAL; у VERTICAL — устаревший, игнорируем) — межстрочный
  отступ `stackCounterSpacing` (бывает null → `stackSpacing`).
- Clip: `frameMaskDisabled !== true`.
- INSTANCE: детей нет, дерево — у SYMBOL из `symbolData.symbolID`; оверрайды в
  `symbolData.symbolOverrides`, производные размеры и позиции в `derivedSymbolData[] {guidPath, size, transform}`.
- Component properties: на инстансе и внутри оверрайда `componentPropAssignments[] {defID,
  value {boolValue | textValue.characters | guidValue}, varValue.value {boolValue |
  textDataValue.characters | symbolIdValue.guid}}`. Где есть обе формы, они совпадают; только в
  `varValue` на ROI Navigator ~3.5k bool, ~2.8k text, ~1.9k swap — читаем `varValue`, иначе legacy.
  Узел компонента ссылается на свойство через
  `componentPropRefs[] {defID, componentPropNodeField: VISIBLE | TEXT_DATA | OVERRIDDEN_SYMBOL_ID}`.
  Своп — `overriddenSymbolID` (в оверрайде или через prop).
- Геометрия: `fillGeometry/strokeGeometry[].commandsBlob` → blob: байт-команда
  (0 Z, 1 M, 2 L, 3 Q, 4 C) + float32 LE координаты в локальной системе узла.
- Текст: `textData.characters`, `fontName {family, style}`, `fontSize`, `lineHeight {value, units}`,
  `letterSpacing {value, units}`, `textCase` (UPPER/LOWER/TITLE → `text-transform`, SMALL_CAPS[_FORCED]
  → `font-variant-caps`), `textDecoration`. Перенос: `textAutoResize: WIDTH_AND_HEIGHT` — одна строка (`pre`),
  `HEIGHT`/фикс — перенос; `textTruncation: ENDING` + `maxLines` (нет — `floor(size.y / lineHeight)`)
  → `…`. Одна строка и есть `textExplicitLayoutVersion` — обрезка посимвольно (`pre`), иначе Figma
  режет по словам (`-webkit-box` + line-clamp, `pre-line`: в Chrome `pre-wrap` оставляет висящий
  пробел перед «…», цена — схлопываются повторные пробелы). У auto-width `ENDING` бывает устаревшим
  (135 шт.) — игнорируем. Ширина «…» у Manrope в Chrome 9.48px, в Figma ≤ 8.65px — на границе
  влезает на символ меньше, это не чинится.
- Числа kiwi бывают NaN (не null): `num` отбрасывает не-конечные значения.
- Fill-потомок (`stackChildPrimaryGrow`) = `flex: 1 1 0; min-width|height: 0`, иначе ширина по контенту
  выталкивает соседей; в `stackWrap: WRAP` basis = свой размер, чтобы переносился.
- Обводка по сторонам: `borderStrokeWeightsIndependent` + `border{Top,Right,Bottom,Left}Weight` →
  inset-тени по сторонам (подчёркивание вкладок), `OUTSIDE` — внешние тени. `strokeWeight` у таких узлов
  часто 0 (1.2k) — не смотрим на него.

- Оверрайды: `guidPath.guids` — ключи узлов SYMBOL-дерева, ключ = `overrideKey ?? guid` (`overrideKey`
  есть лишь у части узлов). Путь длины > 1 проходит через вложенные инстансы, каждый следующий ключ —
  в дереве компонента предыдущего (с учётом свопа). Путь `[overrideKey самого SYMBOL]` адресует
  инстанс целиком и дублирует его собственные поля (ROI Navigator: 101k совпали, 22k — дефолты,
  отличия — размер самого инстанса) — пропускаем. Слои: override → prop → derived, позже выигрывает.
- Резолв на ROI Navigator: 860k источников (оверрайды + derived), не найдено 5.3k (0.6%), из них
  ~1.8k — ключи соседнего варианта (устаревшие оверрайды после смены варианта).
- Своп: у инстанса лежат копии полей корня компонента. Поле, равное значению старого корня, считается
  унаследованным и при свопе берётся у нового корня; собственные поля (размер, `transform`, `visible`,
  размещение `stack*` в родителе, данные символа) остаются. На ROI Navigator 9.5k из 20k свопов меняют
  стиль контейнера. Своп на компонент, которого нет в файле (внешняя библиотека), игнорируется.
- Derived-запись без `size` при оверрайде `size` того же пути: оверрайд устаревший, итоговый размер —
  из компонента. На ROI Navigator правило срабатывает в основном на не-свопах (8010 путей против 128
  свопов): 5300 — no-op (размеры совпадают), 2628 — исправляет, 16 — ломает, 66 — неясно. Сверку с bbox
  derived-геометрии не делаем (выигрыш ~0.2%).
- Constraints: `horizontalConstraint`/`verticalConstraint` MIN (дефолт, в kiwi опущен) / CENTER / MAX /
  STRETCH / SCALE, `FIXED_MIN/MAX` = MIN/MAX. Дети ресайзнутого инстанса раскладываются по ним, если
  derived не даёт им `size`/`transform` (derived часто хранит только геометрию); у повёрнутых и
  отражённых меняется только позиция. Подменённый компонент без auto layout в слоте другого размера
  масштабируется целиком: 1054 вектора с MIN/MIN совпадают только с масштабом, 529 с SCALE/SCALE — с
  обеими гипотезами. Абсолютные дети таких свопов без собственного бокса — только векторы (1918);
  фреймы, текст и инстансы либо в flex, либо с боксом из derived. Вложенный инстанс внутри
  масштабированного содержимого сначала раскладывается по своим constraints, потом умножается на
  масштаб родителя; множитель идёт только через абсолютных детей с полным боксом, flow-дети его не
  получают. Вектор с изменённым боксом растягивается через `viewBox` проектного размера, если своих
  путей в оверрайде нет или они совпадают с компонентом (перекраска); нулевая сторона (линии) — без
  `viewBox` (`render-dom/src/constrain.ts`, `view-box.ts`).
- Общие стили: узлы с `styleType` (FILL, TEXT, EFFECT) и `key`; ссылка `styleIdFor{Fill,StrokeFill,
  Effect,Text} {assetRef{key} | guid}` на узле и в оверрайде. Значения стиля побеждают инлайн (инлайн
  бывает устаревшим). guid `4294967295:4294967295` — отвязанный стиль, игнорируем. Краски FILL-стиля
  лежат только в `fillPaints` — и для `styleIdForStrokeFill` (21k узлов + 16k оверрайдов) берём их в
  `strokePaints` (`fig/style-refs.ts`).
- Переменные: узлы `VARIABLE` (`key`, `variableSetID {assetRef{key} | guid}`,
  `variableDataValues.entries[{modeID, variableData.value {colorValue | alias}}]`) и `VARIABLE_SET`
  (`variableSetModes[{id, name, sortPosition}]`, режим по умолчанию — минимальный `sortPosition`).
  Явный режим — `variableModeBySetMap.entries[{variableSetID, variableModeID}]` на предке (~100 на ROI
  Navigator, в основном Dark), наследуется вниз по `parentIndex`. Набор в ссылках — то `assetRef.key`,
  то guid: ключ канонизируется в guid узла `VARIABLE_SET`. Дети компонента в инстансе: режимы пути
  `ids` = режимы инстанса по документу ⊕ явные режимы узлов каждого `ids[i]` вверх до ближайшего
  `SYMBOL` (явный режим внутри компонента побеждает). Допущение, данными не подтверждённое: режим
  места инстанса побеждает явный режим корня `SYMBOL` (на ROI Navigator ключ есть у 114 инстансов,
  непустые `entries` — у 3, у `SYMBOL` — у 0; закреплено тестом). В `symbolOverrides` ключ
  встречается только с пустыми `entries` (10 шт.) и игнорируется. Сырьё запекается по дереву
  компонента, а `convert/instance-overrides.ts` перекрашивает цели по режимам пути
  (`convert/mode-paths.ts`). Цели добавляет обход раскрытого дерева (`convert/mode-targets.ts`,
  `mode-frames.ts`): всего компонента, если режимы инстанса ≠ режимам корня компонента, иначе —
  только поддеревьев свопов в компонент с другими режимами. База пути, проходящего через своп
  самого инстанса, — дерево подменённого компонента (рендер не применяет к нему оверрайды слота):
  перекраска от ближайшего вложенного инстанса ниже свопа (`mode-owner.ts`). Компоненты часто лежат на Dark-листе (режим от листа, не
  от `SYMBOL`) — инстанс на светлом экране перекрашивается в Light. Заливка ссылается через `paint.colorVar.value.alias`;
  инлайн `color` бывает устаревшим. Альфа переменной лежит в `paint.opacity` при `color.a = 1` —
  при резолве `color` = rgba переменной, `opacity: 1` (на ROI Navigator 132.9k из 133.3k связанных
  красок — `opacity` = альфа переменной, остальные ~400 с устаревшим инлайн-цветом). Резолв —
  `tree/variables.ts`, индекс — `variable-index.ts`, значения с алиасами — `variable-values.ts`.
  Числа привязаны через `variableConsumptionMap.entries[] {variableField, variableData.value.alias}`:
  радиусы, `CORNER_RADIUS`, `STACK_SPACING`/`COUNTER_SPACING`, `STACK_PADDING_*`, `FONT_SIZE`
  (`variable-floats.ts`); `CORNER_RADIUS` пишет и четыре угла без своей привязки. Пересчёт по режимам
  идёт и внутри инстансов, привязки текстового стиля переходят к потребителю вместе с его полями.
  Оверрайд с пустой картой `{entries: []}` — явная отвязка, литерал побеждает (4151 на ROI Navigator);
  литерал без карты при унаследованной привязке устаревший — побеждает переменная (5166). Оверрайд с отвязанным
  текстовым стилем (`4294967295:4294967295`) без своей карты привязок стиля не наследует — литерал побеждает (39).
  `LINE_HEIGHT`, `LETTER_SPACING`, `WIDTH/HEIGHT` не читаем.
- Эллипс с `arcData {startingAngle, endingAngle, innerRadius}` — дуга или кольцо (диаграммы), рисуем
  вектором по `fillGeometry` (на ROI Navigator 2.4k из 4.4k эллипсов).
- Векторы: дети `BOOLEAN_OPERATION` — операнды, в модель не попадают (рисуется
  результат `fillGeometry`).
- Тени: `DROP_SHADOW` у вектора, текста и узла без видимой заливки Figma рисует по содержимому →
  `filter: drop-shadow` (без spread; при размытии слоя — откат на `box-shadow`), иначе `box-shadow`.
  Spread на ветке `filter` на ROI Navigator (модель экранов) — кольцо 1px alpha 0.02 у кнопок (9517 узлов) и один
  Tooltip `32:17975` (экран `32:17265`) с видимым spread и blur; рисуются без spread, решение пользователя — не чинить.
  Несколько ключей Style с CSS `filter` сериализуются одной декларацией. Размытие с
  `blurOpType: PROGRESSIVE` (градиентное) CSS-фильтр размазал бы по всему узлу — пропускаем.
  Отражение ребёнка auto layout — `transform` с диагональю ±1 → CSS `scale`. Поворот ребёнка auto layout
  (`size` — неповёрнутый) → `centerTransform` (CSS `transform` вокруг центра) + `margin`, доводящие слот
  до бокса поворота; на ROI Navigator 1113 сырых узлов, все ±90° (векторы, линии сетки, подписи осей),
  1350 узлов модели на 245 экранах. Отрицательный gap прибавляется к этому `margin`. Повёрнутый grow-ребёнок
  (671 узел — линии L×0 сетки графиков): Figma делит свободное место на слоты как обычным fill-соседям, а
  элемент держит свой размер по центру слота. У нас (только векторы) бокс — обычный fill с нулевым
  `margin` по главной оси, т. е. бокс = слот, а svg — служебный `contentSize` [w, h] по центру бокса.
  Повёрнутые не-векторы с grow (на файле нет) и stretch (254 узла; Figma хранит их уже растянутыми) —
  фиксированный исходный бокс: CSS-stretch тянул бы локальный размер, после поворота лежащий вдоль
  главной оси.
- Без zip-обёртки файл может быть «голым» `fig-kiwi` — `readArchive` принимает оба варианта.

Реализация — `packages/fig-import/src/fig`, `src/tree`, `src/convert` (перенесено из спайка S1).
