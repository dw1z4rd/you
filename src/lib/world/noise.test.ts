import { describe, it, expect } from 'vitest';
import { createNoise } from './noise';

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

import { sampleTerrainHeight } from './terrain';
import type { WorldParams } from './types';

const ROLLING_PARAMS = {
	terrainShape:      'rolling' as const,
	terrainMaxHeight:  20,
	terrainNoiseScale: 0.008,
	terrainOctaves:    5,
};

describe('sampleTerrainHeight', () => {
	it('returns 0 for flat terrain', () => {
		expect(sampleTerrainHeight(10, 20, { ...ROLLING_PARAMS, terrainShape: 'flat' } as WorldParams, 0)).toBe(0);
	});

	it('stays within max height range for rolling terrain', () => {
		for (let i = 0; i < 50; i++) {
			const h = sampleTerrainHeight(Math.random() * 100, Math.random() * 100, ROLLING_PARAMS as unknown as WorldParams, 0);
			expect(h).toBeGreaterThanOrEqual(-ROLLING_PARAMS.terrainMaxHeight - 0.1);
			expect(h).toBeLessThanOrEqual(ROLLING_PARAMS.terrainMaxHeight + 0.1);
		}
	});

	it('is deterministic for same seed', () => {
		const h1 = sampleTerrainHeight(5, 7, ROLLING_PARAMS as unknown as WorldParams, 42);
		const h2 = sampleTerrainHeight(5, 7, ROLLING_PARAMS as unknown as WorldParams, 42);
		expect(h1).toBe(h2);
	});
});
