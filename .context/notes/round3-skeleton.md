# Раунд 3 — каркас (статус: план согласован, кода нет)

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
