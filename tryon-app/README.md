# Примерочная — 3D мини-приложение (Telegram / MAX)

```bash
npm install
npm run dev      # http://localhost:5173 (с --host — доступно с телефона в той же сети)
npm run build    # статическая сборка в dist/
npm run bake     # перезапечь манекен после правок в src/three/procedural/bodySdf.js (~10 с)
```

## Структура
| Файл | Назначение |
|---|---|
| `src/lib/body.js` | Вся «математика фигуры»: рост/вес → обхваты, российский размер, дельты для морфов |
| `src/store/useBodyStore.js` | Состояние фигуры (Zustand), режимы «Рост и вес» / «Мои мерки» |
| `src/config/avatar.js` | `AVATAR_URL` и соответствие параметров → shape keys GLB |
| `src/three/useDampedBody.js` | Плавное «догоняние» фигуры в `useFrame` без ре-рендеров React |
| `src/three/procedural/*` | Генератор гладкого манекена (SDF → сетка → морф-таргеты), только для `npm run bake` |
| `public/models/mannequin.glb` | Запечённый манекен (1,6 МБ, meshopt) — временная замена вашей модели |
| `src/three/GLBAvatar.jsx` | Загрузчик GLB, применяет веса морфов ко всем мешам группы (и к одежде) |
| `src/three/Scene.jsx` | Canvas, студийный свет из Lightformer (без загрузки HDR), подиум, вращение |
| `src/ui/*` | Панель параметров, слайдеры с кнопками «−/+», бейдж размера |

## Требования к GLB
- Безголовый манекен, метры, стоит на Y=0, смотрит в +Z.
- Shape keys: `Bust_Plus/Minus`, `Waist_Plus/Minus`, `Hips_Plus/Minus` (имена меняются в `src/config/avatar.js`).
- Нейтральная форма меша = базовая фигура `BASE_BODY` (рост 166, грудь 94, талия 76, бёдра 102); `_Plus` = +30 см обхвата, `_Minus` = −30 см.
- Одежда: привязана к тому же скелету и несёт те же shape keys.
