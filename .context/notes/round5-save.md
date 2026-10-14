# Раунд 5, срез 1 — сохранение документа (статус: ЗАКРЫТ 26-10-14, T3 пройден)

## Решения (опрос 26-10-14)

См. `decisions.md` → «Раунд 5». Коротко: sidecar `<имя>.fig.fignya` (итоговые правки + размер/SHA-256 базы), ⌘S + точка
несохранённого + вопрос при закрытии; другая база — не применять, предупредить, старый файл в `.bak` при первом ⌘S.

## Структура

```
packages/model/src/compact-edits.ts   compactEdits: одна правка на адрес, порядок первого появления
packages/model/src/restore-edits.ts   restoreEdits(nodes, edits) → { applied, skipped }
packages/model/src/edit-history.ts    seed — постоянные (не отменяемые) правки, edits() — итоговые
apps/desktop/
  shared/edit-guards.ts        переезд из main: нужен и importer (write-atomic остался в main, importer берёт оттуда)
  importer/sidecar-format.ts   формат fignya-edits v1: parse (unknown → гарды) / serialize
  importer/sidecar-store.ts    fs: read (ENOENT → undefined), write атомарно, backup — копия в .bak, предел 64 МБ на чтение
  importer/edit-session.ts     история + restored + dirty + save (очередь записей)
  importer/protocol.ts         ready.restored, edited.dirty, save → saved { dirty }
  main/document-editor.ts      dirty, save (без правок — ничего)
  main/close-guard.ts          Save / Don't Save / Cancel на close (⌘Q тоже)
  main/restore-warning.ts      текст предупреждения (stale / skipped)
  main/app-menu.ts             File → Save (⌘S)
  main/thumb-cache.ts          cacheKey + ключ правок
spikes/live-cdp/save-flow.ts + run-save.sh   ⌘S, перезапуск, правка на месте
```

## DoD

- Правка → точка в кнопке закрытия; ⌘S → `<имя>.fig.fignya` рядом с `.fig`, точка пропадает; undo до сохранённого — без точки.
- Перезапуск → правки на месте (живой экран, миниатюры, инспектор), undo пуст. Без sidecar — как раньше.
- Изменённый `.fig` или битый sidecar → правки не применены, диалог-предупреждение; ⌘S после правки → старый в `.bak`.
- Закрытие окна / ⌘Q с несохранённым → Save / Don't Save / Cancel; Cancel оставляет окно, Save пишет и закрывает.
- Ошибка записи → диалог, окно не закрывается, точка остаётся.
- Vitest на синтетике (compact, restore, history, format, store на tmp, session, guards, menu, cacheKey); `bun run types`,
  `bun run test` код 0; сборка.
- Runbook — шаг 14 в `apps/desktop/README.md` (закрытие окна — 15); CDP-прогон `run-save.sh`.

## Проверка

T1 + Vitest (TDD), T2: сборка + `run-save.sh`. T3 — пользователь по runbook шаг 14. Score ≈ 65 (данные пользователя) →
`code-reviewer` до коммита.

## Эстафета сессий

Как в `round4-selection.md`: в конце сессии — статус в заголовке, «Сделано / дальше», мини-промпт следующей сессии.

## Сделано / дальше

Сессия 26-10-14: код по DoD (TDD), Vitest 601 зелёный, `bun run types` 0, сборка, `run-save.sh save3` — 29/29 в трёх
запусках (save / reopen / stale). `save1` упал на сценарии: `getAllWindows()[0]` — offscreen-окно миниатюр, берём видимое.
Runbook — шаг 14 (`apps/desktop/README.md`), закрытие окна — 15; раздел в `spikes/live-cdp/README.md`.
`code-reviewer`: 4 medium + 6 low + 1 taste исправлены — бросающий getter `overrides` в sidecar-правке не валит открытие
(skipped); бэкап копией до атомарной записи (упала запись — старый sidecar цел; `.bak` перезаписывается — решение в
`decisions.md`); история сворачивает правки за лимитом 200 в базу (память и O(N) на шаг); `restore-report.ts` отдельно;
правка в полёте держит main `dirty`, Save её дожидается, после Save при `dirty` окно не закрывается; `pickEdit` отбрасывает
лишние поля (sidecar и IPC); sidecar > 64 МБ — stale. Коммиты: `9b21120` model, `ab32be1` desktop, `e23fdf0` spikes, docs.

Сессия 26-10-14 (2): T3 по шагу 14 пройден, дефектов нет; в вопросе при закрытии проверены и Save (сохранилось), и
Don't Save (не сохранилось). Срез закрыт.

Дальше: PR #3 открыт (`feat/document-save` → `feat/selection-inspector`); раунд 5 закрыт — дальше
`round5-swap-state.md` → «Промпт следующей сессии». Хвосты ниже — в backlog `decisions.md`.

Хвосты:
- ⌘Q с несохранённой правкой CDP не гоняет (закрывает окно `close()`); в T3 26-10-14 подтверждён вопрос при закрытии
  окна, ⌘Q отдельно не назван — проверить при случае.
- Текст предупреждения «Saving will move it to …bak» — по факту копия + замена; для пользователя то же.
- После сессии с правками кэш миниатюр пишется под ключом с `restored.key` только при следующем открытии; в текущей
  сессии правленые экраны — через ревизии, как в раунде 4.
- Importer берёт `write-atomic` из `main/` (shared без node types) — если появится второй такой модуль, `shared-node/`.
- Хвост лога после конца фазы CDP (`importer exited`, `ERR_CONNECTION_REFUSED` у `thumb.html`) — миниатюры в полёте.

Мини-промпт следующей сессии — в `round5-swap-state.md` (раунд 5 закрыт).
