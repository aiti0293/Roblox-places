--!strict
--[[
	WaveService — waves of voxel wolves coming out of the forest.

	Loop (only while the base has an owner):
	  Intermission (countdown) -> Wave N: wolves spawn at Workspace.EnemySpawns,
	  walk straight to the Town Hall along the trails and bite it ->
	  all wolves dead: +WaveClearBonus, next wave.
	If the Town Hall HP reaches 0, the wolves steal LossShare of the owner's money,
	the wave ends and the Town Hall is restored.

	Enemies are anchored voxel models moved on the server every frame (no physics).
	State for the UI lives in attributes:
	  Workspace.Base: WaveNumber, WaveState ("Waiting" | "Intermission" | "Wave"), NextWaveIn
	  Workspace.Base.TownHall: HP, MaxHP
	API for UnitService: GetEnemies(), DamageEnemy(enemy, amount).
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local DataConfig = require(ReplicatedStorage.Shared.DataConfig)
local EnemyModels = require(ReplicatedStorage.Shared.EnemyModels)

local WaveConfig = DataConfig.WaveConfig

export type Enemy = {
	Info: DataConfig.EnemyInfo,
	Model: Model,
	HP: number,
	Alive: boolean,
	Position: Vector3, -- ground position
	AimOffset: number, -- height of the body center above the ground
	Cooldown: number,
	Bob: number,
	JawOpen: boolean,
	Bar: Frame,
}

local WaveService = {}

local Save: any
local BaseService: any
local base: Model
local townHall: Model
local spawnPoints: { BasePart } = {}
local folder: Folder
local enemies: { Enemy } = {}
local hallHP = WaveConfig.TownHallMaxHP
local hallDestroyed = false
local waveNumber = 0

----------------------------------------------------------------------
-- Helpers
----------------------------------------------------------------------

local function notifyOwner(message: string)
	local owner = BaseService.Owner
	if owner then
		(ReplicatedStorage.Remotes :: any).Notify:FireClient(owner, message)
	end
end

-- Ground height along the path: marble platform, plaza, grass/trails
local function groundY(pos: Vector3): number
	local r = Vector2.new(pos.X, pos.Z).Magnitude
	if r >= 34 and r <= 72 then
		return 1.7
	elseif r <= 19 then
		return 1
	end
	return 0.5
end

local function setHallHP(value: number)
	hallHP = math.max(0, value)
	townHall:SetAttribute("HP", hallHP)
	townHall:SetAttribute("MaxHP", WaveConfig.TownHallMaxHP)
end

local function setState(state: string)
	base:SetAttribute("WaveState", state)
	base:SetAttribute("WaveNumber", waveNumber)
end

local function makeHealthBar(model: Model, height: number): Frame
	local gui = Instance.new("BillboardGui")
	gui.Name = "HealthBar"
	gui.Size = UDim2.fromOffset(60, 7)
	gui.StudsOffset = Vector3.new(0, height + 1, 0)
	gui.AlwaysOnTop = true
	gui.MaxDistance = 120
	local back = Instance.new("Frame")
	back.Size = UDim2.fromScale(1, 1)
	back.BackgroundColor3 = Color3.fromRGB(20, 20, 20)
	back.BorderSizePixel = 0
	back.Parent = gui
	local fill = Instance.new("Frame")
	fill.Name = "Fill"
	fill.Size = UDim2.fromScale(1, 1)
	fill.BackgroundColor3 = Color3.fromRGB(220, 30, 30)
	fill.BorderSizePixel = 0
	fill.Parent = back
	gui.Parent = model.PrimaryPart
	return fill
end

local function placeEnemy(enemy: Enemy)
	local pos = enemy.Position
	local bobY = math.abs(math.sin(enemy.Bob * 1.5)) * 0.3
	local ground = Vector3.new(pos.X, groundY(pos) + bobY, pos.Z)
	local look = Vector3.new(0, ground.Y, 0)
	if (look - ground).Magnitude < 0.1 then
		look = ground + Vector3.new(0, 0, -1)
	end
	enemy.Model:PivotTo(CFrame.lookAt(ground, look)) -- models face -Z = towards the Town Hall
end

local function setJaw(enemy: Enemy, open: boolean)
	if enemy.JawOpen == open or not enemy.Alive then
		return
	end
	enemy.JawOpen = open
	local jaw = enemy.Model:FindFirstChild("LowerJaw") :: Model?
	if jaw then
		local angle = if open then EnemyModels.JawOpenAngle else -EnemyModels.JawOpenAngle
		jaw:PivotTo(jaw:GetPivot() * CFrame.Angles(angle, 0, 0))
	end
end

local function removeEnemy(enemy: Enemy)
	enemy.Alive = false
	enemy.Model:Destroy()
	local index = table.find(enemies, enemy)
	if index then
		table.remove(enemies, index)
	end
end

local function clearEnemies()
	for i = #enemies, 1, -1 do
		removeEnemy(enemies[i])
	end
end

local function spawnEnemy(id: string)
	local info = DataConfig.GetEnemy(id)
	if not info or #spawnPoints == 0 then
		return
	end
	local point = spawnPoints[math.random(#spawnPoints)]
	-- Small sideways offset so wolves do not walk in a single line
	local side = point.CFrame.RightVector * (math.random() * 6 - 3)
	local model = EnemyModels.Build(info.Model)
	local height = model:GetExtentsSize().Y
	local enemy: Enemy = {
		Info = info,
		Model = model,
		HP = info.HP,
		Alive = true,
		Position = Vector3.new(point.Position.X, 0, point.Position.Z) + side,
		AimOffset = height * 0.55,
		Cooldown = 0,
		Bob = math.random() * 3,
		JawOpen = false,
		Bar = makeHealthBar(model, height),
	}
	placeEnemy(enemy)
	model.Parent = folder
	table.insert(enemies, enemy)
end

local function onHallDestroyed()
	hallDestroyed = true
	local owner = BaseService.Owner
	if owner then
		local stolen = math.floor(Save:GetMoney(owner) * WaveConfig.LossShare)
		Save:SpendMoney(owner, stolen)
		notifyOwner(`The Town Hall has fallen! The wolves stole ${stolen}`)
	end
	clearEnemies()
	setHallHP(WaveConfig.TownHallMaxHP)
end

----------------------------------------------------------------------
-- Per-frame enemy update
----------------------------------------------------------------------

local function step(dt: number)
	for i = #enemies, 1, -1 do
		local enemy = enemies[i]
		if not enemy.Alive then
			continue
		end
		local flat = Vector3.new(enemy.Position.X, 0, enemy.Position.Z)
		local dist = flat.Magnitude
		local radius = WaveConfig.TownHallAttackRadius
		if dist > radius then
			-- Walk straight to the Town Hall
			local move = math.min(enemy.Info.Speed * dt, dist - radius)
			enemy.Position -= flat.Unit * move
			enemy.Bob += dt * enemy.Info.Speed * 0.5
		else
			-- Bite the Town Hall
			enemy.Cooldown -= dt
			if enemy.Cooldown <= 0 then
				enemy.Cooldown = 1 / enemy.Info.AttackRate
				setJaw(enemy, true)
				task.delay(0.2, setJaw, enemy, false)
				setHallHP(hallHP - enemy.Info.Damage)
				if hallHP <= 0 then
					onHallDestroyed()
					return
				end
			end
		end
		placeEnemy(enemy)
	end
end

----------------------------------------------------------------------
-- Wave loop
----------------------------------------------------------------------

local function waveComposition(n: number): { string }
	local count = WaveConfig.BaseCount + WaveConfig.CountPerWave * (n - 1)
	local dire = n // WaveConfig.DireWolfEvery
	local list = {}
	for i = 1, count do
		table.insert(list, if i <= dire then "DireWolf" else "Wolf")
	end
	-- Shuffle so dire wolves are mixed in
	for i = #list, 2, -1 do
		local j = math.random(i)
		list[i], list[j] = list[j], list[i]
	end
	return list
end

local function countdown(seconds: number): boolean
	local owner = BaseService.Owner
	setState("Intermission")
	for t = seconds, 1, -1 do
		base:SetAttribute("NextWaveIn", t)
		task.wait(1)
		if BaseService.Owner ~= owner then
			return false
		end
	end
	base:SetAttribute("NextWaveIn", 0)
	return true
end

local function runLoop()
	local lastOwner: Player? = nil
	while true do
		local owner = BaseService.Owner
		if owner == nil then
			clearEnemies()
			waveNumber = 0
			lastOwner = nil
			setState("Waiting")
			task.wait(1)
			continue
		end
		if owner ~= lastOwner then
			-- New owner: start from wave 1 with a full Town Hall
			lastOwner = owner
			waveNumber = 0
			setHallHP(WaveConfig.TownHallMaxHP)
			if not countdown(WaveConfig.FirstWaveDelay) then
				continue
			end
		elseif not countdown(WaveConfig.Intermission) then
			continue
		end

		waveNumber += 1
		hallDestroyed = false
		setState("Wave")
		notifyOwner(`Wave {waveNumber} is coming from the forest!`)
		for _, id in waveComposition(waveNumber) do
			if hallDestroyed or BaseService.Owner ~= owner then
				break
			end
			spawnEnemy(id)
			task.wait(WaveConfig.SpawnInterval)
		end
		while #enemies > 0 and not hallDestroyed and BaseService.Owner == owner do
			task.wait(0.5)
		end
		if not hallDestroyed and BaseService.Owner == owner then
			Save:AddMoney(owner, WaveConfig.WaveClearBonus)
			Save:IncrementStat(owner, "WavesSurvived")
			notifyOwner(`Wave {waveNumber} cleared! +${WaveConfig.WaveClearBonus}`)
		end
	end
end

----------------------------------------------------------------------
-- Lifecycle
----------------------------------------------------------------------

function WaveService:Init(services)
	Save = services.SaveService
	BaseService = services.BaseService
end

function WaveService:Start()
	base = Workspace:WaitForChild("Base") :: Model
	townHall = base:WaitForChild("TownHall") :: Model
	for _, point in (Workspace:WaitForChild("EnemySpawns")):GetChildren() do
		if point:IsA("BasePart") then
			table.insert(spawnPoints, point)
		end
	end
	folder = Instance.new("Folder")
	folder.Name = "Enemies"
	folder.Parent = Workspace

	setHallHP(WaveConfig.TownHallMaxHP)
	setState("Waiting")
	RunService.Heartbeat:Connect(step)
	task.spawn(runLoop)
end

----------------------------------------------------------------------
-- API for UnitService
----------------------------------------------------------------------

function WaveService:GetEnemies(): { Enemy }
	return enemies
end

-- World point to aim at (center of the body)
function WaveService:GetAimPoint(enemy: Enemy): Vector3
	return Vector3.new(enemy.Position.X, groundY(enemy.Position) + enemy.AimOffset, enemy.Position.Z)
end

-- Returns true if this hit killed the enemy (the owner gets the reward)
function WaveService:DamageEnemy(enemy: Enemy, amount: number): boolean
	if not enemy.Alive then
		return false
	end
	enemy.HP -= amount
	enemy.Bar.Size = UDim2.fromScale(math.max(0, enemy.HP / enemy.Info.HP), 1)
	if enemy.HP > 0 then
		return false
	end
	removeEnemy(enemy)
	local owner = BaseService.Owner
	if owner then
		Save:AddMoney(owner, enemy.Info.Reward)
	end
	return true
end

return WaveService
