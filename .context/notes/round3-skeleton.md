# Раунд 3 — каркас (статус: код готов, T2 пройден, ждёт T3 пользователя)

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

Дальше:
- T3 пользователем по runbook `apps/desktop/README.md`.
- Оверрайды инстансов через `overrideKey` (сейчас инстанс рисуется как компонент без правок).
- Импорт блокирует main ~6 с → вынести в `utilityProcess`.
