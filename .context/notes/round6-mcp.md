# Раунд 6, срез 1 — MCP-сервер для внешнего агента (статус: РЕАЛИЗОВАН 26-10-14, ждёт T3 пользователя)

## Решения (опрос 26-10-14)

Спека — `specs/2026-10-14-round6-mcp.md` (6.1), `decisions.md` → «Раунд 6». Сессия 1 (26-10-14): PR стеком в `feat/swap-state`;
`search` агента — id/ссылка + подстрока имени (только MCP, ⌘F без изменений); `screenshot` узла — область экрана по боксу узла.
SDK `@modelcontextprotocol/sdk` 1.31.0 (последняя старше двух недель), порт по умолчанию 7341 (`FIGNYA_MCP_PORT`).

## Структура

```
packages/model/src/override-scope.ts    nestedScope (переехал из render-dom: адрес разрешает и importer)
packages/model/src/resolve-chain.ts     адрес → узел с оверрайдами + проверка, что звено внутри компонента
packages/model/src/edit-history.ts      шаг = пачка { origin, entries }, лимит 200 шагов, top()
packages/model/src/style-input.ts       CSS-строка → StylePatch по EditKey (Record<EditKey>: ключ 6.2 не соберётся без парсера)
packages/model/src/edit-box.ts          достройка бокса для узла внутри инстанса (инспектор и агент)
packages/model/src/outline*.ts          конспект: строки узлов, свёрнутые инстансы, лимит + «… ещё N»
apps/desktop/importer/                  запросы outline, inspect, batch (+ проверка пачки), undo origin agent
apps/desktop/main/mcp/                  http (auth, сессии), сервер SDK, инструменты по файлу, конфиг, лог, меню
apps/desktop/renderer/src/              вид для агента (экран, выделение), фокус от агента, подсветка, индикатор
spikes/live-cdp/                        mcp-flow.ts + run-mcp.sh (T2)
```

## DoD

- Выкл по умолчанию; «Enable MCP Server» (флажок, запоминается), «Copy Claude Code Command», «Reset MCP Token»; токен 32 байта
  hex в `userData/mcp.json` (0600); порт занят — диалог, сервер выключен.
- Auth: без/с чужим токеном 401, чужой Host 403, любой `Origin` 403; только 127.0.0.1.
- Инструменты: document, outline, inspect, search, selection, screenshot (≤ 1568 px), apply_edits, undo_agent_edit,
  open_screen, select. Пачка — один шаг, всё или ничего, ошибка `{ index, reason }`; мейн-компонент — `affectsInstances`.
- Индикатор подключения, подсветка изменённых узлов ~1 с, «Undo Agent Edit» в меню Edit, лог `userData/logs/mcp.log` (5 МБ × 1).
- Vitest TDD; `bun run types`, `bun run test` код 0; сборка. Runbook — шаг 16 «агент через Claude Code», закрытие окна — 17.

## Проверка

T1 + Vitest (TDD), T2: сборка + `run-mcp.sh <tag>` (SDK-клиент к живому приложению). T3 — пользователь по runbook шаг 16.
Score ≈ 70 (безопасность, несколько модулей) → `code-reviewer` до каждого коммита с кодом, фиксы ≥ low.

## Эстафета сессий

Как в `round4-selection.md`: в конце сессии — статус в заголовке, «Сделано / дальше», мини-промпт следующей сессии.

## Сделано / дальше

Сессия 26-10-14 (1): ветка `feat/mcp` от `feat/swap-state`, docs-коммит спеки, разведка, опрос; реализация 6.1 серией
`73580e8..` (model → importer → main/MCP → renderer + runbook → spikes → docs). Проверки: `bun run types` 0, `bun run test` 0
(727), сборка 0; T2 `run-mcp.sh` — mcp2, mcp3 all checks passed (теги mcp1–mcp3 заняты). Два прохода `code-reviewer`:
16 находок (1 high: длинный адрес вешал запрос к importer), затем 5 low — исправлены все, отступления — `decisions.md` → 6.1.
PR #5 → `feat/swap-state`.

Дальше: T3 пользователя по runbook шаг 16 (Claude Code подключается командой из меню, плашка, пачка, Undo Agent Edit).
Замечено: вид для агента (selection) приходит из renderer асинхронно — после `select` его надо ждать, не читать сразу.

## Промпт следующей сессии

Раунд 6, срез 6.2 — видимость и обводка в Command API и инспекторе. Спека: `.context/specs/2026-10-14-round6-mcp.md`
(раздел «6.2 — Command API и инспектор», Нефункциональные — CSS неправленых экранов байт-в-байт, Тестовая стратегия 6.2);
решения — `decisions.md` → «Раунд 6». Сначала: PR #2–#5 — проверить замечания и T3 6.1 от пользователя (чинить первыми).
Ветка `feat/stroke-hidden` от `feat/mcp`, заметка `.context/notes/round6-stroke-hidden.md` по образцу этой.
Объём: `Edit.hidden` + переключатель в инспекторе (скрытый слой остаётся выделенным); `Style.stroke { width, color, align }`
вместо `outline`/inset-тени со spread у равномерной обводки не-векторов, `css-text` — тот же CSS; ключи `stroke`, `hidden` в
`EDIT_KEYS` и парсер в `style-input` (агент получает их без правок сервера, снять отказ `"hidden" is not editable yet`).
Проверка: Vitest TDD; `bun run types`, `bun run test` — код 0, сборка; T2 — паритет CSS по ROI скриптом в `spikes/live-cdp/`
+ CDP-прогон правок (`run-mcp.sh` с новым тегом); runbook шаг 16 дополнить. Score ≥ 60 → `code-reviewer` до коммита.
