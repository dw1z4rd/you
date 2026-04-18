import * as THREE from 'three';
import type { WorldParams } from './types';

function makeCircleTexture(): THREE.Texture {
	const size = 64;
	const canvas = document.createElement('canvas');
	canvas.width = size; canvas.height = size;
	const ctx = canvas.getContext('2d')!;
	const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
	grad.addColorStop(0,   'rgba(255,255,255,1)');
	grad.addColorStop(0.4, 'rgba(255,255,255,0.7)');
	grad.addColorStop(1,   'rgba(255,255,255,0)');
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, size, size);
	return new THREE.CanvasTexture(canvas);
}

export function buildAtmosphere(params: WorldParams, scene: THREE.Scene): void {
	scene.background = new THREE.Color(params.skyColor);
	scene.fog = new THREE.Fog(params.fogColor, params.fogNear, params.fogFar);

	// Starfield — round sprites on a large sphere
	const starCount = 1500;
	const starPos   = new Float32Array(starCount * 3);
	const radius    = params.fogFar * 0.9;
	for (let i = 0; i < starCount; i++) {
		const theta = Math.random() * Math.PI * 2;
		const phi   = Math.acos(1 - Math.random() * 0.8);
		starPos[i * 3]     = radius * Math.sin(phi) * Math.cos(theta);
		starPos[i * 3 + 1] = radius * Math.cos(phi);
		starPos[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
	}
	const starGeo = new THREE.BufferGeometry();
	starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
	const starMat = new THREE.PointsMaterial({
		color:       0xffffff,
		size:        params.bioluminescent ? 3.5 : 2.0,
		map:         makeCircleTexture(),
		alphaTest:   0.1,
		transparent: true,
		depthWrite:  false,
		blending:    params.bioluminescent ? THREE.AdditiveBlending : THREE.NormalBlending,
	});
	scene.add(new THREE.Points(starGeo, starMat));

	if (!params.particlesEnabled) return;

	// Life motes — floating near ground
	const count    = params.particleCount;
	const spread   = params.terrainSize / 2;
	const positions = new Float32Array(count * 3);
	for (let i = 0; i < count; i++) {
		positions[i * 3]     = (Math.random() - 0.5) * spread * 2;
		positions[i * 3 + 1] = 1 + Math.random() * 25;
		positions[i * 3 + 2] = (Math.random() - 0.5) * spread * 2;
	}
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	const material = new THREE.PointsMaterial({
		color:      params.particleColor,
		size:       params.particleSize,
		map:        makeCircleTexture(),
		alphaTest:  0.05,
		transparent: true,
		opacity:    params.bioluminescent ? 0.9 : 0.45,
		depthWrite: false,
		blending:   params.bioluminescent ? THREE.AdditiveBlending : THREE.NormalBlending,
	});
	scene.add(new THREE.Points(geometry, material));
}
