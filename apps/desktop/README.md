# @fignya/desktop

Electron-оболочка. Импорт `.fig` идёт в отдельном процессе (`importer/`, `utilityProcess`), там же
живёт документ; main держит список страниц, renderer показывает страницы, миниатюры и живой DOM экрана.

## Команды (Nushell, из корня репо)

```nu
bun install
$env.FIG_FILE = ("~/Downloads/ROI Navigator.fig" | path expand)
bun run dev
```

- `bun run --cwd apps/desktop build` — прод-сборка в `apps/desktop/out/`.
- `bun run --cwd apps/desktop start` — запуск собранного (`FIG_FILE` так же).
- Кэш миниатюр: `~/Library/Application Support/fignya/thumbs/<cacheKey>/`, ключ — путь + размер +
  mtime `.fig` + `RENDER_HASH` (sha1 исходников model, fig-import, render-dom и `thumb.ts`; в dev
  считается при старте). Каталоги с другим ключом удаляются при запуске. Удалить папку — миниатюры
  перегенерируются.

## Runbook (T3, живое окно)

1. Запуск с `FIG_FILE`. Окно ~8 с показывает «Importing FIG_FILE… N%» и прогресс-бар: он
   растёт до 50% за декодирование и до 100% за конвертацию (первые ~0.5 с — 0%, идёт распаковка).
   Колёсика macOS нет: окно двигается и ресайзится, курсор обычный. В Activity Monitor процесс
   `fignya importer` держит до ~0.9 ГБ, основной процесс Electron — ~150 МБ. В терминале:
   `fignya: imported 9 pages, 406 screens in ~7500 ms` (для ROI Navigator).
2. После импорта: тёмный UI, слева **Pages** (без `Internal Only Canvas`, справа от имени — число
   экранов) и **Screens** текущей страницы; холст вписывает первую страницу.
3. Миниатюры подгружаются лениво за секунды (сначала белые плашки). Повторный запуск берёт их из
   кэша мгновенно.
4. Pan — скролл трекпада или drag. Zoom — pinch или ⌘/Ctrl + колесо, вокруг курсора.
5. Клик по экрану на холсте или в списке Screens (из списка — ещё и центрирование): миниатюра
   заменяется живым DOM с синей обводкой — фреймы, auto layout как flex, текст, rect/ellipse,
   картинки, векторы (SVG), инстансы (дерево компонента). Esc закрывает живой DOM.
6. Смена страницы в Pages заново вписывает холст.
7. Закрытие окна завершает приложение.

Без `FIG_FILE` — красная надпись `FIG_FILE is not set`. `FIG_FILE` не `.fig` (например,
`package.json`) — красная `invalid zip data`, процесс `fignya importer` из Activity Monitor исчезает.

## Замер импорта без Electron

```nu
$env.FIG_FILE = ("~/Downloads/ROI Navigator.fig" | path expand)
bun run --cwd packages/fig-import bench
```

Вывод — одна JSON-строка: `importMs`, `nodes`, `maxRssMb`, `heapAfterGcMb`. Для ROI Navigator:
`nodes` 360637, `maxRssMb` 1600–2050 (плавает от давления памяти; Node без pointer compression, в
Electron меньше), `heapAfterGcMb` 285.

Не реализовано: оверрайды инстансов (текст/видимость/стиль инстанса = как у компонента).
