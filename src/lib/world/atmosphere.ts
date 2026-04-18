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
	// Gradient sky dome
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

	// Starfield — round sprites on upper hemisphere
	const starTex   = makeCircleTexture();
	const starCount = params.starCount;
	const starPos   = new Float32Array(starCount * 3);
	const radius    = params.fogFar * 0.9;

	for (let i = 0; i < starCount; i++) {
		const theta = Math.random() * Math.PI * 2;
		const phi   = Math.acos(1 - Math.random() * 0.75);
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

	const count      = params.particleCount;
	const spread     = params.terrainSize / 2;
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

		const vScale = params.particleDrift === 'chaotic' ? 2.0 : 0.3;
		velocities[i * 3]     = (Math.random() - 0.5) * vScale;
		velocities[i * 3 + 1] = (Math.random() - 0.5) * vScale * 0.3;
		velocities[i * 3 + 2] = (Math.random() - 0.5) * vScale;
	}

	const geo = new THREE.BufferGeometry();
	geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

	const mat = new THREE.PointsMaterial({
		color:       params.particleColor,
		size:        params.particleSize,
		map:         makeCircleTexture(),
		alphaTest:   0.05,
		transparent: true,
		opacity:     params.bioluminescent ? 0.9 : 0.45,
		depthWrite:  false,
		blending:    params.bioluminescent ? THREE.AdditiveBlending : THREE.NormalBlending,
	});

	const points = new THREE.Points(geo, mat);
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

		if (pos[ix] >  spread) pos[ix] = -spread;
		if (pos[ix] < -spread) pos[ix] =  spread;
		if (pos[iz] >  spread) pos[iz] = -spread;
		if (pos[iz] < -spread) pos[iz] =  spread;
		if (pos[iy] < 0)       pos[iy] = system.baseY[i];
		if (pos[iy] > 60)      pos[iy] = 1;

		if (params.particleDrift === 'chaotic') {
			vel[ix] += (Math.random() - 0.5) * 0.4 * delta;
			vel[iz] += (Math.random() - 0.5) * 0.4 * delta;
			vel[ix] = Math.max(-3, Math.min(3, vel[ix]));
			vel[iz] = Math.max(-3, Math.min(3, vel[iz]));
		}
	}

	const attr = system.points.geometry.attributes['position'] as THREE.BufferAttribute;
	attr.set(pos);
	attr.needsUpdate = true;
}
