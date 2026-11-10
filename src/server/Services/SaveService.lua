--!strict
--[[
	SaveService — единственный сервис, который читает и пишет профили игроков.
	Работает строго через ProfileService (ReplicatedStorage.Packages.ProfileService).

	Жизненный цикл игрока:
	  PlayerAdded    → загрузка профиля (ForceLoad) → Reconcile → чистка данных
	                 → сигнал ProfileLoaded  (BaseService спавнит базу)
	  PlayerRemoving → сигнал PlayerLeaving  (BaseService возвращает брейнрота из рук
	                   и деспавнит базу) → profile:Release() (финальное сохранение)

	Правило данных: слоты в профиле меняются ТОЛЬКО когда брейнрот реально
	поставлен/украден. Пока брейнрот «в руках» — в профиле он остаётся за
	владельцем, поэтому выход/краш сервера никогда не теряет брейнротов.

	Другие сервисы НЕ трогают profile.Data напрямую — только через API ниже.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local ProfileService = require(ReplicatedStorage.Packages.ProfileService) :: any
local DataConfig = require(ReplicatedStorage.Shared.DataConfig)

local GameConfig = DataConfig.GameConfig

----------------------------------------------------------------------
-- Мини-сигнал (чтобы не тянуть отдельную библиотеку)
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

	-- task.spawn запускает слушателя сразу (до первого yield),
	-- поэтому порядок сохраняется, а ошибка одного не ломает остальных
	function signal:Fire(...)
		for _, fn in listeners do
			task.spawn(fn, ...)
		end
	end

	return signal :: any
end

----------------------------------------------------------------------
-- Состояние
----------------------------------------------------------------------

local SaveService = {}

SaveService.ProfileLoaded = createSignal() -- (player, data) — профиль готов
SaveService.PlayerLeaving = createSignal() -- (player, data) — до Release профиля.
-- ВАЖНО: слушатели PlayerLeaving не должны yield'ить (task.wait и т.п.),
-- иначе профиль сохранится раньше, чем они закончат работу.

local profileStore = ProfileService.GetProfileStore(GameConfig.ProfileStoreName, DataConfig.ProfileTemplate)
local profiles: { [Player]: any } = {}

----------------------------------------------------------------------
-- Внутренние функции
----------------------------------------------------------------------

-- Убираем из слотов брейнротов, которых больше нет в конфиге
-- (например, переименовали Id) и слоты за пределами BaseSlotCount
local function sanitizeData(data)
	for slot, id in data.BaseSlots do
		local index = tonumber(slot)
		if not DataConfig.GetBrainrot(id) or not index or index < 1 or index > GameConfig.BaseSlotCount then
			data.BaseSlots[slot] = nil
		end
	end
end

-- Деньги дублируем в атрибут — клиентский UI читает его без Remote'ов
local function syncCash(player: Player, data)
	player:SetAttribute("Cash", data.Cash)
end

local function onPlayerAdded(player: Player)
	local profile = profileStore:LoadProfileAsync("Player_" .. player.UserId, "ForceLoad")

	if not profile then
		-- Профиль занят другим сервером и не освободился — безопаснее кикнуть
		player:Kick("Не удалось загрузить данные. Перезайдите, пожалуйста.")
		return
	end

	profile:AddUserId(player.UserId) -- GDPR
	profile:Reconcile() -- подставляем новые поля из шаблона

	-- Если профиль открыли на другом сервере — этот сервер обязан отпустить игрока
	profile:ListenToRelease(function()
		profiles[player] = nil
		player:Kick("Ваши данные открыты на другом сервере.")
	end)

	-- Игрок мог выйти, пока профиль грузился
	if not player:IsDescendantOf(Players) then
		profile:Release()
		return
	end

	sanitizeData(profile.Data)
	profiles[player] = profile
	syncCash(player, profile.Data)
	player:SetAttribute("DataLoaded", true)

	SaveService.ProfileLoaded:Fire(player, profile.Data)
end

local function onPlayerRemoving(player: Player)
	local profile = profiles[player]
	if not profile then
		return
	end

	-- Сначала даём сервисам прибраться (деспавн базы, возврат брейнрота из рук),
	-- и только потом сохраняем — чтобы в профиль попало финальное состояние
	SaveService.PlayerLeaving:Fire(player, profile.Data)

	profiles[player] = nil
	profile:Release()
end

----------------------------------------------------------------------
-- Жизненный цикл сервиса
----------------------------------------------------------------------

function SaveService:Init(_services)
	-- Зависимостей нет: SaveService грузится первым
end

function SaveService:Start()
	Players.PlayerAdded:Connect(onPlayerAdded)
	Players.PlayerRemoving:Connect(onPlayerRemoving)

	-- Игроки, зашедшие до подписки (актуально для Studio)
	for _, player in Players:GetPlayers() do
		task.spawn(onPlayerAdded, player)
	end

	-- Финальные сохранения при закрытии сервера ProfileService делает сам
	-- (внутренний BindToClose), здесь ничего добавлять не нужно
end

----------------------------------------------------------------------
-- Публичное API: общее
----------------------------------------------------------------------

-- Данные игрока или nil, если профиль ещё не загружен / уже выгружен
function SaveService:GetData(player: Player)
	local profile = profiles[player]
	return profile and profile.Data
end

function SaveService:IsLoaded(player: Player): boolean
	return profiles[player] ~= nil
end

----------------------------------------------------------------------
-- Публичное API: деньги
----------------------------------------------------------------------

function SaveService:GetCash(player: Player): number
	local data = self:GetData(player)
	return data and data.Cash or 0
end

function SaveService:AddCash(player: Player, amount: number)
	local data = self:GetData(player)
	if not data or amount <= 0 then
		return
	end
	data.Cash += amount
	syncCash(player, data)
end

-- Возвращает true, если денег хватило и они списаны
function SaveService:SpendCash(player: Player, amount: number): boolean
	local data = self:GetData(player)
	if not data or amount < 0 or data.Cash < amount then
		return false
	end
	data.Cash -= amount
	syncCash(player, data)
	return true
end

----------------------------------------------------------------------
-- Публичное API: слоты базы (ключи — строки "1".."BaseSlotCount")
----------------------------------------------------------------------

-- Таблица слотов только для чтения: { ["1"] = "Noobini", ... }
function SaveService:GetSlots(player: Player): { [string]: string }
	local data = self:GetData(player)
	return data and table.clone(data.BaseSlots) or {}
end

function SaveService:GetSlot(player: Player, slot: string): string?
	local data = self:GetData(player)
	return data and data.BaseSlots[slot]
end

-- Поставить брейнрота (id) или очистить слот (nil). Возвращает успех.
function SaveService:SetSlot(player: Player, slot: string, brainrotId: string?): boolean
	local data = self:GetData(player)
	local index = tonumber(slot)
	if not data or not index or index < 1 or index > GameConfig.BaseSlotCount then
		return false
	end
	if brainrotId and not DataConfig.GetBrainrot(brainrotId) then
		return false
	end
	data.BaseSlots[slot] = brainrotId
	return true
end

-- Первый свободный слот или nil, если база заполнена
function SaveService:FindFreeSlot(player: Player): string?
	local data = self:GetData(player)
	if not data then
		return nil
	end
	for i = 1, GameConfig.BaseSlotCount do
		local key = tostring(i)
		if data.BaseSlots[key] == nil then
			return key
		end
	end
	return nil
end

----------------------------------------------------------------------
-- Публичное API: статистика
----------------------------------------------------------------------

function SaveService:IncrementStat(player: Player, stat: string, amount: number?)
	local data = self:GetData(player)
	if data and data.Stats[stat] ~= nil then
		data.Stats[stat] += amount or 1
	end
end

-- Для рекордов вида «максимальный тир стены»
function SaveService:SetStatMax(player: Player, stat: string, value: number)
	local data = self:GetData(player)
	if data and data.Stats[stat] ~= nil then
		data.Stats[stat] = math.max(data.Stats[stat], value)
	end
end

return SaveService
