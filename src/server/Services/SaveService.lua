--!strict
--[[
	SaveService — the only service that reads and writes player profiles.
	Built on ProfileService (ReplicatedStorage.Packages.ProfileService).

	Player lifecycle:
	  PlayerAdded    -> load profile (ForceLoad) -> Reconcile -> sanitize
	                 -> ProfileLoaded signal (BaseService builds the base)
	  PlayerRemoving -> PlayerLeaving signal (BaseService clears the base)
	                 -> profile:Release() (final save)

	Other services never touch profile.Data directly — only the API below.
	The client sees money through attributes: Money and MoneyCap.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local ProfileService = require(ReplicatedStorage.Packages.ProfileService) :: any
local DataConfig = require(ReplicatedStorage.Shared.DataConfig)

local GameConfig = DataConfig.GameConfig

----------------------------------------------------------------------
-- Tiny signal (no extra library)
----------------------------------------------------------------------

type Signal = {
	Connect: (self: Signal, fn: (...any) -> ()) -> (),
	Fire: (self: Signal, ...any) -> (),
}

local function createSignal(): Signal
	local listeners: { (...any) -> () } = {}
	local signal = {}

	function signal:Connect(fn)
		table.insert(listeners, fn)
	end

	-- task.spawn runs each listener immediately (until its first yield),
	-- so order is kept and one failing listener does not break the others
	function signal:Fire(...)
		for _, fn in listeners do
			task.spawn(fn, ...)
		end
	end

	return signal :: any
end

----------------------------------------------------------------------
-- State
----------------------------------------------------------------------

local SaveService = {}

SaveService.ProfileLoaded = createSignal() -- (player, data)
SaveService.PlayerLeaving = createSignal() -- (player, data) — fired before Release.
-- PlayerLeaving listeners must not yield, otherwise the profile is saved before they finish.

local profileStore = ProfileService.GetProfileStore(GameConfig.ProfileStoreName, DataConfig.ProfileTemplate)
local profiles: { [Player]: any } = {}

----------------------------------------------------------------------
-- Internal
----------------------------------------------------------------------

local function isValidSlot(slot: string): boolean
	local index = tonumber(slot)
	return index ~= nil and index % 1 == 0 and index >= 1 and index <= GameConfig.PlotCount
end

-- Drop plots outside the map and units that no longer exist in the config
local function sanitizeData(data)
	for slot, unitId in data.Plots do
		if not isValidSlot(slot) then
			data.Plots[slot] = nil
		elseif unitId ~= "" and not DataConfig.GetUnit(unitId) then
			data.Plots[slot] = ""
		end
	end
	data.Money = math.clamp(data.Money, 0, GameConfig.MoneyCapacity)
end

local function syncMoney(player: Player, data)
	player:SetAttribute("Money", data.Money)
	player:SetAttribute("MoneyCap", GameConfig.MoneyCapacity)
end

local function onPlayerAdded(player: Player)
	local profile = profileStore:LoadProfileAsync("Player_" .. player.UserId, "ForceLoad")
	if not profile then
		player:Kick("Could not load your data. Please rejoin.")
		return
	end

	profile:AddUserId(player.UserId) -- GDPR
	profile:Reconcile()
	profile:ListenToRelease(function()
		profiles[player] = nil
		player:Kick("Your data was opened on another server.")
	end)

	-- The player may have left while the profile was loading
	if not player:IsDescendantOf(Players) then
		profile:Release()
		return
	end

	sanitizeData(profile.Data)
	profiles[player] = profile
	syncMoney(player, profile.Data)
	player:SetAttribute("DataLoaded", true)

	SaveService.ProfileLoaded:Fire(player, profile.Data)
end

local function onPlayerRemoving(player: Player)
	local profile = profiles[player]
	if not profile then
		return
	end
	SaveService.PlayerLeaving:Fire(player, profile.Data)
	profiles[player] = nil
	profile:Release()
end

----------------------------------------------------------------------
-- Lifecycle
----------------------------------------------------------------------

function SaveService:Init(_services)
	-- No dependencies: SaveService loads first
end

function SaveService:Start()
	Players.PlayerAdded:Connect(onPlayerAdded)
	Players.PlayerRemoving:Connect(onPlayerRemoving)
	for _, player in Players:GetPlayers() do
		task.spawn(onPlayerAdded, player)
	end
	-- ProfileService saves everything on server shutdown by itself (BindToClose)
end

----------------------------------------------------------------------
-- API: general
----------------------------------------------------------------------

function SaveService:GetData(player: Player)
	local profile = profiles[player]
	return profile and profile.Data
end

function SaveService:IsLoaded(player: Player): boolean
	return profiles[player] ~= nil
end

----------------------------------------------------------------------
-- API: money (always clamped to MoneyCapacity)
----------------------------------------------------------------------

function SaveService:GetMoney(player: Player): number
	local data = self:GetData(player)
	return data and data.Money or 0
end

-- Returns how much was actually added (can be less because of the money cap)
function SaveService:AddMoney(player: Player, amount: number): number
	local data = self:GetData(player)
	if not data or amount <= 0 then
		return 0
	end
	local before = data.Money
	data.Money = math.min(GameConfig.MoneyCapacity, data.Money + amount)
	syncMoney(player, data)
	return data.Money - before
end

-- true if the player had enough money and it was spent
function SaveService:SpendMoney(player: Player, amount: number): boolean
	local data = self:GetData(player)
	if not data or amount < 0 or data.Money < amount then
		return false
	end
	data.Money -= amount
	syncMoney(player, data)
	return true
end

----------------------------------------------------------------------
-- API: plots. Value: nil = not bought, "" = owned and empty, unitId = unit placed
----------------------------------------------------------------------

function SaveService:GetPlots(player: Player): { [string]: string }
	local data = self:GetData(player)
	return data and table.clone(data.Plots) or {}
end

function SaveService:GetPlot(player: Player, slot: string): string?
	local data = self:GetData(player)
	return data and data.Plots[slot]
end

function SaveService:SetPlot(player: Player, slot: string, value: string?): boolean
	local data = self:GetData(player)
	if not data or not isValidSlot(slot) then
		return false
	end
	if value and value ~= "" and not DataConfig.GetUnit(value) then
		return false
	end
	data.Plots[slot] = value
	return true
end

----------------------------------------------------------------------
-- API: stats
----------------------------------------------------------------------

function SaveService:IncrementStat(player: Player, stat: string, amount: number?)
	local data = self:GetData(player)
	if data and data.Stats[stat] ~= nil then
		data.Stats[stat] += amount or 1
	end
end

return SaveService
