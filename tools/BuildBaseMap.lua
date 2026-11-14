--[[
	BuildBaseMap — новая карта в «кубическом» (воксельном) стиле.

	Раскладка (центр карты = 0,0,0):
	  • в центре — база игрока: площадь с РАТУШЕЙ (TownHall) из больших и маленьких кубов;
	  • вокруг ратуши — кольцо из 10 подиумов для брейнротов и свободная поляна;
	  • дальше во все стороны — тёмный густой лес из кубических деревьев;
	  • 4 лесные тропы (по осям X/Z) ведут к краям карты, на их концах — точки появления врагов.

	Всё строится ТОЛЬКО из блоков (никаких шаров/цилиндров), все детали Anchored.
	Старая карта (Map, BasePlots, Cannons, WallLanes, BossZone) не удаляется,
	а переносится в ServerStorage.OldMap — её можно вернуть.

	Имена, по которым будут искать скрипты:
	  Workspace.Base.TownHall              — модель ратуши (PrimaryPart = Foundation)
	  Workspace.Base.BrainrotPlots/Plot1..10 — подиумы (Pedestal + невидимый Spot сверху)
	  Workspace.Base.SafeZone              — невидимая зона базы
	  Workspace.Base.SpawnLocation         — точка появления игрока
	  Workspace.EnemySpawns/North|South|East|West — откуда идут враги
	  Workspace.Forest, Workspace.MapBounds — лес и невидимые границы

	Запуск: вставить файл в Command Bar в Studio (или MCP execute_luau). Можно запускать повторно.
]]

local Lighting = game:GetService("Lighting")
local ServerStorage = game:GetService("ServerStorage")

----------------------------------------------------------------------
-- Параметры карты
----------------------------------------------------------------------

local CFG = {
	MapHalfSize = 350, -- карта от -350 до 350 по X и Z
	ClearingRadius = 115, -- радиус светлой поляны вокруг базы
	ForestStart = 125, -- с какого радиуса начинается лес
	PlazaSize = 44, -- каменная площадь под ратушей
	PlotCount = 10, -- = DataConfig.GameConfig.BaseSlotCount
	PlotRadius = 46, -- радиус кольца подиумов
	TrailHalfWidth = 9, -- полуширина лесных троп
	TreeCell = 18, -- шаг сетки, по которой расставляются деревья
	TreeChance = 0.85, -- вероятность дерева в клетке сетки
	Seed = 2026, -- лес всегда одинаковый
}

local COL = {
	Grass = Color3.fromRGB(110, 200, 80),
	GrassLight = Color3.fromRGB(135, 215, 95),
	ForestFloor = Color3.fromRGB(38, 58, 32),
	Stone = Color3.fromRGB(175, 175, 185),
	StoneDark = Color3.fromRGB(140, 140, 152),
	Path = Color3.fromRGB(205, 175, 120),
	Sand = Color3.fromRGB(230, 200, 140),
	Cream = Color3.fromRGB(250, 238, 210),
	Wood = Color3.fromRGB(120, 75, 40),
	WoodDark = Color3.fromRGB(85, 52, 28),
	RoofA = Color3.fromRGB(220, 60, 50),
	RoofB = Color3.fromRGB(245, 120, 50),
	Glass = Color3.fromRGB(110, 200, 255),
	Gold = Color3.fromRGB(255, 205, 40),
	Flag = Color3.fromRGB(40, 120, 255),
	Trunk = Color3.fromRGB(70, 45, 28),
	Rock = Color3.fromRGB(95, 98, 105),
}

local LEAVES = {
	Color3.fromRGB(28, 70, 34),
	Color3.fromRGB(22, 56, 30),
	Color3.fromRGB(36, 82, 40),
	Color3.fromRGB(18, 46, 26),
	Color3.fromRGB(44, 74, 30),
}

-- 10 цветов подиумов (по редкостям брейнротов, просто для красоты)
local PLOT_COLORS = {
	Color3.fromRGB(180, 180, 180), Color3.fromRGB(85, 200, 85), Color3.fromRGB(60, 140, 255),
	Color3.fromRGB(170, 70, 255), Color3.fromRGB(255, 170, 0), Color3.fromRGB(255, 60, 90),
	Color3.fromRGB(255, 240, 150), Color3.fromRGB(70, 70, 80), Color3.fromRGB(0, 255, 255),
	Color3.fromRGB(255, 120, 200),
}

----------------------------------------------------------------------
-- Хелперы (только блоки!)
----------------------------------------------------------------------

local function folder(parent: Instance, name: string): Folder
	local f = Instance.new("Folder")
	f.Name = name
	f.Parent = parent
	return f
end

local function block(parent: Instance, name: string, size: Vector3, pos: Vector3 | CFrame, color: Color3, material: Enum.Material?): Part
	local p = Instance.new("Part")
	p.Name = name
	p.Anchored = true
	p.Size = size
	p.CFrame = if typeof(pos) == "Vector3" then CFrame.new(pos) else pos :: CFrame
	p.Color = color
	p.Material = material or Enum.Material.SmoothPlastic
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Parent = parent
	return p
end

-- Невидимый маркер / зона
local function marker(parent: Instance, name: string, size: Vector3, pos: Vector3 | CFrame, canTouch: boolean?): Part
	local p = block(parent, name, size, pos, Color3.new(1, 1, 1))
	p.Transparency = 1
	p.CanCollide = false
	p.CanQuery = false
	p.CanTouch = canTouch == true
	p.CastShadow = false
	return p
end

local function label(p: BasePart, text: string, face: Enum.NormalId, textColor: Color3?)
	local gui = Instance.new("SurfaceGui")
	gui.Name = "Label"
	gui.Face = face
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.PixelsPerStud = 25
	gui.LightInfluence = 0
	local t = Instance.new("TextLabel")
	t.Size = UDim2.fromScale(1, 1)
	t.BackgroundTransparency = 1
	t.Font = Enum.Font.FredokaOne
	t.TextScaled = true
	t.Text = text
	t.TextColor3 = textColor or Color3.new(1, 1, 1)
	t.TextStrokeTransparency = 0
	t.Parent = gui
	gui.Parent = p
end

----------------------------------------------------------------------
-- 0. Убираем старую карту в ServerStorage.OldMap (не удаляем!)
----------------------------------------------------------------------

local oldStore = ServerStorage:FindFirstChild("OldMap") or folder(ServerStorage, "OldMap")
for _, name in { "Map", "BasePlots", "Cannons", "WallLanes", "BossZone" } do
	local old = workspace:FindFirstChild(name)
	if old then
		local prev = oldStore:FindFirstChild(name)
		if prev then
			prev:Destroy()
		end
		old.Parent = oldStore
	end
end
-- Предыдущая версия этой карты — пересобираем с нуля
for _, name in { "Ground", "Base", "Forest", "EnemySpawns", "MapBounds", "Baseplate", "SpawnLocation" } do
	local old = workspace:FindFirstChild(name)
	if old then
		old:Destroy()
	end
end

----------------------------------------------------------------------
-- 1. Земля: тёмная лесная подстилка + светлая «ступенчатая» поляна
----------------------------------------------------------------------

local ground = folder(workspace, "Ground")
local S = CFG.MapHalfSize
block(ground, "ForestFloor", Vector3.new(S * 2 + 20, 2, S * 2 + 20), Vector3.new(0, -1, 0), COL.ForestFloor, Enum.Material.Grass)

-- Круг поляны из горизонтальных полос шириной 10 — получается «пиксельный» круг
local R = CFG.ClearingRadius
local STEP = 10
local z = -R
while z < R do
	local zc = z + STEP / 2
	local halfW = math.sqrt(math.max(0, R * R - zc * zc))
	halfW = math.floor(halfW / STEP + 0.5) * STEP -- выравниваем по сетке 10
	if halfW > 0 then
		block(ground, "Clearing", Vector3.new(halfW * 2, 0.4, STEP), Vector3.new(0, 0.2, zc), COL.Grass, Enum.Material.Grass)
	end
	z += STEP
end

-- Тропы: от края поляны до краёв карты (по ним придут враги)
local TW = CFG.TrailHalfWidth
local trailStart = CFG.ClearingRadius - 10
local trailLen = S - trailStart
for _, dir in { Vector3.new(1, 0, 0), Vector3.new(-1, 0, 0), Vector3.new(0, 0, 1), Vector3.new(0, 0, -1) } do
	local center = dir * (trailStart + trailLen / 2)
	local size = if dir.X ~= 0 then Vector3.new(trailLen, 0.3, TW * 2 - 4) else Vector3.new(TW * 2 - 4, 0.3, trailLen)
	block(ground, "Trail", size, center + Vector3.new(0, 0.5, 0), COL.Path, Enum.Material.Ground)
end
task.wait()

----------------------------------------------------------------------
-- 2. База игрока в центре
----------------------------------------------------------------------

local base = Instance.new("Model")
base.Name = "Base"

-- Каменная площадь с «шахматной» плиткой 4×4
local plaza = folder(base, "Plaza")
local P = CFG.PlazaSize
for ix = 0, P / 4 - 1 do
	for iz = 0, P / 4 - 1 do
		local c = if (ix + iz) % 2 == 0 then COL.Stone else COL.StoneDark
		block(plaza, "Tile", Vector3.new(4, 1, 4), Vector3.new(-P / 2 + 2 + ix * 4, 0.5, -P / 2 + 2 + iz * 4), c, Enum.Material.Slate)
	end
end

-- РАТУША
local th = Instance.new("Model")
th.Name = "TownHall"
local foundation = block(th, "Foundation", Vector3.new(28, 3, 28), Vector3.new(0, 2.5, 0), COL.Sand, Enum.Material.Sandstone)
-- Ступени к двери (дверь смотрит на +Z)
block(th, "Step1", Vector3.new(10, 1, 3), Vector3.new(0, 1.5, 15.5), COL.Sand, Enum.Material.Sandstone)
block(th, "Step2", Vector3.new(10, 1, 2), Vector3.new(0, 2.5, 15), COL.Sand, Enum.Material.Sandstone)
-- Основной корпус
block(th, "Body", Vector3.new(20, 12, 20), Vector3.new(0, 10, 0), COL.Cream, Enum.Material.Brick)
-- Угловые столбы
for _, sx in { -1, 1 } do
	for _, sz in { -1, 1 } do
		block(th, "Pillar", Vector3.new(3, 14, 3), Vector3.new(sx * 10.5, 11, sz * 10.5), COL.Wood, Enum.Material.WoodPlanks)
	end
end
-- Пояс из маленьких кубов между этажом и крышей
for i = -5, 5 do
	for _, s in { -1, 1 } do
		local col = if i % 2 == 0 then COL.Gold else COL.WoodDark
		block(th, "Trim", Vector3.new(2, 1, 1), Vector3.new(i * 2, 16.5, s * 10.5), col)
		block(th, "Trim", Vector3.new(1, 1, 2), Vector3.new(s * 10.5, 16.5, i * 2), col)
	end
end
-- Дверь и окна
block(th, "Door", Vector3.new(6, 8, 1), Vector3.new(0, 8, 10.4), COL.WoodDark, Enum.Material.WoodPlanks)
block(th, "DoorFrame", Vector3.new(8, 1, 1.2), Vector3.new(0, 12.5, 10.5), COL.Gold)
for _, wx in { -6, 6 } do
	for _, face in { 1, -1 } do
		block(th, "Window", Vector3.new(3, 3, 0.6), Vector3.new(wx, 11, face * 10.2), COL.Glass, Enum.Material.Neon)
		block(th, "Window", Vector3.new(0.6, 3, 3), Vector3.new(face * 10.2, 11, wx), COL.Glass, Enum.Material.Neon)
	end
end
-- Ступенчатая крыша
local roofY = 17.5
local roofSize = 26
local layer = 0
while roofSize >= 4 do
	local col = if layer % 2 == 0 then COL.RoofA else COL.RoofB
	block(th, "Roof", Vector3.new(roofSize, 2, roofSize), Vector3.new(0, roofY + layer * 2, 0), col)
	roofSize -= 4
	layer += 1
end
-- Башенка с зубцами и флагом
local towerBaseY = roofY + layer * 2 - 1
block(th, "Tower", Vector3.new(6, 8, 6), Vector3.new(0, towerBaseY + 4, 0), COL.Cream, Enum.Material.Brick)
for _, sx in { -1, 1 } do
	for _, sz in { -1, 1 } do
		block(th, "Battlement", Vector3.new(2, 2, 2), Vector3.new(sx * 3, towerBaseY + 9, sz * 3), COL.StoneDark)
	end
end
block(th, "FlagPole", Vector3.new(1, 10, 1), Vector3.new(0, towerBaseY + 13, 0), COL.WoodDark)
block(th, "Flag", Vector3.new(6, 4, 0.6), Vector3.new(3.5, towerBaseY + 16, 0), COL.Flag)
-- Табличка над дверью
local sign = block(th, "Sign", Vector3.new(12, 3, 0.6), Vector3.new(0, 14.5, 10.6), COL.WoodDark, Enum.Material.WoodPlanks)
label(sign, "РАТУША", Enum.NormalId.Back, COL.Gold)
th.PrimaryPart = foundation
th.Parent = base

-- Кольцо подиумов для брейнротов
local plots = folder(base, "BrainrotPlots")
for i = 1, CFG.PlotCount do
	-- Первый подиум — справа от двери, дальше по кругу
	local a = (i - 1) / CFG.PlotCount * math.pi * 2 + math.pi / CFG.PlotCount
	local pos = Vector3.new(math.sin(a) * CFG.PlotRadius, 0, math.cos(a) * CFG.PlotRadius)
	local face = CFrame.lookAt(pos, Vector3.new(0, 0, 0)) -- подиум «смотрит» на ратушу
	local m = Instance.new("Model")
	m.Name = "Plot" .. i
	m:SetAttribute("SlotIndex", i)
	local pedestal = block(m, "Pedestal", Vector3.new(10, 1, 10), face + Vector3.new(0, 0.9, 0), COL.StoneDark, Enum.Material.Slate)
	block(m, "Top", Vector3.new(8, 1, 8), face + Vector3.new(0, 1.9, 0), PLOT_COLORS[i])
	-- Маленькие кубики по углам — воксельная окантовка
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			block(m, "Corner", Vector3.new(1.5, 1.5, 1.5), face * CFrame.new(sx * 4.25, 2.65, sz * 4.25), COL.Gold)
		end
	end
	-- Сюда BaseService будет ставить модель брейнрота
	marker(m, "Spot", Vector3.new(4, 0.2, 4), face + Vector3.new(0, 2.5, 0))
	m.PrimaryPart = pedestal
	m.Parent = plots
end

-- Каменная дорожка-кольцо по подиумам (из блоков 4×4, по кругу)
local ring = folder(base, "RingPath")
local ringR = CFG.PlotRadius - 9
local segments = 48
for k = 0, segments - 1 do
	local a = k / segments * math.pi * 2
	local pos = Vector3.new(math.sin(a) * ringR, 0.55, math.cos(a) * ringR)
	block(ring, "PathBlock", Vector3.new(5, 0.3, 5), CFrame.lookAt(pos, Vector3.new(0, 0.55, 0)), COL.Path, Enum.Material.Ground)
end

-- Безопасная зона базы: вся поляна (невидимая, для скриптов)
marker(base, "SafeZone", Vector3.new(CFG.ClearingRadius * 2, 30, CFG.ClearingRadius * 2), Vector3.new(0, 15, 0), true)

-- Точка появления игрока — перед дверью ратуши
local spawn = Instance.new("SpawnLocation")
spawn.Name = "SpawnLocation"
spawn.Anchored = true
spawn.Size = Vector3.new(8, 1, 8)
spawn.Position = Vector3.new(0, 1.2, 24)
spawn.Color = COL.Gold
spawn.Material = Enum.Material.SmoothPlastic
spawn.TopSurface = Enum.SurfaceType.Smooth
spawn.Neutral = true
spawn.Duration = 0
spawn.Parent = base

-- Фонари из кубов по краю поляны (воксельные, со светом)
local lamps = folder(base, "Lamps")
for k = 0, 15 do
	local a = k / 16 * math.pi * 2 + math.pi / 16
	local pos = Vector3.new(math.sin(a) * (CFG.ClearingRadius - 8), 0, math.cos(a) * (CFG.ClearingRadius - 8))
	block(lamps, "LampPost", Vector3.new(1.5, 9, 1.5), pos + Vector3.new(0, 4.5, 0), COL.WoodDark)
	local bulb = block(lamps, "LampLight", Vector3.new(2.5, 2.5, 2.5), pos + Vector3.new(0, 10, 0), Color3.fromRGB(255, 210, 120), Enum.Material.Neon)
	local light = Instance.new("PointLight")
	light.Range = 30
	light.Brightness = 2
	light.Color = Color3.fromRGB(255, 200, 120)
	light.Parent = bulb
end

base.PrimaryPart = foundation
base.Parent = workspace
task.wait()

----------------------------------------------------------------------
-- 3. Тёмный густой лес
----------------------------------------------------------------------

local forest = folder(workspace, "Forest")
local rng = Random.new(CFG.Seed)

-- Ёлка: ствол + 3 яруса кубов
local function pineTree(parent: Instance, pos: Vector3, h: number, leaves: Color3)
	local m = Instance.new("Model")
	m.Name = "Pine"
	block(m, "Trunk", Vector3.new(3, h, 3), pos + Vector3.new(0, h / 2, 0), COL.Trunk, Enum.Material.Wood)
	local y = h * 0.55
	local w = 15
	for tier = 1, 3 do
		local th = 6 - tier
		block(m, "Leaves", Vector3.new(w, th, w), pos + Vector3.new(0, y + th / 2, 0), leaves, Enum.Material.Grass)
		y += th
		w -= 4.5
	end
	block(m, "Top", Vector3.new(2, 3, 2), pos + Vector3.new(0, y + 1.5, 0), leaves)
	m.Parent = parent
end

-- Дуб: ствол + большой куб кроны + 2 куба-«комка» сбоку
local function oakTree(parent: Instance, pos: Vector3, h: number, leaves: Color3)
	local m = Instance.new("Model")
	m.Name = "Oak"
	block(m, "Trunk", Vector3.new(3.5, h, 3.5), pos + Vector3.new(0, h / 2, 0), COL.Trunk, Enum.Material.Wood)
	local cw = rng:NextNumber(13, 18)
	block(m, "Crown", Vector3.new(cw, 9, cw), pos + Vector3.new(0, h + 3.5, 0), leaves, Enum.Material.Grass)
	block(m, "Crown", Vector3.new(8, 6, 8), pos + Vector3.new(cw / 2 - 2, h + 1, rng:NextNumber(-3, 3)), leaves, Enum.Material.Grass)
	block(m, "Crown", Vector3.new(7, 5, 7), pos + Vector3.new(rng:NextNumber(-3, 3), h + 8.5, -cw / 4), leaves, Enum.Material.Grass)
	m.Parent = parent
end

local treeCount = 0
local chunk = Instance.new("Folder")
chunk.Name = "Trees"
local C = CFG.TreeCell
for gx = -S + C / 2, S - C / 2, C do
	for gz = -S + C / 2, S - C / 2, C do
		local pos = Vector3.new(gx + rng:NextNumber(-C * 0.35, C * 0.35), 0, gz + rng:NextNumber(-C * 0.35, C * 0.35))
		local dist = Vector2.new(pos.X, pos.Z).Magnitude
		local onTrail = math.abs(pos.X) < TW + 4 or math.abs(pos.Z) < TW + 4
		if dist > CFG.ForestStart and not onTrail and rng:NextNumber() < CFG.TreeChance then
			local leaves = LEAVES[rng:NextInteger(1, #LEAVES)]
			-- Чем дальше от базы, тем выше деревья
			local h = rng:NextNumber(12, 18) + math.clamp((dist - CFG.ForestStart) / 20, 0, 12)
			if rng:NextNumber() < 0.6 then
				pineTree(chunk, pos, h, leaves)
			else
				oakTree(chunk, pos, h, leaves)
			end
			treeCount += 1
			if treeCount % 80 == 0 then
				chunk.Parent = forest
				task.wait()
				chunk = Instance.new("Folder")
				chunk.Name = "Trees"
			end
		end
	end
end
chunk.Parent = forest

-- Подлесок (кусты) и камни из кубов — заполняют пустоты между деревьями
local under = folder(forest, "Undergrowth")
local bushes, rocks = 0, 0
while bushes < 260 or rocks < 70 do
	local pos = Vector3.new(rng:NextNumber(-S, S), 0, rng:NextNumber(-S, S))
	local dist = Vector2.new(pos.X, pos.Z).Magnitude
	local onTrail = math.abs(pos.X) < TW or math.abs(pos.Z) < TW
	if dist > CFG.ForestStart - 5 and not onTrail then
		if bushes < 260 then
			bushes += 1
			local s = rng:NextNumber(3, 6)
			block(under, "Bush", Vector3.new(s * 1.3, s, s), CFrame.new(pos + Vector3.new(0, s / 2, 0)) * CFrame.Angles(0, rng:NextNumber(0, math.pi), 0), LEAVES[rng:NextInteger(1, #LEAVES)], Enum.Material.Grass)
		else
			rocks += 1
			local s = rng:NextNumber(2, 6)
			block(under, "Rock", Vector3.new(s, s * 0.7, s * 1.2), CFrame.new(pos + Vector3.new(0, s * 0.3, 0)) * CFrame.Angles(0, rng:NextNumber(0, math.pi), 0), COL.Rock, Enum.Material.Slate)
		end
	end
end

----------------------------------------------------------------------
-- 4. Точки появления врагов (концы троп) и границы карты
----------------------------------------------------------------------

local spawns = folder(workspace, "EnemySpawns")
local edge = S - 12
for name, pos in { North = Vector3.new(0, 3, -edge), South = Vector3.new(0, 3, edge), East = Vector3.new(edge, 3, 0), West = Vector3.new(-edge, 3, 0) } do
	marker(spawns, name, Vector3.new(10, 6, 10), CFrame.lookAt(pos, Vector3.new(0, 3, 0)))
end

local bounds = folder(workspace, "MapBounds")
local BH = 120
for _, d in { Vector3.new(1, 0, 0), Vector3.new(-1, 0, 0), Vector3.new(0, 0, 1), Vector3.new(0, 0, -1) } do
	local size = if d.X ~= 0 then Vector3.new(4, BH, S * 2 + 8) else Vector3.new(S * 2 + 8, BH, 4)
	local wall = marker(bounds, "Bound", size, d * (S + 2) + Vector3.new(0, BH / 2, 0))
	wall.CanCollide = true
end

----------------------------------------------------------------------
-- 5. Свет: солнечный день над поляной, лес тёмный за счёт густых крон
----------------------------------------------------------------------

Lighting.ClockTime = 14.5
Lighting.Brightness = 2.5
Lighting.GlobalShadows = true
Lighting.ShadowSoftness = 0.3
Lighting.Ambient = Color3.fromRGB(40, 45, 40)
Lighting.OutdoorAmbient = Color3.fromRGB(100, 110, 100)
local atmosphere = Lighting:FindFirstChildOfClass("Atmosphere") or Instance.new("Atmosphere")
atmosphere.Density = 0.38
atmosphere.Offset = 0.1
atmosphere.Color = Color3.fromRGB(170, 195, 160)
atmosphere.Decay = Color3.fromRGB(35, 55, 35) -- вдали лес уходит в тёмно-зелёную дымку
atmosphere.Glare = 0
atmosphere.Haze = 1.2
atmosphere.Parent = Lighting

local parts = 0
for _, f in { ground, base, forest, spawns, bounds } do
	for _, d in f:GetDescendants() do
		if d:IsA("BasePart") then
			parts += 1
		end
	end
end
local report = `[BuildBaseMap] Готово: {treeCount} деревьев, {parts} деталей. Старая карта — в ServerStorage.OldMap`
print(report)
return report
