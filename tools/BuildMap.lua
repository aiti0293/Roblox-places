--[[
	BuildMap — строит всю карту игры в Workspace.

	КАК ЗАПУСТИТЬ: вставить весь файл в Command Bar в Studio и нажать Enter
	(или выполнить через MCP execute_luau). Можно запускать повторно —
	старая карта удаляется и строится заново.

	Скрипты игры ищут объекты по именам, поэтому имена НЕ менять:
	  Workspace.BasePlots/Plot1..Plot6   (Floor, Walls, RedButton, Slots/1..10,
	                                      Doorway/Lasers, SafeZone, SpawnLocation, PlotSign)
	  Workspace.Cannons/Cannon1..Cannon3 (Platform, Carriage+HitPrompt, Barrel, Muzzle)
	  Workspace.WallLanes/Lane1..Lane6   (невидимые маркеры 48×30×3 — тут WallService строит кирпичи)
	  Workspace.BossZone/<BossId>        (SleepPoint, Pedestal, BrainrotSpot)
	Декор лежит отдельно в Workspace.Map.

	Раскладка (коридор вдоль оси Z, ширина 320):
	  Z ≈ 0    — базы игроков (Plot1..Plot6 в ряд по X, шаг 50)
	  Z ≈ 80   — Shooting Zone (3 пушки)
	  Z = 160  — линия стен (у каждого игрока своя дорожка, Lane i напротив Plot i)
	  Z 165..445 — Boss Zone
]]

local Lighting = game:GetService("Lighting")

----------------------------------------------------------------------
-- Раскладка
----------------------------------------------------------------------

local L = {
	HalfWidth = 160, -- коридор от X = -160 до X = 160
	StartZ = -75, -- задний край карты (за базами)
	EndZ = 445, -- конец Boss Zone
	FenceHeight = 120, -- высота боковых ограждений

	PlotStep = 50, -- шаг между базами по X
	PlotWallHeight = 12,

	CannonZ = 80, -- Shooting Zone (≈60 studs за базами)
	CannonX = { -70, 0, 70 },
	CannonElevation = 25, -- угол подъёма ствола (градусы)

	WallZ = 160, -- линия стен (≈80 studs за пушками)
	LaneSize = Vector3.new(48, 30, 3), -- = WallGridSize (12×10) × WallBrickSize (4×3×3)

	BossZoneStartZ = 165,
	BossZ = 385, -- линия логов боссов
}

-- Центр базы / дорожки стены №i по оси X
local function laneX(i: number): number
	return -125 + (i - 1) * L.PlotStep
end

----------------------------------------------------------------------
-- Цвета (яркий мультяшный стиль)
----------------------------------------------------------------------

local COL = {
	Grass = Color3.fromRGB(120, 210, 90),
	Sand = Color3.fromRGB(255, 214, 120),
	WallZoneFloor = Color3.fromRGB(150, 170, 205),
	BossFloor = Color3.fromRGB(55, 45, 70),
	Fence = Color3.fromRGB(110, 175, 255),
	FenceDark = Color3.fromRGB(45, 35, 60),
	White = Color3.fromRGB(245, 245, 250),
	Laser = Color3.fromRGB(255, 30, 30),
	Button = Color3.fromRGB(255, 40, 40),
	Metal = Color3.fromRGB(60, 62, 75),
	Gold = Color3.fromRGB(255, 200, 40),
	Wood = Color3.fromRGB(160, 100, 55),
	Leaves = Color3.fromRGB(70, 190, 70),
	Gate = Color3.fromRGB(125, 115, 160),
	Cyan = Color3.fromRGB(0, 230, 255),
	Purple = Color3.fromRGB(170, 70, 255),
}

local PLOT_COLORS = {
	Color3.fromRGB(80, 160, 255),
	Color3.fromRGB(90, 220, 120),
	Color3.fromRGB(255, 150, 50),
	Color3.fromRGB(170, 100, 255),
	Color3.fromRGB(255, 110, 180),
	Color3.fromRGB(60, 210, 210),
}

local NEON = Enum.Material.Neon
local CYL = Enum.PartType.Cylinder
local BALL = Enum.PartType.Ball

----------------------------------------------------------------------
-- Хелперы
----------------------------------------------------------------------

local function folder(parent: Instance, name: string): Folder
	local f = Instance.new("Folder")
	f.Name = name
	f.Parent = parent
	return f
end

-- Создать Anchored-часть. opts: Shape, Material, Transparency, CanCollide, CanTouch, CanQuery, CastShadow
local function part(parent: Instance, name: string, size: Vector3, cf: CFrame | Vector3, color: Color3, opts: { [string]: any }?): Part
	local o = opts or {}
	local p = Instance.new("Part")
	if o.Shape then
		p.Shape = o.Shape
	end
	p.Name = name
	p.Anchored = true
	p.Size = size
	p.CFrame = if typeof(cf) == "Vector3" then CFrame.new(cf) else cf :: CFrame
	p.Color = color
	p.Material = o.Material or Enum.Material.SmoothPlastic
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	if o.Transparency then
		p.Transparency = o.Transparency
	end
	if o.CanCollide ~= nil then
		p.CanCollide = o.CanCollide
	end
	if o.CanTouch ~= nil then
		p.CanTouch = o.CanTouch
	end
	if o.CanQuery ~= nil then
		p.CanQuery = o.CanQuery
	end
	if o.CastShadow ~= nil then
		p.CastShadow = o.CastShadow
	end
	p.Parent = parent
	return p
end

-- Невидимая служебная часть (маркер или зона)
local function marker(parent: Instance, name: string, size: Vector3, cf: CFrame | Vector3, canTouch: boolean?): Part
	return part(parent, name, size, cf, COL.White, {
		Transparency = 1,
		CanCollide = false,
		CanQuery = false,
		CanTouch = canTouch == true,
		CastShadow = false,
	})
end

-- Вертикальный цилиндр (ось цилиндра в Roblox — X, поворачиваем её вверх)
local UP = CFrame.Angles(0, 0, math.rad(90))
local function cylinderY(parent: Instance, name: string, height: number, diameter: number, pos: Vector3, color: Color3, opts: { [string]: any }?): Part
	local o = opts or {}
	o.Shape = CYL
	return part(parent, name, Vector3.new(height, diameter, diameter), CFrame.new(pos) * UP, color, o)
end

-- Цилиндр, ось которого смотрит вдоль направления dir
local function cylinderAlong(parent: Instance, name: string, length: number, diameter: number, center: Vector3, dir: Vector3, color: Color3): Part
	local cf = CFrame.lookAt(center, center + dir) * CFrame.Angles(0, math.rad(90), 0)
	return part(parent, name, Vector3.new(length, diameter, diameter), cf, color, { Shape = CYL })
end

-- Надпись на грани части
local function label(p: BasePart, text: string, face: Enum.NormalId?, textColor: Color3?, pixelsPerStud: number?)
	local gui = Instance.new("SurfaceGui")
	gui.Name = "Label"
	gui.Face = face or Enum.NormalId.Front
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.PixelsPerStud = pixelsPerStud or 25
	gui.LightInfluence = 0
	local t = Instance.new("TextLabel")
	t.Name = "Text"
	t.Size = UDim2.fromScale(1, 1)
	t.BackgroundTransparency = 1
	t.Font = Enum.Font.FredokaOne
	t.TextScaled = true
	t.Text = text
	t.TextColor3 = textColor or Color3.new(1, 1, 1)
	t.TextStrokeTransparency = 0
	t.TextStrokeColor3 = Color3.fromRGB(30, 30, 40)
	t.Parent = gui
	gui.Parent = p
end

-- Факел: столб + чаша + неоновое пламя со светом
local function torch(parent: Instance, pos: Vector3)
	local m = Instance.new("Model")
	m.Name = "Torch"
	part(m, "Post", Vector3.new(1.2, 9, 1.2), pos + Vector3.new(0, 4.5, 0), COL.Wood)
	part(m, "Bowl", Vector3.new(2.6, 1, 2.6), pos + Vector3.new(0, 9.3, 0), COL.Metal)
	local flame = part(m, "Flame", Vector3.new(1.8, 1.8, 1.8), pos + Vector3.new(0, 10.6, 0), Color3.fromRGB(255, 140, 30), {
		Shape = BALL,
		Material = NEON,
		CanCollide = false,
		CastShadow = false,
	})
	local light = Instance.new("PointLight")
	light.Color = Color3.fromRGB(255, 150, 60)
	light.Range = 28
	light.Brightness = 3
	light.Shadows = true
	light.Parent = flame
	m.Parent = parent
end

-- Дерево: ствол + шар листвы
local function tree(parent: Instance, pos: Vector3, leaves: Color3, scale: number)
	local m = Instance.new("Model")
	m.Name = "Tree"
	cylinderY(m, "Trunk", 8 * scale, 2.5 * scale, pos + Vector3.new(0, 4 * scale, 0), COL.Wood)
	part(m, "Leaves", Vector3.one * 12 * scale, pos + Vector3.new(0, 11 * scale, 0), leaves, { Shape = BALL })
	m.Parent = parent
end

----------------------------------------------------------------------
-- 0. Очистка
----------------------------------------------------------------------

for _, name in { "Baseplate", "SpawnLocation", "Map", "BasePlots", "Cannons", "WallLanes", "BossZone" } do
	local old = workspace:FindFirstChild(name)
	if old then
		old:Destroy()
	end
end

local map = folder(workspace, "Map")

----------------------------------------------------------------------
-- 1. Земля и ограждения
----------------------------------------------------------------------

local ground = folder(map, "Ground")
local FULL_W = L.HalfWidth * 2 + 12 -- с запасом под ограждения

local function floorSegment(name: string, z1: number, z2: number, color: Color3)
	part(ground, name, Vector3.new(FULL_W, 2, z2 - z1), Vector3.new(0, -1, (z1 + z2) / 2), color)
end

floorSegment("BaseZoneFloor", L.StartZ - 6, 45, COL.Grass)
floorSegment("ShootingZoneFloor", 45, 125, COL.Sand)
floorSegment("WallZoneFloor", 125, L.BossZoneStartZ, COL.WallZoneFloor)
floorSegment("BossZoneFloor", L.BossZoneStartZ, L.EndZ + 6, COL.BossFloor)

-- Песчаные дорожки от дверей баз к Shooting Zone
for i = 1, 6 do
	part(ground, "Path" .. i, Vector3.new(10, 0.2, 25), Vector3.new(laneX(i), 0.1, 32.5), COL.Sand)
end

local bounds = folder(map, "Boundaries")
local H = L.FenceHeight
local brightLen = L.BossZoneStartZ - L.StartZ
local darkLen = L.EndZ - L.BossZoneStartZ
for _, side in { -1, 1 } do
	local x = side * (L.HalfWidth + 3)
	local sideName = if side < 0 then "Left" else "Right"
	part(bounds, "Fence" .. sideName, Vector3.new(6, H, brightLen), Vector3.new(x, H / 2, L.StartZ + brightLen / 2), COL.Fence)
	part(bounds, "FenceBoss" .. sideName, Vector3.new(6, H, darkLen), Vector3.new(x, H / 2, L.BossZoneStartZ + darkLen / 2), COL.FenceDark)
	part(bounds, "Stripe" .. sideName, Vector3.new(6.4, 2, brightLen), Vector3.new(x, 8, L.StartZ + brightLen / 2), COL.White, { Material = NEON })
	part(bounds, "StripeBoss" .. sideName, Vector3.new(6.4, 2, darkLen), Vector3.new(x, 8, L.BossZoneStartZ + darkLen / 2), COL.Purple, { Material = NEON })
end
part(bounds, "FenceBack", Vector3.new(FULL_W, H, 6), Vector3.new(0, H / 2, L.StartZ - 3), COL.Fence)
part(bounds, "FenceEnd", Vector3.new(FULL_W, H, 6), Vector3.new(0, H / 2, L.EndZ + 3), COL.FenceDark)
-- Невидимый потолок, чтобы не вылететь за карту из пушки
part(bounds, "Ceiling", Vector3.new(FULL_W, 2, L.EndZ - L.StartZ + 12), Vector3.new(0, H + 1, (L.StartZ + L.EndZ) / 2), COL.White, {
	Transparency = 1,
	CastShadow = false,
})

----------------------------------------------------------------------
-- 2. Базы игроков: Workspace.BasePlots/Plot1..Plot6
----------------------------------------------------------------------

local plots = folder(workspace, "BasePlots")

-- Позиции слотов относительно центра базы (X, Z): 4 у задней стены, по 3 у боковых
local SLOT_OFFSETS = {
	Vector2.new(-13.5, -14), Vector2.new(-4.5, -14), Vector2.new(4.5, -14), Vector2.new(13.5, -14),
	Vector2.new(-14, -4), Vector2.new(-14, 4), Vector2.new(-14, 12),
	Vector2.new(14, -4), Vector2.new(14, 4), Vector2.new(14, 12),
}

for i = 1, 6 do
	local x = laneX(i)
	local c = PLOT_COLORS[i]
	local m = Instance.new("Model")
	m.Name = "Plot" .. i
	m:SetAttribute("PlotIndex", i)

	-- Пол 40×40 (верх на Y = 1)
	local floorPart = part(m, "Floor", Vector3.new(40, 1, 40), Vector3.new(x, 0.5, 0), c)

	-- Стены с ОДНИМ дверным проёмом (10 шириной) в сторону пушек (+Z)
	local walls = folder(m, "Walls")
	local wh = L.PlotWallHeight
	local wy = 1 + wh / 2
	part(walls, "Back", Vector3.new(40, wh, 2), Vector3.new(x, wy, -19), COL.White)
	part(walls, "Left", Vector3.new(2, wh, 36), Vector3.new(x - 19, wy, 0), COL.White)
	part(walls, "Right", Vector3.new(2, wh, 36), Vector3.new(x + 19, wy, 0), COL.White)
	part(walls, "FrontLeft", Vector3.new(15, wh, 2), Vector3.new(x - 12.5, wy, 19), COL.White)
	part(walls, "FrontRight", Vector3.new(15, wh, 2), Vector3.new(x + 12.5, wy, 19), COL.White)
	part(walls, "DoorTop", Vector3.new(10, 2, 2), Vector3.new(x, wh, 19), COL.White)
	-- Неоновые «крышки» стен цвета базы
	local capY = 1 + wh + 0.3
	part(walls, "CapBack", Vector3.new(40.4, 0.6, 2.4), Vector3.new(x, capY, -19), c, { Material = NEON })
	part(walls, "CapFront", Vector3.new(40.4, 0.6, 2.4), Vector3.new(x, capY, 19), c, { Material = NEON })
	part(walls, "CapLeft", Vector3.new(2.4, 0.6, 36), Vector3.new(x - 19, capY, 0), c, { Material = NEON })
	part(walls, "CapRight", Vector3.new(2.4, 0.6, 36), Vector3.new(x + 19, capY, 0), c, { Material = NEON })

	-- Красная кнопка в центре
	cylinderY(m, "RedButtonBase", 1.5, 9, Vector3.new(x, 1.75, 0), COL.Metal)
	cylinderY(m, "RedButton", 1, 6.5, Vector3.new(x, 3, 0), COL.Button)

	-- Слоты 1..10 вдоль стен
	local slots = folder(m, "Slots")
	for n, off in SLOT_OFFSETS do
		local pad = part(slots, tostring(n), Vector3.new(5, 0.6, 5), Vector3.new(x + off.X, 1.3, off.Y), c:Lerp(COL.White, 0.6))
		pad:SetAttribute("SlotIndex", n)
	end

	-- Дверной проём: стойки + лазеры (по умолчанию ВЫКЛЮЧЕНЫ)
	local doorway = folder(m, "Doorway")
	part(doorway, "PostLeft", Vector3.new(1, 10, 1), Vector3.new(x - 4.5, 6, 19), COL.Metal)
	part(doorway, "PostRight", Vector3.new(1, 10, 1), Vector3.new(x + 4.5, 6, 19), COL.Metal)
	local lasers = folder(doorway, "Lasers")
	for k, h in { 2.5, 4.5, 6.5, 8.5 } do
		part(lasers, "Laser" .. k, Vector3.new(8, 0.35, 0.35), Vector3.new(x, h, 19), COL.Laser, {
			Material = NEON,
			Transparency = 1,
			CanCollide = false,
			CanQuery = false,
			CastShadow = false,
		})
	end

	-- Safe Zone — невидимая зона на всю базу
	marker(m, "SafeZone", Vector3.new(40, 16, 40), Vector3.new(x, 9, 0), true)

	-- Точка появления игрока внутри базы
	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "SpawnLocation"
	spawn.Anchored = true
	spawn.Size = Vector3.new(6, 1, 6)
	spawn.Position = Vector3.new(x, 1, 10)
	spawn.Color = c
	spawn.Material = Enum.Material.SmoothPlastic
	spawn.TopSurface = Enum.SurfaceType.Smooth
	spawn.Neutral = true
	spawn.Duration = 0
	spawn.Parent = m

	-- Табличка над дверью (BaseService позже впишет имя владельца в Label.Text)
	local sign = part(m, "PlotSign", Vector3.new(16, 3.5, 0.6), Vector3.new(x, 15.5, 19.6), c)
	label(sign, "БАЗА " .. i, Enum.NormalId.Back)

	m.PrimaryPart = floorPart
	m.Parent = plots
end

----------------------------------------------------------------------
-- 3. Shooting Zone: Workspace.Cannons/Cannon1..Cannon3
----------------------------------------------------------------------

local cannons = folder(workspace, "Cannons")
local elev = math.rad(L.CannonElevation)
local DIR = Vector3.new(0, math.sin(elev), math.cos(elev)) -- ствол смотрит вдоль коридора на стены

for i, x in L.CannonX do
	local z = L.CannonZ
	local m = Instance.new("Model")
	m.Name = "Cannon" .. i

	local platform = cylinderY(m, "Platform", 2, 20, Vector3.new(x, 1, z), COL.Gold)
	local carriage = part(m, "Carriage", Vector3.new(7, 4, 9), Vector3.new(x, 4, z), COL.Wood)
	part(m, "WheelLeft", Vector3.new(1.5, 7, 7), Vector3.new(x - 4.25, 5.5, z), COL.Metal, { Shape = CYL })
	part(m, "WheelRight", Vector3.new(1.5, 7, 7), Vector3.new(x + 4.25, 5.5, z), COL.Metal, { Shape = CYL })

	local barrelCenter = Vector3.new(x, 7, z) + DIR * 3
	cylinderAlong(m, "Barrel", 14, 5, barrelCenter, DIR, COL.Metal)
	local tip = barrelCenter + DIR * 7
	cylinderAlong(m, "MuzzleRing", 1.4, 6, tip - DIR * 0.7, DIR, COL.Gold)
	-- Точка вылета: LookVector = направление выстрела
	marker(m, "Muzzle", Vector3.new(2, 2, 2), CFrame.lookAt(tip + DIR, tip + DIR * 2))

	local prompt = Instance.new("ProximityPrompt")
	prompt.Name = "HitPrompt"
	prompt.ActionText = "Hit"
	prompt.ObjectText = "Пушка " .. i
	prompt.HoldDuration = 0
	prompt.MaxActivationDistance = 12
	prompt.RequiresLineOfSight = false
	prompt.Parent = carriage

	m:SetAttribute("CannonIndex", i)
	m.PrimaryPart = platform
	m.Parent = cannons
end

-- Арка «SHOOTING ZONE»
local shooting = folder(map, "ShootingZone")
part(shooting, "ArchPostLeft", Vector3.new(3, 36, 3), Vector3.new(-46, 18, 50), COL.White)
part(shooting, "ArchPostRight", Vector3.new(3, 36, 3), Vector3.new(46, 18, 50), COL.White)
local board = part(shooting, "ShootingZoneSign", Vector3.new(95, 12, 1.5), Vector3.new(0, 31, 50), COL.Gold)
label(board, "SHOOTING ZONE", Enum.NormalId.Front, Color3.fromRGB(255, 60, 60), 10)
label(board, "SHOOTING ZONE", Enum.NormalId.Back, Color3.fromRGB(255, 60, 60), 10)

----------------------------------------------------------------------
-- 4. Стены: Workspace.WallLanes/Lane1..Lane6 (маркеры) + перегородки
----------------------------------------------------------------------

local lanes = folder(workspace, "WallLanes")
for i = 1, 6 do
	local lane = marker(lanes, "Lane" .. i, L.LaneSize, Vector3.new(laneX(i), L.LaneSize.Y / 2, L.WallZ))
	lane:SetAttribute("LaneIndex", i)
end

local wallZone = folder(map, "WallZone")
-- Тонкие перегородки между дорожками (до самой линии стен)
for i = 1, 5 do
	local x = laneX(i) + L.PlotStep / 2
	part(wallZone, "Divider" .. i, Vector3.new(2, 30, 40), Vector3.new(x, 15, L.WallZ - 18.5), Color3.fromRGB(230, 240, 255))
	part(wallZone, "DividerCap" .. i, Vector3.new(2.4, 0.8, 40), Vector3.new(x, 30.4, L.WallZ - 18.5), COL.Cyan, { Material = NEON })
end
-- Заглушки по краям (между крайними дорожками и ограждением)
part(wallZone, "EdgeBlockLeft", Vector3.new(11, 30, 3), Vector3.new(-154.5, 15, L.WallZ), COL.Gate)
part(wallZone, "EdgeBlockRight", Vector3.new(11, 30, 3), Vector3.new(154.5, 15, L.WallZ), COL.Gate)
-- Огромная перемычка над стенами: перелететь стену поверху нельзя
part(wallZone, "GateTop", Vector3.new(L.HalfWidth * 2, H - 30, 6), Vector3.new(0, 30 + (H - 30) / 2, L.WallZ), COL.Gate)
part(wallZone, "GateStripe", Vector3.new(L.HalfWidth * 2, 1.5, 6.4), Vector3.new(0, 31, L.WallZ), COL.Cyan, { Material = NEON })
local gateSign = part(wallZone, "GateSign", Vector3.new(200, 14, 1), Vector3.new(0, 48, L.WallZ - 3.5), COL.Gold)
label(gateSign, "ЛОМАЙ СТЕНУ — ЛЕТИ К БОССАМ!", Enum.NormalId.Front, Color3.fromRGB(255, 60, 60), 10)
for i = 1, 6 do
	local plate = part(wallZone, "LaneNumber" .. i, Vector3.new(8, 6, 0.6), Vector3.new(laneX(i), 35, L.WallZ - 3.3), PLOT_COLORS[i])
	label(plate, tostring(i), Enum.NormalId.Front)
end

----------------------------------------------------------------------
-- 5. Boss Zone: Workspace.BossZone/<BossId>
----------------------------------------------------------------------

local bossZone = folder(workspace, "BossZone")
local bossDecor = folder(map, "BossDecor")

local BOSSES = {
	{ Id = "StoneGolem", Name = "Каменный Голем", X = -95, Color = Color3.fromRGB(140, 135, 130), Accent = Color3.fromRGB(255, 170, 60) },
	{ Id = "IronKnight", Name = "Железный Рыцарь", X = 0, Color = Color3.fromRGB(120, 140, 180), Accent = Color3.fromRGB(80, 200, 255) },
	{ Id = "VoidKing", Name = "Король Пустоты", X = 95, Color = Color3.fromRGB(80, 40, 120), Accent = COL.Purple },
}

for _, b in BOSSES do
	local z = L.BossZ
	local m = Instance.new("Model")
	m.Name = b.Id

	local lair = cylinderY(m, "Lair", 1, 44, Vector3.new(b.X, 0.5, z), b.Color)
	cylinderY(m, "LairRim", 0.8, 46, Vector3.new(b.X, 0.4, z), b.Accent, { Material = NEON })
	-- Где спит босс (смотрит в сторону игроков, -Z)
	marker(m, "SleepPoint", Vector3.new(4, 1, 4), CFrame.lookAt(Vector3.new(b.X, 1.5, z + 8), Vector3.new(b.X, 1.5, z - 100)))
	-- Подиум с брейнротом перед боссом
	cylinderY(m, "Pedestal", 3, 9, Vector3.new(b.X, 2.5, z - 10), b.Accent)
	marker(m, "BrainrotSpot", Vector3.new(3, 0.2, 3), Vector3.new(b.X, 4.1, z - 10))
	-- Стела с именем босса
	local backdrop = part(m, "Backdrop", Vector3.new(30, 22, 3), Vector3.new(b.X, 11, z + 22), b.Color)
	label(backdrop, b.Name, Enum.NormalId.Front, b.Accent, 10)

	torch(m, Vector3.new(b.X - 18, 1, z - 14))
	torch(m, Vector3.new(b.X + 18, 1, z - 14))

	m.PrimaryPart = lair
	m.Parent = bossZone
end

-- Факелы вдоль стен Boss Zone
for z = 190, 430, 40 do
	torch(bossDecor, Vector3.new(-145, 0, z))
	torch(bossDecor, Vector3.new(145, 0, z))
end

-- Камни (фиксированный seed — карта всегда одинаковая)
local rng = Random.new(7)
local placed = 0
while placed < 32 do
	local pos = Vector3.new(rng:NextNumber(-150, 150), 0, rng:NextNumber(185, 440))
	local nearLair = false
	for _, b in BOSSES do
		if (Vector3.new(b.X, 0, L.BossZ) - pos).Magnitude < 32 then
			nearLair = true
		end
	end
	if not nearLair then
		placed += 1
		local s = rng:NextNumber(3, 9)
		local shade = rng:NextNumber(0.25, 0.45)
		part(bossDecor, "Rock", Vector3.new(s * rng:NextNumber(0.8, 1.4), s, s * rng:NextNumber(0.8, 1.4)),
			CFrame.new(pos + Vector3.new(0, s * 0.35, 0)) * CFrame.Angles(rng:NextNumber(-0.4, 0.4), rng:NextNumber(0, math.pi), rng:NextNumber(-0.4, 0.4)),
			Color3.new(shade, shade * 0.95, shade * 1.1))
	end
end

-- Фиолетовые кристаллы у Короля Пустоты
for k = 1, 5 do
	local a = k / 5 * math.pi * 2
	local pos = Vector3.new(95 + math.cos(a) * 27, 5, L.BossZ + math.sin(a) * 27)
	part(bossDecor, "VoidCrystal", Vector3.new(2.5, 10, 2.5), CFrame.new(pos) * CFrame.Angles(0.25, a, 0.2), COL.Purple, { Material = NEON })
end

----------------------------------------------------------------------
-- 6. Декор: бордюры, деревья, указатели
----------------------------------------------------------------------

local decor = folder(map, "Decor")

-- Красно-белые бордюры вдоль ограждений
local n = 0
for z = L.StartZ, 125, 10 do
	n += 1
	local col = if n % 2 == 0 then Color3.fromRGB(255, 70, 70) else COL.White
	part(decor, "Curb", Vector3.new(6, 1, 10), Vector3.new(-157, 0.5, z + 5), col)
	part(decor, "Curb", Vector3.new(6, 1, 10), Vector3.new(157, 0.5, z + 5), col)
end

-- Деревья за базами и кусты между базами
local leafColors = { COL.Leaves, Color3.fromRGB(255, 140, 200), Color3.fromRGB(110, 220, 90) }
for k = 0, 7 do
	tree(decor, Vector3.new(-140 + k * 40, 0, -52 + (k % 2) * 8), leafColors[k % 3 + 1], 1 + (k % 3) * 0.15)
end
for i = 1, 5 do
	part(decor, "Bush", Vector3.new(7, 6, 7), Vector3.new(laneX(i) + 25, 2.5, -10), COL.Leaves, { Shape = BALL })
	part(decor, "Bush", Vector3.new(6, 5, 6), Vector3.new(laneX(i) + 25, 2, 6), Color3.fromRGB(90, 200, 80), { Shape = BALL })
end

-- Указатели со стрелками
local function arrowSign(name: string, text: string, pos: Vector3, color: Color3)
	part(decor, name .. "Post", Vector3.new(1, 10, 1), pos + Vector3.new(0, 5, 0), COL.Wood)
	local b = part(decor, name, Vector3.new(16, 4, 0.5), pos + Vector3.new(0, 10, 0), color)
	label(b, text, Enum.NormalId.Front, Color3.new(1, 1, 1), 20)
end
arrowSign("SignToCannonsL", "▲ К ПУШКАМ ▲", Vector3.new(-148, 0, 40), Color3.fromRGB(255, 120, 40))
arrowSign("SignToCannonsR", "▲ К ПУШКАМ ▲", Vector3.new(148, 0, 40), Color3.fromRGB(255, 120, 40))
arrowSign("SignToWallsL", "▲ К СТЕНАМ ▲", Vector3.new(-140, 0, 112), Color3.fromRGB(60, 140, 255))
arrowSign("SignToWallsR", "▲ К СТЕНАМ ▲", Vector3.new(140, 0, 112), Color3.fromRGB(60, 140, 255))
arrowSign("SignBossesL", "⚠ БОССЫ СПЯТ ⚠", Vector3.new(-135, 0, 200), Color3.fromRGB(150, 50, 200))
arrowSign("SignBossesR", "⚠ БОССЫ СПЯТ ⚠", Vector3.new(135, 0, 200), Color3.fromRGB(150, 50, 200))

----------------------------------------------------------------------
-- 7. Свет: дневное небо, мягкие тени, сочные цвета
----------------------------------------------------------------------

Lighting.ClockTime = 14
Lighting.Brightness = 3
Lighting.GlobalShadows = true
Lighting.ShadowSoftness = 0.5
Lighting.Ambient = Color3.fromRGB(60, 60, 70)
Lighting.OutdoorAmbient = Color3.fromRGB(140, 140, 155)
Lighting.EnvironmentDiffuseScale = 1
Lighting.EnvironmentSpecularScale = 0.4
pcall(function()
	(Lighting :: any).Technology = Enum.Technology.Future
end)

if not Lighting:FindFirstChildOfClass("Sky") then
	local sky = Instance.new("Sky")
	sky.Parent = Lighting
end

local atmosphere = Lighting:FindFirstChildOfClass("Atmosphere") or Instance.new("Atmosphere")
atmosphere.Density = 0.25
atmosphere.Offset = 0
atmosphere.Color = Color3.fromRGB(200, 220, 255)
atmosphere.Decay = Color3.fromRGB(110, 130, 170)
atmosphere.Glare = 0
atmosphere.Haze = 0.5
atmosphere.Parent = Lighting

local cc = Lighting:FindFirstChild("MapColor") or Instance.new("ColorCorrectionEffect")
cc.Name = "MapColor"
;(cc :: ColorCorrectionEffect).Saturation = 0.15
;(cc :: ColorCorrectionEffect).Contrast = 0.05
cc.Parent = Lighting

local count = 0
for _, f in { map, plots, cannons, lanes, bossZone } do
	for _, d in f:GetDescendants() do
		if d:IsA("BasePart") then
			count += 1
		end
	end
end
local report = `[BuildMap] Готово: {count} деталей`
print(report)
return report
