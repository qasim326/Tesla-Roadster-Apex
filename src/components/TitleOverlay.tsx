import React from 'react';
import {
  Award,
  CloudFog,
  CloudRain,
  Coins,
  Flag,
  Rocket,
  SlidersHorizontal,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { getPilotRank } from '../data/missionsAndCampaign';
import {
  BestRecord,
  CAR_MODEL_META,
  CarSpec,
  MissionsProgressState,
  WEATHER_CONFIGS,
  WeatherCondition,
} from '../types/game';
import { soundEngine } from '../audio/soundEngine';

interface TitleOverlayProps {
  bestRecord: BestRecord;
  carSpec: CarSpec;
  weather: WeatherCondition;
  studioOpen: boolean;
  muted: boolean;
  missionsState: MissionsProgressState;
  onStartEndless: () => void;
  onOpenCampaign: () => void;
  onOpenMissions: () => void;
  onToggleStudio: () => void;
  onToggleMute: () => void;
  onChangeWeather: (w: WeatherCondition) => void;
}

const WEATHER_OPTIONS: { id: WeatherCondition; label: string }[] = [
  { id: 'clear', label: 'Clear' },
  { id: 'rainy', label: 'Rain' },
  { id: 'foggy', label: 'Fog' },
];

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  bestRecord,
  carSpec,
  weather,
  studioOpen,
  muted,
  missionsState,
  onStartEndless,
  onOpenCampaign,
  onOpenMissions,
  onToggleStudio,
  onToggleMute,
  onChangeWeather,
}) => {
  const modelMeta = CAR_MODEL_META[carSpec.carModel];
  const weatherMeta = WEATHER_CONFIGS[weather];
  const pilotRank = getPilotRank(missionsState.missionsCompleted);
  const claimableCount = missionsState.activeMissions.filter((m) => m.completed).length;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none">
      {/* Compact left edge scrim so typography stays crisp while keeping center car unobstructed */}
      <div
        className="absolute inset-y-0 left-0 w-full max-w-[490px] pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(6,10,18,0.84) 0%, rgba(6,10,18,0.42) 55%, rgba(6,10,18,0) 100%)',
        }}
      />

      {/* Top Metadata Strip, Pilot Rank & Dynamic Weather Switcher */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 pt-4 sm:pt-6">
        <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-mono-tech tracking-wider uppercase whitespace-nowrap">
          <span className="text-amber-400 font-semibold">SPACEX EDITION</span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span className="text-slate-300">{modelMeta.name}</span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 text-cyan-300 font-semibold">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            LVL {pilotRank.level} {pilotRank.title}
          </span>
          <span className="text-slate-500 hidden sm:inline" aria-hidden="true">·</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-amber-300 font-semibold">
            <Coins className="w-3.5 h-3.5" />
            {missionsState.coins.toLocaleString()} CR
          </span>
        </div>

        <div className="flex items-center gap-2.5 pointer-events-auto">
          {/* Interactive Dynamic Weather Segmented Control */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl bg-[#0b101b]/95 border border-white/15"
            role="group"
            aria-label="Dynamic Weather Condition"
          >
            {WEATHER_OPTIONS.map((opt) => {
              const active = weather === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onChangeWeather(opt.id);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {opt.id === 'clear' && <Sun className="w-3.5 h-3.5" />}
                  {opt.id === 'rainy' && <CloudRain className="w-3.5 h-3.5" />}
                  {opt.id === 'foggy' && <CloudFog className="w-3.5 h-3.5" />}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onToggleMute();
            }}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            className="w-10 h-10 rounded-xl bg-[#0b101b]/90 border border-white/15 flex items-center justify-center text-slate-200 hover:text-white hover:border-white/30 transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Compact Left Hero Block leaving center lobby car completely clear */}
      <main className="relative z-10 px-4 sm:px-8 pt-6 sm:pt-12 max-w-[430px] pointer-events-auto">
        <svg
          width="320"
          height="14"
          viewBox="0 0 320 14"
          fill="none"
          className="mb-3 max-w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="apexRuleGrad" x1="0" y1="0" x2="320" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="48%" stopColor="#F59E0B" />
              <stop offset="68%" stopColor="#22D3EE" />
              <stop offset="100%" stopColor="#22D3EE" />
            </linearGradient>
          </defs>
          <path
            d="M0 10 L132 10 L144 3 L320 3"
            stroke="url(#apexRuleGrad)"
            strokeWidth="2"
          />
        </svg>

        <h1 className="font-display font-bold tracking-tight leading-none">
          <span className="block text-4xl sm:text-[50px] tracking-[0.06em] text-white">
            ROADST<span className="text-cyan-400">ER</span>
          </span>
          <span className="mt-1 flex items-center gap-3 text-2xl sm:text-[30px] tracking-[0.28em] text-amber-400">
            <span>APEX</span>
            <svg width="36" height="16" viewBox="0 0 36 16" fill="none" aria-hidden="true">
              <path
                d="M2 12 L28 12 L34 4 M6 6 L24 6"
                stroke="#22D3EE"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </h1>

        <p className="mt-3.5 text-xs sm:text-sm leading-relaxed text-slate-300 max-w-[350px]">
          Launch over highway traffic with hydraulic jumps and ignite SpaceX cold-gas
          thrusters across molten viaduct breaches and Mars expeditions.
        </p>

        {/* Primary Play Modes: Endless Mode + Campaign Mode */}
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onStartEndless();
            }}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display text-sm font-bold tracking-wider transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg"
          >
            <span>ENDLESS MODE</span>
            <span className="font-mono-tech text-[11px] opacity-75 hidden sm:inline">[ENTER]</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenCampaign();
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display text-sm font-bold tracking-wider transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg"
          >
            <Flag className="w-4 h-4" />
            <span>CAMPAIGN MODE</span>
          </button>
        </div>

        {/* Secondary Actions: Missions & Customize */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenMissions();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#121826]/90 border border-white/15 hover:border-cyan-400/50 text-slate-100 font-display text-xs sm:text-sm font-semibold tracking-wider transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Rocket className="w-3.5 h-3.5 text-cyan-400" />
            <span>MISSIONS</span>
            <span
              className={`font-mono-tech text-[10px] px-1.5 py-0.5 rounded font-bold ${
                claimableCount > 0
                  ? 'bg-emerald-400 text-slate-950'
                  : 'bg-white/10 text-amber-300'
              }`}
            >
              {claimableCount > 0 ? `${claimableCount} READY` : '3 ACTIVE'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onToggleStudio();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-display text-xs sm:text-sm font-semibold tracking-wider transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              studioOpen
                ? 'bg-[#121826]/95 border-amber-400 text-white'
                : 'bg-[#121826]/85 border-white/15 text-slate-100 hover:border-white/30'
            }`}
          >
            <span
              className="w-3 h-3 rounded-full border border-white/30 shrink-0"
              style={{ backgroundColor: carSpec.paintHex }}
            />
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-300" />
            <span>{studioOpen ? 'CLOSE STUDIO' : 'CUSTOMIZE'}</span>
          </button>
        </div>

        {/* Best Score & Active Weather Grip Metadata */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-mono-tech tracking-wider">
          <span className="text-slate-400">BEST</span>
          <span className="text-cyan-400 font-semibold tabular-nums">
            {bestRecord.bestPts.toLocaleString()} PTS
          </span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span className="text-amber-400 font-semibold tabular-nums">
            {bestRecord.bestKm.toFixed(2)} KM
          </span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span className="text-slate-300">
            {weatherMeta.label} ({weatherMeta.gripPct}% Grip)
          </span>
        </div>
      </main>

      {/* Bottom-Left Controls Hint */}
      {!studioOpen && (
        <div className="fixed left-6 sm:left-8 bottom-6 z-10 hidden lg:flex items-center gap-2 text-xs text-slate-300">
          <span>
            <strong className="text-white font-semibold">W / S</strong> Speed
          </span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span>
            <strong className="text-white font-semibold">A / D</strong> Steer
          </span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span>
            <strong className="text-amber-400 font-semibold">Space</strong> Jump
          </span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span>
            <strong className="text-cyan-400 font-semibold">F / Q / E</strong> Flip
          </span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span>
            <strong className="text-cyan-400 font-semibold">V</strong> Weather
          </span>
        </div>
      )}
    </div>
  );
};
