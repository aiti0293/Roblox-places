# Архитектура серверной части

## Структура проекта (Rojo)

```
src/
├── shared/                         → ReplicatedStorage.Shared
│   └── DataConfig.lua              — все константы и таблицы (Brainrot/Wall/Game/Boss)
├── server/                         → ServerScriptService.Server
│   ├── Main.server.lua             — точка входа: Remotes + Init/Start сервисов
│   └── Services/
│       ├── SaveService.lua         — ProfileService: загрузка/сохранение профилей
│       ├── BaseService.lua         — участки баз, слоты, пассивный доход, «в руках»
│       ├── CannonService.lua       — 3 нейтральные пушки: захват, зарядка, выстрел
│       ├── WallService.lua         — личные стены игроков, HP кирпичей, обломки, реген
│       ├── BossService.lua         — машина состояний: Sleep → Chase → Return
│       └── SecurityService.lua     — лазеры, красная кнопка, бита, тревога/WANTED
└── client/                         → StarterPlayerScripts.Client (позже)
Packages/                           → ReplicatedStorage.Packages (ProfileService)
```

## Контракт сервиса

Каждый сервис — ModuleScript, возвращающий таблицу:

```lua
local MyService = {}

function MyService:Init(services)  -- получить ссылки на другие сервисы
	self.Save = services.SaveService
end

function MyService:Start()         -- подписки на события, циклы
end

return MyService
```

`Main.server.lua` грузит сервисы в фиксированном порядке:
`SaveService → BaseService → WallService → CannonService → BossService → SecurityService`.
Циклических `require` нет — сервисы общаются через таблицу `services`, переданную в `Init`.

## Зоны ответственности и связи

| Сервис | Владеет состоянием | Кого вызывает |
|---|---|---|
| **SaveService** | `Profiles[player]` | — |
| **BaseService** | участок игрока, слоты, `HeldBrainrot[player]` | SaveService |
| **CannonService** | `Cannons[i] = {Owner, BrainrotId}` | BaseService (забрать из рук), WallService (урон) |
| **WallService** | `Walls[player] = {Tier, Bricks}` | SaveService (награда, статистика) |
| **BossService** | `Bosses[id] = {State, Target}` | BaseService (выронить брейнрота) |
| **SecurityService** | лазеры, кулдауны биты, удержание кнопки | BaseService (выронить / кража) |

### Ключевое правило: «брейнрот в руках»
Единственный источник правды — `BaseService.HeldBrainrot[player]`:
`{ Id, FromOwner: Player, FromSlot: string }`.
- В руках → доход не идёт (слот помечен пустым, но «зарезервирован» за владельцем).
- `BaseService:DropHeld(player)` — **единая точка** для всех случаев потери:
  удар битой, поймал босс, смерть от лазера, выход из игры.
  Брейнрот мгновенно возвращается на базу владельца (`FromOwner`).

## Игровой цикл (поток данных)

```
[База] RequestPickup ──► BaseService.HeldBrainrot
        │
[Пушка] RequestCannon ──► CannonService: захват свободной пушки,
        │                 скин по редкости (DataConfig.Rarities[r].CannonSkin)
        │                 брейнрот «поглощается» пушкой → возвращается на базу
[Hit]   RequestFire ──► CannonService: игрок = снаряд (LinearVelocity / AssemblyLinearVelocity)
        │
[Стена] Touched ──► WallService:Damage(player, LaunchPower)
        │            кирпичи с HP ≤ 0 → Unanchored обломки → Debris
        │            через WallRegenTime стена восстанавливается
[Земля] игрок падает у Boss Zone
        │
[Босс]  RequestPickup брейнрота босса ──► BossService: Sleep → Chase
        ├─ догнал  → BaseService:DropHeld → Return → Sleep
        └─ игрок в Safe Zone → Return → Sleep
```

## Безопасность (анти-чит)

- Клиент только **просит** (Request*). Все проверки — на сервере: дистанция, кулдауны, владение.
- Удар битой: сервер проверяет `BatCooldown` и `BatRange` сам, клиентский хит-лист игнорируется.
- Деньги и слоты меняются только через SaveService — один путь записи в профиль.
- Состояние для UI отдаётся через `Attributes` (`player:SetAttribute("Cash", …)`)
  и RemoteEvent'ы из `DataConfig.Remotes`.

## Что нужно в Workspace / ServerStorage

- `workspace.BasePlots/Plot1..Plot6` — точки баз (у каждой: `RedButton`, `Slots/1..10`, `Lasers`, `SafeZone`).
- `workspace.Cannons/Cannon1..Cannon3` — нейтральные пушки (`Seat`/`Barrel`, `HitPrompt`).
- `workspace.WallLanes/Lane1..Lane6` — точки, где строится личная стена игрока.
- `workspace.BossZone/<BossId>` — точки сна боссов.
- `ServerStorage.Brainrots`, `ServerStorage.CannonSkins`, `ServerStorage.Bosses` — модели.
- `Packages/ProfileService` — модуль ProfileService (MadStudioRoblox).

> Максимум 6 игроков задаётся в **Game Settings → Places → Max Players** (скриптом не меняется).
