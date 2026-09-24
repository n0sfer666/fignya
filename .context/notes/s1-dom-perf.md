# S1 — состояние (2026-09-24)

- Готово: декодер, конвертер, сборка сценариев, Electron-хосты, Tauri-хост, раннер с RSS, runbook.
  `thumbs` (199 за 37 с) и `bench` проходят, в том числе из песочницы Bash.
- Падение Electron: без `window-all-closed` destroy последнего offscreen-окна = выход приложения.
- Прогон 2026-09-24 (REPS=1) невалиден для Tauri: Low Power Mode + батарея → WebKit rAF 30 fps.
  Раннер теперь печатает `WARNING`.
- Дальше: прогон REPS=3 от сети без Low Power Mode → выбор shell в `decisions.md` → dev-log.
