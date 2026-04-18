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
			varying float vWave;
			void main() {
				vec3 pos = position;
				float wave = sin(pos.x * 0.5 + uTime)       * 0.15
				           + sin(pos.z * 0.4 + uTime * 1.3)  * 0.10
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
				vec3 col = uColor + vec3(vWave * 0.3);
				gl_FragColor = vec4(col, uOpacity);
			}
		`,
		transparent: true,
		side: THREE.DoubleSide,
		depthWrite: false,
	});

	const mesh = new THREE.Mesh(geo, mat);
	mesh.position.y = 0;
	scene.add(mesh);
	return { mesh, material: mat };
}

export function updateWater(water: WaterMesh | null, time: number): void {
	if (!water) return;
	water.material.uniforms['uTime'].value = time;
}
