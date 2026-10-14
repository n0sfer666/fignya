# Раунд 4, срез 3 — экспорт экрана в HTML/CSS (статус: ЗАКРЫТ — T3 пользователя по runbook шаг 12 пройден 26-10-14, дефектов нет; 3389f0f…docs, не запушен; ветка `feat/selection-inspector`)

## Решения (опрос 26-10-14)

- Экспортируется открытый живой экран: File → Export Screen… (⌘E), без живого экрана пункт неактивен. Папку выбирает диалог
  сохранения, имя по умолчанию — имя экрана.
- Правки среза 2 входят в экспорт: модель экрана берётся из importer, как при открытии.
- CSS — классы в `styles.css`: одинаковые наборы деклараций схлопываются в `.n1`, `.n2`… (по порядку обхода).
- Шрифты: скачанные начертания (кэш Google Fonts) семейств экрана копируются в `fonts/` + `@font-face`; системные и
  проприетарные — только имя в `font-family`.
- `data-id` / `data-kind` остаются.

## Результат на диске

```
<папка>/index.html   <!doctype html>, <title>имя экрана</title>, <link styles.css>, <div data-screen> + дерево узлов с class
<папка>/styles.css   @font-face… + base (body, [data-screen], *, svg — из SCREEN_CSS) + .nN{…}
<папка>/images/<hash>.<ext>   ext по сигнатуре (imageMime)
<папка>/fonts/<file>          копия из userData/fonts
```

## Структура

```
packages/render-dom/src/
  screen-css.ts      HOST_CSS + NODE_CSS; SCREEN_CSS собирается из них
  class-styles.ts    classStyles(root): style="" → class по одинаковому cssText, возвращает правила .nN{…}
  export-screen.ts   exportScreen(model, { imageUrl, title }) → { html, css, families }
  screen-images.ts   screenImages(model): хэши картинок, которые renderRoot реально запросил
apps/desktop/
  shared/api.ts      export:available / export:request / export:images / export:screen
  shared/export.ts   ScreenExport, ExportResult, ImageFiles, exportImagePath
  shared/font-face-css.ts  fontFaceRule(face, url = fontUrl)
  main/export-guards.ts    ввод из renderer: строки, лимиты (64 MiB, 10k картинок), hash, семейства
  main/export-image-file.ts  <hash>.png|jpg|gif|webp|bin по сигнатуре
  main/export-image-stage.ts  export:images читает картинки один раз, export:screen пишет их из stage
  main/export-files.ts     exportFiles(bundle, sources): картинки, начертания → fonts/ + @font-face перед CSS
  main/export-writer.ts    writeExport(dir, files): mkdir + writeAtomic, чужие файлы не трогает
  main/export-folder-name.ts  имя папки по умолчанию из имени экрана
  main/export-ipc.ts       диалог, запись, «Показать в Finder», ошибка — showErrorBox; доступность пункта меню
  main/app-menu.ts         File → Export Screen… (id export-screen, ⌘E)
  renderer/src/export-binding.ts  live-экран, доступность пункта, один экспорт за раз, ошибка → export:failed
  renderer/src/export-live.ts  модель экрана → screenImages → exportImages → exportScreen → window.fignya.exportScreen
  renderer/src/canvas/page-canvas.ts  onLive(screenId | undefined) при открытии/закрытии живого экрана; 204 строки > 200:
                     +4 строки — проводка коллбэка по образцу SelectNode, без второй ответственности; вынос live-mount —
                     рефакторинг вне среза
spikes/live-cdp/run-export.sh  экспорт открытого экрана → снимок экспорта ↔ снимок живого экрана
```

## DoD

- ⌘E / File → Export Screen… на открытом экране → диалог → папка с `index.html`, `styles.css`, `images/`, `fonts/`.
- `index.html`, открытый в браузере (file://, offline), выглядит как живой экран, с правками и скачанными шрифтами.
- В HTML нет `style=""` и `fignya://`; классы общие для одинаковых наборов деклараций.
- Без живого экрана пункт неактивен; отмена диалога ничего не пишет; ошибка записи и любой сбой до диалога — окно
  «Export failed»; повторный ⌘E во время экспорта не открывает второй диалог.
- Vitest на синтетике: class-styles, export-screen, screen-images, export-guards, export-image-file, export-image-stage, export-files,
  export-writer, export-folder-name, export-binding, font-face-css, app-menu. `bun run types` чисто.
- Runbook — шаг 12 в `apps/desktop/README.md`; CDP-прогон `run-export.sh`.

Не входит: экспорт выделенного слоя, страницы целиком, семантические имена классов, адаптив.

## Проверка

T1 + Vitest (TDD), T2: сборка + `run-export.sh` (снимок экспорта против живого экрана). T3 — пользователь по runbook шаг 12.
Score ≈ 60 → `code-reviewer` до коммита.

## Эстафета сессий

Как в `round4-selection.md`: в конце сессии — статус в заголовке, «Сделано / дальше», мини-промпт следующей сессии.

## Сделано / дальше

Сделано (26-10-14): весь DoD кодом. Проверки: `bun run types` чисто, `bun run test` код 0 (526), сборка, CDP
`run-export.sh exp12` (2479:25954, 247 узлов, 0 расхождений) и `exp9` (89:2590, 27 woff2 Roboto, `loaded` с file://) — all checks
passed (16). По ходу: живой экран наследует цвет/шрифт UI приложения, экспорт — дефолты браузера; у нетекстовых узлов это не
влияет на отрисовку, спайк сравнивает наследуемое только у `text`. В экспорт уходила неиспользуемая картинка (хэши со всей
модели) → `screenImages` (только отрисованные), проверка «every written file is referenced».
`code-reviewer`: 3 medium, 7 low, 1 taste — все исправлены: дубли путей/начертаний/хэшей (гонка temp-файлов `writeAtomic`);
один экспорт за раз (`bindExport`); сбой до диалога — окно «Export failed» через `export:failed`; картинки читаются один раз
(`export-image-stage`); `exportImagePath` в main; имя папки по code points без ведущих точек; пустые семейства; тесты writer на
дубль пути и путь-файл; спайк — `loaded` и ссылки без расширения. Второй проход: 1 low (stage держит байты без экспорта → TTL
60 с), 2 taste (`isStringList`, общий `READ_LIMIT`) — исправлены. page-canvas 204 строки — обоснование в «Структуре».
Коммиты: 3389f0f render-dom, 51351bb desktop, 97f4da8 spikes, затем docs.

T3 пользователя (26-10-14) — шаг 12 пройден, дефектов нет. Дальше — срез 4, `notes/round4-play.md`.

Хвосты:
- Наследуемое (цвет и шрифт UI приложения) живой экран получает из shadow host, а экспорт — от браузера; сейчас это видно
  только у нетекстовых узлов, где ничего не рисует. Если появится `currentColor` или текст без явного стиля — изолировать host.
- Системные и проприетарные шрифты (YS Text, установленные Manrope/Inter) — только имя: на другой машине будет fallback.
- Попутное от ревью, не подтвердилось: `main/google-fonts.ts:44` склеивает источники по `url`; в кэше ROI Navigator у каждого
  веса свой файл (Geist 20/20, Rubik 18/18, Roboto 27/27), начертания не теряются.
- stage картинок живёт 60 с: если держать диалог сохранения дольше, картинки перечитаются из importer (корректно, медленнее).
- Не входит (решение): экспорт слоя/страницы, семантические классы, адаптив.
