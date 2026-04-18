# You. Planet Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the current flat Three.js world into a living, schema-driven planet with real terrain height, instanced objects, water, animated particles, a sky gradient, and round stars.

**Architecture:** Each visual system lives in its own file under `src/lib/world/`. `WorldParams` carries all derived visual parameters so `WorldView.svelte` stays a pure wiring layer. New fields added to `WorldParams` are populated in `schema-to-world.ts` and consumed by the individual system builders. The render loop in `WorldView.svelte` calls `update*` functions each frame for animated systems.

**Tech Stack:** Three.js (already installed), pure-JS simplex noise (inline, no packages), SvelteKit 2 + Svelte 5 runes, Bun, TypeScript.

---

## File Map

| File | Change |
|------|--------|
| `src/lib/world/types.ts` | Add 8 new WorldParams fields |
| `src/lib/world/schema-to-world.ts` | Populate new fields from schema |
| `src/lib/world/noise.ts` | **Create** — simplex2 + fbm functions |
| `src/lib/world/terrain.ts` | Replace sine placeholder with simplex noise; add `sampleTerrainHeight` |
| `src/lib/world/player.ts` | Use `sampleTerrainHeight` for ground-following |
| `src/lib/world/atmosphere.ts` | Round stars with canvas texture; refactor particles with animation |
| `src/lib/world/water.ts` | **Create** — animated water plane ShaderMaterial |
| `src/lib/world/objects.ts` | **Create** — instanced trees, crystals, rocks |
| `src/lib/components/WorldView.svelte` | Wire water, objects, animated particles into scene + loop |
| `src/lib/world/noise.test.ts` | **Create** — unit tests for noise functions |

---

## Task 1: Extend WorldParams and schema-to-world

**Files:**
- Modify: `src/lib/world/types.ts`
- Modify: `src/lib/world/schema-to-world.ts`

- [ ] **Step 1: Add new fields to WorldParams**

Replace the entire contents of `src/lib/world/types.ts`:

```typescript
export interface WorldParams {
	// Sky / atmosphere
	skyColor: number;
	fogColor: number;
	fogNear: number;
	fogFar: number;
	skyZenithColor: number;
	skyHorizonColor: number;
	starCount: number;

	// Lighting
	ambientColor: number;
	ambientIntensity: number;
	sunColor: number;
	sunIntensity: number;
	sunPosition: [number, number, number];
	castShadows: boolean;

	// Terrain
	terrainSize: number;
	terrainSegments: number;
	terrainMaxHeight: number;
	terrainShape: 'rolling' | 'jagged' | 'wavy' | 'flat';
	terrainColor: number;
	terrainRoughness: number;
	terrainMetalness: number;
	terrainEmissive: number;
	terrainEmissiveIntensity: number;
	terrainNoiseScale: number;
	terrainOctaves: number;

	// Water
	waterEnabled: boolean;
	waterColor: number;
	waterOpacity: number;

	// Particles
	particlesEnabled: boolean;
	particleColor: number;
	particleCount: number;
	particleSize: number;
	particleDrift: 'none' | 'gentle' | 'chaotic';

	// Objects
	objectDensity: number;
	objectScale: number;
	objectShape: 'organic' | 'crystalline' | 'geometric';

	// Player / camera
	moveSpeed: number;
	cameraHeight: number;
	fov: number;

	// Animation
	timeSpeed: number;
	cyclicalTime: boolean;

	// Special effects derived from metaphysical axioms
	gazeReactive: boolean;
	matterSolidity: 'solid' | 'translucent' | 'ghostly';
	lifeMovement: 'none' | 'subtle' | 'active';
	entropyLevel: 0 | 1 | 2;

	// Bioluminescence
	bioluminescent: boolean;
	bioluminColor: number;
}
```

- [ ] **Step 2: Populate new fields in schema-to-world.ts**

Add the new fields inside the `return` block and in the helper constants. Replace the entire contents of `src/lib/world/schema-to-world.ts`:

```typescript
import type { UniverseSchema } from '$lib/universe/types';
import type { WorldParams } from './types';

const PALETTE_COLORS = {
	warm:      { sky: 0x1a0800, fog: 0x200a00, ambient: 0xff6030, sun: 0xff9060, terrain: 0x3d1a00, particle: 0xff5020, water: 0x4a2010, skyZenith: 0x0a0400, skyHorizon: 0x3a1000 },
	cool:      { sky: 0x00081a, fog: 0x000a20, ambient: 0x3060ff, sun: 0x6090ff, terrain: 0x001040, particle: 0x2040ff, water: 0x001a40, skyZenith: 0x000510, skyHorizon: 0x001030 },
	monochrome:{ sky: 0x080808, fog: 0x060606, ambient: 0x888888, sun: 0xbbbbbb, terrain: 0x1a1a1a, particle: 0x666666, water: 0x111111, skyZenith: 0x050505, skyHorizon: 0x151515 },
	chromatic: { sky: 0x050510, fog: 0x030308, ambient: 0x8040ff, sun: 0xffff40, terrain: 0x101030, particle: 0x40ffff, water: 0x102040, skyZenith: 0x020208, skyHorizon: 0x100820 },
};

const SCALE_PARAMS = {
	intimate: { terrainSize: 200,  fogNear: 40,  fogFar: 200  },
	vast:     { terrainSize: 600,  fogNear: 100, fogFar: 600  },
	cosmic:   { terrainSize: 2000, fogNear: 300, fogFar: 2000 },
};

const ENTROPY_HEIGHT  = { low: 5, medium: 20, high: 50 };
const ENTROPY_OCTAVES = { low: 3, medium: 5,  high: 8  };
const ENTROPY_LEVEL   = { low: 0, medium: 1,  high: 2  } as const;

const DENSITY_OBJECTS   = { sparse: 50,  moderate: 200, dense: 500  };
const DENSITY_PARTICLES = { sparse: 800, moderate: 2500, dense: 6000 };
const DENSITY_STARS     = { sparse: 800, moderate: 1500, dense: 3000 };

export function schemaToWorld(schema: UniverseSchema): WorldParams {
	const c = PALETTE_COLORS[schema.palette];
	const s = SCALE_PARAMS[schema.scale];

	let sunIntensity    = 1.5;
	let ambientIntensity = 0.6;
	let castShadows     = false;
	let bioluminescent  = false;
	let bioluminColor   = c.particle;

	switch (schema.light) {
		case 'harsh':
			sunIntensity     = 3.5;
			ambientIntensity = 0.3;
			castShadows      = true;
			break;
		case 'diffuse':
			sunIntensity     = 0.8;
			ambientIntensity = 1.8;
			break;
		case 'bioluminescent':
			sunIntensity     = 0;
			ambientIntensity = 0.4;
			bioluminescent   = true;
			break;
		case 'absent':
			sunIntensity     = 0;
			ambientIntensity = 0.05;
			break;
	}

	const terrainShape = (
		schema.geometry === 'organic'     ? 'rolling' :
		schema.geometry === 'crystalline' ? 'jagged'  :
		schema.geometry === 'fluid'       ? 'wavy'    : 'flat'
	) as WorldParams['terrainShape'];

	const objectShape = (
		schema.geometry === 'crystalline' ? 'crystalline' :
		schema.geometry === 'geometric'   ? 'geometric'   : 'organic'
	) as WorldParams['objectShape'];

	const gazeReactive   = schema.consciousness === 'substrate';
	const matterSolidity: WorldParams['matterSolidity'] =
		schema.matter === 'primary'  ? 'solid'       :
		schema.matter === 'emergent' ? 'translucent' : 'ghostly';
	const lifeMovement: WorldParams['lifeMovement'] =
		schema.life === 'present'   ? 'active' :
		schema.life === 'potential' ? 'subtle'  : 'none';

	const terrainEmissive =
		bioluminescent        ? c.particle :
		schema.light === 'absent' ? c.ambient  : 0x000000;
	const terrainEmissiveIntensity =
		bioluminescent        ? 0.15 :
		schema.light === 'absent' ? 0.45  : 0;

	const particlesEnabled = bioluminescent || schema.life !== 'absent';
	const particleCount    = DENSITY_PARTICLES[schema.density];
	const particleDrift: WorldParams['particleDrift'] =
		schema.entropy === 'high'    ? 'chaotic' :
		schema.life   === 'present' ? 'gentle'  : 'none';

	const waterEnabled =
		schema.matter !== 'illusory' &&
		(schema.entropy !== 'low' || schema.life === 'present');
	const waterColor   = c.water;
	const waterOpacity = schema.matter === 'emergent' ? 0.6 : 0.75;

	const sunY: number =
		schema.entropy === 'low'    ? 200 :
		schema.entropy === 'medium' ? 100 : 30;
	const sunPosition: [number, number, number] = [150, sunY, 100];

	const cyclicalTime = schema.time === 'cyclical';
	const timeSpeed    =
		schema.time === 'absent'   ? 0   :
		schema.time === 'cyclical' ? 1.5 : 0.5;

	const terrainNoiseScale =
		schema.geometry === 'organic'     ? 0.008 :
		schema.geometry === 'crystalline' ? 0.02  :
		schema.geometry === 'fluid'       ? 0.005 : 0.01;

	return {
		skyColor:        c.sky,
		fogColor:        c.fog,
		fogNear:         s.fogNear,
		fogFar:          s.fogFar,
		skyZenithColor:  c.skyZenith,
		skyHorizonColor: c.skyHorizon,
		starCount:       DENSITY_STARS[schema.density],

		ambientColor:     c.ambient,
		ambientIntensity,
		sunColor:         c.sun,
		sunIntensity,
		sunPosition,
		castShadows,

		terrainSize:             s.terrainSize,
		terrainSegments:         128,
		terrainMaxHeight:        ENTROPY_HEIGHT[schema.entropy],
		terrainShape,
		terrainColor:            c.terrain,
		terrainRoughness:        schema.entropy === 'low' ? 0.4 : schema.entropy === 'medium' ? 0.7 : 0.9,
		terrainMetalness:        schema.matter === 'primary' ? 0.1 : 0,
		terrainEmissive,
		terrainEmissiveIntensity,
		terrainNoiseScale,
		terrainOctaves:          ENTROPY_OCTAVES[schema.entropy],

		waterEnabled,
		waterColor,
		waterOpacity,

		particlesEnabled,
		particleColor: c.particle,
		particleCount,
		particleSize:  schema.scale === 'cosmic' ? 0.8 : 0.4,
		particleDrift,

		objectDensity: DENSITY_OBJECTS[schema.density],
		objectScale:   schema.scale === 'intimate' ? 0.5 : schema.scale === 'vast' ? 1.5 : 4,
		objectShape,

		moveSpeed:    schema.scale === 'intimate' ? 8 : schema.scale === 'vast' ? 20 : 60,
		cameraHeight: 2,
		fov:          75,

		timeSpeed,
		cyclicalTime,

		gazeReactive,
		matterSolidity,
		lifeMovement,
		entropyLevel: ENTROPY_LEVEL[schema.entropy],

		bioluminescent,
		bioluminColor,
	};
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd C:\Users\tooln\dev\you && bunx tsc --noEmit
```

Expected: no errors related to WorldParams fields.

- [ ] **Step 4: Commit**

```bash
git add src/lib/world/types.ts src/lib/world/schema-to-world.ts
git commit -m "feat: extend WorldParams with noise, water, sky, star fields"
```

---

## Task 2: Simplex noise module

**Files:**
- Create: `src/lib/world/noise.ts`
- Create: `src/lib/world/noise.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/world/noise.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { simplex2, fbm, createNoise } from './noise';

describe('simplex2', () => {
	it('returns values in [-1, 1]', () => {
		const noise = createNoise(42);
		for (let i = 0; i < 100; i++) {
			const v = noise.simplex2(Math.random() * 100, Math.random() * 100);
			expect(v).toBeGreaterThanOrEqual(-1.01);
			expect(v).toBeLessThanOrEqual(1.01);
		}
	});

	it('is deterministic for same inputs', () => {
		const noise = createNoise(123);
		expect(noise.simplex2(1.5, 2.7)).toBe(noise.simplex2(1.5, 2.7));
	});

	it('returns different values for different inputs', () => {
		const noise = createNoise(0);
		expect(noise.simplex2(0, 0)).not.toBe(noise.simplex2(1, 0));
	});
});

describe('fbm', () => {
	it('returns values in [-1, 1] with 5 octaves', () => {
		const noise = createNoise(7);
		for (let i = 0; i < 50; i++) {
			const v = noise.fbm(Math.random() * 50, Math.random() * 50, 5);
			expect(v).toBeGreaterThanOrEqual(-1.01);
			expect(v).toBeLessThanOrEqual(1.01);
		}
	});

	it('more octaves produce more detail than fewer', () => {
		const noise = createNoise(99);
		// Sample a 10x10 grid, compute variance — high octaves should have higher variance
		const sample = (octaves: number) => {
			let sum = 0;
			for (let x = 0; x < 10; x++)
				for (let z = 0; z < 10; z++)
					sum += Math.abs(noise.fbm(x * 0.3, z * 0.3, octaves) - noise.fbm(x * 0.3 + 0.1, z * 0.3, octaves));
			return sum;
		};
		expect(sample(8)).toBeGreaterThan(sample(2));
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:\Users\tooln\dev\you && bun run vitest run src/lib/world/noise.test.ts
```

Expected: FAIL — "Cannot find module './noise'"

- [ ] **Step 3: Implement noise.ts**

Create `src/lib/world/noise.ts`:

```typescript
// Simplex noise 2D — Stefan Gustavson algorithm, seeded variant

const GRAD2 = [
	[1, 1], [-1, 1], [1, -1], [-1, -1],
	[1, 0], [-1, 0], [0, 1],  [0, -1],
	[1, 1], [-1, 1], [0, -1], [1, -1],
];

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

function buildPerm(seed: number): { perm: Uint8Array; permMod12: Uint8Array } {
	const p = new Uint8Array(256);
	for (let i = 0; i < 256; i++) p[i] = i;

	// Seeded shuffle (mulberry32 lcg)
	let s = seed >>> 0;
	for (let i = 255; i > 0; i--) {
		s = (Math.imul(s ^ (s >>> 15), s | 1) ^ ((s ^ (Math.imul(s ^ (s >>> 7), s | 61))) >>> 3)) >>> 0;
		const j = s % (i + 1);
		const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
	}

	const perm     = new Uint8Array(512);
	const permMod12 = new Uint8Array(512);
	for (let i = 0; i < 512; i++) {
		perm[i]      = p[i & 255];
		permMod12[i] = perm[i] % 12;
	}
	return { perm, permMod12 };
}

export interface NoiseInstance {
	simplex2(xin: number, yin: number): number;
	fbm(x: number, y: number, octaves: number, lacunarity?: number, gain?: number): number;
}

export function createNoise(seed: number): NoiseInstance {
	const { perm, permMod12 } = buildPerm(seed);

	function simplex2(xin: number, yin: number): number {
		const s  = (xin + yin) * F2;
		const i  = Math.floor(xin + s);
		const j  = Math.floor(yin + s);
		const t  = (i + j) * G2;
		const x0 = xin - (i - t);
		const y0 = yin - (j - t);

		let i1: number, j1: number;
		if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }

		const x1 = x0 - i1 + G2;
		const y1 = y0 - j1 + G2;
		const x2 = x0 - 1 + 2 * G2;
		const y2 = y0 - 1 + 2 * G2;

		const ii  = i & 255;
		const jj  = j & 255;
		const gi0 = permMod12[ii     + perm[jj]];
		const gi1 = permMod12[ii + i1 + perm[jj + j1]];
		const gi2 = permMod12[ii + 1  + perm[jj + 1]];

		let t0 = 0.5 - x0 * x0 - y0 * y0;
		const n0 = t0 < 0 ? 0 : ((t0 *= t0), t0 * t0 * (GRAD2[gi0][0] * x0 + GRAD2[gi0][1] * y0));

		let t1 = 0.5 - x1 * x1 - y1 * y1;
		const n1 = t1 < 0 ? 0 : ((t1 *= t1), t1 * t1 * (GRAD2[gi1][0] * x1 + GRAD2[gi1][1] * y1));

		let t2 = 0.5 - x2 * x2 - y2 * y2;
		const n2 = t2 < 0 ? 0 : ((t2 *= t2), t2 * t2 * (GRAD2[gi2][0] * x2 + GRAD2[gi2][1] * y2));

		return Math.max(-1, Math.min(1, 70 * (n0 + n1 + n2)));
	}

	function fbm(x: number, y: number, octaves: number, lacunarity = 2, gain = 0.5): number {
		let value = 0, amp = 1, freq = 1, maxVal = 0;
		for (let i = 0; i < octaves; i++) {
			value  += amp * simplex2(x * freq, y * freq);
			maxVal += amp;
			amp    *= gain;
			freq   *= lacunarity;
		}
		return value / maxVal;
	}

	return { simplex2, fbm };
}

// Shared global noise instance — seeded from a stable value at module load.
// Replace seed per-room if universe-specific variation is needed.
let _globalNoise: NoiseInstance | null = null;
export function getGlobalNoise(seed = 0): NoiseInstance {
	if (!_globalNoise) _globalNoise = createNoise(seed);
	return _globalNoise;
}

export function resetGlobalNoise(seed: number): void {
	_globalNoise = createNoise(seed);
}

// Convenience re-exports
export function simplex2(x: number, y: number): number {
	return getGlobalNoise().simplex2(x, y);
}

export function fbm(x: number, y: number, octaves: number): number {
	return getGlobalNoise().fbm(x, y, octaves);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:\Users\tooln\dev\you && bun run vitest run src/lib/world/noise.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/world/noise.ts src/lib/world/noise.test.ts
git commit -m "feat: add seeded simplex noise module with fbm"
```

---

## Task 3: Terrain — simplex noise heights + height sampler

**Files:**
- Modify: `src/lib/world/terrain.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/lib/world/noise.test.ts` (append at end of file):

```typescript
import { sampleTerrainHeight } from './terrain';
import type { WorldParams } from './types';

// Minimal params stub for testing the height sampler
const ROLLING_PARAMS: Pick<WorldParams, 'terrainShape' | 'terrainMaxHeight' | 'terrainNoiseScale' | 'terrainOctaves'> = {
	terrainShape:     'rolling',
	terrainMaxHeight: 20,
	terrainNoiseScale: 0.008,
	terrainOctaves:    5,
};

describe('sampleTerrainHeight', () => {
	it('returns 0 for flat terrain', () => {
		expect(sampleTerrainHeight(10, 20, { ...ROLLING_PARAMS, terrainShape: 'flat' } as WorldParams, 0)).toBe(0);
	});

	it('returns values within max height range for rolling terrain', () => {
		for (let i = 0; i < 50; i++) {
			const h = sampleTerrainHeight(Math.random() * 100, Math.random() * 100, ROLLING_PARAMS as WorldParams, 0);
			expect(h).toBeGreaterThanOrEqual(-ROLLING_PARAMS.terrainMaxHeight - 0.1);
			expect(h).toBeLessThanOrEqual(ROLLING_PARAMS.terrainMaxHeight + 0.1);
		}
	});

	it('is deterministic for same seed', () => {
		const h1 = sampleTerrainHeight(5, 7, ROLLING_PARAMS as WorldParams, 42);
		const h2 = sampleTerrainHeight(5, 7, ROLLING_PARAMS as WorldParams, 42);
		expect(h1).toBe(h2);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:\Users\tooln\dev\you && bun run vitest run src/lib/world/noise.test.ts
```

Expected: FAIL — "sampleTerrainHeight is not a function" (not exported yet).

- [ ] **Step 3: Implement terrain.ts with simplex noise**

Replace entire contents of `src/lib/world/terrain.ts`:

```typescript
import * as THREE from 'three';
import type { WorldParams } from './types';
import { createNoise } from './noise';

export interface TerrainMesh {
	mesh: THREE.Mesh;
	geometry: THREE.PlaneGeometry;
	getHeight: (x: number, z: number) => number;
}

// Seeded noise per terrain instance — call resetGlobalNoise before building if you want per-room variation
const _noiseCache = new Map<number, ReturnType<typeof createNoise>>();
function getNoise(seed: number) {
	if (!_noiseCache.has(seed)) _noiseCache.set(seed, createNoise(seed));
	return _noiseCache.get(seed)!;
}

export function sampleTerrainHeight(x: number, z: number, params: Pick<WorldParams, 'terrainShape' | 'terrainMaxHeight' | 'terrainNoiseScale' | 'terrainOctaves'>, seed: number): number {
	if (params.terrainShape === 'flat') return 0;
	const noise = getNoise(seed);
	const nx = x * params.terrainNoiseScale;
	const nz = z * params.terrainNoiseScale;

	switch (params.terrainShape) {
		case 'rolling':
			return noise.fbm(nx, nz, params.terrainOctaves) * params.terrainMaxHeight;
		case 'jagged': {
			// Ridged noise — abs + invert gives sharp ridges
			let value = 0, amp = 1, freq = 1, max = 0;
			for (let i = 0; i < params.terrainOctaves; i++) {
				value += amp * (1 - Math.abs(noise.simplex2(nx * freq, nz * freq)));
				max += amp; amp *= 0.5; freq *= 2;
			}
			return (value / max) * params.terrainMaxHeight;
		}
		case 'wavy':
			// Low-frequency, smooth — animation handled in updateTerrain
			return noise.fbm(nx * 0.5, nz * 0.5, 2) * params.terrainMaxHeight * 0.5;
		default:
			return 0;
	}
}

export function buildTerrain(params: WorldParams, scene: THREE.Scene, seed = 0): TerrainMesh {
	const { terrainSize, terrainSegments } = params;
	const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
	geometry.rotateX(-Math.PI / 2);

	const pos = geometry.attributes['position'] as THREE.BufferAttribute;
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i);
		const z = pos.getZ(i);
		pos.setY(i, sampleTerrainHeight(x, z, params, seed));
	}
	pos.needsUpdate = true;
	geometry.computeVertexNormals();

	const material = new THREE.MeshStandardMaterial({
		color:             params.terrainColor,
		roughness:         params.terrainRoughness,
		metalness:         params.terrainMetalness,
		emissive:          new THREE.Color(params.terrainEmissive),
		emissiveIntensity: params.terrainEmissiveIntensity,
	});
	applyMatterSolidity(material, params);

	const mesh = new THREE.Mesh(geometry, material);
	mesh.receiveShadow = params.castShadows;
	scene.add(mesh);

	const getHeight = (x: number, z: number) => sampleTerrainHeight(x, z, params, seed);
	return { mesh, geometry, getHeight };
}

export function updateTerrain(terrain: TerrainMesh, params: WorldParams, time: number): void {
	if (params.terrainShape !== 'wavy') return;

	const pos  = terrain.geometry.attributes['position'] as THREE.BufferAttribute;
	const max  = params.terrainMaxHeight;
	const seed = 0;
	const noise = getNoise(seed);

	for (let i = 0; i < pos.count; i++) {
		const x  = pos.getX(i);
		const z  = pos.getZ(i);
		const nx = x * params.terrainNoiseScale * 0.5;
		const nz = z * params.terrainNoiseScale * 0.5;
		const base = noise.fbm(nx, nz, 2) * max * 0.5;
		const wave = Math.sin(x * 0.08 + time * params.timeSpeed) * 0.3
		           + Math.sin(z * 0.06 + time * params.timeSpeed * 1.3) * 0.2;
		pos.setY(i, base + wave * max * 0.3);
	}

	pos.needsUpdate = true;
	terrain.geometry.computeVertexNormals();
}

function applyMatterSolidity(material: THREE.MeshStandardMaterial, params: WorldParams): void {
	if (params.matterSolidity === 'translucent') {
		material.transparent = true;
		material.opacity = 0.55;
	} else if (params.matterSolidity === 'ghostly') {
		material.transparent = true;
		material.opacity = 0.2;
		material.wireframe = true;
	}
}
```

- [ ] **Step 4: Run tests**

```bash
cd C:\Users\tooln\dev\you && bun run vitest run src/lib/world/noise.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/world/terrain.ts src/lib/world/noise.test.ts
git commit -m "feat: simplex noise terrain heights with height sampler"
```

---

## Task 4: Player ground-following

**Files:**
- Modify: `src/lib/world/player.ts`

- [ ] **Step 1: Update PlayerController to accept a height sampler**

Replace entire contents of `src/lib/world/player.ts`:

```typescript
import * as THREE from 'three';
import type { WorldParams } from './types';

export class PlayerController {
	private camera: THREE.PerspectiveCamera;
	private params: WorldParams;
	private euler  = new THREE.Euler(0, 0, 0, 'YXZ');
	private keys   = new Set<string>();
	private locked = false;
	private getTerrainHeight: (x: number, z: number) => number;

	private readonly onKeyDown     = (e: KeyboardEvent) => this.keys.add(e.code);
	private readonly onKeyUp       = (e: KeyboardEvent) => this.keys.delete(e.code);
	private readonly onLockChange  = () => { this.locked = document.pointerLockElement !== null; };
	private readonly onMouseMove   = (e: MouseEvent) => {
		if (!this.locked) return;
		const sens = 0.002;
		this.euler.setFromQuaternion(this.camera.quaternion);
		this.euler.y -= e.movementX * sens;
		this.euler.x  = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x - e.movementY * sens));
		this.camera.quaternion.setFromEuler(this.euler);
	};

	constructor(
		camera: THREE.PerspectiveCamera,
		params: WorldParams,
		getTerrainHeight: (x: number, z: number) => number = () => 0,
	) {
		this.camera           = camera;
		this.params           = params;
		this.getTerrainHeight = getTerrainHeight;
		document.addEventListener('keydown',           this.onKeyDown);
		document.addEventListener('keyup',             this.onKeyUp);
		document.addEventListener('mousemove',         this.onMouseMove);
		document.addEventListener('pointerlockchange', this.onLockChange);
	}

	lock(element: HTMLElement): void {
		element.requestPointerLock();
	}

	update(delta: number): void {
		const speed = this.params.moveSpeed * delta;
		const dir   = new THREE.Vector3();

		if (this.keys.has('KeyW') || this.keys.has('ArrowUp'))    dir.z -= 1;
		if (this.keys.has('KeyS') || this.keys.has('ArrowDown'))  dir.z += 1;
		if (this.keys.has('KeyA') || this.keys.has('ArrowLeft'))  dir.x -= 1;
		if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) dir.x += 1;

		if (dir.lengthSq() > 0) {
			dir.normalize().applyEuler(new THREE.Euler(0, this.euler.y, 0));
			this.camera.position.addScaledVector(dir, speed);
		}

		const groundY = this.getTerrainHeight(this.camera.position.x, this.camera.position.z);
		this.camera.position.y = groundY + this.params.cameraHeight;
	}

	getPosition(): { x: number; y: number; z: number; rotY: number } {
		return {
			x:    this.camera.position.x,
			y:    this.camera.position.y,
			z:    this.camera.position.z,
			rotY: this.euler.y,
		};
	}

	dispose(): void {
		document.removeEventListener('keydown',           this.onKeyDown);
		document.removeEventListener('keyup',             this.onKeyUp);
		document.removeEventListener('mousemove',         this.onMouseMove);
		document.removeEventListener('pointerlockchange', this.onLockChange);
	}
}
```

- [ ] **Step 2: Update WorldView.svelte to pass getHeight to PlayerController**

In `src/lib/components/WorldView.svelte`, replace this line:

```typescript
		const player  = new PlayerController(camera, params);
```

With:

```typescript
		const player = new PlayerController(camera, params, terrain.getHeight);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd C:\Users\tooln\dev\you && bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/world/player.ts src/lib/components/WorldView.svelte
git commit -m "feat: player follows terrain height via height sampler"
```

---

## Task 5: Sky gradient dome + round stars

**Files:**
- Modify: `src/lib/world/atmosphere.ts`

- [ ] **Step 1: Replace atmosphere.ts**

Replace entire contents of `src/lib/world/atmosphere.ts`:

```typescript
import * as THREE from 'three';
import type { WorldParams } from './types';

export interface ParticleSystem {
	points: THREE.Points;
	positions: Float32Array;
	velocities: Float32Array;
	baseY: Float32Array;
}

function makeCircleTexture(): THREE.Texture {
	const size = 64;
	const canvas = document.createElement('canvas');
	canvas.width  = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d')!;
	const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
	grad.addColorStop(0,   'rgba(255,255,255,1)');
	grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
	grad.addColorStop(1,   'rgba(255,255,255,0)');
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, size, size);
	return new THREE.CanvasTexture(canvas);
}

export function buildAtmosphere(params: WorldParams, scene: THREE.Scene): void {
	// Gradient sky dome — large sphere, BackSide, gradient shader
	const skyGeo = new THREE.SphereGeometry(params.fogFar * 0.95, 32, 16);
	const skyMat = new THREE.ShaderMaterial({
		uniforms: {
			uZenith:  { value: new THREE.Color(params.skyZenithColor) },
			uHorizon: { value: new THREE.Color(params.skyHorizonColor) },
		},
		vertexShader: `
			varying float vY;
			void main() {
				vY = normalize(position).y;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`,
		fragmentShader: `
			uniform vec3 uZenith;
			uniform vec3 uHorizon;
			varying float vY;
			void main() {
				float t = clamp(vY * 1.4, 0.0, 1.0);
				gl_FragColor = vec4(mix(uHorizon, uZenith, t), 1.0);
			}
		`,
		side: THREE.BackSide,
		depthWrite: false,
	});
	scene.add(new THREE.Mesh(skyGeo, skyMat));
	scene.fog = new THREE.Fog(params.fogColor, params.fogNear, params.fogFar);

	// Starfield — always visible, round sprites via canvas texture
	const starTex  = makeCircleTexture();
	const starCount = params.starCount;
	const starPos   = new Float32Array(starCount * 3);
	const radius    = params.fogFar * 0.9;

	for (let i = 0; i < starCount; i++) {
		// Distribute uniformly on upper hemisphere
		const theta = Math.random() * Math.PI * 2;
		const phi   = Math.acos(1 - Math.random() * 0.75); // upper 3/4 sphere
		starPos[i * 3]     = radius * Math.sin(phi) * Math.cos(theta);
		starPos[i * 3 + 1] = radius * Math.cos(phi);
		starPos[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
	}

	const starGeo = new THREE.BufferGeometry();
	starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));

	const starMat = new THREE.PointsMaterial({
		color:       0xffffff,
		size:        params.bioluminescent ? 3.0 : 1.5,
		map:         starTex,
		alphaTest:   0.1,
		transparent: true,
		depthWrite:  false,
		blending:    params.bioluminescent ? THREE.AdditiveBlending : THREE.NormalBlending,
	});

	scene.add(new THREE.Points(starGeo, starMat));
}

export function buildParticles(params: WorldParams, scene: THREE.Scene): ParticleSystem | null {
	if (!params.particlesEnabled) return null;

	const count     = params.particleCount;
	const spread    = params.terrainSize / 2;
	const positions  = new Float32Array(count * 3);
	const velocities = new Float32Array(count * 3);
	const baseY      = new Float32Array(count);

	for (let i = 0; i < count; i++) {
		const x = (Math.random() - 0.5) * spread * 2;
		const y = 2 + Math.random() * 40;
		const z = (Math.random() - 0.5) * spread * 2;
		positions[i * 3]     = x;
		positions[i * 3 + 1] = y;
		positions[i * 3 + 2] = z;
		baseY[i]             = y;

		// Chaotic velocities are larger
		const vScale = params.particleDrift === 'chaotic' ? 2.0 : 0.3;
		velocities[i * 3]     = (Math.random() - 0.5) * vScale;
		velocities[i * 3 + 1] = (Math.random() - 0.5) * vScale * 0.3;
		velocities[i * 3 + 2] = (Math.random() - 0.5) * vScale;
	}

	const geo = new THREE.BufferGeometry();
	geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

	const circleTex = makeCircleTexture();
	const mat = new THREE.PointsMaterial({
		color:      params.particleColor,
		size:       params.particleSize,
		map:        circleTex,
		alphaTest:  0.05,
		transparent: true,
		opacity:    params.bioluminescent ? 0.9 : 0.45,
		depthWrite: false,
		blending:   params.bioluminescent ? THREE.AdditiveBlending : THREE.NormalBlending,
	});

	const points: THREE.Points = new THREE.Points(geo, mat);
	scene.add(points);

	return { points, positions, velocities, baseY };
}

export function updateParticles(system: ParticleSystem, params: WorldParams, time: number, delta: number): void {
	if (params.particleDrift === 'none') return;

	const pos    = system.positions;
	const vel    = system.velocities;
	const count  = pos.length / 3;
	const spread = params.terrainSize / 2;
	const pulse  = params.cyclicalTime ? 0.5 + 0.5 * Math.sin(time * params.timeSpeed) : 1;

	for (let i = 0; i < count; i++) {
		const ix = i * 3, iy = ix + 1, iz = ix + 2;

		pos[ix] += vel[ix] * delta * pulse;
		pos[iy] += vel[iy] * delta * pulse + Math.sin(time * 0.3 + i) * 0.002;
		pos[iz] += vel[iz] * delta * pulse;

		// Wrap particles inside terrain bounds
		if (pos[ix] >  spread) pos[ix] = -spread;
		if (pos[ix] < -spread) pos[ix] =  spread;
		if (pos[iz] >  spread) pos[iz] = -spread;
		if (pos[iz] < -spread) pos[iz] =  spread;
		if (pos[iy] < 0)       pos[iy] = system.baseY[i];
		if (pos[iy] > 60)      pos[iy] = 1;

		// Chaotic particles also randomize velocity each frame
		if (params.particleDrift === 'chaotic') {
			vel[ix] += (Math.random() - 0.5) * 0.4 * delta;
			vel[iz] += (Math.random() - 0.5) * 0.4 * delta;
			// Clamp velocity
			vel[ix] = Math.max(-3, Math.min(3, vel[ix]));
			vel[iz] = Math.max(-3, Math.min(3, vel[iz]));
		}
	}

	const attr = system.points.geometry.attributes['position'] as THREE.BufferAttribute;
	attr.set(pos);
	attr.needsUpdate = true;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:\Users\tooln\dev\you && bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/world/atmosphere.ts
git commit -m "feat: sky gradient dome, round stars, animated particle system"
```

---

## Task 6: Water plane

**Files:**
- Create: `src/lib/world/water.ts`

- [ ] **Step 1: Create water.ts**

Create `src/lib/world/water.ts`:

```typescript
import * as THREE from 'three';
import type { WorldParams } from './types';

export interface WaterMesh {
	mesh: THREE.Mesh;
	material: THREE.ShaderMaterial;
}

export function buildWater(params: WorldParams, scene: THREE.Scene): WaterMesh | null {
	if (!params.waterEnabled) return null;

	const geo = new THREE.PlaneGeometry(params.terrainSize, params.terrainSize, 64, 64);
	geo.rotateX(-Math.PI / 2);

	const mat = new THREE.ShaderMaterial({
		uniforms: {
			uTime:    { value: 0 },
			uColor:   { value: new THREE.Color(params.waterColor) },
			uOpacity: { value: params.waterOpacity },
		},
		vertexShader: `
			uniform float uTime;
			varying vec2 vUv;
			varying float vWave;
			void main() {
				vUv = uv;
				vec3 pos = position;
				float wave = sin(pos.x * 0.5 + uTime)      * 0.15
				           + sin(pos.z * 0.4 + uTime * 1.3) * 0.10
				           + sin((pos.x + pos.z) * 0.3 + uTime * 0.7) * 0.05;
				pos.y += wave;
				vWave = wave;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
			}
		`,
		fragmentShader: `
			uniform vec3 uColor;
			uniform float uOpacity;
			varying float vWave;
			void main() {
				// Lighten crests slightly
				vec3 col = uColor + vec3(vWave * 0.3);
				gl_FragColor = vec4(col, uOpacity);
			}
		`,
		transparent: true,
		side: THREE.DoubleSide,
		depthWrite: false,
	});

	const mesh = new THREE.Mesh(geo, mat);
	mesh.position.y = 0; // sits at sea level; terrain peaks emerge above
	scene.add(mesh);

	return { mesh, material: mat };
}

export function updateWater(water: WaterMesh | null, time: number): void {
	if (!water) return;
	water.material.uniforms['uTime'].value = time;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:\Users\tooln\dev\you && bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/world/water.ts
git commit -m "feat: animated water plane with ripple vertex shader"
```

---

## Task 7: Terrain objects — instanced meshes

**Files:**
- Create: `src/lib/world/objects.ts`

- [ ] **Step 1: Create objects.ts**

Create `src/lib/world/objects.ts`:

```typescript
import * as THREE from 'three';
import type { WorldParams } from './types';

export function buildObjects(
	params: WorldParams,
	scene: THREE.Scene,
	getHeight: (x: number, z: number) => number,
): THREE.Object3D[] {
	const count  = params.objectDensity;
	const spread = params.terrainSize / 2 * 0.9; // avoid edges
	const scale  = params.objectScale;
	const added: THREE.Object3D[] = [];

	const dummy = new THREE.Object3D();

	function placeInstanced(
		geo: THREE.BufferGeometry,
		mat: THREE.Material,
		yOffset: number,
	): THREE.InstancedMesh {
		const mesh = new THREE.InstancedMesh(geo, mat, count);
		mesh.castShadow    = params.castShadows;
		mesh.receiveShadow = params.castShadows;

		for (let i = 0; i < count; i++) {
			const x   = (Math.random() - 0.5) * spread * 2;
			const z   = (Math.random() - 0.5) * spread * 2;
			const y   = getHeight(x, z);
			const s   = (0.7 + Math.random() * 0.6) * scale;
			dummy.position.set(x, y + yOffset * s, z);
			dummy.scale.setScalar(s);
			dummy.rotation.y = Math.random() * Math.PI * 2;
			dummy.updateMatrix();
			mesh.setMatrixAt(i, dummy.matrix);
		}
		mesh.instanceMatrix.needsUpdate = true;
		scene.add(mesh);
		added.push(mesh);
		return mesh;
	}

	if (params.lifeMovement === 'none') {
		// Rocks only — all schema configs that have life: absent
		const rockGeo = new THREE.IcosahedronGeometry(0.35, 0);
		const rockMat = new THREE.MeshStandardMaterial({
			color:    params.terrainColor,
			roughness: 0.95,
			metalness: 0.0,
		});
		placeInstanced(rockGeo, rockMat, 0.15);
		return added;
	}

	if (params.lifeMovement === 'subtle') {
		// Ghostly wireframe stumps — life: potential
		const ghostGeo = new THREE.CylinderGeometry(0.05, 0.2, 1.5, 5);
		const ghostMat = new THREE.MeshStandardMaterial({
			color:       params.particleColor,
			wireframe:   true,
			transparent: true,
			opacity:     0.3,
		});
		placeInstanced(ghostGeo, ghostMat, 0.75);
		return added;
	}

	// life: present
	if (params.objectShape === 'organic') {
		// Trees: trunk (cylinder) + canopy (cone)
		const trunkGeo = new THREE.CylinderGeometry(0.08, 0.13, 1.0, 6);
		const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a1a00, roughness: 0.9 });
		placeInstanced(trunkGeo, trunkMat, 0.5);

		const canopyGeo = new THREE.ConeGeometry(0.6, 1.8, 7);
		const canopyColor = new THREE.Color(params.terrainColor).lerp(new THREE.Color(0x003300), 0.5);
		const canopyMat = new THREE.MeshStandardMaterial({
			color:     canopyColor,
			roughness: 0.85,
			emissive:  params.bioluminescent ? new THREE.Color(params.bioluminColor) : undefined,
			emissiveIntensity: params.bioluminescent ? 0.1 : 0,
		});
		placeInstanced(canopyGeo, canopyMat, 1.6);
		return added;
	}

	if (params.objectShape === 'crystalline' || params.objectShape === 'geometric') {
		// Crystal pillars
		const sides   = params.objectShape === 'crystalline' ? 5 : 4;
		const crystalGeo = new THREE.CylinderGeometry(0.04, 0.18, 2.2, sides);
		const crystalMat = new THREE.MeshStandardMaterial({
			color:       params.particleColor,
			metalness:   0.8,
			roughness:   0.1,
			transparent: true,
			opacity:     0.85,
			emissive:    params.bioluminescent ? new THREE.Color(params.bioluminColor) : undefined,
			emissiveIntensity: params.bioluminescent ? 0.3 : 0,
		});
		placeInstanced(crystalGeo, crystalMat, 1.1);

		// Small base rocks under each crystal
		const baseGeo = new THREE.IcosahedronGeometry(0.25, 0);
		const baseMat = new THREE.MeshStandardMaterial({ color: params.terrainColor, roughness: 0.9 });
		placeInstanced(baseGeo, baseMat, 0.1);
		return added;
	}

	return added;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:\Users\tooln\dev\you && bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/world/objects.ts
git commit -m "feat: instanced terrain objects — trees, crystals, rocks by schema"
```

---

## Task 8: Wire all new systems in WorldView.svelte

**Files:**
- Modify: `src/lib/components/WorldView.svelte`

- [ ] **Step 1: Rewrite WorldView.svelte to use all new systems**

Replace entire contents of `src/lib/components/WorldView.svelte`:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import type { WorldParams } from '$lib/world/types';
	import type { PlayerInfo } from '$lib/multiplayer/types';
	import { createScene, createCamera, createRenderer } from '$lib/world/scene';
	import { buildLighting } from '$lib/world/lighting';
	import { buildAtmosphere, buildParticles, updateParticles } from '$lib/world/atmosphere';
	import { buildTerrain, updateTerrain } from '$lib/world/terrain';
	import { buildWater, updateWater } from '$lib/world/water';
	import { buildObjects } from '$lib/world/objects';
	import { PlayerController } from '$lib/world/player';

	let {
		params,
		players = {},
		onPosition,
	}: {
		params: WorldParams;
		players?: Record<string, PlayerInfo>;
		onPosition?: (pos: { x: number; y: number; z: number; rotY: number }) => void;
	} = $props();

	let canvas: HTMLCanvasElement;

	let playersSnapshot = players;
	$effect(() => { playersSnapshot = players; });

	onMount(() => {
		const scene    = createScene();
		const camera   = createCamera(params, canvas.clientWidth / canvas.clientHeight);
		const renderer = createRenderer(canvas);

		buildLighting(params, scene);
		buildAtmosphere(params, scene);

		const terrain  = buildTerrain(params, scene);
		const water    = buildWater(params, scene);
		const particles = buildParticles(params, scene);
		buildObjects(params, scene, terrain.getHeight);

		const player = new PlayerController(camera, params, terrain.getHeight);

		// Other-player orbs
		const orbs   = new Map<string, THREE.Mesh>();
		const orbGeom = new THREE.SphereGeometry(0.4, 12, 8);
		const orbMat  = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			emissive: new THREE.Color(params.bioluminColor || 0x8888ff),
			emissiveIntensity: 2,
			transparent: true,
			opacity: 0.85,
		});

		function syncOrbs() {
			const snap = playersSnapshot;
			for (const [id, mesh] of orbs) {
				if (!snap[id]) { scene.remove(mesh); orbs.delete(id); }
			}
			for (const [id, info] of Object.entries(snap)) {
				let mesh = orbs.get(id);
				if (!mesh) {
					mesh = new THREE.Mesh(orbGeom, orbMat.clone());
					scene.add(mesh);
					orbs.set(id, mesh);
				}
				mesh.position.set(info.x, info.y, info.z);
			}
		}

		let rafId: number;
		let lastTime  = performance.now();
		let frameCount = 0;

		function resize() {
			const w = canvas.clientWidth;
			const h = canvas.clientHeight;
			renderer.setSize(w, h, false);
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
		}

		const observer = new ResizeObserver(resize);
		observer.observe(canvas);
		resize();

		function loop(now: number) {
			const delta = Math.min((now - lastTime) / 1000, 0.1);
			lastTime = now;
			frameCount++;

			const time = now / 1000;

			player.update(delta);
			updateTerrain(terrain, params, time);
			updateWater(water, time);
			if (particles) updateParticles(particles, params, time, delta);
			syncOrbs();
			renderer.render(scene, camera);

			if (frameCount % 5 === 0) onPosition?.(player.getPosition());

			rafId = requestAnimationFrame(loop);
		}

		canvas.addEventListener('click', () => player.lock(canvas));
		rafId = requestAnimationFrame(loop);

		return () => {
			observer.disconnect();
			cancelAnimationFrame(rafId);
			player.dispose();
			orbGeom.dispose();
			renderer.dispose();
		};
	});
</script>

<canvas bind:this={canvas} class="w-full h-full block" />
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:\Users\tooln\dev\you && bunx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start dev server and visual check**

```bash
cd C:\Users\tooln\dev\you && bun dev
```

Navigate to `http://localhost:5173`, complete the Q&A, enter the world, and verify:
- Sky shows gradient (dark at top, slightly lighter at horizon) — not pure black
- Stars are round glowing dots, not squares
- Terrain has visible height variation (hills or ridges depending on schema)
- Player walks up and down terrain naturally
- If `life: present`, trees or crystals are visible on terrain
- If `waterEnabled`, a translucent water plane sits at y=0

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/WorldView.svelte
git commit -m "feat: wire terrain objects, water, animated particles, sky into WorldView"
```

---

## Self-Review

**Spec coverage:**
1. ✅ Terrain height (simplex noise) — Task 2 + 3
2. ✅ Terrain objects (instanced) — Task 7
3. ✅ Water plane — Task 6
4. ✅ Atmospheric effects (sky gradient + fog) — Task 5
5. ✅ Particle systems (life movement, bioluminescent, cyclical, entropy) — Task 5
6. ✅ Star fix (round via canvas texture) — Task 5
7. ✅ Ground-following player — Task 4
8. ✅ WorldView wiring — Task 8

**Placeholder scan:** No TBDs, no "add appropriate error handling", all code blocks complete.

**Type consistency:**
- `TerrainMesh.getHeight` defined in Task 3, consumed in Tasks 4 and 7 ✅
- `ParticleSystem` interface defined in Task 5, `updateParticles` signature matches ✅
- `WaterMesh` defined in Task 6, `updateWater` signature matches ✅
- All new `WorldParams` fields defined in Task 1, populated in schema-to-world in Task 1, consumed in Tasks 3–7 ✅
