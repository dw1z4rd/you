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
}
