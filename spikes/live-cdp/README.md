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
```

Сверка экрана с эталоном по нодам: `node-tree.ts <id> [depth]` — поддерево сырых узлов (тип, имя, размер, позиция, HIDDEN, stack,
constraint, типы заливок/обводок, `sym` инстанса); `screen-html.ts <id>` — экран через `importFig` → `renderScreen` в happy-dom,
содержимое shadow root в `out/<id с «-»>.html` (картинки — `img/<hash>`), по нему видно итоговый CSS/SVG узла по `data-id`.

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
`I<инстанс>;<текст>` на второй → обводка `.node-mark` совпадает с прямоугольником элемента (< 0.5 px; `delta -2` — цепочка
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
