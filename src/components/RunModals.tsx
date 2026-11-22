import React from 'react';
import { Play, RotateCcw, Home } from 'lucide-react';
import { HudState } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

interface PauseModalProps {
  hud: HudState;
  onResume: () => void;
  onRestart: () => void;
  onExitToStudio: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  hud,
  onResume,
  onRestart,
  onExitToStudio,
}) => {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 px-4"
      role="dialog"
      aria-label="Run Paused"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#0b101b] border border-white/15 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <span className="font-mono-tech text-[11px] uppercase tracking-wider text-amber-400">
              Drive Suspended
            </span>
            <h2 className="font-display text-2xl font-bold text-white tracking-wide mt-0.5">
              PAUSED
            </h2>
          </div>
          <span className="font-mono-tech text-xs text-slate-400">[ESC]</span>
        </div>

        <div className="grid grid-cols-2 gap-3 my-5">
          <div className="rounded-xl bg-[#111827] border border-white/10 px-4 py-3">
            <div className="text-[11px] text-slate-400">Score</div>
            <div className="font-display text-xl font-bold text-white tabular-nums mt-0.5">
              {hud.score.toLocaleString()} <span className="text-xs text-slate-400">PTS</span>
            </div>
          </div>
          <div className="rounded-xl bg-[#111827] border border-white/10 px-4 py-3">
            <div className="text-[11px] text-slate-400">Distance</div>
            <div className="font-mono-tech text-xl font-bold text-cyan-400 tabular-nums mt-0.5">
              {hud.distanceKm.toFixed(2)} <span className="text-xs">KM</span>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onResume();
            }}
            className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display text-sm font-bold tracking-wider transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME DRIVE</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onRestart();
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#141b2b] border border-white/12 text-slate-200 hover:text-white hover:border-white/25 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onExitToStudio();
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#141b2b] border border-white/12 text-slate-200 hover:text-white hover:border-white/25 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Studio</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  hud: HudState;
  isNewRecord: boolean;
  onRetry: () => void;
  onExitToStudio: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  hud,
  isNewRecord,
  onRetry,
  onExitToStudio,
}) => {
  const headline =
    hud.gameOverReason === 'lava_fall'
      ? 'LAVA BREACH'
      : hud.gameOverReason === 'viaduct_fall'
        ? 'VIADUCT BREACH'
        : 'CHASSIS WRECKED';
  const subtitle =
    hud.gameOverReason === 'lava_fall'
      ? 'Steer onto the intact highway lane or fire SpaceX cold-gas thrusters over collapsed lava sections.'
      : hud.gameOverReason === 'viaduct_fall'
        ? 'Ignite SpaceX cold-gas thrusters mid-air to clear open viaduct spans.'
        : 'Use hydraulic suspension jumps to vault hazard barriers and weave through traffic.';

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-label="Run Complete"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#0b101b] border border-white/15 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <span
              className={`font-mono-tech text-[11px] uppercase tracking-wider font-semibold ${
                isNewRecord ? 'text-cyan-400' : 'text-red-400'
              }`}
            >
              {isNewRecord ? 'NEW APEX RECORD' : 'RUN TERMINATED'}
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-wide mt-0.5">
              {headline}
            </h2>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-300">{subtitle}</p>

        <div className="grid grid-cols-2 gap-3 my-5">
          <div className="rounded-xl bg-[#111827] border border-white/10 px-4 py-3">
            <div className="text-[11px] text-slate-400">Final Score</div>
            <div className="font-display text-xl font-bold text-white tabular-nums mt-0.5">
              {hud.score.toLocaleString()} <span className="text-xs text-slate-400">PTS</span>
            </div>
          </div>
          <div className="rounded-xl bg-[#111827] border border-white/10 px-4 py-3">
            <div className="text-[11px] text-slate-400">Distance</div>
            <div className="font-mono-tech text-xl font-bold text-cyan-400 tabular-nums mt-0.5">
              {hud.distanceKm.toFixed(2)} <span className="text-xs">KM</span>
            </div>
          </div>
          <div className="rounded-xl bg-[#111827] border border-white/10 px-4 py-3">
            <div className="text-[11px] text-slate-400">Peak Velocity</div>
            <div className="font-mono-tech text-lg font-bold text-amber-400 tabular-nums mt-0.5">
              {hud.topSpeedKmh} <span className="text-xs">KM/H</span>
            </div>
          </div>
          <div className="rounded-xl bg-[#111827] border border-white/10 px-4 py-3">
            <div className="text-[11px] text-slate-400">Viaduct Gaps</div>
            <div className="font-mono-tech text-lg font-bold text-slate-100 tabular-nums mt-0.5">
              {hud.gapsCleared}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onRetry();
            }}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display text-sm font-bold tracking-wider transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RETRY DRIVE</span>
            <span className="font-mono-tech text-xs opacity-75">[ENTER]</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onExitToStudio();
            }}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#141b2b] border border-white/15 text-slate-200 hover:text-white hover:border-white/30 font-display text-sm font-semibold tracking-wider transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>STUDIO</span>
          </button>
        </div>
      </div>
    </div>
  );
};
