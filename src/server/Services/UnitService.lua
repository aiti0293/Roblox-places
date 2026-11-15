--!strict
--[[
	UnitService — the monsters on the plots defend the base from the werewolves.

	Every unit looks for the nearest enemy within its Range. When ready
	(FireRate), it turns to the target, OPENS ITS LOWER JAW and fires
	from the mouth depending on the rarity's attack type:
	  Bite     — a small cube projectile (Common)
	  Fireball — a glowing orange/red cube with light (Rare)
	  Laser    — an instant straight beam (Epic, Legendary for now)
	Then the jaw closes. Damage is applied through WaveService:DamageEnemy.
	Projectiles are anchored parts moved by the server every frame.
]]

local Debris = game:GetService("Debris")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local DataConfig = require(ReplicatedStorage.Shared.DataConfig)
local UnitModels = require(ReplicatedStorage.Shared.UnitModels)

local THINK_INTERVAL = 0.1 -- how often units look for targets (seconds)
local FIRE_DELAY = 0.12 -- jaw opens, then the shot leaves the mouth
local JAW_CLOSE_DELAY = 0.4
local MOUTH_FORWARD = 1.6 -- studs from the jaw hinge to the mouth tip

local ATTACKS = {
	Bite = { Speed = 80, Size = 0.6, Color = Color3.fromRGB(236, 230, 212), Neon = false },
	Fireball = { Speed = 50, Size = 1.1, Color = Color3.fromRGB(255, 110, 20), Neon = true },
}

type UnitState = { Cooldown: number, JawOpen: boolean }
type Projectile = { Part: BasePart, Target: any, Damage: number, Speed: number }

local UnitService = {}

local BaseService: any
local WaveService: any
local folder: Folder
local states: { [Model]: UnitState } = setmetatable({}, { __mode = "k" }) :: any
local projectiles: { Projectile } = {}
local thinkTimer = 0

----------------------------------------------------------------------
-- Helpers
----------------------------------------------------------------------

local function setJaw(model: Model, state: UnitState, open: boolean)
	if state.JawOpen == open or model.Parent == nil then
		return
	end
	state.JawOpen = open
	local jaw = model:FindFirstChild("LowerJaw") :: Model?
	if jaw then
		local angle = if open then UnitModels.JawOpenAngle else -UnitModels.JawOpenAngle
		jaw:PivotTo(jaw:GetPivot() * CFrame.Angles(angle, 0, 0))
	end
end

local function mouthPosition(model: Model): Vector3
	local jaw = model:FindFirstChild("LowerJaw") :: Model?
	local hinge = jaw and jaw.PrimaryPart
	local pivot = model:GetPivot()
	local origin = if hinge then hinge.Position else pivot.Position + Vector3.new(0, 6, 0)
	return origin + pivot.LookVector * MOUTH_FORWARD
end

local function faceTarget(model: Model, target: Vector3)
	local pos = model:GetPivot().Position
	local flat = Vector3.new(target.X, pos.Y, target.Z)
	if (flat - pos).Magnitude > 0.1 then
		model:PivotTo(CFrame.lookAt(pos, flat)) -- units face -Z
	end
end

local function findTarget(position: Vector3, range: number)
	local best, bestDist = nil, range
	for _, enemy in WaveService:GetEnemies() do
		if enemy.Alive then
			local d = (WaveService:GetAimPoint(enemy) - position).Magnitude
			if d <= bestDist then
				best, bestDist = enemy, d
			end
		end
	end
	return best
end

local function makePart(name: string, size: Vector3, color: Color3, neon: boolean): Part
	local p = Instance.new("Part")
	p.Name = name
	p.Size = size
	p.Color = color
	p.Material = if neon then Enum.Material.Neon else Enum.Material.SmoothPlastic
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = false
	p.CanTouch = false
	p.CastShadow = false
	return p
end

----------------------------------------------------------------------
-- Attacks
----------------------------------------------------------------------

local function fireProjectile(from: Vector3, target: any, damage: number, attack: typeof(ATTACKS.Bite))
	local part = makePart("Projectile", Vector3.one * attack.Size, attack.Color, attack.Neon)
	part.CFrame = CFrame.new(from)
	if attack.Neon then
		local light = Instance.new("PointLight")
		light.Color = attack.Color
		light.Range = 10
		light.Brightness = 3
		light.Parent = part
	end
	part.Parent = folder
	table.insert(projectiles, { Part = part, Target = target, Damage = damage, Speed = attack.Speed })
end

local function fireLaser(from: Vector3, target: any, damage: number, color: Color3)
	local to = WaveService:GetAimPoint(target)
	local length = (to - from).Magnitude
	local beam = makePart("Laser", Vector3.new(0.3, 0.3, length), color, true)
	beam.CFrame = CFrame.lookAt(from, to) * CFrame.new(0, 0, -length / 2)
	beam.Parent = folder
	Debris:AddItem(beam, 0.15)
	WaveService:DamageEnemy(target, damage)
end

local function attack(unit: Model, state: UnitState, info: DataConfig.UnitInfo, damage: number, target: any)
	faceTarget(unit, WaveService:GetAimPoint(target))
	setJaw(unit, state, true)
	local rarity = DataConfig.Rarities[info.Rarity]
	task.delay(FIRE_DELAY, function()
		if unit.Parent == nil or not target.Alive then
			return
		end
		local from = mouthPosition(unit)
		if rarity.AttackType == "Laser" then
			fireLaser(from, target, damage, rarity.Color)
		else
			fireProjectile(from, target, damage, ATTACKS[rarity.AttackType] or ATTACKS.Bite)
		end
	end)
	task.delay(JAW_CLOSE_DELAY, setJaw, unit, state, false)
end

----------------------------------------------------------------------
-- Update
----------------------------------------------------------------------

local function think(dt: number)
	for _, placed in BaseService:GetPlacedUnits() do
		local model = placed.Model
		local info = DataConfig.GetUnit(placed.UnitId)
		if not info then
			continue
		end
		local stats = DataConfig.GetUnitStats(placed.UnitId, placed.Level or 1) :: any
		local state = states[model]
		if not state then
			state = { Cooldown = math.random() / stats.FireRate, JawOpen = false }
			states[model] = state
		end
		state.Cooldown -= dt
		if state.Cooldown <= 0 then
			local target = findTarget(model:GetPivot().Position + Vector3.new(0, 4, 0), stats.Range)
			if target then
				state.Cooldown = 1 / stats.FireRate
				attack(model, state, info, stats.Damage, target)
			end
		end
	end
end

local function moveProjectiles(dt: number)
	for i = #projectiles, 1, -1 do
		local p = projectiles[i]
		if not p.Target.Alive then
			p.Part:Destroy()
			table.remove(projectiles, i)
			continue
		end
		local to = WaveService:GetAimPoint(p.Target)
		local pos = p.Part.Position
		local delta = to - pos
		local stepLen = p.Speed * dt
		if delta.Magnitude <= stepLen + 0.5 then
			WaveService:DamageEnemy(p.Target, p.Damage)
			p.Part:Destroy()
			table.remove(projectiles, i)
		else
			-- Spinning cube flying to the (moving) target
			local nextPos = pos + delta.Unit * stepLen
			p.Part.CFrame = CFrame.new(nextPos) * CFrame.Angles(os.clock() * 8, os.clock() * 6, 0)
		end
	end
end

----------------------------------------------------------------------
-- Lifecycle
----------------------------------------------------------------------

function UnitService:Init(services)
	BaseService = services.BaseService
	WaveService = services.WaveService
end

function UnitService:Start()
	folder = Instance.new("Folder")
	folder.Name = "Projectiles"
	folder.Parent = Workspace

	RunService.Heartbeat:Connect(function(dt)
		moveProjectiles(dt)
		thinkTimer += dt
		if thinkTimer >= THINK_INTERVAL then
			think(thinkTimer)
			thinkTimer = 0
		end
	end)
end

return UnitService
