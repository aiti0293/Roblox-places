--!strict
--[[
	BaseService — the player's base: Town Hall in the center and plots around it.

	• The base (Workspace.Base) belongs to one owner: the first player whose profile loads.
	  Other players on the server are visitors for now (raids come later).
	• Plot flow:  locked --buy (money)--> owned & empty --place unit (money)--> unit
	              unit --upgrade (money, E)--> unit Lv+1 (max MaxUnitLevel)
	              unit --sell (hold F, refund of everything invested)--> owned & empty
	• All plot data lives in the profile (SaveService), so the base re-appears
	  exactly the same after a rejoin. Leaving clears the base for the next owner.
	• Interaction: a ProximityPrompt on every plot (always validated on the server),
	  plus RemoteEvents (RequestBuyPlot / RequestPlaceUnit / RequestSellUnit).
	  An empty owned plot opens the defender shop on the client (Remotes.OpenShop).

	Map contract (built by tools/ImportBlenderMap.lua):
	  Workspace.Base.SpawnLocation
	  Workspace.Base.BrainrotPlots.PlotN  (attribute SlotIndex)
	    Pedestal  — marble pad (gets the ProximityPrompt)
	    Glow      — 4 neon border strips (state color)
	    Spot      — invisible part on top (attribute Row = 1..3), units stand here
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local DataConfig = require(ReplicatedStorage.Shared.DataConfig)
local UnitModels = require(ReplicatedStorage.Shared.UnitModels)

local GameConfig = DataConfig.GameConfig

type PlotState = {
	Slot: string,
	Row: number,
	Model: Model,
	Pedestal: BasePart,
	Spot: BasePart,
	Glows: { BasePart },
	Prompt: ProximityPrompt, -- E: buy / shop / upgrade
	SellPrompt: ProximityPrompt, -- F (hold): sell
	Unit: Model?,
}

local LOCKED_COLOR = Color3.fromRGB(120, 125, 140)
local OWNED_COLOR = Color3.fromRGB(150, 230, 255)
local SELL_HOLD_TIME = 1 -- hold F this long to sell (prevents accidents)

local BaseService = {}
BaseService.Owner = nil :: Player?

local Save: any
local remotes: Folder
local base: Model
local plots: { [string]: PlotState } = {}

----------------------------------------------------------------------
-- Helpers
----------------------------------------------------------------------

local function notify(player: Player, message: string)
	(remotes:FindFirstChild("Notify") :: RemoteEvent):FireClient(player, message)
end

local function isOwner(player: Player): boolean
	return BaseService.Owner == player and Save:IsLoaded(player)
end

-- The unit stands on the Spot, facing away from the Town Hall (towards the forest)
local function unitCFrame(plot: PlotState): CFrame
	local spot = plot.Spot
	return spot.CFrame * CFrame.new(0, -spot.Size.Y / 2, 0) * CFrame.Angles(0, math.pi, 0)
end

local function despawnUnit(plot: PlotState)
	if plot.Unit then
		plot.Unit:Destroy()
		plot.Unit = nil
	end
end

-- "Lv 3 ★★★" above the unit, in its rarity color
local function levelBadge(model: Model, info: DataConfig.UnitInfo, level: number)
	local rarity = DataConfig.Rarities[info.Rarity]
	local gui = Instance.new("BillboardGui")
	gui.Name = "LevelBadge"
	gui.Size = UDim2.fromOffset(90, 22)
	gui.StudsOffset = Vector3.new(0, model:GetExtentsSize().Y + 0.8, 0)
	gui.MaxDistance = 60
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Font = Enum.Font.GothamBold
	label.TextScaled = true
	label.TextColor3 = rarity.Color
	label.TextStrokeTransparency = 0.2
	label.Text = `Lv {level} ` .. string.rep("★", level)
	label.Parent = gui
	gui.Parent = model.PrimaryPart
end

local function spawnUnit(plot: PlotState, unitId: string, level: number)
	despawnUnit(plot)
	local info = DataConfig.GetUnit(unitId)
	if not info then
		return
	end
	local model = UnitModels.Build(info.Model)
	model.Name = "Unit"
	model:SetAttribute("UnitId", unitId)
	model:SetAttribute("Slot", plot.Slot)
	model:SetAttribute("Level", level)
	model:PivotTo(unitCFrame(plot))
	-- Higher level = slightly bigger monster (scales around its feet)
	model:ScaleTo(1 + GameConfig.UpgradeScale * (level - 1))
	levelBadge(model, info, level)
	model.Parent = plot.Model
	plot.Unit = model
end

-- Updates glow color and prompt text for one plot from the owner's data
local function refreshPlot(plot: PlotState)
	local owner = BaseService.Owner
	local value = if owner then Save:GetPlot(owner, plot.Slot) else nil
	local prompt = plot.Prompt

	local glowColor = if value ~= nil then OWNED_COLOR else LOCKED_COLOR
	for _, glow in plot.Glows do
		glow.Color = glowColor
		glow.Material = if value ~= nil then Enum.Material.Neon else Enum.Material.SmoothPlastic
	end

	prompt.Enabled = owner ~= nil
	if value == nil then
		prompt.ActionText = "Buy plot"
		prompt.ObjectText = `${DataConfig.GetPlotPrice(plot.Row)}`
		prompt.HoldDuration = 0
	elseif value == "" then
		prompt.ActionText = "Summon defender"
		prompt.ObjectText = "Shop"
		prompt.HoldDuration = 0
	else
		local level = Save:GetPlotLevel(owner, plot.Slot)
		local cost = DataConfig.GetUpgradeCost(value, level)
		if cost then
			prompt.ActionText = `Upgrade to Lv {level + 1}`
			prompt.ObjectText = `${cost}`
		else
			prompt.ActionText = "Max level"
			prompt.ObjectText = ""
		end
		prompt.HoldDuration = 0
	end

	-- Sell prompt (hold F): only on plots with a unit
	local hasUnit = owner ~= nil and value ~= nil and value ~= ""
	plot.SellPrompt.Enabled = hasUnit
	if hasUnit then
		local invested = DataConfig.GetInvested(value :: string, Save:GetPlotLevel(owner, plot.Slot))
		plot.SellPrompt.ObjectText = `+${math.floor(invested * GameConfig.SellRefund)}`
	end
end

local function refreshAll()
	for _, plot in plots do
		refreshPlot(plot)
	end
end

----------------------------------------------------------------------
-- Actions (all validated on the server)
----------------------------------------------------------------------

function BaseService:BuyPlot(player: Player, slot: string): boolean
	local plot = plots[slot]
	if not plot or not isOwner(player) then
		return false
	end
	if Save:GetPlot(player, slot) ~= nil then
		return false -- already bought
	end
	local price = DataConfig.GetPlotPrice(plot.Row)
	if not Save:SpendMoney(player, price) then
		notify(player, `Not enough money: plot costs ${price}`)
		return false
	end
	Save:SetPlot(player, slot, "")
	refreshPlot(plot)
	return true
end

function BaseService:PlaceUnit(player: Player, slot: string, unitId: string): boolean
	local plot = plots[slot]
	local info = DataConfig.GetUnit(unitId)
	if not plot or not info or not isOwner(player) then
		return false
	end
	if Save:GetPlot(player, slot) ~= "" then
		return false -- not bought or already occupied
	end
	if not Save:SpendMoney(player, info.Price) then
		notify(player, `Not enough money: {info.DisplayName} costs ${info.Price}`)
		return false
	end
	Save:SetPlot(player, slot, unitId)
	Save:IncrementStat(player, "UnitsPlaced")
	spawnUnit(plot, unitId, 1)
	refreshPlot(plot)
	return true
end

function BaseService:SellUnit(player: Player, slot: string): boolean
	local plot = plots[slot]
	if not plot or not isOwner(player) then
		return false
	end
	local unitId = Save:GetPlot(player, slot)
	local info = unitId and DataConfig.GetUnit(unitId)
	if not info then
		return false
	end
	local refund = math.floor(DataConfig.GetInvested(info.Id, Save:GetPlotLevel(player, slot)) * GameConfig.SellRefund)
	Save:SetPlot(player, slot, "")
	despawnUnit(plot)
	local added = Save:AddMoney(player, refund)
	if added < refund then
		notify(player, "Money storage is full — part of the refund was lost")
	end
	refreshPlot(plot)
	return true
end

function BaseService:UpgradeUnit(player: Player, slot: string): boolean
	local plot = plots[slot]
	if not plot or not isOwner(player) then
		return false
	end
	local unitId = Save:GetPlot(player, slot)
	local info = unitId and DataConfig.GetUnit(unitId)
	if not info then
		return false
	end
	local level = Save:GetPlotLevel(player, slot)
	local cost = DataConfig.GetUpgradeCost(info.Id, level)
	if not cost then
		notify(player, `{info.DisplayName} is already at max level`)
		return false
	end
	if not Save:SpendMoney(player, cost) then
		notify(player, `Not enough money: upgrade costs ${cost}`)
		return false
	end
	Save:SetPlotLevel(player, slot, level + 1)
	spawnUnit(plot, info.Id, level + 1)
	refreshPlot(plot)
	notify(player, `{info.DisplayName} is now level {level + 1}!`)
	return true
end

----------------------------------------------------------------------
-- Ownership
----------------------------------------------------------------------

local function claimBase(player: Player)
	BaseService.Owner = player
	base:SetAttribute("OwnerUserId", player.UserId)
	base:SetAttribute("OwnerName", player.DisplayName)
	local spawn = base:FindFirstChild("SpawnLocation")
	if spawn and spawn:IsA("SpawnLocation") then
		player.RespawnLocation = spawn
	end
	local gotKit = Save:ClaimStarterKit(player)
	for slot, unitId in Save:GetPlots(player) do
		local plot = plots[slot]
		if plot and unitId ~= "" then
			spawnUnit(plot, unitId, Save:GetPlotLevel(player, slot))
		end
	end
	refreshAll()
	notify(player, "Welcome to your base!")
	if gotKit then
		notify(player, `Starter gift: {#GameConfig.StarterKit.Slots} free defenders guard the trails!`)
	end
end

local function releaseBase()
	for _, plot in plots do
		despawnUnit(plot)
	end
	BaseService.Owner = nil
	base:SetAttribute("OwnerUserId", nil)
	base:SetAttribute("OwnerName", nil)
	refreshAll()
end

local function onProfileLoaded(player: Player)
	if BaseService.Owner == nil then
		claimBase(player)
	else
		notify(player, "You are visiting someone else's base")
	end
end

-- Must not yield (see SaveService.PlayerLeaving)
local function onPlayerLeaving(player: Player)
	if BaseService.Owner ~= player then
		return
	end
	releaseBase()
	-- Hand the base to another loaded player, if any
	for _, other in Players:GetPlayers() do
		if other ~= player and Save:IsLoaded(other) then
			claimBase(other)
			break
		end
	end
end

----------------------------------------------------------------------
-- Setup
----------------------------------------------------------------------

local function collectPlots()
	local folder = base:WaitForChild("BrainrotPlots")
	for _, model in folder:GetChildren() do
		local index = model:GetAttribute("SlotIndex")
		local pedestal = model:FindFirstChild("Pedestal")
		local spot = model:FindFirstChild("Spot")
		if not (model:IsA("Model") and index and pedestal and spot) then
			warn(`[BaseService] Plot {model.Name} is missing SlotIndex/Pedestal/Spot — skipped`)
			continue
		end
		local glows = {}
		for _, child in model:GetChildren() do
			if child.Name == "Glow" and child:IsA("BasePart") then
				table.insert(glows, child)
			end
		end
		local prompt = Instance.new("ProximityPrompt")
		prompt.Name = "PlotPrompt"
		prompt.KeyboardKeyCode = Enum.KeyCode.E
		prompt.MaxActivationDistance = 8
		prompt.RequiresLineOfSight = false
		prompt.Parent = pedestal
		local sellPrompt = Instance.new("ProximityPrompt")
		sellPrompt.Name = "SellPrompt"
		sellPrompt.ActionText = "Sell"
		sellPrompt.KeyboardKeyCode = Enum.KeyCode.F
		sellPrompt.HoldDuration = SELL_HOLD_TIME
		sellPrompt.MaxActivationDistance = 8
		sellPrompt.RequiresLineOfSight = false
		sellPrompt.UIOffset = Vector2.new(0, 70) -- shown under the main prompt
		sellPrompt.Enabled = false
		sellPrompt.Parent = pedestal

		local slot = tostring(index)
		local plot: PlotState = {
			Slot = slot,
			Row = (spot :: BasePart):GetAttribute("Row") or 1,
			Model = model :: Model,
			Pedestal = pedestal :: BasePart,
			Spot = spot :: BasePart,
			Glows = glows,
			Prompt = prompt,
			SellPrompt = sellPrompt,
			Unit = nil,
		}
		plots[slot] = plot

		prompt.Triggered:Connect(function(player)
			local value = Save:GetPlot(player, slot)
			if not isOwner(player) then
				notify(player, "This is not your base")
			elseif value == nil then
				BaseService:BuyPlot(player, slot)
			elseif value == "" then
				-- The client opens the defender shop and replies with RequestPlaceUnit
				(remotes:FindFirstChild("OpenShop") :: RemoteEvent):FireClient(player, slot)
			else
				BaseService:UpgradeUnit(player, slot)
			end
		end)
		sellPrompt.Triggered:Connect(function(player)
			if isOwner(player) then
				BaseService:SellUnit(player, slot)
			end
		end)
	end

	local count = 0
	for _ in plots do
		count += 1
	end
	if count ~= GameConfig.PlotCount then
		warn(`[BaseService] Map has {count} plots, DataConfig.PlotCount = {GameConfig.PlotCount}`)
	end
end

function BaseService:Init(services)
	Save = services.SaveService
end

function BaseService:Start()
	remotes = ReplicatedStorage:WaitForChild("Remotes") :: Folder
	base = Workspace:WaitForChild("Base") :: Model
	collectPlots()
	refreshAll()

	Save.ProfileLoaded:Connect(onProfileLoaded)
	Save.PlayerLeaving:Connect(onPlayerLeaving)

	-- Remotes for the future UI (arguments from the client are never trusted)
	local function onRemote(name: string, handler: (Player, string, any) -> ())
		(remotes:WaitForChild(name) :: RemoteEvent).OnServerEvent:Connect(function(player, slot, extra)
			if typeof(slot) == "string" then
				handler(player, slot, extra)
			end
		end)
	end
	onRemote("RequestBuyPlot", function(player, slot)
		self:BuyPlot(player, slot)
	end)
	onRemote("RequestPlaceUnit", function(player, slot, unitId)
		if typeof(unitId) == "string" then
			self:PlaceUnit(player, slot, unitId)
		end
	end)
	onRemote("RequestSellUnit", function(player, slot)
		self:SellUnit(player, slot)
	end)
	onRemote("RequestUpgradeUnit", function(player, slot)
		self:UpgradeUnit(player, slot)
	end)
end

----------------------------------------------------------------------
-- API for other services (UnitService / WaveService later)
----------------------------------------------------------------------

-- All placed units: { Slot, UnitId, Level, Model }
function BaseService:GetPlacedUnits(): { { Slot: string, UnitId: string, Level: number, Model: Model } }
	local list = {}
	for slot, plot in plots do
		if plot.Unit then
			table.insert(list, { Slot = slot, UnitId = plot.Unit:GetAttribute("UnitId") :: string, Level = plot.Unit:GetAttribute("Level") or 1, Model = plot.Unit })
		end
	end
	return list
end

function BaseService:GetTownHall(): Model?
	return base and base:FindFirstChild("TownHall") :: Model?
end

return BaseService
