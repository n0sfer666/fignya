# Формат .fig (как читаем)

- ZIP (store): `canvas.fig`, `images/<sha1-hex>` (без расширения, тип по сигнатуре), `meta.json`, thumbnail.
- `canvas.fig`: `fig-kiwi` (8 байт) + u32 версия + чанки `[u32 LE size][bytes]`.
  Чанк 0 — kiwi-схема (deflate raw), чанк 1 — данные (zstd; различать по magic `28 b5 2f fd`).
- Сообщение: `nodeChanges[]` (плоский список), `blobs[].bytes`.
- Узел: `guid {sessionID, localID}`, `parentIndex {guid, position}` — порядок детей = сортировка
  строк `position`. `transform` m00..m12 (m02/m12 — смещение от родителя), `size {x,y}`.
- Auto layout: `stackMode` HORIZONTAL/VERTICAL, `stackSpacing`, `stackHorizontalPadding`,
  `stackVerticalPadding`, `stackPaddingRight/Bottom`, `stackPrimary/CounterAlignItems`,
  `stackChildPrimaryGrow`, `stackChildAlignSelf`, `stackPositioning: ABSOLUTE`.
- Clip: `frameMaskDisabled !== true`.
- INSTANCE: детей нет, дерево — у SYMBOL из `symbolData.symbolID`; оверрайды в
  `symbolData.symbolOverrides` (по `overrideKey`), производные размеры в `derivedSymbolData`.
- Геометрия: `fillGeometry/strokeGeometry[].commandsBlob` → blob: байт-команда
  (0 Z, 1 M, 2 L, 3 Q, 4 C) + float32 LE координаты в локальной системе узла.
- Текст: `textData.characters`, `fontName {family, style}`, `fontSize`, `lineHeight {value, units}`,
  `letterSpacing {value, units}`.

- Оверрайды (замер раунда 3 на ROI Navigator): `symbolOverrides[].guidPath.guids` ссылаются на
  `overrideKey` узлов SYMBOL-дерева (254264 из 255455 совпали), а не на их `guid`. Чаще всего
  переопределяют `size`, `fillPaints`, `name`, `font*`, `textData`.
- Векторы: дети `BOOLEAN_OPERATION` — операнды, в модель не попадают (рисуется
  результат `fillGeometry`).
- Без zip-обёртки файл может быть «голым» `fig-kiwi` — `readArchive` принимает оба варианта.

Реализация — `packages/fig-import/src/fig`, `src/tree`, `src/convert` (перенесено из спайка S1).
