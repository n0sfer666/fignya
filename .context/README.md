# fignya — контекст

OSS desktop-аналог Figma: дизайн — живой HTML/CSS, импорт `.fig`, работа offline, локальный ИИ.
Стадия: раунд 4 закрыт (MVP готов, PR #2 в `main`), раунд 5 — срез 1 «сохранение документа» закрыт (`notes/round5-save.md`, PR #3 в `feat/selection-inspector`), срез 2 «SWAP_STATE в Play» — код готов, ждёт T3 по runbook шаг 15 (`notes/round5-swap-state.md`, ветка `feat/swap-state`); статус раунда 4 — `notes/round4-selection.md` (срез 1),
`notes/round4-edit.md` (срез 2), `notes/round4-export.md` (срез 3, экспорт HTML/CSS), `notes/round4-play.md` (срез 4, Play и переход по клику). Раунд 3 (каркас `packages/*`, `apps/desktop`) — `notes/round3-skeleton.md`,
потоковый импорт — `notes/round3-streaming-import.md`, оверрайды инстансов — `notes/round3-overrides.md`.

## Карта

| Файл | Когда читать |
|---|---|
| `decisions.md` | любые вопросы «почему так», скоуп MVP, backlog |
| `stack.md` | выбор языков/рантайма, домен |
| `architecture.md` | слои, поток данных `.fig` → модель → DOM |
| `fig-format.md` | работа с декодером `.fig`, поля узлов |
| `testing.md`, `checks.md` | перед проверкой и коммитом |
| `conventions.md`, `commits.md` | перед кодом и коммитом |
| `env.md` | переменные окружения |

Полная история решений раунда 1 — `~/wiki/dev-log/fignya/26-09-23-feasibility-architecture.md`.
