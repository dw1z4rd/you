export interface WorldParams {
	// Sky / atmosphere
	skyColor: number;
	fogColor: number;
	fogNear: number;
	fogFar: number;

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

	// Particles
	particlesEnabled: boolean;
	particleColor: number;
	particleCount: number;
	particleSize: number;

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
	gazeReactive: boolean;           // consciousness === 'substrate': world responds to player gaze
	matterSolidity: 'solid' | 'translucent' | 'ghostly';
	lifeMovement: 'none' | 'subtle' | 'active';
	entropyLevel: 0 | 1 | 2;        // 0 = pristine, 1 = weathered, 2 = ruined

	// Bioluminescence
	bioluminescent: boolean;
	bioluminColor: number;
}
