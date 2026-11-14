--!strict
--[[
	UnitModels — voxel definitions of the monsters (see VoxelModel).

	Chomper (Common) is the base body: feet, belly, arms, back spikes,
	an upper jaw (head with eyes and teeth) and a LowerJaw group with a hinge
	at its back, so it can swing open before an attack:
	    LowerJaw:PivotTo(LowerJaw:GetPivot() * CFrame.Angles(UnitModels.JawOpenAngle, 0, 0))
	Rarer units reuse the same body with a different palette for now.
]]

local VoxelModel = require(script.Parent.VoxelModel)

local UnitModels = {}

UnitModels.JawOpenAngle = math.rad(-35) -- negative = jaw swings down

local CHOMPER: VoxelModel.Definition = {
	VoxelSize = 0.5,
	Palette = {
		body = Color3.fromRGB(110, 200, 80),
		belly = Color3.fromRGB(195, 235, 145),
		dark = Color3.fromRGB(60, 110, 45),
		spike = Color3.fromRGB(70, 140, 55),
		eye = Color3.fromRGB(250, 250, 250),
		pupil = Color3.fromRGB(20, 20, 25),
		tooth = Color3.fromRGB(250, 248, 235),
		mouth = Color3.fromRGB(90, 20, 30),
		tongue = Color3.fromRGB(230, 90, 120),
	},
	Groups = {
		UpperJaw = { Hinge = Vector3.new(0, 5, 2) },
		LowerJaw = { Hinge = Vector3.new(0, 4.5, 2) },
	},
	Voxels = {
		-- Body (y 1..4)
		{ Pos = Vector3.new(0, 2.5, 0), Size = Vector3.new(6, 3, 6), Color = "body" },
		{ Pos = Vector3.new(0, 2.5, -2.75), Size = Vector3.new(4, 2, 1), Color = "belly" },
		-- Feet
		{ Pos = Vector3.new(-1.75, 0.5, -0.5), Size = Vector3.new(2, 1, 3), Color = "dark" },
		{ Pos = Vector3.new(1.75, 0.5, -0.5), Size = Vector3.new(2, 1, 3), Color = "dark" },
		-- Arms
		{ Pos = Vector3.new(-3.5, 3, -0.5), Size = Vector3.new(1, 2, 1), Color = "dark" },
		{ Pos = Vector3.new(3.5, 3, -0.5), Size = Vector3.new(1, 2, 1), Color = "dark" },
		-- Inside of the mouth (visible only when the jaw is open)
		{ Pos = Vector3.new(0, 4.75, -0.5), Size = Vector3.new(5, 0.5, 4), Color = "mouth" },

		-- Upper jaw: head (y 5..8), eyes, upper teeth
		{ Pos = Vector3.new(0, 6.5, -0.5), Size = Vector3.new(6, 3, 5), Color = "body", Group = "UpperJaw" },
		{ Pos = Vector3.new(-1.5, 7, -3.1), Size = Vector3.new(1.2, 1.2, 0.2), Color = "eye", Group = "UpperJaw" },
		{ Pos = Vector3.new(1.5, 7, -3.1), Size = Vector3.new(1.2, 1.2, 0.2), Color = "eye", Group = "UpperJaw" },
		{ Pos = Vector3.new(-1.5, 7, -3.25), Size = Vector3.new(0.6, 0.6, 0.2), Color = "pupil", Group = "UpperJaw" },
		{ Pos = Vector3.new(1.5, 7, -3.25), Size = Vector3.new(0.6, 0.6, 0.2), Color = "pupil", Group = "UpperJaw" },
		{ Pos = Vector3.new(-2, 4.6, -2.6), Size = Vector3.new(0.6, 0.8, 0.6), Color = "tooth", Group = "UpperJaw" },
		{ Pos = Vector3.new(-0.7, 4.6, -2.6), Size = Vector3.new(0.6, 0.8, 0.6), Color = "tooth", Group = "UpperJaw" },
		{ Pos = Vector3.new(0.7, 4.6, -2.6), Size = Vector3.new(0.6, 0.8, 0.6), Color = "tooth", Group = "UpperJaw" },
		{ Pos = Vector3.new(2, 4.6, -2.6), Size = Vector3.new(0.6, 0.8, 0.6), Color = "tooth", Group = "UpperJaw" },
		-- Back spikes
		{ Pos = Vector3.new(0, 8.5, 0.5), Color = "spike", Group = "UpperJaw" },
		{ Pos = Vector3.new(0, 8.5, -1), Color = "spike", Group = "UpperJaw" },
		{ Pos = Vector3.new(0, 4.5, 3.5), Color = "spike" },
		{ Pos = Vector3.new(0, 3, 3.5), Color = "spike" },

		-- Lower jaw (y 4..5): slab, tongue, lower teeth
		{ Pos = Vector3.new(0, 4.5, -0.5), Size = Vector3.new(6, 1, 5), Color = "body", Group = "LowerJaw" },
		{ Pos = Vector3.new(0, 5.05, -1), Size = Vector3.new(2, 0.1, 2.5), Color = "tongue", Group = "LowerJaw" },
		{ Pos = Vector3.new(-1.4, 5.3, -2.6), Size = Vector3.new(0.6, 0.6, 0.6), Color = "tooth", Group = "LowerJaw" },
		{ Pos = Vector3.new(0, 5.3, -2.6), Size = Vector3.new(0.6, 0.6, 0.6), Color = "tooth", Group = "LowerJaw" },
		{ Pos = Vector3.new(1.4, 5.3, -2.6), Size = Vector3.new(0.6, 0.6, 0.6), Color = "tooth", Group = "LowerJaw" },
	},
}

-- Palette overrides per unit (same body, different colors)
local SKINS: { [string]: { [string]: Color3 }? } = {
	Chomper = nil,
	Firemaw = {
		body = Color3.fromRGB(235, 90, 40),
		belly = Color3.fromRGB(255, 190, 90),
		dark = Color3.fromRGB(140, 40, 20),
		spike = Color3.fromRGB(255, 220, 60),
	},
	Laserjaw = {
		body = Color3.fromRGB(140, 70, 230),
		belly = Color3.fromRGB(210, 170, 255),
		dark = Color3.fromRGB(70, 30, 130),
		spike = Color3.fromRGB(0, 230, 255),
	},
	Kingmaw = {
		body = Color3.fromRGB(240, 185, 40),
		belly = Color3.fromRGB(255, 235, 150),
		dark = Color3.fromRGB(150, 100, 20),
		spike = Color3.fromRGB(255, 255, 255),
	},
}

-- Builds a unit model at the origin (bottom center, facing -Z)
function UnitModels.Build(modelKey: string): Model
	return VoxelModel.Build(CHOMPER, modelKey, SKINS[modelKey])
end

return UnitModels
