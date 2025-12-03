export type Position = {
  x: number;
  y: number;
};

export enum EntityType {
  EMPTY = 'EMPTY',
  WALL = 'WALL', // Not used currently but good for extensibility
  TOWER_LEFT = 'TOWER_LEFT',   // Enemy scoring target (0,0)
  TOWER_RIGHT = 'TOWER_RIGHT', // User scoring target (6,0)
  RELOADER_LEFT = 'RELOADER_LEFT', // User reloader (0,6)
  RELOADER_RIGHT = 'RELOADER_RIGHT', // Enemy reloader (6,6)
}

export enum GamePhase {
  WAITING = 'WAITING',
  AUTO = 'AUTO', // First 30s
  TELEOP = 'TELEOP', // Remaining 2m
  ENDED = 'ENDED',
}

export interface RobotState {
  pos: Position;
  ammo: number;
  score: number;
  id: 'user' | 'enemy';
  lastShotTime: number; // For cooldown visual
}

export interface GameState {
  phase: GamePhase;
  timeRemaining: number; // Seconds
  user: RobotState;
  enemy: RobotState;
  messages: string[]; // Log
}