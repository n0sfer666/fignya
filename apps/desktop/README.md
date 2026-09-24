# @fignya/desktop

Electron-оболочка. Main держит импортированный документ, renderer показывает страницы, миниатюры
и живой DOM экрана.

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

1. Запуск с `FIG_FILE`. Окно ~6–7 с показывает «Importing FIG_FILE…» и не отвечает — известное
   ограничение: импорт идёт в main-потоке. В терминале:
   `fignya: imported 9 pages, 406 screens in ~6500 ms` (для ROI Navigator).
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

Без `FIG_FILE` — красная надпись `FIG_FILE is not set`.

Не реализовано: оверрайды инстансов (текст/видимость/стиль инстанса = как у компонента).
