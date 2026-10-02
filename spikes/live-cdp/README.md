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
