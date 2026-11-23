import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CloudFog,
  CloudRain,
  Flag,
  Flame,
  Pause,
  Rocket,
  Shield,
  Sparkles,
  Sun,
  Timer,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { MISSION_MAP, getStageMeta } from '../data/missionsAndCampaign';
import {
  ActiveMission,
  HudState,
  MissionBanner,
  WEATHER_CONFIGS,
  WeatherCondition,
} from '../types/game';
import { TouchControlsState } from './GameCanvas';

interface GameplayHudProps {
  hud: HudState;
  weather: WeatherCondition;
  muted: boolean;
  activeMissions: ActiveMission[];
  missionBanner: MissionBanner | null;
  touchRef: React.MutableRefObject<TouchControlsState>;
  onToggleMute: () => void;
  onCycleWeather: () => void;
  onPause: () => void;
}

export const GameplayHud: React.FC<GameplayHudProps> = ({
  hud,
  weather,
  muted,
  activeMissions,
  missionBanner,
  touchRef,
  onToggleMute,
  onCycleWeather,
  onPause,
}) => {
  const [pinnedIdx, setPinnedIdx] = useState<number | null>(null);

  const weatherCfg = WEATHER_CONFIGS[weather];
  const statusLabel = hud.coldGasActive
    ? 'COLD-GAS ACTIVE'
    : hud.surgeActive
      ? 'SURGE BOOST'
      : hud.coldGasPct < 100
        ? 'RECHARGING'
        : 'HYDRAULIC READY';

  // Pick first incomplete mission by default, or user-selected slot
  const autoIdx = activeMissions.findIndex((m) => !m.completed);
  const resolvedIdx =
    pinnedIdx !== null && activeMissions[pinnedIdx]
      ? pinnedIdx
      : autoIdx >= 0
        ? autoIdx
        : 0;
  const trackedMission = activeMissions[resolvedIdx];
  const trackedDef = trackedMission ? MISSION_MAP[trackedMission.id] : null;

  const isCampaign = hud.playMode === 'campaign';
  const stageMeta = isCampaign ? getStageMeta(hud.campaignStage) : null;
  const stagePct =
    stageMeta && hud.stageTarget > 0
      ? Math.min(100, Math.round((hud.stageProgress / hud.stageTarget) * 100))
      : 0;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none">
      {/* Top-Left Score Card + Sleek Active Mission Tracker Bar */}
      <div className="fixed top-3 left-3 sm:top-5 sm:left-6 flex flex-col gap-2 pointer-events-auto max-w-[198px] sm:max-w-[244px]">
        <div className="rounded-xl bg-[#0b101b]/90 border border-white/12 px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-xl">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-xl sm:text-3xl font-bold text-white tabular-nums leading-none">
              {hud.score.toLocaleString()}
            </span>
            <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-slate-400">
              PTS
            </span>
          </div>
          <div className="mt-1 font-mono-tech text-[11px] sm:text-xs font-medium text-cyan-400 tabular-nums">
            {hud.distanceKm.toFixed(2)} km
          </div>
        </div>

        {/* Sleek Compact Active Mission Tracker Bar */}
        {trackedMission && trackedDef && (
          <button
            type="button"
            onClick={() =>
              setPinnedIdx((prev) => {
                const cur = prev !== null ? prev : resolvedIdx;
                return (cur + 1) % Math.max(1, activeMissions.length);
              })
            }
            title="Click to cycle active SpaceX missions"
            className={`text-left rounded-xl border px-3 py-2 shadow-xl transition-colors cursor-pointer ${
              trackedMission.completed
                ? 'bg-emerald-950/85 border-emerald-400/45'
                : 'bg-[#0b101b]/88 border-white/12 hover:border-cyan-400/40'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {trackedMission.completed ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                ) : (
                  <Rocket className="w-3 h-3 text-cyan-400 shrink-0" />
                )}
                <span className="font-display text-[11px] font-bold text-white truncate">
                  {trackedDef.title}
                </span>
              </div>
              <span className="font-mono-tech text-[10px] font-bold text-amber-400 shrink-0">
                +{trackedDef.rewardPts}
              </span>
            </div>

            <div className="mt-1 flex items-center justify-between gap-2 font-mono-tech text-[10px]">
              <span className="text-slate-300 tabular-nums">
                {Math.min(trackedDef.target, Math.floor(trackedMission.progress)).toLocaleString()}{' '}
                / {trackedDef.target.toLocaleString()} {trackedDef.unit}
              </span>
              <span className="flex items-center gap-1 shrink-0">
                {activeMissions.map((m, idx) => (
                  <span
                    key={m.id}
                    className={`w-1.5 h-1.5 rounded-full ${
                      idx === resolvedIdx
                        ? m.completed
                          ? 'bg-emerald-400'
                          : 'bg-cyan-400'
                        : m.completed
                          ? 'bg-emerald-500/45'
                          : 'bg-slate-600'
                    }`}
                  />
                ))}
              </span>
            </div>

            <div className="mt-1 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-150 ${
                  trackedMission.completed ? 'bg-emerald-400' : 'bg-cyan-400'
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((trackedMission.progress / trackedDef.target) * 100),
                  )}%`,
                }}
              />
            </div>
          </button>
        )}
      </div>

      {/* Campaign Stage Objective Pill (Top-Center) */}
      {isCampaign && stageMeta && (
        <div className="fixed top-16 sm:top-5 left-1/2 -translate-x-1/2 w-[250px] sm:w-[290px] pointer-events-none">
          <div
            className={`rounded-xl border px-3.5 py-2 shadow-xl ${
              stageMeta.theme === 'mars'
                ? 'bg-[#210f0c]/92 border-orange-400/45'
                : 'bg-[#0b101b]/90 border-cyan-400/35'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Flag
                  className={`w-3 h-3 shrink-0 ${
                    stageMeta.theme === 'mars' ? 'text-orange-400' : 'text-cyan-400'
                  }`}
                />
                <span className="font-mono-tech text-[10px] font-bold uppercase tracking-wider text-white truncate">
                  S{stageMeta.id}: {stageMeta.name}
                </span>
              </div>

              {hud.stageTimeLeftSec !== null ? (
                <span
                  className={`inline-flex items-center gap-1 font-mono-tech text-[11px] font-bold tabular-nums shrink-0 ${
                    hud.stageTimeLeftSec <= 10 ? 'text-red-400' : 'text-amber-300'
                  }`}
                >
                  <Timer className="w-3 h-3" />
                  {hud.stageTimeLeftSec.toFixed(1)}s
                </span>
              ) : (
                <span className="font-mono-tech text-[10px] font-semibold text-cyan-300 tabular-nums shrink-0">
                  {Math.min(hud.stageTarget, Math.floor(hud.stageProgress)).toLocaleString()}/
                  {hud.stageTarget.toLocaleString()}
                </span>
              )}
            </div>

            {hud.stageTimeLeftSec !== null && (
              <div className="mt-0.5 flex items-center justify-between text-[10px] font-mono-tech text-slate-300 tabular-nums">
                <span>Distance Goal</span>
                <span>
                  {Math.min(hud.stageTarget, Math.floor(hud.stageProgress)).toLocaleString()} /{' '}
                  {hud.stageTarget.toLocaleString()} m
                </span>
              </div>
            )}

            <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-150 ${
                  stageMeta.theme === 'mars' ? 'bg-orange-400' : 'bg-amber-400'
                }`}
                style={{ width: `${stagePct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Celebratory Live "MISSION COMPLETE!" Banner */}
      {missionBanner && (
        <div
          key={missionBanner.id}
          className="fixed top-28 sm:top-24 left-1/2 -translate-x-1/2 z-30 animate-mission-banner pointer-events-none"
        >
          <div className="flex items-center gap-3 rounded-xl bg-[#091c18]/95 border border-emerald-400/60 px-4 py-2.5 shadow-2xl">
            <div className="w-8 h-8 rounded-lg bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <div className="font-mono-tech text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                MISSION COMPLETE!
              </div>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-bold text-white whitespace-nowrap">
                  {missionBanner.title}
                </span>
                <span className="font-mono-tech text-xs font-bold text-amber-300 whitespace-nowrap">
                  +{missionBanner.rewardPts} PTS · +{missionBanner.rewardCoins} CR
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top-Center Event Callout */}
      {hud.callout && (
        <div
          key={hud.callout.id}
          className={`fixed left-1/2 -translate-x-1/2 animate-callout ${
            isCampaign ? 'top-32 sm:top-24' : 'top-6'
          }`}
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
      <div className="fixed top-3 right-3 sm:top-5 sm:right-6 flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={onCycleWeather}
          aria-label={`Weather: ${weatherCfg.label}. Click to cycle weather`}
          title={`Weather: ${weatherCfg.label} (${weatherCfg.gripPct}% Grip) [V]`}
          className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl bg-[#0b101b]/90 border border-white/12 flex items-center gap-1.5 sm:gap-2 text-xs font-semibold text-slate-200 hover:text-white hover:border-cyan-400/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
          className="flex items-center gap-2 rounded-xl bg-[#0b101b]/90 border border-white/12 px-2.5 sm:px-3.5 py-2 sm:py-2.5 shadow-xl"
          aria-label={`Shield Integrity ${hud.shields} of ${hud.maxShields}`}
        >
          <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="flex items-center gap-1 sm:gap-1.5">
            {Array.from({ length: hud.maxShields }).map((_, idx) => {
              const active = idx < hud.shields;
              return (
                <span
                  key={idx}
                  className={`h-2 w-3.5 sm:w-5 rounded-sm transition-colors ${
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
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0b101b]/90 border border-white/12 flex items-center justify-center text-slate-200 hover:text-white hover:border-white/25 transition-colors cursor-pointer"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onPause}
          aria-label="Pause game"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#0b101b]/90 border border-white/12 flex items-center justify-center text-slate-200 hover:text-white hover:border-white/25 transition-colors cursor-pointer"
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
      <div className="fixed bottom-4 left-3 flex md:hidden items-center gap-1 pointer-events-auto">
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
          className="w-9 h-10 rounded-lg bg-[#0b101b]/90 border border-white/15 flex items-center justify-center text-white active:bg-amber-500 active:text-slate-950"
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
          className="w-9 h-10 rounded-lg bg-[#0b101b]/90 border border-white/15 flex items-center justify-center text-white active:bg-amber-500 active:text-slate-950"
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
          className="h-10 px-1.5 rounded-lg bg-[#0b101b]/90 border border-white/15 flex items-center text-slate-100 text-[10px] font-bold active:bg-white active:text-slate-950"
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
          className="h-10 px-1.5 rounded-lg bg-[#0b101b]/90 border border-white/15 flex items-center text-slate-300 text-[10px] font-bold active:bg-red-500 active:text-white"
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
          className="h-10 px-1.5 rounded-lg bg-[#0b101b]/90 border border-amber-400/40 flex items-center gap-0.5 text-amber-400 text-[10px] font-bold active:bg-amber-500 active:text-slate-950"
          aria-label="Jump and Cold-Gas Thruster"
        >
          <Flame className="w-3 h-3" />
          <span>THR</span>
        </button>
        <button
          type="button"
          onPointerDown={() => {
            touchRef.current.flip = true;
          }}
          className="h-10 px-1.5 rounded-lg bg-[#0b101b]/90 border border-cyan-400/40 flex items-center text-cyan-300 text-[10px] font-bold active:bg-cyan-400 active:text-slate-950"
          aria-label="Roadster Flip"
        >
          FLP
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
          className="h-10 px-1.5 rounded-lg bg-[#0b101b]/90 border border-cyan-400/40 flex items-center text-cyan-400 text-[10px] font-bold active:bg-cyan-400 active:text-slate-950"
          aria-label="Surge Boost"
        >
          <Zap className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom-Right Speedometer & Cold-Gas Bar Card */}
      <div className="fixed bottom-4 right-3 sm:bottom-5 sm:right-6 pointer-events-auto">
        <div className="rounded-xl bg-[#0b101b]/92 border border-white/12 px-3.5 sm:px-5 py-2.5 sm:py-3 shadow-2xl min-w-[146px] sm:min-w-[238px]">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-display text-2xl sm:text-4xl font-bold text-white tabular-nums leading-none">
              {hud.speedKmh}
            </span>
            <span className="font-mono-tech text-[10px] sm:text-[11px] font-semibold tracking-wider text-amber-400">
              KM/H
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="font-mono-tech text-[9px] sm:text-[11px] font-medium tracking-wide text-slate-300 truncate">
              {statusLabel}
            </span>
            <span className="font-mono-tech text-[10px] sm:text-[11px] font-semibold text-cyan-400 tabular-nums">
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
