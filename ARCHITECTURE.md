# Architecture

Voxel (LEGO-style) base-defense game for Roblox: a Town Hall in the center of a forest
clearing, plots around it where the player places voxel monsters, and waves of enemies
coming out of the dark forest. Later: raids on other players' bases.

Code, comments and identifiers are in English.

## Core loop

```
build base (buy plots) -> place / upgrade units -> survive waves -> earn money -> raid others (later)
```

## Project layout (Rojo-compatible)

```
src/
├── shared/                         -> ReplicatedStorage.Shared
│   ├── DataConfig.lua              — all constants: economy, rarities, units, profile template, remotes
│   ├── VoxelModel.lua              — builds models out of small cube Parts (groups with hinges)
│   └── UnitModels.lua              — voxel werewolves: tall, muscular, black, bloody, long fangs (jaw = LowerJaw group)
├── server/                         -> ServerScriptService.Server
│   ├── Main.server.lua             — entry point: Remotes + Init/Start of services
│   └── Services/
│       ├── SaveService.lua         — ProfileService: money (with cap), plots, stats
│       ├── BaseService.lua         — base ownership, buy plot / place unit / sell unit
│       ├── UnitService.lua         — (next) targeting, jaw opening, attacks by rarity
│       └── WaveService.lua         — (next) enemy waves from Workspace.EnemySpawns
└── client/                         -> StarterPlayerScripts.Client (later: HUD, shop UI)
Packages/ProfileService.lua         -> ReplicatedStorage.Packages.ProfileService
tools/
├── blender/build_map.py            — builds the voxel map in Blender
├── blender/render_previews.py      — preview renders
├── blender/export_map.py           — exports the map to BrainrotMap.json
├── blender/run_headless.py         — build + render + export without the Blender UI
└── ImportBlenderMap.lua            — builds the map in Studio from BrainrotMap.json
```

## Service contract

```lua
local MyService = {}
function MyService:Init(services) end  -- grab references to other services
function MyService:Start() end         -- connect events, start loops
return MyService
```

`Main` loads services in a fixed order: `SaveService -> BaseService -> UnitService -> WaveService`.
Services talk through the `services` table passed to `Init` (no circular requires).

## State ("store")

The server is the single source of truth (the Roblox equivalent of a Zustand store):

| Data | Owner | How the client sees it |
|---|---|---|
| Money, money cap | SaveService (profile) | player attributes `Money`, `MoneyCap` |
| Plots: `[slot] = unitId / ""` | SaveService (profile) | plot glow + unit models in Workspace |
| Base owner | BaseService | `Workspace.Base` attributes `OwnerUserId`, `OwnerName` |

Clients only send requests (`RequestBuyPlot`, `RequestPlaceUnit`, `RequestSellUnit`);
the server validates ownership, money and slot state. This keeps multiplayer / raids
possible later without trusting the client.

## Units and rarities

| Rarity | Attack | Example unit |
|---|---|---|
| Common | Bite (small cube projectile) | Ripper |
| Rare | Fireball (glowing orange/red cube) | Bloodfang |
| Epic | Laser (raycast beam) | Nightmaw |
| Legendary | not designed yet (Laser for now) | Alpha |

Every unit has a `LowerJaw` model with a hinge: before firing it rotates by
`UnitModels.JawOpenAngle` to open the mouth.

## Map contract (Workspace)

- `Base.TownHall` — Town Hall (PrimaryPart `Foundation`), crystal inside: `TownHall.Crystal`
  (attributes `IsCrystal`, `MaxHP`).
- `Base.BrainrotPlots.Plot1..Plot116` — plots in 3 rings (attribute `SlotIndex`;
  `Spot` has attribute `Row`), each with `Pedestal`, 4 `Glow` strips and an invisible `Spot`.
- `Base.SafeZone`, `Base.SpawnLocation`.
- `EnemySpawns.North/South/East/West` — where waves come from.
- `Forest`, `Ground`, `MapBounds` — decoration and invisible borders.

The map is built in Blender (`tools/blender`) and imported with `ServerStorage.Tools.ImportBlenderMap`.
