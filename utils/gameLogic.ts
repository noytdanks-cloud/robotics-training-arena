import { Position, RobotState } from '../types';
import { GRID_SIZE, SHOOT_RANGE, TOWER_LEFT_POS, TOWER_RIGHT_POS, RELOADER_LEFT_POS, RELOADER_RIGHT_POS } from '../constants';

export const getDistance = (p1: Position, p2: Position) => {
  return Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y)); // Chebyshev for shooting range
};

export const getManhattanDistance = (p1: Position, p2: Position) => {
    return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
};

export const isInRange = (shooter: Position, target: Position): boolean => {
  return getDistance(shooter, target) <= SHOOT_RANGE;
};

// Simple BFS to find next move towards target
export const getNextMove = (start: Position, target: Position, obstacle: Position): Position => {
  if (start.x === target.x && start.y === target.y) return start;

  const queue: { pos: Position; path: Position[] }[] = [{ pos: start, path: [] }];
  const visited = new Set<string>();
  visited.add(`${start.x},${start.y}`);

  // Basic BFS
  while (queue.length > 0) {
    const current = queue.shift()!;
    const { pos, path } = current;

    if (pos.x === target.x && pos.y === target.y) {
      return path[0] || start;
    }

    const directions = [
      { x: 0, y: -1 }, // Up
      { x: 0, y: 1 },  // Down
      { x: -1, y: 0 }, // Left
      { x: 1, y: 0 },  // Right
    ];

    for (const dir of directions) {
      const nextPos = { x: pos.x + dir.x, y: pos.y + dir.y };
      const key = `${nextPos.x},${nextPos.y}`;

      // Check bounds
      if (nextPos.x < 0 || nextPos.x >= GRID_SIZE || nextPos.y < 0 || nextPos.y >= GRID_SIZE) continue;
      
      // Check obstacle (other robot)
      // Note: In BFS, we treat the other robot as a hard wall to avoid collision planning
      if (nextPos.x === obstacle.x && nextPos.y === obstacle.y) continue;

      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ pos: nextPos, path: [...path, nextPos] });
      }
    }
  }

  // Fallback: If no path (e.g., blocked), stay put
  return start;
};

// AI Decision Making
export const calculateAIMove = (
  aiState: RobotState,
  opponentPos: Position,
  targetTower: Position,
  reloaderPos: Position
): { type: 'MOVE' | 'SHOOT' | 'RELOAD' | 'IDLE'; target?: Position } => {
  
  // 1. Logic: Needs Ammo?
  if (aiState.ammo === 0) {
    // If on reloader, reload action (handled by game loop, but here we can signal intent)
    if (aiState.pos.x === reloaderPos.x && aiState.pos.y === reloaderPos.y) {
       return { type: 'RELOAD' };
    }
    // Else move to reloader
    return { type: 'MOVE', target: reloaderPos };
  }

  // 2. Logic: In Range to Shoot?
  if (isInRange(aiState.pos, targetTower)) {
    return { type: 'SHOOT' };
  }

  // 3. Logic: Move to optimal shooting spot
  // Find closest tile that is in range of tower
  let bestSpot = aiState.pos;
  let minDist = 999;

  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      const p = { x, y };
      if (isInRange(p, targetTower)) {
         const dist = getManhattanDistance(aiState.pos, p);
         if (dist < minDist) {
           minDist = dist;
           bestSpot = p;
         }
      }
    }
  }

  return { type: 'MOVE', target: bestSpot };
};
