import type { UniverseSchema } from '$lib/universe/types';
import type { WorldParams } from './types';

const PALETTE_COLORS = {
	warm:      { sky: 0x1a0800, fog: 0x200a00, ambient: 0xff6030, sun: 0xff9060, terrain: 0x3d1a00, particle: 0xff5020 },
	cool:      { sky: 0x00081a, fog: 0x000a20, ambient: 0x3060ff, sun: 0x6090ff, terrain: 0x001040, particle: 0x2040ff },
	monochrome:{ sky: 0x080808, fog: 0x060606, ambient: 0x888888, sun: 0xbbbbbb, terrain: 0x1a1a1a, particle: 0x666666 },
	chromatic: { sky: 0x050510, fog: 0x030308, ambient: 0x8040ff, sun: 0xffff40, terrain: 0x101030, particle: 0x40ffff },
};

const SCALE_PARAMS = {
	intimate: { terrainSize: 200,  fogNear: 40,  fogFar: 200  },
	vast:     { terrainSize: 600,  fogNear: 100, fogFar: 600  },
	cosmic:   { terrainSize: 2000, fogNear: 300, fogFar: 2000 },
};

const ENTROPY_HEIGHT = { low: 5, medium: 20, high: 50 };
const ENTROPY_LEVEL  = { low: 0, medium: 1, high: 2 } as const;

const DENSITY_OBJECTS = { sparse: 10, moderate: 50, dense: 200 };
const DENSITY_PARTICLES = { sparse: 800, moderate: 2500, dense: 6000 };

export function schemaToWorld(schema: UniverseSchema): WorldParams {
	const c = PALETTE_COLORS[schema.palette];
	const s = SCALE_PARAMS[schema.scale];

	// Lighting presets
	let sunIntensity = 1.5;
	let ambientIntensity = 0.6;
	let castShadows = false;
	let bioluminescent = false;
	let bioluminColor = c.particle;

	switch (schema.light) {
		case 'harsh':
			sunIntensity = 3.5;
			ambientIntensity = 0.3;
			castShadows = true;
			break;
		case 'diffuse':
			sunIntensity = 0.8;
			ambientIntensity = 1.8;
			castShadows = false;
			break;
		case 'bioluminescent':
			sunIntensity = 0;
			ambientIntensity = 0.4;
			bioluminescent = true;
			break;
		case 'absent':
			sunIntensity = 0;
			ambientIntensity = 0.05;
			break;
	}

	// Terrain shape
	const terrainShape = (
		schema.geometry === 'organic'     ? 'rolling' :
		schema.geometry === 'crystalline' ? 'jagged'  :
		schema.geometry === 'fluid'       ? 'wavy'    : 'flat'
	) as WorldParams['terrainShape'];

	// Object shape
	const objectShape = (
		schema.geometry === 'crystalline' ? 'crystalline' :
		schema.geometry === 'geometric'   ? 'geometric'   : 'organic'
	) as WorldParams['objectShape'];

	// Special effects from metaphysical axioms
	const gazeReactive  = schema.consciousness === 'substrate';
	const matterSolidity: WorldParams['matterSolidity'] =
		schema.matter === 'primary'   ? 'solid'       :
		schema.matter === 'emergent'  ? 'translucent' : 'ghostly';
	const lifeMovement: WorldParams['lifeMovement'] =
		schema.life === 'present'  ? 'active' :
		schema.life === 'potential'? 'subtle' : 'none';

	// Emissive glow — bioluminescent: particle color; absent: faint palette glow so
	// geometry is barely perceptible in total darkness (especially important for wireframe matter)
	const terrainEmissive =
		bioluminescent        ? c.particle :
		schema.light === 'absent' ? c.ambient  : 0x000000;
	const terrainEmissiveIntensity =
		bioluminescent        ? 0.15 :
		schema.light === 'absent' ? 0.45  : 0;

	// Particles enabled when bioluminescent OR life is present/potential
	const particlesEnabled = bioluminescent || schema.life !== 'absent';
	const particleCount = DENSITY_PARTICLES[schema.density];

	// Sun position shifts with entropy (high entropy = low/dramatic sun)
	const sunY = schema.entropy === 'low' ? 200 : schema.entropy === 'medium' ? 100 : 30;
	const sunPosition: [number, number, number] = [150, sunY, 100];

	// Time
	const cyclicalTime = schema.time === 'cyclical';
	const timeSpeed =
		schema.time === 'absent'   ? 0   :
		schema.time === 'cyclical' ? 1.5 : 0.5;

	return {
		// Sky / atmosphere
		skyColor:  c.sky,
		fogColor:  c.fog,
		fogNear:   s.fogNear,
		fogFar:    s.fogFar,

		// Lighting
		ambientColor:     c.ambient,
		ambientIntensity,
		sunColor:         c.sun,
		sunIntensity,
		sunPosition,
		castShadows,

		// Terrain
		terrainSize:             s.terrainSize,
		terrainSegments:         128,
		terrainMaxHeight:        ENTROPY_HEIGHT[schema.entropy],
		terrainShape,
		terrainColor:            c.terrain,
		terrainRoughness:        schema.entropy === 'low' ? 0.4 : schema.entropy === 'medium' ? 0.7 : 0.9,
		terrainMetalness:        schema.matter === 'primary' ? 0.1 : 0,
		terrainEmissive,
		terrainEmissiveIntensity,

		// Particles
		particlesEnabled,
		particleColor: c.particle,
		particleCount,
		particleSize:  schema.scale === 'cosmic' ? 0.8 : 0.4,

		// Objects
		objectDensity: DENSITY_OBJECTS[schema.density],
		objectScale:   schema.scale === 'intimate' ? 0.5 : schema.scale === 'vast' ? 1.5 : 4,
		objectShape,

		// Player / camera
		moveSpeed:    schema.scale === 'intimate' ? 8 : schema.scale === 'vast' ? 20 : 60,
		cameraHeight: 2,
		fov:          75,

		// Animation
		timeSpeed,
		cyclicalTime,

		// Special effects
		gazeReactive,
		matterSolidity,
		lifeMovement,
		entropyLevel: ENTROPY_LEVEL[schema.entropy],

		// Bioluminescence
		bioluminescent,
		bioluminColor,
	};
}
