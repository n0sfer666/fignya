# Тестирование

- Спайки: без TDD. Проверка — типы + прогон с цифрами (T2); поведение в реальном окне
  (FPS, RSS) пользователь снимает сам на маке по runbook спайка.
- Продакшен (план): Rust — `cargo test` + `insta` (FigTree → Model → CSS по типам узлов);
  TS — Vitest; визуальная регрессия — Playwright + pixel diff против эталонов Figma;
  перф-бюджеты как тесты (открытие экрана, FPS pan/zoom, RSS).
- Каркас (раунд 3): Vitest из корня (`vitest.config.ts`, projects по пакетам, render-dom — happy-dom).
  Фикстуры синтетические: `packages/fig-import/test/fig-binary.ts` собирает настоящий `.fig`
  (мини-схема kiwi + zip). T2 окна агент может сам: Electron запускается из Bash, миниатюры в
  `~/Library/Application Support/fignya/thumbs/` — синтетические можно смотреть, приватные нет.
- Корпус `.fig` в репо — только свои/открытые файлы. `ROI Navigator.fig` приватный, в репо нельзя.
