# S1 — состояние (2026-09-24)

- Готово: декодер, конвертер, сборка сценариев, Electron-хосты, Tauri-хост, раннер с RSS, runbook.
  `thumbs` (199 за 37 с) и `bench` проходят, в том числе из песочницы Bash.
- Падение Electron: без `window-all-closed` destroy последнего offscreen-окна = выход приложения.
- Прогон 2026-09-24 (REPS=1) невалиден для Tauri: Low Power Mode + батарея → WebKit rAF 30 fps.
  Раннер теперь печатает `WARNING`.
- Валидный прогон REPS=3 — `results/2026-09-24T11-34-15.md`. Выбор: Electron (`decisions.md`). Спайк закрыт.
