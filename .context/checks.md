# Проверки

| Что | Команда |
|---|---|
| Типы всех пакетов | `bun run types` (корень) |
| Тесты (Vitest, все пакеты) | `bun run test` (корень) |
| Сборка приложения | `bun run --cwd apps/desktop build` |
| Цифры на реальном `.fig` | `FIG_FILE=… bun run --cwd packages/fig-import inspect` |
| Типы спайка S1 | `cd spikes/s1-dom-perf && bun run types` |
| Сборка Tauri-хоста S1 | `cd spikes/s1-dom-perf && bun run build:tauri` |

Линтера пока нет. `checks.json` читает pre-commit hook.
