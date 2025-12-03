import { Position } from './types';

export const GRID_SIZE = 7;
export const MAX_AMMO = 3;
export const SHOOT_RANGE = 3; // Chebyshev distance
export const TOTAL_GAME_TIME = 150; // 2m 30s
export const AUTO_PHASE_DURATION = 30; // 30s
export const TICK_RATE_MS = 600; // Speed of AI movement

export const TOWER_LEFT_POS: Position = { x: 0, y: 0 };
export const TOWER_RIGHT_POS: Position = { x: 6, y: 0 };

export const RELOADER_LEFT_POS: Position = { x: 0, y: 6 }; // User Reloader
export const RELOADER_RIGHT_POS: Position = { x: 6, y: 6 }; // Enemy Reloader

// Initial Positions
export const INITIAL_USER_POS: Position = { x: 2, y: 5 };
export const INITIAL_ENEMY_POS: Position = { x: 4, y: 5 };
