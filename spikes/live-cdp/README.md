# live-cdp — живые замеры `apps/desktop` через CDP

Скрипты для T3 без участия пользователя: dev-экземпляр Electron с `--remoteDebuggingPort`, bun-скрипт
по WebSocket CDP (`cdp.ts`: подключение к главному окну, `Runtime.evaluate`, скрыть/показать окно через
System Events). Артефакты — в `out/` (в git не попадает): лог приложения, копия `.fig`, каталог миниатюр прогона.

## Миниатюры страницы, открытой в скрытом окне

```nu
$env.FIG_FILE = ("~/Downloads/ROI Navigator.fig" | path expand)
bash spikes/live-cdp/run-hidden.sh <tag>
```

Нужны `bun`, `osascript` и право Automation/Accessibility для System Events у терминала. Холодный кэш на
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
