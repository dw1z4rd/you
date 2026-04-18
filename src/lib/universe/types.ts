export interface Answer {
	question: string;
	answer: string;
	axiom: string;
	domain: string;
}

export interface UniverseState {
	answers: Answer[];
}

export interface QuestionResult {
	question: string;
	domain: string;
	choices: [string, string];
}

export interface UniverseSchema {
	// Metaphysical
	consciousness: 'substrate' | 'emergent' | 'absent';
	identity: 'singular' | 'distributed' | 'fluid';
	time: 'linear' | 'cyclical' | 'absent';
	causality: 'deterministic' | 'probabilistic' | 'absent';
	meaning: 'intrinsic' | 'constructed' | 'absent';
	matter: 'primary' | 'emergent' | 'illusory';
	life: 'present' | 'absent' | 'potential';
	// Visual / generative — for future 3D world
	palette: 'warm' | 'cool' | 'monochrome' | 'chromatic';
	density: 'sparse' | 'moderate' | 'dense';
	scale: 'intimate' | 'vast' | 'cosmic';
	geometry: 'organic' | 'crystalline' | 'fluid' | 'geometric';
	light: 'harsh' | 'diffuse' | 'bioluminescent' | 'absent';
	entropy: 'low' | 'medium' | 'high';
}

export interface SynthesisResult {
	narrative: string;
	schema: UniverseSchema;
}
