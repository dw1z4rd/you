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

	let s = seed >>> 0;
	for (let i = 255; i > 0; i--) {
		s = (Math.imul(s ^ (s >>> 15), s | 1) ^ ((s ^ (Math.imul(s ^ (s >>> 7), s | 61))) >>> 3)) >>> 0;
		const j = s % (i + 1);
		const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
	}

	const perm      = new Uint8Array(512);
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
		const gi0 = permMod12[ii      + perm[jj]];
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

let _globalNoise: NoiseInstance | null = null;

export function getGlobalNoise(seed = 0): NoiseInstance {
	if (!_globalNoise) _globalNoise = createNoise(seed);
	return _globalNoise;
}

export function resetGlobalNoise(seed: number): void {
	_globalNoise = createNoise(seed);
}

export function simplex2(x: number, y: number): number {
	return getGlobalNoise().simplex2(x, y);
}

export function fbm(x: number, y: number, octaves: number): number {
	return getGlobalNoise().fbm(x, y, octaves);
}
