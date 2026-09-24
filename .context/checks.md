# Проверки

| Что | Команда |
|---|---|
| Типы спайка S1 | `cd spikes/s1-dom-perf && bun run types` |
| Сборка Tauri-хоста S1 | `cd spikes/s1-dom-perf && bun run build:tauri` |

Линтера пока нет. `checks.json` читает pre-commit hook.
