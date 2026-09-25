# Раунд 3 — каркас (статус: T3 каркаса и потокового импорта пройден; оверрайды — T3 провален, идёт сверка с Figma)

## Структура

```
packages/model/       плоская Map<id, Node>; style — типизированное подмножество CSS;
                      components + instance {componentId, overrides}
packages/fig-import/  .fig → model: fig/ + tree/ + convert/ из spikes/s1-dom-perf/src,
                      convert отдаёт style-записи вместо css-строк
packages/render-dom/  model → DOM одного экрана (Shadow DOM на фрейм), чистая функция
apps/desktop/
  main/      окно, протокол fignya:// (картинки .fig), IPC «открыть FIG_FILE → model»,
             миниатюры: offscreen BrowserWindow + render-dom + capturePage → PNG-кэш в userData
  preload/   типизированный мост IPC
  renderer/  canvas (vanilla): world-слой will-change: transform, обзор = <img> по x/y,
             клик → живой DOM экрана; панели (Solid): страницы/экраны
```

## DoD

- `FIG_FILE=… bun run dev` открывает окно: список страниц (без `Internal Only Canvas`) и экранов.
- Обзор страницы миниатюрами, pan/zoom; кэш миниатюр вне репо.
- Клик по экрану — живой DOM: frame, auto layout→flex, text, rect/ellipse, image fill,
  vector→SVG, instance→дерево SYMBOL.
- Vitest: import→model, model→style, render-dom на синтетических фикстурах; `tsc` чисто.
- Runbook в README приложения с ожидаемым видом; живое окно проверяет пользователь (T3).

## Проверка

T2 агентом (типы, Vitest, сборка, запуск), T3 — пользователь по runbook. Score ≥ 60 → `code-reviewer` до коммита.

## Эстафета сессий

В конце каждой сессии: обновить статус в заголовке и раздел «Сделано / дальше» этого файла,
затем выдать в чат мини-промпт для следующей сессии в том же формате, что и стартовый
(проект, ветка, что прочитать, что сделано, следующий шаг, ограничения, требование написать такой же промпт).

## Сделано / дальше

Сделано (сессия 26-09-24):
- bun workspaces + Vitest projects (model, fig-import, render-dom на happy-dom, desktop); тесты
  только из корня: `bun run test`.
- `packages/model`, `packages/fig-import` (перенос из спайка, TDD), `packages/render-dom`;
  инстанс без своих детей раскрывается в дерево SYMBOL (`expandedComponentId`), циклы отсечены.
- `apps/desktop`: electron-vite + Solid; main держит документ (IPC `document:state`/`document:screen`,
  проверка отправителя), протокол `fignya://image|thumb`, миниатюры offscreen + `capturePage`,
  кэш `userData/thumbs/<key>`, ключ включает `RENDER_HASH`; canvas pan/zoom, клик → живой DOM.
- Три захода `code-reviewer`, находки ≥ low исправлены. T2: типы, 87 тестов, сборка, smoke на
  синтетическом `.fig`; реальный файл — импорт ~6.5 с, 406 экранов.

Сделано позже: потоковый импорт в `utilityProcess` (`notes/round3-streaming-import.md`, T3 пройден),
оверрайды инстансов 26-09-25 (`notes/round3-overrides.md`, T2 и два захода ревью пройдены,
145 тестов).

Сессия 26-09-25 (вторая): T3 оверрайдов провален («нет подписей, почти всё не совпадает») →
исправлены fill-потомки (`flex: 1 1 0`), перенос/обрезка текста, props из `varValue`, обводка по
сторонам (детали — `notes/round3-overrides.md`, формат — `fig-format.md`); 156 тестов.

Дальше:
- Сверка нода за нодой: пользователь кладёт PNG 1x эталона в `~/_dev/fignya-ref/<id>.png`
  (вне репо), агент сравнивает со своим рендером и на каждое расхождение пишет синтетический тест.
  Первый экран — `15633:62993`; открытые вопросы: пустой квадрат у кнопки справа вверху, переносы
  коротких подписей в фиксированных ячейках, подпись карточки в две строки, подписи оси Y. Для честной сверки нужны Manrope/Inter.
- Загрузка шрифтов документа (Google Fonts по согласию, `decisions.md`) — backlog.
- Ленивый резолв оверрайдов по экрану (стратегия: держать только инстансы и поддеревья компонентов,
  замер: весь индекс 1127 МБ кучи → 605 МБ; DoD согласован: bench + retained heap + p50/max резолва
  экрана, ленивая ScreenModel = eager на всех 406 экранах).
- Попутный баг: первый запуск — `capturePage` падает `UnknownVizError` на ~10 миниатюрах и одна
  «timed out after 15000 ms» (+ `sandbox_extension_issue_file`); второй запуск без ошибок. Нужен ретрай.
