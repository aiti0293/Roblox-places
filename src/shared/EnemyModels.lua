--!strict
--[[
	EnemyModels — voxel wolves that come out of the forest (see VoxelModel).
	Four legs, black fur, glowing eyes, bloody fangs, a LowerJaw group for biting.
	DireWolf is the same wolf, bigger, with orange eyes. Faces -Z, origin = bottom center.
]]

local VoxelModel = require(script.Parent.VoxelModel)

local EnemyModels = {}

EnemyModels.JawOpenAngle = math.rad(-35)

local V = Vector3.new

local VOXELS: { VoxelModel.Voxel } = {
	-- Body, chest, mane
	{ Pos = V(0, 4, 0), Size = V(3.4, 2.6, 7), Color = "fur" },
	{ Pos = V(0, 4.4, -2.6), Size = V(3.8, 3, 2.4), Color = "fur2" },
	{ Pos = V(0, 5.9, -1.8), Size = V(3, 1, 3), Color = "dark" },
	{ Pos = V(0, 6.6, -0.5), Size = V(1, 0.8, 1.2), Color = "dark" },
	{ Pos = V(0, 6.4, 1), Size = V(1, 0.8, 1.2), Color = "dark" },
	{ Pos = V(0.8, 4, -3.85), Size = V(0.8, 1, 0.15), Color = "blood" },
	-- Legs and paws
	{ Pos = V(-1.2, 1.5, -2.6), Size = V(1, 3, 1), Color = "fur" },
	{ Pos = V(1.2, 1.5, -2.6), Size = V(1, 3, 1), Color = "fur" },
	{ Pos = V(-1.2, 1.5, 2.4), Size = V(1, 3, 1.2), Color = "fur" },
	{ Pos = V(1.2, 1.5, 2.4), Size = V(1, 3, 1.2), Color = "fur" },
	{ Pos = V(-1.2, 0.25, -2.9), Size = V(1.2, 0.5, 1.6), Color = "dark" },
	{ Pos = V(1.2, 0.25, -2.9), Size = V(1.2, 0.5, 1.6), Color = "dark" },
	{ Pos = V(-1.2, 0.25, 2.2), Size = V(1.2, 0.5, 1.6), Color = "dark" },
	{ Pos = V(1.2, 0.25, 2.2), Size = V(1.2, 0.5, 1.6), Color = "dark" },
	-- Tail
	{ Pos = V(0, 4.6, 4.2), Size = V(0.8, 0.8, 2), Color = "fur" },
	{ Pos = V(0, 4.2, 5.4), Size = V(0.6, 0.6, 1), Color = "dark" },
	-- Neck and inside of the mouth
	{ Pos = V(0, 5.2, -3.9), Size = V(2.2, 2, 1.6), Color = "fur" },
	{ Pos = V(0, 4.8, -6.7), Size = V(1, 0.2, 1.6), Color = "mouth" },

	-- Head (UpperJaw)
	{ Pos = V(0, 5.8, -5.2), Size = V(2.6, 2, 2), Color = "fur", Group = "UpperJaw" },
	{ Pos = V(0, 5.3, -6.8), Size = V(1.4, 1, 1.8), Color = "fur", Group = "UpperJaw" },
	{ Pos = V(0, 5.75, -7.75), Size = V(0.6, 0.4, 0.3), Color = "nose", Group = "UpperJaw" },
	{ Pos = V(-0.75, 6.2, -6.25), Size = V(0.5, 0.3, 0.15), Color = "eye", Group = "UpperJaw" },
	{ Pos = V(0.75, 6.2, -6.25), Size = V(0.5, 0.3, 0.15), Color = "eye", Group = "UpperJaw" },
	{ Pos = V(-0.8, 7.2, -4.9), Size = V(0.6, 1, 0.6), Color = "dark", Group = "UpperJaw" },
	{ Pos = V(0.8, 7.2, -4.9), Size = V(0.6, 1, 0.6), Color = "dark", Group = "UpperJaw" },
	{ Pos = V(-0.45, 4.5, -7.4), Size = V(0.25, 0.9, 0.25), Color = "tooth", Group = "UpperJaw" },
	{ Pos = V(0.45, 4.5, -7.4), Size = V(0.25, 0.9, 0.25), Color = "tooth", Group = "UpperJaw" },

	-- Lower jaw
	{ Pos = V(0, 4.5, -6.7), Size = V(1.2, 0.6, 1.8), Color = "fur", Group = "LowerJaw" },
	{ Pos = V(-0.3, 5, -7.5), Size = V(0.2, 0.6, 0.2), Color = "tooth", Group = "LowerJaw" },
	{ Pos = V(0.3, 5, -7.5), Size = V(0.2, 0.6, 0.2), Color = "tooth", Group = "LowerJaw" },
	{ Pos = V(0, 4.15, -7.2), Size = V(0.8, 0.2, 0.6), Color = "blood", Group = "LowerJaw" },
}

local PALETTE = {
	fur = Color3.fromRGB(28, 26, 30),
	fur2 = Color3.fromRGB(44, 40, 46),
	dark = Color3.fromRGB(12, 11, 13),
	nose = Color3.fromRGB(5, 5, 5),
	eye = Color3.fromRGB(255, 40, 30),
	tooth = Color3.fromRGB(236, 230, 212),
	blood = Color3.fromRGB(125, 0, 10),
	mouth = Color3.fromRGB(70, 0, 8),
}

local GROUPS = {
	UpperJaw = { Hinge = V(0, 4.8, -5.6) },
	LowerJaw = { Hinge = V(0, 4.8, -5.6) },
}

local DEFINITIONS: { [string]: VoxelModel.Definition } = {
	Wolf = { VoxelSize = 0.45, Palette = PALETTE, Voxels = VOXELS, Groups = GROUPS, NeonColors = { eye = true } },
	DireWolf = { VoxelSize = 0.7, Palette = PALETTE, Voxels = VOXELS, Groups = GROUPS, NeonColors = { eye = true } },
}

local SKINS: { [string]: { [string]: Color3 }? } = {
	Wolf = nil,
	DireWolf = { eye = Color3.fromRGB(255, 150, 20), fur2 = Color3.fromRGB(60, 32, 28) },
}

-- Builds an enemy model at the origin (bottom center, facing -Z)
function EnemyModels.Build(modelKey: string): Model
	local def = DEFINITIONS[modelKey] or DEFINITIONS.Wolf
	return VoxelModel.Build(def, modelKey, SKINS[modelKey])
end

return EnemyModels
