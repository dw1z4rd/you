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
