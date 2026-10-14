# live-cdp — живые замеры `apps/desktop` через CDP

Скрипты для T3 без участия пользователя: dev-экземпляр Electron с `--remoteDebuggingPort`, bun-скрипт
по WebSocket CDP (`cdp.ts`: подключение к главному окну, `Runtime.evaluate`, скрыть/показать окно через
`NSRunningApplication` по pid процесса с `--remote-debugging-port=$PORT`). Артефакты — в `out/` (в git не попадает):
лог приложения, копия `.fig`, каталог миниатюр прогона.

Запуск/остановка экземпляра и перенос каталога миниатюр прогона — общие функции `app.sh` (`app_start`, `app_finish`;
`app_run <tag> <script.ts> [args…]` — старт, скрипт под `caffeinate -d -i bun`, финиш, код выхода скрипта). Открытие самой большой страницы
и счёт `<img>` — `page-thumbs.ts` (если она уже активна, сначала клик по другой).

## Миниатюры страницы, открытой в скрытом окне

```nu
$env.FIG_FILE = ("~/Downloads/ROI Navigator.fig" | path expand)
bash spikes/live-cdp/run-hidden.sh <tag>
```

Нужны `bun` и `osascript` (JXA). System Events не годится: ссылка на процесс разрешается по имени, и при втором
запущенном «Electron» скрывается чужое окно — код 3. Холодный кэш на
каждый прогон: свежая копия `FIG_FILE` (`cp -c`, клон APFS) в `out/copy.fig`, `touch` меняет mtime → новый ключ кэша;
каталоги миниатюр, созданные прогоном (разница со списком до запуска), переносятся в `out/thumbs-<tag>`, чужие не трогаются;
тег должен быть новым. Под `caffeinate -d -i`, порт `PORT`
(по умолчанию 9445), длительность скрытия `HIDDEN_MS` (25000).

Сценарий: дождаться импорта → скрыть Electron (`visibilityState === "hidden"`, иначе код 3) → клик по
странице с наибольшим числом экранов → `HIDDEN_MS` → показать окно → счёт загруженных `<img>`.
Ожидаемый вывод (ROI Navigator, страница Work на 201 экран, Low Power Mode):

```
15.4s imported
15.9s hidden, opened page with 201 screens
40.9s still hidden after 25000 ms: {"loaded":201,"total":201,"eager":201,"lazy":0}
41.0s revealed (visible): {"loaded":201,"total":201,"eager":201,"lazy":0}
41.0s all loaded: {"loaded":201,"total":201,"eager":201,"lazy":0}
```

До 26-10-02 (`loading="lazy"` всегда) — `loaded: 0` и в скрытом окне, и при возврате, затем ~15 с догрузки.
Коды выхода: 0 — в скрытом окне загружены все; 1 — ошибка CDP/скрипта; 5 — в скрытом окне загружены не все (поведение до фикса), после показа
догрузились; 2 — импорт не закончился за 120 с; 3 — окно не скрылось; 4 — не догрузилось за 120 с после показа; 6 — страница
не открылась (0 экранов или число `<img>` не равно счётчику страницы).

## Миниатюры lazy в видимом окне при fitView

```nu
$env.FIG_FILE = ("~/Downloads/ROI Navigator.fig" | path expand)
bash spikes/live-cdp/run-fit.sh <tag>
```

Окно видимо, клик по самой большой странице, без жестов. Вопрос: ставит ли eager (скрытое окно) в очередь миниатюр
больше, чем lazy. `show()` ставит `fitView`, но zoom не ниже `MIN_ZOOM` 0.02: страница больше холста × 50 в вьюпорт не влезает,
и lazy запрашивает только кадры в вьюпорте + отступ ленивой загрузки Chromium. Пока страница в него помещается — lazy
запрашивает те же N, eager лишь начинает раньше. `currentSrc` отложенный lazy не отличает: он заполнен и у `<img>` за 100000px.
Ожидаемый вывод (ROI Navigator, Work на 201 экран — 89050×84483 px, при 0.02 это 1782×1690 при холсте 1200×868; 26-10-03):

```
16.1s opened page with 201 screens, zoom 0.02 in 1200×868
17.1s after 1 s: {"loaded":6,"total":201,"eager":0,"lazy":201}
22.2s loaded 70/201
33.4s all loaded: {"loaded":201,"total":201,"eager":0,"lazy":201}, 11.6 thumbs/s
```

Коды: 0 — все lazy догрузились, окно всё время видимо; 1 — ошибка CDP/скрипта; 2 — импорт не закончился; 3 — окно не стало
видимым; 4 — не догрузилось за 180 с; 5 — не все `<img>` lazy или окно хоть раз было невидимым; 6 — страница не открылась.

## Приоритет миниатюр экранов в окне

```nu
$env.FIG_FILE = ("~/Downloads/ROI Navigator.fig" | path expand)
bash spikes/live-cdp/run-zoom.sh <tag>
```

Окно видимо, самая большая страница, через 1 с после открытия — ctrl+колесо на последнем кадре DOM до половины ширины
холста. Мерится время от зума до базовой и резкой миниатюры всех кадров в окне. Renderer шлёт `thumb:focus` (id кадров в
окне, после `SETTLE_MS`), очередь main берёт их задания раньше остальных. Ожидаемый вывод (Work, 201 экран; 26-10-03):

```
12.0s zoomed to 16166:65133, zoom 0.416667 in 1200×868
12.5s visible base after 0.5–0.8 s: {"n":2,"base":2,"sharp":0,"loaded":11,"total":201}
12.7s visible sharp after 0.8 s: {"n":2,"base":2,"sharp":2,"loaded":12,"total":201}
```

До фокуса — 12.9 / 13.4 с при `loaded` 201: кадры в окне ждали всю очередь. Дефект — `loaded` около `total` в строке
`visible base` (фокус не дошёл или пришёл поздно; `load` миниатюр не должен откладывать `sharpen`). Скрипт выходит при
непустой очереди, поэтому в `out/app-<tag>.log` ~190 строк `retrying` (`renderer is gone`, `ERR_CONNECTION_REFUSED`) —
`app_stop` гасит dev-сервер раньше Electron, это не дефект. Коды: 0 — резкие
в окне; 1 — ошибка CDP/скрипта; 2 — импорт не закончился; 3 — окно не стало видимым; 4 — не стали резкими за 60 с;
6 — нет кадров на странице.

Размер страниц при `MIN_ZOOM` без Electron:

```nu
$env.FIG_FILE = ("~/Downloads/ROI Navigator.fig" | path expand)
bun spikes/live-cdp/page-fit.ts
```

Страницы по убыванию большей стороны: экраны, границы, размер при zoom 0.02. На ROI Navigator: For dev 712×1948, Work 1782×1690,
остальные ≤ 410×251. Сторона заметно больше холста + отступа lazy (Work при 1200×868 ещё грузится вся) → eager ставит в очередь
больше, чем lazy: перепроверить `run-fit.sh` (`loaded` < `total` без жестов).

## Замеры по сырому `.fig` (без Electron)

```nu
$env.FIG_FILE = ("~/Downloads/ROI Navigator.fig" | path expand)
bun spikes/live-cdp/turned-grow.ts
bun spikes/live-cdp/node-path.ts 12645:43534 14999:110842
bun spikes/live-cdp/node-tree.ts 2479:25954 4
bun spikes/live-cdp/screen-html.ts 2479:25954
bun spikes/live-cdp/find-text.ts "Сыробогатов" "Мужская фертильность"
bun spikes/live-cdp/raw-node.ts 12645:43587 symbolData
```

Сверка экрана с эталоном по нодам: `node-tree.ts <id> [depth]` — поддерево сырых узлов (тип, имя, размер, позиция, HIDDEN, stack,
constraint, типы заливок/обводок, `sym` инстанса); `screen-html.ts <id>` — экран через `importFig` → `renderScreen` в happy-dom,
содержимое shadow root в `out/<id с «-»>.html` (картинки — `img/<hash>`), по нему видно итоговый CSS/SVG узла по `data-id`.
Откуда взялся текст или значение: `find-text.ts <строка>…` — узлы, в сырье которых встречается строка (так нашлись режимы
STRING-переменной `content/categoryName`); `raw-node.ts <id> [ключ…]` — JSON сырого узла целиком или выбранных полей.

Миниатюры (без `.fig`): `bun spikes/live-cdp/tier-scan.ts <каталог кэша экземпляра>` — `@2x`, ужатый до `@1x`, против `@1x` (и `@1x`
против base), среднее расхождение канала; растянутые/обрезанные уровни дают ~12 против ~1. `osr-size.cjs` и `osr-zoom.cjs` —
голый Electron (`apps/desktop/node_modules/.bin/electron spikes/live-cdp/osr-zoom.cjs` из корня): offscreen-снимок большого размера не
обрезается; зум страницы главного окна на общем http-origin меняет и offscreen-окно (26-10-03: inner 2629×1753 вместо 2880×1920).

`turned-grow.ts` — повёрнутые (не отражение) flow-дети auto layout, критерий — `rotation`/`isFlip`/`isFlex` из
`fig-import/src/convert/layout.ts`: с grow векторы получают долю слота, не-векторы — фиксированный бокс. Два прохода: сырые
узлы и цели оверрайдов инстансов тем же путём, что `instance-overrides.ts` (`instanceResolver` по `symbolNodes`, слои
override/prop/derived через `mergedFields`, вложенные инстансы, `settledRaw`). `noise*` — матрица отличается от единичной
меньше чем на 1e-6 (шум float), `rotation()` всё равно считает её поворотом. Ожидание на ROI Navigator (mtime 26-10-02 15:16):
сырые `turnedFlow` 1352 / `noiseFlow` 140 / `noiseStretch` 81 / `growVector` 704 / `growOther` 0; целей 667829, `unresolved` 1304;
через оверрайды 1586 / 94 / 92 / 3 / `growOther` 1 — он же `growOtherNoise` (`6869:86774 → 456:32646` «Left side»).
`growOther − growOtherNoise` > 0 → нужна обёртка-слот. `node-path.ts <id>…` печатает «страница / … / фрейм»
(неизвестный id — `not found`, код 1).
`section-screens.ts <id>…` — экраны секции, как в Screens (вложенные секции раскрываются, скрытые — `visible: false` — пропускаются,
как `pages.ts`): `секция  экран  число INSTANCE  имя`; в Screens секций нет, run-shots по id секции даёт `no page`. Обход —
`screen-frames.ts` (общий с `overflow-scan.ts`, тот фильтрует ещё и opacity 0). Ожидание 26-10-13: `2479:26710` — 16 экранов,
`9402:158329` — 20, `5873:93717` — 2.

## Шум float в матрице поворота: видимость

```nu
$env.FIG_FILE = ("~/Downloads/ROI Navigator.fig" | path expand)
bun spikes/live-cdp/noise-screens.ts | save -f spikes/live-cdp/out/noise-screens.txt
open spikes/live-cdp/out/noise-screens.txt | lines | where $it =~ '^\d+:\d+ ' | each { split row ' ' | first } | save -f spikes/live-cdp/out/noise-ids.txt
bash spikes/live-cdp/run-shots.sh <tag> ...(open spikes/live-cdp/out/noise-ids.txt | lines)
bun spikes/live-cdp/shots-diff.ts <tag a> <tag b>
```

`noise-screens.ts` — экраны (`pagesOf` из `tree/pages.ts`: видимые FRAME, секции разворачиваются), где flow-ребёнок с матрицей
«единичная ±1e-6» (`turn-kind.ts`) имеет STRETCH или grow; сырые узлы и цели инстансов — общий обход `fig-walk.ts` (его же
использует `turned-grow.ts`). Ожидание на ROI Navigator (mtime 26-10-02 15:16): `screens with noise: 48, with noise stretch/grow: 25,
hits 69`; grow — один, `6860:85389` «Work / Проекты / анализ» (`6869:86774 → 456:32646` «Left side»).

`run-shots.sh <tag> <id>…` — живой экземпляр (холодный кэш, как выше; тег должен быть новым и для `shots-`, и для `app-`/`thumbs-`),
каждый экран открывается кликом в списке Screens, после `document.fonts.ready` и `decode` картинок (каждое не дольше 5 с) и двух rAF:
`Page.captureScreenshot` по рамке живого экрана и прямоугольники всех `[data-id]` в его shadow root → `out/shots-<tag>/<id>.png|json`.
Коды: 0 — все экраны сняты; 7 — часть не снялась (строка экрана с причиной: `no page`, `no list item`, `not settled` за 30 с,
`error …`), остальные сняты; 2 — импорт не закончился за 120 с; 1 — сбой до цикла по экранам (нет CDP, занят тег).
`shots-diff.ts a b` — по экрану: сдвинутые прямоугольники (до 0.01 px), отличающиеся пиксели, max Δ канала, рамка отличий
(PNG → BMP через `sips`, `bitmap.ts`: 24/32 bpp, выравнивание строк, знак высоты), экраны только в одном прогоне — `missing in`.
`SPILL=1 bash spikes/live-cdp/run-shots.sh <tag> <id>…` — вылет за рамку: viewport 3200 в высоту, в `<id>.json` ещё `extent`
(объединение прямоугольников узлов, без учёта clip), снимки по нему: `<id>-spill.png` — живой DOM, `<id>-thumb.png` — миниатюра
после Esc; миниатюры с альфой — в `out/thumbs-<tag>/`. Ожидание 26-10-13: `14999-110842.png` 720×512 и `@2x` 2880×2048 (как
эталон), `15633-62993.png` 720×1409, `13554-104566.png` 720×480 без альфы; на снимках подписи «Цена» ниже рамки, у 13554 вылета нет. `shots-diff.ts` сравнивает `-spill`/`-thumb` только по
пикселям (json у них нет); у `-spill` соседние экраны в кадре дают шум, пока не дорисован резкий уровень.
Сколько экранов файла вылетают: `bun spikes/live-cdp/overflow-scan.ts` (бокс — `contentBounds` импортера, инстансы — своим боксом, слои дальше 6000 px отброшены): 694 экрана, без clip с вылетом или инстансом без clip — 190,
с вылетом 113 (почти все вниз, на 42…4755 px).

Замер 26-10-02: три прогона без изменений — прямоугольники 0 сдвигов на всех 25 экранах, пиксели расходятся на 7–9 экранах
(до 156k px, Δ ≤ 113) — пиксели не сигнал, сигнал — прямоугольники. С временным эпсилоном 1e-6 в `rotation()` — те же 0 сдвигов;
пиксели в пределах межпрогонного шума (`15146:136825`: 1807 px, Δ ≤ 4, рамка `31,62,2230,1484` — та же, что у шума `15018:116856`
между прогонами без правки). Вывод: на этом файле шум float невидим (Figma хранит размер уже растянутым, ресайза родителя в приложении нет).

## Поиск ноды (⌘F)

```nu
$env.FIG_FILE = ("~/Downloads/ROI Navigator.fig" | path expand)
bash spikes/live-cdp/run-search.sh <tag>
```

`search-jump.ts`: ⌘F через `Input.dispatchKeyEvent`, ввод `Input.insertText`, Enter. Сценарий: `2479-25954` → живой экран;
из его shadow root — текст вне инстансов и текст внутри инстанса; переход на другую страницу; ссылка Figma на первый текст и
`I<инстанс>;<текст>` на второй → обводка `.node-selection` совпадает с прямоугольником элемента (< 0.5 px; `delta -2` — цепочка
`[data-id]` в DOM не найдена целиком) и в окне холста; `padding` первому тексту → обводка следует за relayout; `13160:88951` → живой экран; `9:99999999` → «Nothing found»; Esc закрывает поле, живой экран остаётся; поле открыто, приложение
скрыто и показано снова (`setElectronVisible`) → поле не закрылось, ввод на месте. Скриншоты —
`out/search-<tag>/`. Ожидаемый вывод (ROI Navigator, mtime 26-10-02 15:16; 26-10-06):

```
12.8s picked {"own":"2479:25960","outer":"2479:25967","inner":"1320:33495"}
13.3s switched to page 01 blocks
14.3s ok   link to 2479:25960 from another page → {"page":"Work","live":"2479:25954","zoom":"0.858007",…}, delta 0.0068359375
14.7s ok   mark follows relayout of 2479:25960 → delta 0.005859375
16.7s ok   I2479:25967;1320:33495 → {"page":"Work","live":"2479:25954","zoom":"1","mark":[812,422,57,24],"inView":true}, delta 0.0078125
20.2s ok   window blur keeps search open → away {"open":true,"hasFocus":false}, back {"open":true,"value":"2479-25954","focus":"INPUT"}
20.2s all checks passed
```

Ответ поиска — `answered in <ms>` (26-10-06: 0.5–1 с, шаг опроса 500 мс), нет строк за 5 с — `no results for <query>: {open, value,
focus, hasFocus}`. 26-10-06 флак s3/s7: окно без фокуса ОС (`hasFocus:false`) → `blur` закрывал поле; теперь blur закрывает поле,
только если документ в фокусе.

Коды: 0 — все проверки; 7 — часть `FAIL`; 2 — импорт не закончился; 1 — сбой CDP/скрипта. Буфер обмена перед прогоном лучше
очистить от id ноды: поле подставит его при ⌘F (скрипт выделяет и перезаписывает ввод через 400 мс).

## Выделение и инспектор

```nu
$env.FIG_FILE = ("~/Downloads/ROI Navigator.fig" | path expand)
bash spikes/live-cdp/run-select.sh <tag> [screen-id]
```

`select-pick.ts`: ⌘F `<screen-id>` (по умолчанию `2479:25954`) → выделен корень экрана; Esc снимает выделение, экран живой.
Цель — видимый текст глубже 3 уровней, по возможности внутри инстанса (`elementFromPoint` в shadow root попадает в него же).
Мышь через `Input.dispatchMouseEvent`: наведение → `.node-hover` на верхнем уровне; клик → верхний уровень; повторный клик
через 600 мс — тот же; двойной (`clickCount` 2 в пределах 500 мс) → шаг вглубь, текст при этом не выделен (без `user-select: none` на
`.workspace` падает); ⌘+клик → сам текст и секция Typography;
двойными кликами до инстанса → строка `component`; ctrl+колесо → рамка на элементе; Esc снимает выделение, второй Esc
закрывает экран. Каждое выделение: одна `.node-selection` совпадает с прямоугольником элемента (< 0.5 px), `id` инспектора —
тот элемент, `width` инспектора = inline `width` элемента. Код 3 — на экране нет подходящего текста, 7 — проверки упали.
Скриншоты — `out/select-<tag>/`. Ожидаемый вывод (ROI Navigator, mtime 26-10-02 15:16; 26-10-14):

```
16.2s target {…"kinds":["frame","frame","frame","frame","frame","frame","instance","frame","frame","text"]}
16.4s ok   hover outlines the top level {"count":1,"delta":0,"width":"1440px"}
16.6s ok   click → 2479:25978 (depth 1): …, inspector id 2479:25978 width 1440px
18.5s ok   double click → 2479:25979 (depth 2): …, inspector id 2479:25979 width 900px
18.5s ok   double click does not select text
19.3s ok   ⌘+click → 456:32603 (depth 9): …, inspector id 456:32603 width 131px
23.3s ok   inspector names the instance component
23.6s ok   selection follows zoom {"count":1,"delta":0.0087890625,"width":""}
24.1s ok   second Esc closes the live screen
24.1s all checks passed
```

## Правка из инспектора

```nu
$env.FIG_FILE = ("~/Downloads/ROI Navigator.fig" | path expand)
bash spikes/live-cdp/run-edit.sh <tag> [screen-id]
```

`edit-flow.ts` (помощники — `ui.ts`): ⌘F `<screen-id>` → Esc → ⌘+клик по видимому тексту внутри инстанса. Поле `font-size`
(фокус и выделение через JS, ввод `Input.insertText`, Enter) +10 px → computed `font-size` элемента под рамкой, инспектор держит
тот же `id`; тот же слой в других инстансах компонента не меняется; `text` → новый `textContent`; `abc` в `font-size` →
`.field.invalid`, холст прежний; Esc — поле откатилось, выделение есть. ⌘Z ×2 (`rawKeyDown` с `code: KeyZ` — ловит renderer,
пункт меню без регистрации хоткея) → исходные текст и размер, ⇧⌘Z → снова +10. Esc, Esc → `img` экрана с `r=` в `src` загружена;
повторное открытие → правка на месте; `width` +20 → левый верхний угол рамки на месте, ширина больше, фокус остался в поле
`width`; ⌘Z в том же поле без blur → `width` прежняя, ⇧⌘Z → снова +20 и поле показывает его. `height`: `999` и ⌘Z → в поле снова прежнее значение, документ не тронут; `height` +10 без Enter и клик по пустому холсту
→ через 1.5 с выделения нет (перерисовка его не вернула), ⌘+клик по тому же тексту → `height` новый. Код 3 — нет видимого текста в
инстансе, 7 — проверки упали. Скриншоты — `out/edit-<tag>/`. Ожидаемый вывод (ROI Navigator, mtime 26-10-02 15:16; 26-10-14):

```
16.5s selected 456:32603 font-size 13px text "Название сценария:"
16.7s ok   font-size 23px shows in the live screen 23px
16.7s same layer in all instances: ["23px","13px"]
17.4s ok   broken input is flagged and not applied
17.9s ok   ⌘Z restores the text Название сценария:
18.1s ok   ⌘Z restores font-size 13px
18.4s ok   ⌘⇧Z redoes font-size
18.5s ok   closed screen shows a thumbnail of the edited revision
19.4s ok   reopened screen keeps the edit
19.7s box before [638.2,348.2,79.7] after [638.2,348.2,91.9]
19.7s ok   width inside an instance grows the box in place
19.7s ok   the field keeps focus after the live screen redraws (width)
19.9s ok   ⌘Z right after Enter, still in the field, undoes the edit
20.2s ok   ⌘⇧Z in the same field redoes it
20.2s ok   the field shows the redone value
20.7s ok   ⌘Z in a field undoes the typing, not the document (18px)
22.2s ok   a click away commits the field and the redraw keeps the new (empty) selection
22.5s ok   the edit from blur landed on the old layer
22.6s all checks passed
```

## Экспорт экрана (File → Export Screen…)

```nu
$env.FIG_FILE = ("~/Downloads/ROI Navigator.fig" | path expand)
bash spikes/live-cdp/run-export.sh <tag> [screen-id]
```

`export-flow.ts`: кроме renderer-CDP (`PORT`), main-процесс под Node-инспектором (`INSPECT`, по умолчанию 9446; `app.sh`
передаёт `--inspect`, подключение — `main-cdp.ts`). Пункт меню `export-screen` неактивен без живого экрана → ⌘F `<screen-id>`
→ пункт активен → `window.fignya.edit` opacity 0.5 у корня экрана → в main подменяются `dialog.showSaveDialog` (папка
`out/export-<tag>/site`) и `shell.showItemInFolder`, клик по пункту меню. Проверки папки: `index.html` и `styles.css` есть, в HTML
нет `style="`, нигде нет `fignya://`, все `images/…` и `fonts/…` из HTML/CSS существуют, и других файлов там нет (картинки —
только отрисованные: `screenImages`, а не все хэши модели). Затем `index.html` открывается в новом
`BrowserWindow` с file:// (снимок `export.png`), у начертаний `document.fonts` нет статуса `error` (а при непустом `fonts/` хотя
бы одно `loaded`), у каждого `[data-id]` бокс
(±1 px, в координатах экрана) и computed-стиль совпадают с живым экраном (`live.png`); наследуемые свойства текста (`color`,
`font-*`, `line-height`) сравниваются только у `text`: у прочих узлов живой экран наследует их от UI приложения, а экспорт — от
дефолтов браузера, и на отрисовку это не влияет. Затем `showSaveDialog` подменяется медленным (1 с) с путём на существующий
файл `as-file`, `showErrorBox` — счётчиком, пункт меню кликается дважды подряд: диалог один, ошибка одна (`EEXIST`), файл цел. Код 2 — импорт не закончился, 1 — проверки упали. Ожидаемый вывод (26-10-14):

```
15.3s ok   export menu item disabled without a live screen
16.2s ok   search 2479:25954 opens the screen
16.2s ok   export menu item enabled with a live screen
16.5s ok   edit redraws the live screen
18.0s live nodes: 247
18.3s ok   File → Export Screen writes the folder
18.3s html 30325 B, css 30205 B, 1 images, 0 fonts
18.3s ok   index.html and styles.css written
18.3s ok   no inline styles in index.html
18.3s ok   no fignya:// urls
18.3s ok   all 1 referenced files exist
18.3s ok   every written file is referenced
19.0s export fonts: []
19.0s ok   exported faces load from file://
19.0s ok   exported page matches the live screen (247 nodes, 0 diffs)
19.0s ok   export carries the edit
20.5s ok   export onto a file shows an error
22.0s errors: ["Export failed: EEXIST: file already exists, mkdir '…/out/export-<tag>/as-file'"]
22.0s ok   a second ⌘E during an export opens no second dialog
22.0s ok   the file in the way is left as is
22.0s all checks passed
```

С `89:2590` (Roboto из кэша Google Fonts): `0 images, 27 fonts`, `all 27 referenced files exist`, в `export fonts` у используемого
начертания `Roboto 400 loaded`, у прочих `unloaded`, `55 nodes, 0 diffs`.

## Play (View → Play, ⌥⌘↩)

```nu
$env.FIG_FILE = ("~/Downloads/ROI Navigator.fig" | path expand)
bash spikes/live-cdp/run-play.sh <tag> [screen-id]
```

`play-flow.ts` (renderer-CDP + main под `INSPECT`, как экспорт): пункт `play-screen` неактивен и ⌥⌘↩ (`Input.dispatchKeyEvent`
с Alt+Meta — клавишу ловит renderer) ничего не открывает без живого экрана → ⌘F `<screen-id>` (по умолчанию `9402:158357`,
«Загрузка файла») → пункт активен → opacity 0.5 у корня → снимок холста (живой экран, рамка выделения, текст инспектора) →
⌥⌘↩: оверлей `.play` с этим экраном, имя в шапке, правка видна, ширина сцены ≤ окна, хотспоты `[data-hotspot]` есть, `export-screen` серый, окно под оверлеем `inert` (`start.png`)
→ клик по пункту меню при открытом Play второго оверлея не даёт → клик по шапке ставит `flash` на хост и через 0,5 с снимает
(`flash.png`) → клик в центр первого хотспота, который сверху в своей точке → другой экран (`target.png`) → Backspace — назад, ←
на первом экране — на месте → Esc: оверлей снят, снимок холста тот же (`after.png`), Play и экспорт активны, `inert` снят. Снимки — `out/play-<tag>/`.
Код 2 — импорт не закончился, 1 — проверки упали. Ожидаемый вывод (26-10-14):

```
15.3s ok   Play menu item disabled without a live screen
15.8s ok   ⌥⌘↩ without a live screen does nothing
16.7s ok   search 9402:158357 opens the screen
16.7s ok   Play menu item enabled with a live screen
17.0s ok   edit redraws the live screen
17.0s ok   a layer is selected before Play
17.0s ok   ⌥⌘↩ plays the live screen
17.0s playing "Загрузка файла"
17.0s ok   header names the screen
17.0s ok   Play shows the edit
17.0s fit {"stage":1440,"window":1440,"transform":"scale(1)"}
17.0s ok   screen fits the window width
17.0s hotspots: 2
17.0s ok   screen has hotspots
17.0s ok   Export is disabled while playing
17.0s ok   the window under Play is inert
17.6s ok   View → Play while playing opens no second Play
17.6s ok   a click past the links flashes the hotspots
18.2s ok   the flash fades
18.2s ok   a hotspot is clickable
18.5s ok   a click on a hotspot opens its target
18.5s navigated to 9402:158442 "Загрузил файл"
18.8s ok   Backspace goes back
19.3s ok   ← on the first screen stays
19.3s ok   Escape leaves Play
19.3s ok   canvas keeps the live screen, selection and inspector
19.3s ok   Play stays available after leaving
19.3s ok   Export is back after leaving
19.3s ok   the window is live again
19.4s all checks passed
```

## Зум холста с клавиатуры

```nu
$env.FIG_FILE = ("~/Downloads/ROI Navigator.fig" | path expand)
bash spikes/live-cdp/run-key-zoom.sh <tag> "03 screens" 600
```

`key-zoom.ts [страница] [пауза мс]`: настоящие нажатия ⌘= ⌘= ⌘= ⌘− ⌘− ⌘− ⌘0 ⌘⇧= ⌘⇧= ⌘− ⌘0 через System Events (`key code`,
не зависит от раскладки), перед каждым окно выводится вперёд. На каждое нажатие строка: `front` — приложение на переднем плане,
`keydown` в рендерере, `ipc` — пришёл ли `canvas:zoom`, `moved` — сменился ли `transform` у `.world`, `lag` от keydown до IPC,
`longtask`. Окно должно быть на переднем плане: работа за машиной во время прогона уводит фокус (`front=Arc…`, `ipc=0`).
Ожидание (26-10-13, «03 screens» и Work): `ipc missing: 0/11`, lag 1–47 мс, longtask 0; на Work/For dev ⌘− после fit не
двигает холст — fit уже на `MIN_ZOOM` 0.02. Коды: 0 — все нажатия дошли; 5 — часть без IPC; 2 — импорт не закончился; 3 — окно не стало видимым.
