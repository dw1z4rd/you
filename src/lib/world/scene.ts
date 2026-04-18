import * as THREE from 'three';
import type { WorldParams } from './types';

export function createScene(): THREE.Scene {
	return new THREE.Scene();
}

export function createCamera(params: WorldParams, aspect: number): THREE.PerspectiveCamera {
	const camera = new THREE.PerspectiveCamera(params.fov, aspect, 0.1, params.fogFar * 2);
	camera.position.set(0, params.cameraHeight, 10);
	return camera;
}

export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.0;
	return renderer;
}
