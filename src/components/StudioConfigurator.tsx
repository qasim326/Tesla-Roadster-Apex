import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, RotateCcw, SlidersHorizontal } from 'lucide-react';
import {
  AeroKit,
  CAR_MODEL_META,
  CarModelId,
  CarSpec,
  CoatFinish,
  DEFAULT_CAR_SPEC,
  HEADLIGHT_THEMES,
  HeadlightTint,
  LiveryStyle,
  PRESET_SWATCHES,
  StancePreset,
  StudioTab,
  THRUSTER_THEMES,
  ThrusterColorKey,
  TrimStyle,
  UNDERGLOW_THEMES,
  UnderglowColor,
  WheelFinish,
  WheelStyle,
  WidebodyKit,
} from '../types/game';
import { soundEngine } from '../audio/soundEngine';

interface StudioConfiguratorProps {
  carSpec: CarSpec;
  studioOpen: boolean;
  studioTab: StudioTab;
  customSwatches: string[];
  onChangeSpec: (next: CarSpec) => void;
  onToggleStudio: () => void;
  onChangeTab: (tab: StudioTab) => void;
  onAddCustomSwatch: (hex: string) => void;
  onResetSpec: () => void;
}

const MODEL_IDS: CarModelId[] = ['roadster', 'formula', 'cyber', 'prototype'];

const COAT_OPTIONS: { id: CoatFinish; label: string }[] = [
  { id: 'gloss', label: 'Gloss' },
  { id: 'metallic', label: 'Metallic' },
  { id: 'matte', label: 'Matte' },
  { id: 'chrome', label: 'Chrome' },
];

const LIVERY_OPTIONS: { id: LiveryStyle; label: string }[] = [
  { id: 'none', label: 'Clean' },
  { id: 'centerStripe', label: 'Center GT' },
  { id: 'twinStripe', label: 'Twin Le Mans' },
  { id: 'apexSide', label: 'Side Slash' },
];

const LIVERY_COLORS = ['#06B6D4', '#F59E0B', '#EF4444', '#F8FAFC', '#18181B', '#10B981'];

const WHEEL_STYLE_OPTIONS: { id: WheelStyle; label: string }[] = [
  { id: 'sixSpoke', label: 'Apex 6-Spoke' },
  { id: 'turbine', label: 'Aero Turbine' },
  { id: 'mesh', label: 'Forged Mesh' },
  { id: 'aeroDisc', label: 'Hyper Disc' },
];

const WHEEL_FINISH_OPTIONS: { id: WheelFinish; label: string }[] = [
  { id: 'machined', label: 'Machined' },
  { id: 'obsidian', label: 'Obsidian' },
  { id: 'gold', label: 'Champagne' },
  { id: 'titanium', label: 'Titanium' },
];

const AERO_KIT_OPTIONS: { id: AeroKit; label: string }[] = [
  { id: 'gtWing', label: 'GT Carbon Wing' },
  { id: 'swanNeck', label: 'Track Swan-Neck' },
  { id: 'ducktail', label: 'Active Ducktail' },
  { id: 'stealth', label: 'Stealth Delete' },
];

const TRIM_OPTIONS: { id: TrimStyle; label: string }[] = [
  { id: 'carbon', label: 'Carbon Weave' },
  { id: 'body', label: 'Body Match' },
  { id: 'cyan', label: 'Cryo Cyan' },
  { id: 'amber', label: 'Solar Amber' },
];

const WIDEBODY_OPTIONS: { id: WidebodyKit; label: string }[] = [
  { id: 'stock', label: 'Factory Arch' },
  { id: 'trackWide', label: 'Track Widebody' },
];

const STANCE_OPTIONS: { id: StancePreset; label: string }[] = [
  { id: 'track', label: 'Track Spec' },
  { id: 'slammed', label: 'Slammed Low' },
  { id: 'rally', label: 'High Clearance' },
];

function isValidHex(val: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(val.trim());
}

export const StudioConfigurator: React.FC<StudioConfiguratorProps> = ({
  carSpec,
  studioOpen,
  studioTab,
  customSwatches,
  onChangeSpec,
  onToggleStudio,
  onChangeTab,
  onAddCustomSwatch,
  onResetSpec,
}) => {
  const [hexInput, setHexInput] = useState(carSpec.paintHex.toUpperCase());
  const allSwatches = Array.from(new Set([...PRESET_SWATCHES, ...customSwatches]));
  const thrusterTheme = THRUSTER_THEMES[carSpec.thrusterColor];
  const modelMeta = CAR_MODEL_META[carSpec.carModel];

  const handleHexChange = (value: string) => {
    const formatted = value.startsWith('#') ? value.toUpperCase() : `#${value.toUpperCase()}`;
    setHexInput(formatted.slice(0, 7));
    if (isValidHex(formatted)) {
      onChangeSpec({ ...carSpec, paintHex: formatted });
    }
  };

  const handleAddHex = () => {
    soundEngine.playUiClick();
    if (isValidHex(hexInput)) {
      onAddCustomSwatch(hexInput);
      onChangeSpec({ ...carSpec, paintHex: hexInput });
    } else {
      setHexInput(carSpec.paintHex.toUpperCase());
    }
  };

  const handleSelectSwatch = (hex: string) => {
    soundEngine.playUiClick();
    setHexInput(hex.toUpperCase());
    onChangeSpec({ ...carSpec, paintHex: hex });
  };

  const handleReset = () => {
    soundEngine.playUiClick();
    setHexInput(DEFAULT_CAR_SPEC.paintHex);
    onResetSpec();
  };

  const isSaved = allSwatches.some(
    (s) => s.toUpperCase() === carSpec.paintHex.toUpperCase(),
  );

  const tabList: { id: StudioTab; label: string }[] = [
    { id: 'model', label: 'Model' },
    { id: 'paint', label: 'Paint' },
    { id: 'livery', label: 'Livery' },
    { id: 'wheels', label: 'Wheels' },
    { id: 'aero', label: 'Aero' },
    { id: 'stance', label: 'Stance' },
    { id: 'thrusters', label: 'Thrusters' },
  ];

  return (
    <>
      {/* Studio Spec Preview Card: sits bottom-right when studio closed */}
      {!studioOpen && (
        <div className="fixed bottom-5 right-7 z-20 hidden sm:block pointer-events-auto">
          <div className="w-[186px] rounded-xl bg-[#0b101b]/95 border border-white/15 overflow-hidden shadow-2xl">
            <div className="relative h-[86px] bg-gradient-to-br from-[#161c29] via-[#0c1322] to-[#081520] flex items-center justify-center px-3">
              <svg viewBox="0 0 200 84" className="w-full h-full" aria-hidden="true">
                <defs>
                  <radialGradient id="specGlow" cx="50%" cy="68%" r="48%">
                    <stop offset="0%" stopColor={thrusterTheme.hex} stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#060911" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <ellipse cx="100" cy="64" rx="82" ry="14" fill="url(#specGlow)" />
                {carSpec.aeroKit !== 'stealth' && (
                  <path
                    d="M148 34 L172 30 L174 35 L150 38 Z"
                    fill={carSpec.paintHex}
                    opacity="0.92"
                  />
                )}
                <path
                  d="M24 54 L30 43 L62 36 L88 22 L134 22 L162 35 L176 41 L174 55 L24 55 Z"
                  fill={carSpec.paintHex}
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="1.2"
                />
                <path d="M68 35 L90 23 L130 23 L148 35 Z" fill="#0f172a" />
                <rect x="20" y="53" width="156" height="4" rx="1.5" fill="#1e293b" />
                <rect x="82" y="42" width="4" height="9" rx="1" fill={thrusterTheme.hex} />
                <circle cx="56" cy="55" r="11.5" fill="#0f131b" stroke="#94a3b8" strokeWidth="2.5" />
                <circle cx="56" cy="55" r="4.5" fill="#cbd5e1" />
                <circle cx="144" cy="55" r="11.5" fill="#0f131b" stroke="#94a3b8" strokeWidth="2.5" />
                <circle cx="144" cy="55" r="4.5" fill="#cbd5e1" />
              </svg>
            </div>
            <div className="flex items-center justify-between px-3 py-2 bg-[#090d16] border-t border-white/10">
              <span className="text-[11px] font-medium text-slate-200 truncate">
                {modelMeta.name}
              </span>
              <span className="text-[10px] font-mono-tech font-semibold tracking-wider text-amber-400 whitespace-nowrap">
                ACTIVE
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Bottom-Center Studio Configurator Drawer (Keeps centered car unobstructed!) */}
      {studioOpen && (
        <div
          className="fixed z-30 left-1/2 -translate-x-1/2 bottom-[74px] w-[calc(100vw-1.5rem)] max-w-[680px] rounded-2xl bg-[#0b101b]/95 border border-white/15 shadow-2xl p-4 sm:p-5 pointer-events-auto"
          role="dialog"
          aria-label="Studio Configurator"
        >
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3.5 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="font-display text-sm font-bold tracking-wider text-white uppercase whitespace-nowrap">
                STUDIO CONFIGURATOR
              </span>
              <span className="font-mono-tech text-xs text-cyan-400 whitespace-nowrap">
                {modelMeta.name}
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
              <div className="flex items-center bg-[#121826] rounded-lg p-1 border border-white/10">
                {tabList.map((tabItem) => {
                  const active = studioTab === tabItem.id;
                  return (
                    <button
                      key={tabItem.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        onChangeTab(tabItem.id);
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {tabItem.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#121826] border border-white/10 text-xs font-medium text-slate-300 hover:text-white hover:border-white/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="Reset car to Studio Spec"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="pt-3.5 space-y-3.5">
            {studioTab === 'model' && (
              <div className="space-y-2.5">
                <span className="text-xs font-medium text-slate-300 block">
                  Select Hypercar Chassis Platform
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MODEL_IDS.map((mId) => {
                    const meta = CAR_MODEL_META[mId];
                    const active = carSpec.carModel === mId;
                    return (
                      <button
                        key={mId}
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          onChangeSpec({ ...carSpec, carModel: mId });
                        }}
                        className={`text-left px-3 py-2.5 rounded-xl border transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#1b2232] border-amber-400 text-white'
                            : 'bg-[#121826] border-white/10 text-slate-300 hover:border-white/25 hover:text-white'
                        }`}
                      >
                        <div className="font-display text-xs font-bold tracking-wide text-white truncate">
                          {meta.name}
                        </div>
                        <div className="mt-0.5 text-[10px] text-slate-400 truncate">
                          {meta.subtitle}
                        </div>
                        <div className="mt-1.5 font-mono-tech text-[10px] font-semibold text-amber-400">
                          {meta.topSpeedKmh} KM/H
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {studioTab === 'paint' && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-300">
                    Exterior Paint & Custom Swatches
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#121826] border border-white/15 text-xs font-mono-tech text-slate-200 cursor-text">
                      <span
                        className="w-3 h-3 rounded-sm border border-white/25 shrink-0"
                        style={{ backgroundColor: carSpec.paintHex }}
                      />
                      <input
                        type="text"
                        value={hexInput}
                        onChange={(e) => handleHexChange(e.target.value)}
                        className="w-[64px] bg-transparent outline-none uppercase text-slate-100"
                        maxLength={7}
                        aria-label="Custom Hex Color"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleAddHex}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isSaved
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-[#1a2234] text-amber-400 border border-amber-500/40 hover:bg-amber-500 hover:text-slate-950'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isSaved ? 'Saved' : 'Add'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {allSwatches.map((hex) => {
                    const selected = hex.toUpperCase() === carSpec.paintHex.toUpperCase();
                    return (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => handleSelectSwatch(hex)}
                        aria-label={`Select paint ${hex}`}
                        className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                          selected
                            ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#0b101b] scale-110'
                            : 'border border-white/20 hover:scale-105'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <span className="text-xs font-medium text-slate-300">Coat Finish</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {COAT_OPTIONS.map((opt) => {
                      const active = carSpec.coatFinish === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            onChangeSpec({ ...carSpec, coatFinish: opt.id });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            active
                              ? 'bg-[#1b2232] border-amber-400 text-amber-300'
                              : 'bg-[#121826] border-white/10 text-slate-300 hover:border-white/25 hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {studioTab === 'livery' && (
              <>
                <div className="space-y-2">
                  <span className="text-xs font-medium text-slate-300 block">
                    Racing Livery Graphics
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {LIVERY_OPTIONS.map((opt) => {
                      const active = carSpec.livery === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            onChangeSpec({ ...carSpec, livery: opt.id });
                          }}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                            active
                              ? 'bg-[#1b2232] border-amber-400 text-amber-300'
                              : 'bg-[#121826] border-white/10 text-slate-300 hover:border-white/25 hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <span className="text-xs font-medium text-slate-300">Stripe Accent Color</span>
                  <div className="flex items-center gap-2">
                    {LIVERY_COLORS.map((hex) => {
                      const active = carSpec.liveryHex.toUpperCase() === hex.toUpperCase();
                      return (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            onChangeSpec({
                              ...carSpec,
                              liveryHex: hex,
                              livery: carSpec.livery === 'none' ? 'twinStripe' : carSpec.livery,
                            });
                          }}
                          aria-label={`Select stripe color ${hex}`}
                          className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                            active
                              ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#0b101b] scale-110'
                              : 'border border-white/25 hover:scale-105'
                          }`}
                          style={{ backgroundColor: hex }}
                        />
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {studioTab === 'wheels' && (
              <>
                <div className="space-y-2">
                  <span className="text-xs font-medium text-slate-300 block">
                    Forged Wheel Architecture
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {WHEEL_STYLE_OPTIONS.map((opt) => {
                      const active = carSpec.wheelStyle === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            onChangeSpec({ ...carSpec, wheelStyle: opt.id });
                          }}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                            active
                              ? 'bg-[#1b2232] border-amber-400 text-amber-300'
                              : 'bg-[#121826] border-white/10 text-slate-300 hover:border-white/25 hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <span className="text-xs font-medium text-slate-300">Alloy Finish</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {WHEEL_FINISH_OPTIONS.map((opt) => {
                      const active = carSpec.wheelFinish === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            onChangeSpec({ ...carSpec, wheelFinish: opt.id });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                            active
                              ? 'bg-[#1b2232] border-amber-400 text-amber-300'
                              : 'bg-[#121826] border-white/10 text-slate-300 hover:border-white/25 hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {studioTab === 'aero' && (
              <>
                <div className="space-y-2">
                  <span className="text-xs font-medium text-slate-300 block">
                    Rear Downforce Wing Package
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {AERO_KIT_OPTIONS.map((opt) => {
                      const active = carSpec.aeroKit === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            onChangeSpec({ ...carSpec, aeroKit: opt.id });
                          }}
                          className={`px-2.5 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                            active
                              ? 'bg-[#1b2232] border-amber-400 text-amber-300'
                              : 'bg-[#121826] border-white/10 text-slate-300 hover:border-white/25 hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <span className="text-xs font-medium text-slate-300">Body Fender Kit</span>
                  <div className="flex items-center gap-1.5">
                    {WIDEBODY_OPTIONS.map((opt) => {
                      const active = carSpec.widebody === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            onChangeSpec({ ...carSpec, widebody: opt.id });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                            active
                              ? 'bg-[#1b2232] border-amber-400 text-amber-300'
                              : 'bg-[#121826] border-white/10 text-slate-300 hover:border-white/25 hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <span className="text-xs font-medium text-slate-300">Splitter & Skirts</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {TRIM_OPTIONS.map((opt) => {
                      const active = carSpec.trimStyle === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            onChangeSpec({ ...carSpec, trimStyle: opt.id });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                            active
                              ? 'bg-[#1b2232] border-amber-400 text-amber-300'
                              : 'bg-[#121826] border-white/10 text-slate-300 hover:border-white/25 hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {studioTab === 'stance' && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-300">Suspension Stance</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {STANCE_OPTIONS.map((opt) => {
                      const active = carSpec.stance === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            onChangeSpec({ ...carSpec, stance: opt.id });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                            active
                              ? 'bg-[#1b2232] border-amber-400 text-amber-300'
                              : 'bg-[#121826] border-white/10 text-slate-300 hover:border-white/25 hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <span className="text-xs font-medium text-slate-300">Underglow Neon</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(Object.keys(UNDERGLOW_THEMES) as UnderglowColor[]).map((key) => {
                      const theme = UNDERGLOW_THEMES[key];
                      const active = carSpec.underglow === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            onChangeSpec({ ...carSpec, underglow: key });
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                            active
                              ? 'bg-[#172231] border-white/60 text-white'
                              : 'bg-[#121826] border-white/10 text-slate-300 hover:border-white/25 hover:text-white'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: theme.hex }}
                          />
                          <span>{theme.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <span className="text-xs font-medium text-slate-300">Headlight Laser Tint</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(Object.keys(HEADLIGHT_THEMES) as HeadlightTint[]).map((key) => {
                      const theme = HEADLIGHT_THEMES[key];
                      const active = carSpec.headlightTint === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            onChangeSpec({ ...carSpec, headlightTint: key });
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                            active
                              ? 'bg-[#1b2232] border-amber-400 text-amber-300'
                              : 'bg-[#121826] border-white/10 text-slate-300 hover:border-white/25 hover:text-white'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: theme.uiHex }}
                          />
                          <span>{theme.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {studioTab === 'thrusters' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-300">
                    Cold-Gas Thruster Plume & Accent Signature
                  </span>
                  <span className="text-xs font-medium text-cyan-400 whitespace-nowrap">
                    Live Rear Preview
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(Object.keys(THRUSTER_THEMES) as ThrusterColorKey[]).map((key) => {
                    const theme = THRUSTER_THEMES[key];
                    const active = carSpec.thrusterColor === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          onChangeSpec({ ...carSpec, thrusterColor: key });
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-[#172231] border-white/60 text-white'
                            : 'bg-[#121826] border-white/10 text-slate-300 hover:border-white/25 hover:text-white'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: theme.hex }}
                        />
                        <span>{theme.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Center Quick Swatch & Customize Bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto max-w-[95vw]">
        <div className="flex items-center gap-2 sm:gap-2.5 px-3 py-2 rounded-2xl bg-[#0b101b]/95 border border-white/15 shadow-2xl overflow-x-auto">
          <div className="flex items-center gap-1.5">
            {allSwatches.slice(0, 8).map((hex) => {
              const selected = hex.toUpperCase() === carSpec.paintHex.toUpperCase();
              return (
                <button
                  key={hex}
                  type="button"
                  onClick={() => handleSelectSwatch(hex)}
                  aria-label={`Paint ${hex}`}
                  className={`w-6 h-6 rounded-full shrink-0 transition-transform cursor-pointer ${
                    selected
                      ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#0b101b] scale-110'
                      : 'border border-white/20 hover:scale-105'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              );
            })}
          </div>

          <div className="h-5 w-px bg-white/10 hidden sm:block" />

          <label className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#121826] border border-white/12 text-xs font-mono-tech text-slate-200 shrink-0">
            <span
              className="w-2.5 h-2.5 rounded-sm border border-white/25"
              style={{ backgroundColor: carSpec.paintHex }}
            />
            <input
              type="text"
              value={hexInput}
              onChange={(e) => handleHexChange(e.target.value)}
              className="w-[60px] bg-transparent outline-none uppercase"
              maxLength={7}
              aria-label="Quick Hex Input"
            />
          </label>

          <button
            type="button"
            onClick={handleAddHex}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#182032] border border-white/10 text-xs font-semibold text-amber-400 hover:bg-[#1f2940] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onToggleStudio();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              studioOpen
                ? 'bg-amber-500 text-slate-950'
                : 'bg-[#121826] border border-white/15 text-slate-200 hover:text-white hover:border-white/30'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Customize</span>
            {studioOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </>
  );
};
