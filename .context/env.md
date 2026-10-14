# Переменные окружения

| Переменная | Где | Смысл |
|---|---|---|
| `FIG_FILE` | `apps/desktop` (dev/start), `fig-import inspect`, S1 `build` | путь к `.fig` |
| `REPS` | S1 `bench` | повторов на сценарий (по умолчанию 3) |
| `RUNTIMES` | S1 `bench` | `electron,tauri` — фильтр рантаймов |
| `DIST_DIR`, `RESULT_FILE`, `SCENARIO` | хосты S1 | выставляет раннер |
| `PORT`, `INSPECT` | `spikes/live-cdp` | CDP renderer (9445) и Node-инспектор main (9446, `run-export.sh`) |
| `FIGNYA_MCP_PORT` | `apps/desktop` (main), `spikes/live-cdp/run-mcp.sh` | порт MCP-сервера на 127.0.0.1, по умолчанию 7341 (3845 занят MCP Figma Desktop) |
