import React, { useState, useEffect, useRef, useCallback } from 'react';
import GameBoard from './components/GameBoard';
import GameControls from './components/GameControls';
import { GameState, GamePhase, RobotState, Position, EntityType } from './types';
import { 
    GRID_SIZE, MAX_AMMO, INITIAL_USER_POS, INITIAL_ENEMY_POS, 
    TICK_RATE_MS, TOTAL_GAME_TIME, AUTO_PHASE_DURATION, 
    TOWER_LEFT_POS, TOWER_RIGHT_POS, RELOADER_LEFT_POS, RELOADER_RIGHT_POS,
    SHOOT_RANGE
} from './constants';
import { isInRange, getNextMove, calculateAIMove } from './utils/gameLogic';
import { Timer, Zap, Trophy, RefreshCw, Play, PlayCircle, AlertTriangle } from 'lucide-react';

const INITIAL_ROBOT_STATE: Omit<RobotState, 'id'> = {
  pos: { x: 0, y: 0 },
  ammo: MAX_AMMO,
  score: 0,
  lastShotTime: 0,
};

function App() {
  const [gameState, setGameState] = useState<GamePhase>(GamePhase.WAITING);
  const [timeRemaining, setTimeRemaining] = useState(TOTAL_GAME_TIME);
  const [messages, setMessages] = useState<string[]>([]);
  
  const [user, setUser] = useState<RobotState>({ ...INITIAL_ROBOT_STATE, pos: INITIAL_USER_POS, id: 'user' });
  const [enemy, setEnemy] = useState<RobotState>({ ...INITIAL_ROBOT_STATE, pos: INITIAL_ENEMY_POS, id: 'enemy' });

  // Refs for loop logic to access latest state without dependency cycles
  const userRef = useRef(user);
  const enemyRef = useRef(enemy);
  const stateRef = useRef(gameState);

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { enemyRef.current = enemy; }, [enemy]);
  useEffect(() => { stateRef.current = gameState; }, [gameState]);

  const addMessage = (msg: string) => {
    setMessages(prev => [msg, ...prev].slice(0, 5));
  };

  const startGame = () => {
    setGameState(GamePhase.AUTO);
    setTimeRemaining(TOTAL_GAME_TIME);
    setUser({ ...INITIAL_ROBOT_STATE, pos: INITIAL_USER_POS, id: 'user' });
    setEnemy({ ...INITIAL_ROBOT_STATE, pos: INITIAL_ENEMY_POS, id: 'enemy' });
    setMessages(["Game Started!", "AUTO MODE: 30 Seconds"]);
  };

  // Timer & Phase Logic
  useEffect(() => {
    if (gameState === GamePhase.WAITING || gameState === GamePhase.ENDED) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setGameState(GamePhase.ENDED);
          return 0;
        }
        // Phase transition logic
        const timeLeft = prev - 1;
        const elapsedTime = TOTAL_GAME_TIME - timeLeft;
        
        if (elapsedTime === AUTO_PHASE_DURATION && stateRef.current === GamePhase.AUTO) {
            setGameState(GamePhase.TELEOP);
            addMessage("TELEOP ENABLED! Take Control!");
        }
        return timeLeft;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState]);


  // AI Loop
  useEffect(() => {
    if (gameState === GamePhase.WAITING || gameState === GamePhase.ENDED) return;

    const tick = setInterval(() => {
      handleAITick();
    }, TICK_RATE_MS);

    return () => clearInterval(tick);
  }, [gameState]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (stateRef.current !== GamePhase.TELEOP) return;

        // Arrow Keys (Legacy support)
        if (e.key === 'ArrowUp') handleMove(0, -1);
        if (e.key === 'ArrowDown') handleMove(0, 1);
        if (e.key === 'ArrowLeft') handleMove(-1, 0);
        if (e.key === 'ArrowRight') handleMove(1, 0);
        
        // Requested Key Mapping
        if (e.key === '6') handleMove(0, -1); // Up
        if (e.key === '7') handleMove(0, 1);  // Down
        if (e.key === '9') handleMove(-1, 0); // Left
        if (e.key === '8') handleMove(1, 0);  // Right
        if (e.key === '5') handleUserShoot(); // Shoot

        // Allow 'R' for reload if on tile?
        if (e.key === 'r' || e.key === 'R') {
             if (userRef.current.pos.x === RELOADER_LEFT_POS.x && userRef.current.pos.y === RELOADER_LEFT_POS.y) {
                 handleUserReload();
             }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Game Logic ---

  const handleAITick = () => {
    // 1. Enemy Logic (Always AI)
    const enemyState = enemyRef.current;
    const userState = userRef.current;
    
    // Enemy targets Top-Left Tower (0,0) | Reloads at Bottom-Right (6,6)
    const enemyAction = calculateAIMove(enemyState, userState.pos, TOWER_LEFT_POS, RELOADER_RIGHT_POS);

    if (enemyAction.type === 'MOVE' && enemyAction.target) {
       const nextPos = getNextMove(enemyState.pos, enemyAction.target, userState.pos);
       moveRobot('enemy', nextPos);
    } else if (enemyAction.type === 'SHOOT') {
       shoot('enemy');
    } else if (enemyAction.type === 'RELOAD') {
       reload('enemy');
    }

    // 2. User AI Logic (Only during Auto Phase)
    if (stateRef.current === GamePhase.AUTO) {
        // User targets Top-Right Tower (6,0) | Reloads at Bottom-Left (0,6)
        const userAction = calculateAIMove(userState, enemyState.pos, TOWER_RIGHT_POS, RELOADER_LEFT_POS);
        
        if (userAction.type === 'MOVE' && userAction.target) {
            const nextPos = getNextMove(userState.pos, userAction.target, enemyState.pos);
            moveRobot('user', nextPos);
        } else if (userAction.type === 'SHOOT') {
            shoot('user');
        } else if (userAction.type === 'RELOAD') {
            reload('user');
        }
    }
  };

  const moveRobot = (id: 'user' | 'enemy', targetPos: Position) => {
    const currentMover = id === 'user' ? userRef.current : enemyRef.current;
    const otherRobot = id === 'user' ? enemyRef.current : userRef.current;
    
    // Validate Bounds
    if (targetPos.x < 0 || targetPos.x >= GRID_SIZE || targetPos.y < 0 || targetPos.y >= GRID_SIZE) return;

    // Validate Collision
    if (targetPos.x === otherRobot.pos.x && targetPos.y === otherRobot.pos.y) {
        // Collision Penalty
        if (id === 'user') {
            setUser(prev => ({ ...prev, score: prev.score - 1 }));
            addMessage("User Collision! -1 Pt");
        } else {
            setEnemy(prev => ({ ...prev, score: prev.score - 1 }));
            addMessage("Enemy Collision! -1 Pt");
        }
        return; // Don't move
    }

    // Move
    if (id === 'user') setUser(prev => ({ ...prev, pos: targetPos }));
    else setEnemy(prev => ({ ...prev, pos: targetPos }));
  };

  const shoot = (id: 'user' | 'enemy') => {
      const shooter = id === 'user' ? userRef.current : enemyRef.current;
      
      if (shooter.ammo <= 0) return;

      // Deduct Ammo
      if (id === 'user') setUser(prev => ({ ...prev, ammo: prev.ammo - 1 }));
      else setEnemy(prev => ({ ...prev, ammo: prev.ammo - 1 }));

      // Check Hits
      const targetTower = id === 'user' ? TOWER_RIGHT_POS : TOWER_LEFT_POS;
      const wrongTower = id === 'user' ? TOWER_LEFT_POS : TOWER_RIGHT_POS;

      if (isInRange(shooter.pos, targetTower)) {
          // Correct Tower
          if (id === 'user') {
              setUser(prev => ({ ...prev, score: prev.score + 1 }));
              addMessage("User Scored! +1");
          } else {
              setEnemy(prev => ({ ...prev, score: prev.score + 1 }));
              addMessage("Enemy Scored! +1");
          }
      } else if (isInRange(shooter.pos, wrongTower)) {
          // Wrong Tower -> Point to opponent
          if (id === 'user') {
              setEnemy(prev => ({ ...prev, score: prev.score + 1 }));
              addMessage("User Shot Wrong Tower! Enemy +1");
          } else {
              setUser(prev => ({ ...prev, score: prev.score + 1 }));
              addMessage("Enemy Shot Wrong Tower! User +1");
          }
      }
  };

  const reload = (id: 'user' | 'enemy') => {
      const robot = id === 'user' ? userRef.current : enemyRef.current;
      const reloaderPos = id === 'user' ? RELOADER_LEFT_POS : RELOADER_RIGHT_POS;
      
      if (robot.pos.x === reloaderPos.x && robot.pos.y === reloaderPos.y) {
          if (id === 'user') {
              setUser(prev => ({ ...prev, ammo: MAX_AMMO }));
              addMessage("User Reloaded!");
          } else {
              setEnemy(prev => ({ ...prev, ammo: MAX_AMMO }));
          }
      }
  };

  // Manual Controls Handlers
  const handleMove = (dx: number, dy: number) => {
      if (stateRef.current !== GamePhase.TELEOP) return;
      const currentPos = userRef.current.pos;
      const newPos = { x: currentPos.x + dx, y: currentPos.y + dy };
      moveRobot('user', newPos);
  };

  const handleUserShoot = () => {
      if (stateRef.current !== GamePhase.TELEOP) return;
      shoot('user');
  };

  const handleUserReload = () => {
       reload('user');
  };
  
  const handleTileClick = (pos: Position) => {
      // Tap on robot to reload when on reloader
      if (stateRef.current === GamePhase.TELEOP) {
          if (user.pos.x === pos.x && user.pos.y === pos.y) {
             if (user.pos.x === RELOADER_LEFT_POS.x && user.pos.y === RELOADER_LEFT_POS.y) {
                 handleUserReload();
             }
          }
      }
  };

  // Render Helpers
  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isUserOnReloader = user.pos.x === RELOADER_LEFT_POS.x && user.pos.y === RELOADER_LEFT_POS.y;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-2 font-sans select-none overflow-hidden">
      
      {/* Header / Scoreboard */}
      <div className="w-full max-w-4xl bg-slate-800 rounded-xl p-4 mb-4 shadow-xl border border-slate-700 z-10">
        <div className="flex justify-between items-center">
           <div className="flex flex-col items-center">
             <span className="text-blue-400 font-bold text-lg">YOU</span>
             <span className="text-3xl font-tech">{user.score}</span>
           </div>
           
           <div className="flex flex-col items-center">
              <div className={`text-xl font-tech font-bold flex items-center gap-2 ${timeRemaining < 30 ? 'text-red-400 animate-pulse' : 'text-slate-200'}`}>
                <Timer className="w-5 h-5" />
                {formatTime(timeRemaining)}
              </div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-bold mt-1">
                 {gameState === GamePhase.WAITING ? 'READY' : gameState === GamePhase.AUTO ? 'AUTO MODE' : gameState === GamePhase.TELEOP ? 'TELEOP MODE' : 'GAME OVER'}
              </div>
           </div>

           <div className="flex flex-col items-center">
             <span className="text-red-400 font-bold text-lg">ENEMY</span>
             <span className="text-3xl font-tech">{enemy.score}</span>
           </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full max-w-5xl flex-1">
          {/* Left Controls (Desktop) / Bottom Controls (Mobile) */}
          {gameState !== GamePhase.WAITING && gameState !== GamePhase.ENDED && (
            <div className={`order-2 md:order-1 transition-opacity duration-500 ${gameState === GamePhase.AUTO ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
                <GameControls 
                    onMove={handleMove}
                    onShoot={handleUserShoot}
                    onReload={handleUserReload}
                    canShoot={user.ammo > 0}
                    canReload={isUserOnReloader && user.ammo < MAX_AMMO}
                    disabled={gameState !== GamePhase.TELEOP}
                />
            </div>
          )}

          {/* Game Area */}
          <div className="order-1 md:order-2 relative">
            <GameBoard 
                user={user} 
                enemy={enemy} 
                onTileClick={handleTileClick} 
                isTeleop={gameState === GamePhase.TELEOP}
            />
            
            {/* Messages Toast Overlay */}
            <div className="absolute top-2 left-0 w-full pointer-events-none flex flex-col items-center gap-1">
                {messages.map((m, i) => (
                    <div key={i} className="bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
                        {m}
                    </div>
                ))}
            </div>
          </div>
      </div>


      {/* Start / Game Over Modal */}
      {(gameState === GamePhase.WAITING || gameState === GamePhase.ENDED) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-600 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
             <h1 className="text-3xl font-tech font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                 {gameState === GamePhase.ENDED ? "GAME OVER" : "ROBO DUEL"}
             </h1>
             
             {gameState === GamePhase.ENDED && (
                 <div className="my-6">
                     <div className="text-xl mb-2 flex justify-center items-center gap-2">
                         {user.score > enemy.score ? <Trophy className="text-yellow-400" /> : user.score < enemy.score ? <AlertTriangle className="text-red-400" /> : <RefreshCw className="text-gray-400"/>}
                         {user.score > enemy.score ? "VICTORY!" : user.score < enemy.score ? "DEFEAT" : "DRAW"}
                     </div>
                     <p className="text-slate-400">Final Score: {user.score} - {enemy.score}</p>
                 </div>
             )}

             {gameState === GamePhase.WAITING && (
                 <div className="text-left text-sm text-slate-300 space-y-2 mb-6 bg-slate-900/50 p-4 rounded-lg">
                     <p>🤖 <strong className="text-white">Objective:</strong> Shoot your tower (Right/Blue).</p>
                     <p>⚠️ <strong className="text-white">Avoid:</strong> Enemy tower (Left/Red).</p>
                     <p>⌨️ <strong className="text-white">Controls:</strong> 6(Up), 7(Dn), 8(Rt), 9(Lt), 5(Shoot).</p>
                     <p>🔋 <strong className="text-white">Reload:</strong> Go to bottom-left & tap robot.</p>
                 </div>
             )}

             <button 
                onClick={startGame}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2"
             >
                {gameState === GamePhase.ENDED ? <RefreshCw className="w-5 h-5"/> : <PlayCircle className="w-5 h-5"/>}
                {gameState === GamePhase.ENDED ? "PLAY AGAIN" : "START MATCH"}
             </button>
          </div>
        </div>
      )}
      
    </div>
  );
}

export default App;