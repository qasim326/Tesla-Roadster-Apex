import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CloudFog,
  CloudRain,
  Flame,
  Pause,
  Shield,
  Sun,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { HudState, WEATHER_CONFIGS, WeatherCondition } from '../types/game';
import { TouchControlsState } from './GameCanvas';

interface GameplayHudProps {
  hud: HudState;
  weather: WeatherCondition;
  muted: boolean;
  touchRef: React.MutableRefObject<TouchControlsState>;
  onToggleMute: () => void;
  onCycleWeather: () => void;
  onPause: () => void;
}

export const GameplayHud: React.FC<GameplayHudProps> = ({
  hud,
  weather,
  muted,
  touchRef,
  onToggleMute,
  onCycleWeather,
  onPause,
}) => {
  const weatherCfg = WEATHER_CONFIGS[weather];
  const statusLabel = hud.coldGasActive
    ? 'COLD-GAS ACTIVE'
    : hud.surgeActive
      ? 'SURGE BOOST'
      : hud.coldGasPct < 100
        ? 'RECHARGING'
        : 'HYDRAULIC READY';

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none">
      {/* Top-Left Score & Distance Card (Matches Image 4) */}
      <div className="fixed top-4 left-4 sm:top-5 sm:left-6 pointer-events-auto">
        <div className="rounded-xl bg-[#0b101b]/90 border border-white/12 px-4 py-2.5 shadow-xl min-w-[148px]">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-2xl sm:text-3xl font-bold text-white tabular-nums leading-none">
              {hud.score.toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold tracking-wider text-slate-400">
              PTS
            </span>
          </div>
          <div className="mt-1 font-mono-tech text-xs font-medium text-cyan-400 tabular-nums">
            {hud.distanceKm.toFixed(2)} km
          </div>
        </div>
      </div>

      {/* Top-Center Event Callout */}
      {hud.callout && (
        <div
          key={hud.callout.id}
          className="fixed top-6 left-1/2 -translate-x-1/2 animate-callout"
        >
          <span
            className={`font-display text-sm sm:text-base font-bold tracking-widest uppercase ${
              hud.callout.tone === 'cyan'
                ? 'text-cyan-300'
                : hud.callout.tone === 'amber'
                  ? 'text-amber-400'
                  : 'text-red-400'
            }`}
          >
            {hud.callout.text}
          </span>
        </div>
      )}

      {/* Top-Right Weather Toggle + Shield Integrity + Audio + Pause Cluster */}
      <div className="fixed top-4 right-4 sm:top-5 sm:right-6 flex items-center gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={onCycleWeather}
          aria-label={`Weather: ${weatherCfg.label}. Click to cycle weather`}
          title={`Weather: ${weatherCfg.label} (${weatherCfg.gripPct}% Grip) [V]`}
          className="h-10 px-3 rounded-xl bg-[#0b101b]/90 border border-white/12 flex items-center gap-2 text-xs font-semibold text-slate-200 hover:text-white hover:border-cyan-400/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {weather === 'clear' && <Sun className="w-3.5 h-3.5 text-amber-400" />}
          {weather === 'rainy' && <CloudRain className="w-3.5 h-3.5 text-cyan-400" />}
          {weather === 'foggy' && <CloudFog className="w-3.5 h-3.5 text-slate-300" />}
          <span className="hidden sm:inline">{weatherCfg.shortLabel}</span>
          <span className="font-mono-tech text-[10px] text-cyan-400 hidden md:inline">
            {weatherCfg.gripPct}%
          </span>
        </button>

        <div
          className="flex items-center gap-2.5 rounded-xl bg-[#0b101b]/90 border border-white/12 px-3.5 py-2.5 shadow-xl"
          aria-label={`Shield Integrity ${hud.shields} of ${hud.maxShields}`}
        >
          <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="flex items-center gap-1.5">
            {Array.from({ length: hud.maxShields }).map((_, idx) => {
              const active = idx < hud.shields;
              return (
                <span
                  key={idx}
                  className={`h-2 w-5 rounded-sm transition-colors ${
                    active ? 'bg-cyan-400' : 'bg-slate-700/70'
                  }`}
                />
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          className="w-10 h-10 rounded-xl bg-[#0b101b]/90 border border-white/12 flex items-center justify-center text-slate-200 hover:text-white hover:border-white/25 transition-colors cursor-pointer"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onPause}
          aria-label="Pause game"
          className="w-10 h-10 rounded-xl bg-[#0b101b]/90 border border-white/12 flex items-center justify-center text-slate-200 hover:text-white hover:border-white/25 transition-colors cursor-pointer"
        >
          <Pause className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom-Left Controls Hint (Desktop) */}
      <div className="fixed bottom-5 left-6 hidden md:flex items-center gap-4 text-xs text-slate-400">
        <span>
          <strong className="text-slate-200 font-semibold">W / S:</strong> Speed
        </span>
        <span>
          <strong className="text-slate-200 font-semibold">Space:</strong> Jump & Thrusters
        </span>
        <span>
          <strong className="text-slate-200 font-semibold">F / Q / E:</strong> Flip
        </span>
        <span>
          <strong className="text-slate-200 font-semibold">Shift:</strong> Surge
        </span>
        <span>
          <strong className="text-slate-200 font-semibold">V:</strong> Weather
        </span>
      </div>

      {/* Mobile / Touch Controls */}
      <div className="fixed bottom-5 left-4 flex md:hidden items-center gap-1.5 pointer-events-auto">
        <button
          type="button"
          onPointerDown={() => {
            touchRef.current.left = true;
          }}
          onPointerUp={() => {
            touchRef.current.left = false;
          }}
          onPointerLeave={() => {
            touchRef.current.left = false;
          }}
          className="w-10 h-11 rounded-xl bg-[#0b101b]/90 border border-white/15 flex items-center justify-center text-white active:bg-amber-500 active:text-slate-950"
          aria-label="Steer Left"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onPointerDown={() => {
            touchRef.current.right = true;
          }}
          onPointerUp={() => {
            touchRef.current.right = false;
          }}
          onPointerLeave={() => {
            touchRef.current.right = false;
          }}
          className="w-10 h-11 rounded-xl bg-[#0b101b]/90 border border-white/15 flex items-center justify-center text-white active:bg-amber-500 active:text-slate-950"
          aria-label="Steer Right"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onPointerDown={() => {
            touchRef.current.accel = true;
          }}
          onPointerUp={() => {
            touchRef.current.accel = false;
          }}
          onPointerLeave={() => {
            touchRef.current.accel = false;
          }}
          className="h-11 px-2 rounded-xl bg-[#0b101b]/90 border border-white/15 flex items-center text-slate-100 text-[11px] font-bold active:bg-white active:text-slate-950"
          aria-label="Accelerate"
        >
          GAS
        </button>
        <button
          type="button"
          onPointerDown={() => {
            touchRef.current.brake = true;
          }}
          onPointerUp={() => {
            touchRef.current.brake = false;
          }}
          onPointerLeave={() => {
            touchRef.current.brake = false;
          }}
          className="h-11 px-2 rounded-xl bg-[#0b101b]/90 border border-white/15 flex items-center text-slate-300 text-[11px] font-bold active:bg-red-500 active:text-white"
          aria-label="Brake"
        >
          BRK
        </button>
        <button
          type="button"
          onPointerDown={() => {
            touchRef.current.jump = true;
          }}
          onPointerUp={() => {
            touchRef.current.jump = false;
          }}
          onPointerLeave={() => {
            touchRef.current.jump = false;
          }}
          className="h-11 px-2 rounded-xl bg-[#0b101b]/90 border border-amber-400/40 flex items-center gap-1 text-amber-400 text-[11px] font-bold active:bg-amber-500 active:text-slate-950"
          aria-label="Jump and Cold-Gas Thruster"
        >
          <Flame className="w-3.5 h-3.5" />
          <span>THR</span>
        </button>
        <button
          type="button"
          onPointerDown={() => {
            touchRef.current.flip = true;
          }}
          className="h-11 px-2 rounded-xl bg-[#0b101b]/90 border border-cyan-400/40 flex items-center text-cyan-300 text-[11px] font-bold active:bg-cyan-400 active:text-slate-950"
          aria-label="Roadster Flip"
        >
          FLIP
        </button>
        <button
          type="button"
          onPointerDown={() => {
            touchRef.current.surge = true;
          }}
          onPointerUp={() => {
            touchRef.current.surge = false;
          }}
          onPointerLeave={() => {
            touchRef.current.surge = false;
          }}
          className="h-11 px-2 rounded-xl bg-[#0b101b]/90 border border-cyan-400/40 flex items-center text-cyan-400 text-[11px] font-bold active:bg-cyan-400 active:text-slate-950"
          aria-label="Surge Boost"
        >
          <Zap className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom-Right Speedometer & Cold-Gas Bar Card (Matches Image 4) */}
      <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-6 pointer-events-auto">
        <div className="rounded-xl bg-[#0b101b]/92 border border-white/12 px-4 sm:px-5 py-3 shadow-2xl min-w-[205px] sm:min-w-[238px]">
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-display text-3xl sm:text-4xl font-bold text-white tabular-nums leading-none">
              {hud.speedKmh}
            </span>
            <span className="font-mono-tech text-[11px] font-semibold tracking-wider text-amber-400">
              KM/H
            </span>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-3">
            <span className="font-mono-tech text-[11px] font-medium tracking-wide text-slate-300">
              {statusLabel}
            </span>
            <span className="font-mono-tech text-[11px] font-semibold text-cyan-400 tabular-nums">
              {hud.coldGasPct}%
            </span>
          </div>

          <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-400 transition-[width] duration-75"
              style={{ width: `${Math.max(0, Math.min(100, hud.coldGasPct))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
