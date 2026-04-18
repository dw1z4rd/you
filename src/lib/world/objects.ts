import * as THREE from 'three';
import type { WorldParams } from './types';

export function buildObjects(
	params: WorldParams,
	scene: THREE.Scene,
	getHeight: (x: number, z: number) => number,
): THREE.Object3D[] {
	const count  = params.objectDensity;
	const spread = params.terrainSize / 2 * 0.9;
	const scale  = params.objectScale;
	const added: THREE.Object3D[] = [];
	const dummy = new THREE.Object3D();

	function placeInstanced(geo: THREE.BufferGeometry, mat: THREE.Material, yOffset: number): THREE.InstancedMesh {
		const mesh = new THREE.InstancedMesh(geo, mat, count);
		mesh.castShadow    = params.castShadows;
		mesh.receiveShadow = params.castShadows;
		for (let i = 0; i < count; i++) {
			const x = (Math.random() - 0.5) * spread * 2;
			const z = (Math.random() - 0.5) * spread * 2;
			const y = getHeight(x, z);
			const s = (0.7 + Math.random() * 0.6) * scale;
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
		const rockGeo = new THREE.IcosahedronGeometry(0.35, 0);
		const rockMat = new THREE.MeshStandardMaterial({ color: params.terrainColor, roughness: 0.95 });
		placeInstanced(rockGeo, rockMat, 0.15);
		return added;
	}

	if (params.lifeMovement === 'subtle') {
		const ghostGeo = new THREE.CylinderGeometry(0.05, 0.2, 1.5, 5);
		const ghostMat = new THREE.MeshStandardMaterial({
			color: params.particleColor, wireframe: true, transparent: true, opacity: 0.3,
		});
		placeInstanced(ghostGeo, ghostMat, 0.75);
		return added;
	}

	// life: present
	if (params.objectShape === 'organic') {
		const trunkGeo = new THREE.CylinderGeometry(0.08, 0.13, 1.0, 6);
		const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a1a00, roughness: 0.9 });
		placeInstanced(trunkGeo, trunkMat, 0.5);

		const canopyGeo = new THREE.ConeGeometry(0.6, 1.8, 7);
		const canopyColor = new THREE.Color(params.terrainColor).lerp(new THREE.Color(0x003300), 0.5);
		const canopyMat = new THREE.MeshStandardMaterial({
			color: canopyColor,
			roughness: 0.85,
			emissive: params.bioluminescent ? new THREE.Color(params.bioluminColor) : new THREE.Color(0x000000),
			emissiveIntensity: params.bioluminescent ? 0.1 : 0,
		});
		placeInstanced(canopyGeo, canopyMat, 1.6);
		return added;
	}

	// crystalline or geometric
	const sides      = params.objectShape === 'crystalline' ? 5 : 4;
	const crystalGeo = new THREE.CylinderGeometry(0.04, 0.18, 2.2, sides);
	const crystalMat = new THREE.MeshStandardMaterial({
		color: params.particleColor,
		metalness: 0.8,
		roughness: 0.1,
		transparent: true,
		opacity: 0.85,
		emissive: params.bioluminescent ? new THREE.Color(params.bioluminColor) : new THREE.Color(0x000000),
		emissiveIntensity: params.bioluminescent ? 0.3 : 0,
	});
	placeInstanced(crystalGeo, crystalMat, 1.1);

	const baseGeo = new THREE.IcosahedronGeometry(0.25, 0);
	const baseMat = new THREE.MeshStandardMaterial({ color: params.terrainColor, roughness: 0.9 });
	placeInstanced(baseGeo, baseMat, 0.1);
	return added;
}
