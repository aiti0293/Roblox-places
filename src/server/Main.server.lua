--!strict
--[[
	Main — the only server Script (entry point).
	Creates the RemoteEvents and starts the services in two phases:
	  1) Init()  — services grab references to each other;
	  2) Start() — connect events, start loops.
	SaveService goes first because everything else needs player data.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataConfig = require(ReplicatedStorage.Shared.DataConfig)

-- RemoteEvents from the config list
local remotes = Instance.new("Folder")
remotes.Name = "Remotes"
for _, name in DataConfig.Remotes do
	local remote = Instance.new("RemoteEvent")
	remote.Name = name
	remote.Parent = remotes
end
remotes.Parent = ReplicatedStorage

-- Load order (services that are not written yet are skipped with a warning)
local ORDER = {
	"SaveService",
	"BaseService",
	"UnitService", -- next: units open their jaw and shoot at enemies
	"WaveService", -- next: waves of monsters from the forest edges
}

local servicesFolder = script.Parent:WaitForChild("Services")
local loaded = {}

for _, name in ORDER do
	local module = servicesFolder:FindFirstChild(name)
	if module then
		loaded[name] = require(module) :: any
	else
		warn(`[Main] Service {name} not found — skipped`)
	end
end

-- Phase 1: Init
for _, name in ORDER do
	local service = loaded[name]
	if service and service.Init then
		service:Init(loaded)
	end
end

-- Phase 2: Start (each in its own thread so one service cannot block the others)
for _, name in ORDER do
	local service = loaded[name]
	if service and service.Start then
		task.spawn(service.Start, service)
	end
end

print("[Main] All services started")
