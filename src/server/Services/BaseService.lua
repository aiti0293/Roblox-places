--!strict
--[[
	BaseService — the player's base: Town Hall in the center and plots around it.

	• The base (Workspace.Base) belongs to one owner: the first player whose profile loads.
	  Other players on the server are visitors for now (raids come later).
	• Plot flow:  locked --buy (money)--> owned & empty --place unit (money)--> unit
	              unit --sell (refund)--> owned & empty
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
	Prompt: ProximityPrompt,
	Unit: Model?,
}

local LOCKED_COLOR = Color3.fromRGB(120, 125, 140)
local OWNED_COLOR = Color3.fromRGB(150, 230, 255)
local SELL_HOLD_TIME = 1 -- hold E this long to sell (prevents accidents)

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

local function spawnUnit(plot: PlotState, unitId: string)
	despawnUnit(plot)
	local info = DataConfig.GetUnit(unitId)
	if not info then
		return
	end
	local model = UnitModels.Build(info.Model)
	model.Name = "Unit"
	model:SetAttribute("UnitId", unitId)
	model:SetAttribute("Slot", plot.Slot)
	model:PivotTo(unitCFrame(plot))
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
		local unit = DataConfig.GetUnit(value)
		prompt.ActionText = "Sell"
		prompt.ObjectText = `{unit and unit.DisplayName or value}  +${unit and math.floor(unit.Price * GameConfig.SellRefund) or 0}`
		prompt.HoldDuration = SELL_HOLD_TIME
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
	spawnUnit(plot, unitId)
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
	Save:SetPlot(player, slot, "")
	despawnUnit(plot)
	local added = Save:AddMoney(player, math.floor(info.Price * GameConfig.SellRefund))
	if added < math.floor(info.Price * GameConfig.SellRefund) then
		notify(player, "Money storage is full — part of the refund was lost")
	end
	refreshPlot(plot)
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
			spawnUnit(plot, unitId)
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

		local slot = tostring(index)
		local plot: PlotState = {
			Slot = slot,
			Row = (spot :: BasePart):GetAttribute("Row") or 1,
			Model = model :: Model,
			Pedestal = pedestal :: BasePart,
			Spot = spot :: BasePart,
			Glows = glows,
			Prompt = prompt,
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
end

----------------------------------------------------------------------
-- API for other services (UnitService / WaveService later)
----------------------------------------------------------------------

-- All placed units: { Slot, UnitId, Model }
function BaseService:GetPlacedUnits(): { { Slot: string, UnitId: string, Model: Model } }
	local list = {}
	for slot, plot in plots do
		if plot.Unit then
			table.insert(list, { Slot = slot, UnitId = plot.Unit:GetAttribute("UnitId") :: string, Model = plot.Unit })
		end
	end
	return list
end

function BaseService:GetTownHall(): Model?
	return base and base:FindFirstChild("TownHall") :: Model?
end

return BaseService
