--[[
	ImportBlenderMap — собирает в Workspace карту, выгруженную из Blender
	(tools/blender/export_map.py → BrainrotMap.json).

	КАК ЗАПУСТИТЬ: выполнить в Command Bar (или через MCP execute_luau).
	Откроется окно выбора файла — выберите BrainrotMap.json (лежит в «Загрузках»).
	Ход работы пишется в Output и в _G.MapImportStatus.

	Что делает:
	  • старую карту (Map, BasePlots, Cannons, WallLanes, BossZone) переносит в ServerStorage.OldMap;
	  • удаляет прошлую версию этой карты (Ground, Base, Forest, EnemySpawns, MapBounds);
	  • строит Part'ы по данным из файла: папки/модели по путям, невидимые маркеры,
	    SpawnLocation, свет в фонарях, надпись на табличке ратуши;
	  • настраивает Lighting (день над поляной, тёмно-зелёная дымка над лесом).
]]

local HttpService = game:GetService("HttpService")
local Lighting = game:GetService("Lighting")
local ServerStorage = game:GetService("ServerStorage")
local StudioService = game:GetService("StudioService")

-- Флаги — те же, что в build_map.py
local F_MARKER, F_TOUCH, F_COLLIDE, F_SPAWN, F_NOSHADOW = 1, 2, 4, 8, 16
local TOP_LEVEL = { "Ground", "Base", "Forest", "EnemySpawns", "MapBounds" }
local OLD_MAP = { "Map", "BasePlots", "Cannons", "WallLanes", "BossZone" }
local PARTS_PER_YIELD = 400

local function setStatus(text: string)
	_G.MapImportStatus = text
	print("[ImportBlenderMap] " .. text)
end

local function hasFlag(flags: number, f: number): boolean
	return bit32.band(flags, f) ~= 0
end

local function build(data)
	-- 1. Старая карта — в архив, прошлая версия новой — удалить
	local archive = ServerStorage:FindFirstChild("OldMap")
	if not archive then
		archive = Instance.new("Folder")
		archive.Name = "OldMap"
		archive.Parent = ServerStorage
	end
	for _, name in OLD_MAP do
		local old = workspace:FindFirstChild(name)
		if old then
			local prev = archive:FindFirstChild(name)
			if prev then
				prev:Destroy()
			end
			old.Parent = archive
		end
	end
	for _, name in { "Baseplate", "SpawnLocation", table.unpack(TOP_LEVEL) } do
		local old = workspace:FindFirstChild(name)
		if old then
			old:Destroy()
		end
	end

	-- 2. Контейнеры по путям ("Base/TownHall" → Model или Folder)
	local containers: { [string]: Instance } = {}
	local function container(path: string): Instance
		local existing = containers[path]
		if existing then
			return existing
		end
		local parentPath, leaf = string.match(path, "^(.*)/([^/]+)$")
		local parent = if parentPath then container(parentPath) else workspace
		leaf = leaf or path
		local inst = Instance.new(if data.models[path] ~= nil then "Model" else "Folder")
		inst.Name = leaf
		inst.Parent = parent
		containers[path] = inst
		return inst
	end

	-- 3. Детали
	local total = #data.parts
	for i, p in data.parts do
		local path, name = p[1], p[2]
		local flags: number = p[14]
		local extra = p[15]
		local isSpawn = hasFlag(flags, F_SPAWN)

		local part: BasePart = Instance.new(if isSpawn then "SpawnLocation" else "Part") :: any
		part.Name = name
		part.Anchored = true
		part.Size = Vector3.new(p[6], p[7], p[8])
		part.CFrame = CFrame.new(p[3], p[4], p[5]) * CFrame.Angles(0, p[9], 0)
		part.Color = Color3.fromRGB(p[10], p[11], p[12])
		local ok, mat = pcall(function()
			return (Enum.Material :: any)[p[13]]
		end)
		part.Material = if ok and mat then mat else Enum.Material.SmoothPlastic
		part.TopSurface = Enum.SurfaceType.Smooth
		part.BottomSurface = Enum.SurfaceType.Smooth

		if hasFlag(flags, F_MARKER) then
			part.Transparency = 1
			part.CanCollide = hasFlag(flags, F_COLLIDE)
			part.CanQuery = false
			part.CanTouch = hasFlag(flags, F_TOUCH)
			part.CastShadow = false
		end
		if hasFlag(flags, F_NOSHADOW) then
			part.CastShadow = false
		end
		if isSpawn then
			local spawn = part :: SpawnLocation
			spawn.Neutral = true
			spawn.Duration = 0
		end

		if type(extra) == "table" then
			if extra.light_range then
				local light = Instance.new("PointLight")
				light.Range = extra.light_range
				light.Brightness = extra.light_brightness or 1
				light.Color = part.Color
				light.Parent = part
			end
			if extra.label then
				local gui = Instance.new("SurfaceGui")
				gui.Name = "Label"
				gui.Face = (Enum.NormalId :: any)[extra.face or "Front"]
				gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
				gui.PixelsPerStud = 25
				gui.LightInfluence = 0
				local t = Instance.new("TextLabel")
				t.Size = UDim2.fromScale(1, 1)
				t.BackgroundTransparency = 1
				local fontOk, font = pcall(function()
					return (Enum.Font :: any)[extra.font or "FredokaOne"]
				end)
				t.Font = if fontOk and font then font else Enum.Font.FredokaOne
				t.TextScaled = true
				t.Text = extra.label
				local tc = extra.textcolor
				t.TextColor3 = if tc then Color3.fromRGB(tc[1], tc[2], tc[3]) else Color3.new(1, 1, 1)
				local sc = extra.stroke
				t.TextStrokeColor3 = if sc then Color3.fromRGB(sc[1], sc[2], sc[3]) else Color3.new(0, 0, 0)
				t.TextStrokeTransparency = 0
				t.Parent = gui
				gui.Parent = part
			end
			if extra.slot then
				part:SetAttribute("SlotIndex", extra.slot)
			end
			-- Ключи вида attr_Имя становятся атрибутами (IsCrystal, MaxHP, Row…)
			for key, value in extra do
				if string.sub(key, 1, 5) == "attr_" then
					part:SetAttribute(string.sub(key, 6), value)
				end
			end
		end

		part.Parent = container(path)
		if i % PARTS_PER_YIELD == 0 then
			setStatus(`строю: {i}/{total}`)
			task.wait()
		end
	end

	-- 4. PrimaryPart у моделей и номер слота у подиумов
	for path, primaryName in data.models do
		local model = containers[path]
		if model and model:IsA("Model") and primaryName ~= "" then
			local primary = model:FindFirstChild(primaryName)
			if primary then
				model.PrimaryPart = primary
			end
		end
		local slot = string.match(path, "Plot(%d+)$")
		if model and slot then
			model:SetAttribute("SlotIndex", tonumber(slot))
		end
	end

	-- 5. Свет
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
	atmosphere.Decay = Color3.fromRGB(35, 55, 35)
	atmosphere.Glare = 0
	atmosphere.Haze = 1.2
	atmosphere.Parent = Lighting

	setStatus(`готово: {total} деталей`)
end

setStatus("ожидаю выбор файла BrainrotMap.json")
task.spawn(function()
	local ok, file = pcall(function()
		return StudioService:PromptImportFile({ "json" })
	end)
	if not ok then
		setStatus("ошибка окна выбора: " .. tostring(file))
		return
	end
	if not file then
		setStatus("файл не выбран")
		return
	end
	local decodedOk, data = pcall(HttpService.JSONDecode, HttpService, file:GetBinaryContents())
	if not decodedOk or type(data) ~= "table" or not data.parts then
		setStatus("файл не похож на BrainrotMap.json")
		return
	end
	local buildOk, err = pcall(build, data)
	if not buildOk then
		setStatus("ошибка постройки: " .. tostring(err))
	end
end)
