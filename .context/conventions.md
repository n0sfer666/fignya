# Конвенции

- TypeScript strict + `noUncheckedIndexedAccess`; без `any`, `as`, `@ts-ignore`. Нетипизированные
  данные (kiwi, JSON) — `unknown` + гарды из `src/fig/guards.ts` (`isRec`, `num`, `str`, `recs`…).
- Одна ответственность на файл, ≤ 200 строк. Без комментариев в коде.
- Функции-стрелки, именованные экспорты, без классов там, где хватает функций.
- Приватные данные (`.fig`, картинки из него, имена экранов) — никогда в git; путь к `.fig` — env `FIG_FILE`.
- IPC: контракт main ↔ renderer типизирован в `apps/desktop/shared/api.ts`; данные от своего main
  гардами не проверяются: `ipcRenderer.invoke`/`on` в preload — доверенная граница, их `any`
  сужается типом `FignyaApi`. Входы main от renderer (id экрана, URL протокола) — `unknown` и проверка;
  отправитель — `isAppUrl(senderFrame.url)`.
- Всё, что main пишет в `userData`, — только в своём подкаталоге (`thumbs/`); удаление — лишь по
  маске своих имён, рядом лежат служебные каталоги Electron.
