# Формат .fig (как читаем)

- ZIP (store): `canvas.fig`, `images/<sha1-hex>` (без расширения, тип по сигнатуре), `meta.json`, thumbnail.
- `canvas.fig`: `fig-kiwi` (8 байт) + u32 версия + чанки `[u32 LE size][bytes]`.
  Чанк 0 — kiwi-схема (deflate raw), чанк 1 — данные (zstd; различать по magic `28 b5 2f fd`).
- Сообщение: `nodeChanges[]` (плоский список), `blobs[].bytes`.
- Декодирование потоковое (`fig/read-message.ts`): верхний `Message` разбирается вручную по id полей,
  `nodeChanges` — по одному узлу скомпилированным `decodeNodeChange`, из узла сразу остаётся только
  allowlist `fig/kept-fields.ts` (у `symbolData` — `symbolID` и `symbolOverrides`, у `textData` —
  `characters`, у `derivedSymbolData` — `guidPath`, `size`, `transform`). Прочие derived-поля
  (`derivedTextData`, derived-геометрия) — основная масса сырья, в память не попадают.
- Узел: `guid {sessionID, localID}`, `parentIndex {guid, position}` — порядок детей = сортировка
  строк `position`. `transform` m00..m12 (m02/m12 — смещение от родителя), `size {x,y}`.
- Auto layout: `stackMode` HORIZONTAL/VERTICAL, `stackSpacing`, `stackHorizontalPadding`,
  `stackVerticalPadding`, `stackPaddingRight/Bottom`, `stackPrimary/CounterAlignItems`,
  `stackChildPrimaryGrow`, `stackChildAlignSelf`, `stackPositioning: ABSOLUTE`.
- Clip: `frameMaskDisabled !== true`.
- INSTANCE: детей нет, дерево — у SYMBOL из `symbolData.symbolID`; оверрайды в
  `symbolData.symbolOverrides`, производные размеры и позиции в `derivedSymbolData[] {guidPath, size, transform}`.
- Component properties: на инстансе и внутри оверрайда `componentPropAssignments[] {defID,
  value {boolValue | textValue.characters | guidValue}}`; узел компонента ссылается на свойство через
  `componentPropRefs[] {defID, componentPropNodeField: VISIBLE | TEXT_DATA | OVERRIDDEN_SYMBOL_ID}`.
  Своп — `overriddenSymbolID` (в оверрайде или через prop).
- Геометрия: `fillGeometry/strokeGeometry[].commandsBlob` → blob: байт-команда
  (0 Z, 1 M, 2 L, 3 Q, 4 C) + float32 LE координаты в локальной системе узла.
- Текст: `textData.characters`, `fontName {family, style}`, `fontSize`, `lineHeight {value, units}`,
  `letterSpacing {value, units}`.

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
- Векторы: дети `BOOLEAN_OPERATION` — операнды, в модель не попадают (рисуется
  результат `fillGeometry`).
- Без zip-обёртки файл может быть «голым» `fig-kiwi` — `readArchive` принимает оба варианта.

Реализация — `packages/fig-import/src/fig`, `src/tree`, `src/convert` (перенесено из спайка S1).
