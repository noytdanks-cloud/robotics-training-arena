import React from 'react';
import { Position, RobotState } from '../types';
import { GRID_SIZE, TOWER_LEFT_POS, TOWER_RIGHT_POS, RELOADER_LEFT_POS, RELOADER_RIGHT_POS, SHOOT_RANGE } from '../constants';
import { Target, Zap, BatteryCharging, ShieldAlert } from 'lucide-react';

interface GameBoardProps {
  user: RobotState;
  enemy: RobotState;
  onTileClick: (pos: Position) => void;
  isTeleop: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({ user, enemy, onTileClick, isTeleop }) => {
  const renderTile = (x: number, y: number) => {
    const isUser = user.pos.x === x && user.pos.y === y;
    const isEnemy = enemy.pos.x === x && enemy.pos.y === y;
    
    // Check for specific zones
    const isTowerLeft = x === TOWER_LEFT_POS.x && y === TOWER_LEFT_POS.y;
    const isTowerRight = x === TOWER_RIGHT_POS.x && y === TOWER_RIGHT_POS.y;
    const isReloaderLeft = x === RELOADER_LEFT_POS.x && y === RELOADER_LEFT_POS.y;
    const isReloaderRight = x === RELOADER_RIGHT_POS.x && y === RELOADER_RIGHT_POS.y;

    let bgClass = "bg-slate-800 border-slate-700";
    let content = null;

    if (isTowerLeft) {
      bgClass = "bg-red-900/50 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]";
      content = <div className="flex flex-col items-center"><Target className="w-6 h-6 text-red-400" /><span className="text-[10px] text-red-300">FOE GOAL</span></div>;
    } else if (isTowerRight) {
      bgClass = "bg-blue-900/50 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]";
      content = <div className="flex flex-col items-center"><Target className="w-6 h-6 text-blue-400" /><span className="text-[10px] text-blue-300">YOUR GOAL</span></div>;
    } else if (isReloaderLeft) {
      bgClass = "bg-green-900/30 border-green-600";
      content = <div className="flex flex-col items-center"><BatteryCharging className="w-5 h-5 text-green-400" /><span className="text-[8px] text-green-300">RELOAD</span></div>;
    } else if (isReloaderRight) {
      bgClass = "bg-orange-900/30 border-orange-600";
      content = <div className="flex flex-col items-center"><BatteryCharging className="w-5 h-5 text-orange-400" /><span className="text-[8px] text-orange-300">ENEMY</span></div>;
    }

    // Robot Overlay
    if (isUser) {
      content = (
        <div className={`relative flex items-center justify-center w-full h-full bg-blue-600 rounded-md shadow-lg transition-transform duration-300 ${isUser && isReloaderLeft ? 'ring-2 ring-white animate-pulse' : ''}`}>
          <div className="text-white font-bold text-xs flex flex-col items-center">
            <span>YOU</span>
            <div className="flex gap-0.5 mt-1">
               {[...Array(3)].map((_, i) => (
                 <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < user.ammo ? 'bg-yellow-300' : 'bg-gray-400'}`} />
               ))}
            </div>
          </div>
        </div>
      );
    } else if (isEnemy) {
      content = (
        <div className="relative flex items-center justify-center w-full h-full bg-red-600 rounded-md shadow-lg transition-transform duration-300">
           <div className="text-white font-bold text-xs flex flex-col items-center">
            <span>AI</span>
            <div className="flex gap-0.5 mt-1">
               {[...Array(3)].map((_, i) => (
                 <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < enemy.ammo ? 'bg-yellow-300' : 'bg-gray-400'}`} />
               ))}
            </div>
          </div>
        </div>
      );
    }
    
    // Highlight shooting range when in teleop
    if (isTeleop && !isUser && !isEnemy && Math.max(Math.abs(user.pos.x - x), Math.abs(user.pos.y - y)) <= SHOOT_RANGE) {
        bgClass += " bg-blue-500/10";
    }

    return (
      <div
        key={`${x}-${y}`}
        onClick={() => onTileClick({ x, y })}
        className={`w-full aspect-square border flex items-center justify-center cursor-pointer select-none transition-colors duration-200 hover:bg-slate-700 ${bgClass}`}
      >
        {content}
      </div>
    );
  };

  const grid = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      row.push(renderTile(x, y));
    }
    grid.push(<div key={y} className="grid grid-cols-7 gap-1">{row}</div>);
  }

  return (
    <div className="bg-slate-900 p-2 rounded-xl shadow-2xl border border-slate-700 max-w-md w-full mx-auto">
      <div className="flex flex-col gap-1">
        {grid}
      </div>
    </div>
  );
};

export default GameBoard;
