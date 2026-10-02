# live-cdp — живые замеры `apps/desktop` через CDP

Скрипты для T3 без участия пользователя: dev-экземпляр Electron с `--remoteDebuggingPort`, bun-скрипт
по WebSocket CDP (`cdp.ts`: подключение к главному окну, `Runtime.evaluate`, скрыть/показать окно через
`NSRunningApplication` по pid процесса с `--remote-debugging-port=$PORT`). Артефакты — в `out/` (в git не попадает):
лог приложения, копия `.fig`, каталог миниатюр прогона.

Запуск/остановка экземпляра и перенос каталога миниатюр прогона — общие функции `app.sh` (`app_start`, `app_finish`).

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
15.6s hidden, opened page with 201 screens
40.6s still hidden after 25000 ms: {"loaded":201,"total":201,"eager":201}
41.0s revealed (visible): {"loaded":201,"total":201,"eager":201}
41.0s all loaded: {"loaded":201,"total":201,"eager":201}
```

До 26-10-02 (`loading="lazy"` всегда) — `loaded: 0` и в скрытом окне, и при возврате, затем ~15 с догрузки.
Коды выхода: 0 — в скрытом окне загружены все; 5 — в скрытом окне загружены не все (поведение до фикса), после показа
догрузились; 2 — импорт не закончился за 120 с; 3 — окно не скрылось; 4 — не догрузилось за 120 с после показа; 6 — страница
не открылась (0 экранов или число `<img>` не равно счётчику страницы).

## Замеры по сырому `.fig` (без Electron)

```nu
$env.FIG_FILE = ("~/Downloads/ROI Navigator.fig" | path expand)
bun spikes/live-cdp/turned-grow.ts
bun spikes/live-cdp/node-path.ts 12645:43534 14999:110842
```

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
