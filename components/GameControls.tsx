import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Crosshair, RotateCcw } from 'lucide-react';

interface GameControlsProps {
  onMove: (dx: number, dy: number) => void;
  onShoot: () => void;
  onReload: () => void;
  canShoot: boolean;
  canReload: boolean;
  disabled: boolean;
}

const GameControls: React.FC<GameControlsProps> = ({ onMove, onShoot, onReload, canShoot, canReload, disabled }) => {
  const Button = ({ 
    label, 
    icon: Icon, 
    onClick, 
    disabled: btnDisabled,
    variant = 'default' 
  }: { 
    label: string, 
    icon: any, 
    onClick: () => void, 
    disabled?: boolean,
    variant?: 'default' | 'danger'
  }) => (
    <button 
        disabled={btnDisabled}
        onClick={onClick} 
        className={`relative w-20 h-20 rounded-xl flex flex-col items-center justify-center border-b-4 transition-all touch-manipulation active:scale-95 active:border-b-0 active:translate-y-1
            ${btnDisabled 
                ? 'bg-slate-700 border-slate-800 opacity-50 cursor-not-allowed' 
                : variant === 'danger'
                    ? 'bg-red-600 border-red-800 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                    : 'bg-slate-600 border-slate-800 hover:bg-slate-500 text-white'
            }`}
    >
        <span className="absolute top-1 left-2 text-xs font-bold text-white/50">{label}</span>
        <Icon className={`w-8 h-8 ${variant === 'danger' ? 'text-white' : 'text-slate-200'}`} />
    </button>
  );

  return (
    <div className="flex flex-col items-center gap-6 bg-slate-800/80 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-md shadow-xl">
      <div className="flex items-center gap-2 mb-2">
         <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
         <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Operator Console</span>
      </div>

      {/* Control Cluster */}
      <div className="grid grid-cols-3 gap-3">
            {/* Top Row */}
            <div />
            <Button label="6" icon={ArrowUp} onClick={() => onMove(0, -1)} disabled={disabled} />
            <div />
            
            {/* Middle Row */}
            <Button label="9" icon={ArrowLeft} onClick={() => onMove(-1, 0)} disabled={disabled} />
            <Button label="5" icon={Crosshair} onClick={onShoot} disabled={disabled || !canShoot} variant="danger" />
            <Button label="8" icon={ArrowRight} onClick={() => onMove(1, 0)} disabled={disabled} />

            {/* Bottom Row */}
            <div />
            <Button label="7" icon={ArrowDown} onClick={() => onMove(0, 1)} disabled={disabled} />
            <div />
      </div>

      {/* Aux Buttons */}
      <button 
        disabled={disabled || !canReload}
        onClick={onReload} 
        className={`w-full py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-bold transition-all border-b-4 active:border-b-0 active:translate-y-1 ${canReload ? 'bg-green-600 border-green-800 text-white hover:bg-green-500' : 'bg-slate-700 border-slate-800 text-slate-500'}`}>
        <RotateCcw className="w-5 h-5" />
        RELOAD SYSTEM
      </button>

      <div className="text-[10px] text-slate-500 text-center max-w-[200px]">
        Manual Override Enabled. Use on-screen pad or keyboard keys 5-9.
      </div>
    </div>
  );
};

export default GameControls;