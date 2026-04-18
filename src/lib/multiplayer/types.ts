import type { UniverseSchema, UniverseState, SynthesisResult } from '../universe/types';

export interface PlayerInfo {
	id: string;
	isOwner: boolean;
	x: number;
	y: number;
	z: number;
	rotY: number;
}

export interface RoomState {
	ownerSecret: string;
	ownerId: string;
	schema: UniverseSchema;
	universe: UniverseState;
	synthesis: SynthesisResult | null;
	permissions: string[];
}

// Client → Server
export type ClientMessage =
	| { type: 'join'; ownerSecret?: string; schema?: UniverseSchema; universe?: UniverseState; synthesis?: SynthesisResult | null }
	| { type: 'position'; x: number; y: number; z: number; rotY: number }
	| { type: 'request_permission' }
	| { type: 'grant_permission'; connectionId: string }
	| { type: 'revoke_permission'; connectionId: string }
	| { type: 'universe_update'; universe: UniverseState };

// Server → Client
export type ServerMessage =
	| { type: 'connected'; yourId: string }
	| { type: 'welcome'; yourId: string; isOwner: boolean; state: RoomState; players: PlayerInfo[] }
	| { type: 'player_joined'; player: PlayerInfo }
	| { type: 'player_left'; id: string }
	| { type: 'player_position'; id: string; x: number; y: number; z: number; rotY: number }
	| { type: 'permission_request'; id: string }
	| { type: 'permissions_update'; permissions: string[] }
	| { type: 'universe_update'; universe: UniverseState }
	| { type: 'error'; message: string };
