--!strict
--[[
	DataConfig — single source of all game constants.
	Lives in ReplicatedStorage.Shared so the client can read it too (names, colors, prices).
	Pure data plus a few lookup helpers. Every table is frozen.
]]

local DataConfig = {}

----------------------------------------------------------------------
-- Types
----------------------------------------------------------------------

export type RarityName = "Common" | "Rare" | "Epic" | "Legendary"
export type AttackType = "Bite" | "Fireball" | "Laser"

export type RarityInfo = {
	Order: number, -- 1..4, higher = rarer
	DisplayName: string,
	Color: Color3, -- UI / glow color
	AttackType: AttackType,
}

export type UnitInfo = {
	Id: string, -- saved in the profile
	DisplayName: string,
	Rarity: RarityName,
	Price: number, -- cost to place on a plot
	Damage: number, -- per shot
	Range: number, -- studs
	FireRate: number, -- shots per second
	Model: string, -- key in UnitModels
}

----------------------------------------------------------------------
-- 1. GameConfig
----------------------------------------------------------------------

DataConfig.GameConfig = table.freeze({
	-- Economy
	StartingMoney = 500,
	MoneyCapacity = 2000, -- money limit (will grow with Town Hall level later)
	SellRefund = 0.5, -- share of the unit price returned when selling

	-- Base / plots (must match the map: Workspace.Base.BrainrotPlots/Plot1..PlotN)
	PlotCount = 116,
	PlotPriceByRow = { 50, 150, 400 }, -- row 1 = inner ring, row 3 = outer ring
	DefaultUnit = "Ripper", -- unit placed by the plot prompt (until the shop UI exists)

	-- Persistence
	ProfileStoreName = "PlayerData_v2",
})

----------------------------------------------------------------------
-- 2. Rarities and attack types
--    Legendary attack type is not designed yet — uses Laser for now.
----------------------------------------------------------------------

DataConfig.Rarities = table.freeze({
	Common = { Order = 1, DisplayName = "Common", Color = Color3.fromRGB(150, 200, 120), AttackType = "Bite" },
	Rare = { Order = 2, DisplayName = "Rare", Color = Color3.fromRGB(70, 150, 255), AttackType = "Fireball" },
	Epic = { Order = 3, DisplayName = "Epic", Color = Color3.fromRGB(170, 80, 255), AttackType = "Laser" },
	Legendary = { Order = 4, DisplayName = "Legendary", Color = Color3.fromRGB(255, 185, 40), AttackType = "Laser" },
} :: { [RarityName]: RarityInfo })

----------------------------------------------------------------------
-- 3. Units (voxel werewolves, see UnitModels). Key = Id.
----------------------------------------------------------------------

DataConfig.UnitConfig = table.freeze({
	Ripper = { Id = "Ripper", DisplayName = "Ripper", Rarity = "Common", Price = 100, Damage = 10, Range = 30, FireRate = 1.0, Model = "Ripper" },
	Bloodfang = { Id = "Bloodfang", DisplayName = "Bloodfang", Rarity = "Rare", Price = 400, Damage = 25, Range = 40, FireRate = 0.8, Model = "Bloodfang" },
	Nightmaw = { Id = "Nightmaw", DisplayName = "Nightmaw", Rarity = "Epic", Price = 1200, Damage = 40, Range = 50, FireRate = 1.2, Model = "Nightmaw" },
	Alpha = { Id = "Alpha", DisplayName = "Alpha", Rarity = "Legendary", Price = 3000, Damage = 90, Range = 60, FireRate = 1.0, Model = "Alpha" },
} :: { [string]: UnitInfo })

----------------------------------------------------------------------
-- 3b. Enemies (voxel wolves from the forest, see EnemyModels) and waves
----------------------------------------------------------------------

export type EnemyInfo = {
	Id: string,
	DisplayName: string,
	HP: number,
	Speed: number, -- studs per second
	Damage: number, -- per bite on the Town Hall
	AttackRate: number, -- bites per second
	Reward: number, -- money for the kill
	Model: string, -- key in EnemyModels
}

DataConfig.EnemyConfig = table.freeze({
	Wolf = { Id = "Wolf", DisplayName = "Wolf", HP = 40, Speed = 10, Damage = 10, AttackRate = 1, Reward = 15, Model = "Wolf" },
	DireWolf = { Id = "DireWolf", DisplayName = "Dire Wolf", HP = 140, Speed = 8, Damage = 30, AttackRate = 0.8, Reward = 45, Model = "DireWolf" },
} :: { [string]: EnemyInfo })

DataConfig.WaveConfig = table.freeze({
	FirstWaveDelay = 15, -- seconds before the first wave after the owner joins
	Intermission = 20, -- seconds between waves
	BaseCount = 4, -- wolves in wave 1
	CountPerWave = 2, -- +wolves every wave
	DireWolfEvery = 3, -- one dire wolf per 3 waves (wave 3: 1, wave 6: 2, ...)
	SpawnInterval = 1, -- seconds between spawns
	WaveClearBonus = 50, -- money for surviving a wave

	TownHallMaxHP = 1000,
	TownHallAttackRadius = 16, -- enemies stop and bite at this distance from the center
	LossShare = 0.5, -- share of money stolen when the Town Hall falls
})

----------------------------------------------------------------------
-- 4. Profile template (ProfileService). New fields added here are
--    reconciled into old profiles automatically.
----------------------------------------------------------------------

DataConfig.ProfileTemplate = table.freeze({
	Money = DataConfig.GameConfig.StartingMoney,
	-- Owned plots: [slot "1".."PlotCount"] = unitId, or "" for an owned empty plot.
	-- A slot that is missing from the table is not bought yet.
	Plots = {} :: { [string]: string },
	Stats = {
		UnitsPlaced = 0,
		WavesSurvived = 0,
	},
})

----------------------------------------------------------------------
-- 5. RemoteEvent names (created by Main in ReplicatedStorage.Remotes)
----------------------------------------------------------------------

DataConfig.Remotes = table.freeze({
	-- Client -> Server
	"RequestBuyPlot", -- (slot: string)
	"RequestPlaceUnit", -- (slot: string, unitId: string)
	"RequestSellUnit", -- (slot: string)

	-- Server -> Client
	"Notify", -- (message: string)
})

----------------------------------------------------------------------
-- Helpers
----------------------------------------------------------------------

function DataConfig.GetUnit(id: string): UnitInfo?
	return DataConfig.UnitConfig[id]
end

function DataConfig.GetEnemy(id: string): EnemyInfo?
	return DataConfig.EnemyConfig[id]
end

function DataConfig.GetRarityOf(unitId: string): RarityInfo?
	local unit = DataConfig.UnitConfig[unitId]
	return if unit then DataConfig.Rarities[unit.Rarity] else nil
end

function DataConfig.GetPlotPrice(row: number): number
	local prices = DataConfig.GameConfig.PlotPriceByRow
	return prices[math.clamp(row, 1, #prices)]
end

return table.freeze(DataConfig)
