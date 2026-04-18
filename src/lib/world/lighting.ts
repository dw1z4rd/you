import * as THREE from 'three';
import type { WorldParams } from './types';

export function buildLighting(params: WorldParams, scene: THREE.Scene): void {
	const ambient = new THREE.AmbientLight(params.ambientColor, params.ambientIntensity);
	scene.add(ambient);

	if (params.sunIntensity > 0) {
		const sun = new THREE.DirectionalLight(params.sunColor, params.sunIntensity);
		sun.position.set(...params.sunPosition);
		sun.castShadow = params.castShadows;

		if (params.castShadows) {
			sun.shadow.mapSize.width = 2048;
			sun.shadow.mapSize.height = 2048;
			const d = params.terrainSize / 2;
			sun.shadow.camera.left = -d;
			sun.shadow.camera.right = d;
			sun.shadow.camera.top = d;
			sun.shadow.camera.bottom = -d;
			sun.shadow.camera.near = 0.5;
			sun.shadow.camera.far = params.terrainSize * 2;
		}

		scene.add(sun);
	}
}
