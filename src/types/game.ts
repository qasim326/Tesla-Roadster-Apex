export type CarModelId = 'roadster' | 'formula' | 'cyber' | 'prototype';
export type CoatFinish = 'gloss' | 'metallic' | 'matte' | 'chrome';
export type WheelStyle = 'sixSpoke' | 'turbine' | 'mesh' | 'aeroDisc';
export type WheelFinish = 'machined' | 'obsidian' | 'gold' | 'titanium';
export type AeroKit = 'gtWing' | 'ducktail' | 'swanNeck' | 'stealth';
export type TrimStyle = 'carbon' | 'body' | 'cyan' | 'amber';
export type LiveryStyle = 'none' | 'centerStripe' | 'twinStripe' | 'apexSide';
export type WidebodyKit = 'stock' | 'trackWide';
export type UnderglowColor = 'off' | 'cyan' | 'amber' | 'violet' | 'emerald' | 'crimson';
export type HeadlightTint = 'xenon' | 'amber' | 'iceBlue' | 'crimson';
export type StancePreset = 'track' | 'slammed' | 'rally';
export type ThrusterColorKey = 'cyan' | 'amber' | 'ultraviolet' | 'emerald' | 'crimson';

export type WeatherCondition = 'clear' | 'rainy' | 'foggy';

export interface WeatherMeta {
  id: WeatherCondition;
  label: string;
  shortLabel: string;
  gripPct: number;
  visibilityLabel: string;
  fogColorHex: number;
  fogDensity: number;
  steerDamp: number;
  brakeDamp: number;
  dragFactor: number;
}

export const WEATHER_CONFIGS: Record<WeatherCondition, WeatherMeta> = {
  clear: {
    id: 'clear',
    label: 'Clear Night',
    shortLabel: 'Clear',
    gripPct: 100,
    visibilityLabel: '100% Visibility',
    fogColorHex: 0x060b14,
    fogDensity: 0.0044,
    steerDamp: 11.5,
    brakeDamp: 4.8,
    dragFactor: 1.0,
  },
  rainy: {
    id: 'rainy',
    label: 'Storm Rain',
    shortLabel: 'Rain',
    gripPct: 58,
    visibilityLabel: '62% Visibility',
    fogColorHex: 0x07101c,
    fogDensity: 0.0118,
    steerDamp: 4.3,
    brakeDamp: 2.1,
    dragFactor: 0.94,
  },
  foggy: {
    id: 'foggy',
    label: 'Dense Fog',
    shortLabel: 'Fog',
    gripPct: 82,
    visibilityLabel: '28% Visibility',
    fogColorHex: 0x152232,
    fogDensity: 0.0295,
    steerDamp: 8.4,
    brakeDamp: 3.6,
    dragFactor: 0.98,
  },
};

export interface CarSpec {
  carModel: CarModelId;
  paintHex: string;
  coatFinish: CoatFinish;
  wheelStyle: WheelStyle;
  wheelFinish: WheelFinish;
  aeroKit: AeroKit;
  trimStyle: TrimStyle;
  livery: LiveryStyle;
  liveryHex: string;
  widebody: WidebodyKit;
  underglow: UnderglowColor;
  headlightTint: HeadlightTint;
  stance: StancePreset;
  thrusterColor: ThrusterColorKey;
}

export const DEFAULT_CAR_SPEC: CarSpec = {
  carModel: 'roadster',
  paintHex: '#F1F5F9',
  coatFinish: 'gloss',
  wheelStyle: 'sixSpoke',
  wheelFinish: 'machined',
  aeroKit: 'gtWing',
  trimStyle: 'carbon',
  livery: 'none',
  liveryHex: '#06B6D4',
  widebody: 'stock',
  underglow: 'off',
  headlightTint: 'xenon',
  stance: 'track',
  thrusterColor: 'cyan',
};

export const CAR_MODEL_META: Record<
  CarModelId,
  { name: string; subtitle: string; topSpeedKmh: number }
> = {
  roadster: {
    name: 'Apex Roadster',
    subtitle: 'SpaceX Cold-Gas Hypercar',
    topSpeedKmh: 518,
  },
  formula: {
    name: 'Orbital F1',
    subtitle: 'Open-Wheel Aero Monoposto',
    topSpeedKmh: 534,
  },
  cyber: {
    name: 'Cyber Wedge',
    subtitle: 'Angular Exoskeleton Interceptor',
    topSpeedKmh: 506,
  },
  prototype: {
    name: 'Le Mans Hyper',
    subtitle: 'Dorsal-Fin Endurance LMP',
    topSpeedKmh: 526,
  },
};

export const PRESET_SWATCHES: string[] = [
  '#F1F5F9', // Studio White
  '#DC2626', // Racing Red
  '#18181B', // Obsidian Black
  '#F59E0B', // Solar Amber
  '#06B6D4', // Cryo Cyan
  '#94A3B8', // Titanium Silver
  '#2563EB', // Cobalt Blue
  '#10B981', // Emerald
];

export const UNDERGLOW_THEMES: Record<
  UnderglowColor,
  { label: string; hex: string; lightHex: number }
> = {
  off: { label: 'Off', hex: '#475569', lightHex: 0x000000 },
  cyan: { label: 'Cryo Cyan', hex: '#06B6D4', lightHex: 0x22d3ee },
  amber: { label: 'Solar Amber', hex: '#F59E0B', lightHex: 0xf59e0b },
  violet: { label: 'Ultraviolet', hex: '#8B5CF6', lightHex: 0xa78bfa },
  emerald: { label: 'Emerald', hex: '#10B981', lightHex: 0x34d399 },
  crimson: { label: 'Crimson', hex: '#EF4444', lightHex: 0xf87171 },
};

export const HEADLIGHT_THEMES: Record<
  HeadlightTint,
  { label: string; colorHex: number; emissiveHex: number; uiHex: string }
> = {
  xenon: { label: 'Xenon White', colorHex: 0xffffff, emissiveHex: 0xfff5e0, uiHex: '#F8FAFC' },
  amber: { label: 'GT Yellow', colorHex: 0xfef08a, emissiveHex: 0xf59e0b, uiHex: '#F59E0B' },
  iceBlue: { label: 'Laser Ice', colorHex: 0xe0f2fe, emissiveHex: 0x38bdf8, uiHex: '#38BDF8' },
  crimson: { label: 'Apex Red', colorHex: 0xfecaca, emissiveHex: 0xef4444, uiHex: '#EF4444' },
};

export const THRUSTER_THEMES: Record<
  ThrusterColorKey,
  { label: string; hex: string; coreHex: string; glowHex: number }
> = {
  cyan: {
    label: 'Cryo Cyan',
    hex: '#06B6D4',
    coreHex: '#E0F7FA',
    glowHex: 0x22d3ee,
  },
  amber: {
    label: 'Solar Amber',
    hex: '#F59E0B',
    coreHex: '#FEF3C7',
    glowHex: 0xf59e0b,
  },
  ultraviolet: {
    label: 'Ultraviolet',
    hex: '#8B5CF6',
    coreHex: '#EDE9FE',
    glowHex: 0xa78bfa,
  },
  emerald: {
    label: 'Emerald',
    hex: '#10B981',
    coreHex: '#D1FAE5',
    glowHex: 0x34d399,
  },
  crimson: {
    label: 'Crimson',
    hex: '#EF4444',
    coreHex: '#FEE2E2',
    glowHex: 0xf87171,
  },
};

export type GameMode = 'title' | 'playing' | 'paused' | 'gameover' | 'stage_complete';
export type PlayMode = 'endless' | 'campaign';
export type CampaignStageId = 1 | 2 | 3 | 4 | 5;
export type StageTheme = 'earth' | 'orbit' | 'mars';

export type MissionTypeId =
  | 'thruster_burn'
  | 'close_call'
  | 'starman_speed'
  | 'orbital_collector'
  | 'zero_damage_sprint'
  | 'lane_weaver'
  | 'apex_score'
  | 'rival_overtake';

export interface MissionDefinition {
  id: MissionTypeId;
  title: string;
  description: string;
  unit: string;
  target: number;
  perRun: boolean;
  rewardPts: number;
  rewardCoins: number;
}

export interface ActiveMission {
  id: MissionTypeId;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface MissionBanner {
  id: number;
  missionId: MissionTypeId;
  title: string;
  rewardPts: number;
  rewardCoins: number;
}

export interface MissionsProgressState {
  activeMissions: ActiveMission[];
  missionsCompleted: number;
  coins: number;
  unlockedStage: CampaignStageId;
  completedStages: CampaignStageId[];
}

export interface PilotRankInfo {
  title: string;
  level: number;
  nextTitle: string | null;
  currentMin: number;
  nextMin: number | null;
}

export interface CampaignStageMeta {
  id: CampaignStageId;
  name: string;
  subtitle: string;
  objectiveLabel: string;
  theme: StageTheme;
  goalKind: 'distance_timed' | 'fuel_cells' | 'overtakes' | 'distance' | 'mars_boss';
  targetValue: number;
  timeLimitSec: number | null;
  difficulty: number;
  rewardPts: number;
  rewardCoins: number;
  weather: WeatherCondition;
}

export type StudioTab = 'model' | 'paint' | 'livery' | 'wheels' | 'aero' | 'stance' | 'thrusters';

export interface HudCallout {
  text: string;
  tone: 'cyan' | 'amber' | 'red';
  id: number;
}

export interface HudState {
  score: number;
  distanceKm: number;
  speedKmh: number;
  elapsedSeconds: number;
  sprint1KmSec: number | null;
  coldGasPct: number;
  coldGasActive: boolean;
  surgeActive: boolean;
  isAirborne: boolean;
  shields: number;
  maxShields: number;
  gapsCleared: number;
  topSpeedKmh: number;
  weather: WeatherCondition;
  callout: HudCallout | null;
  gameOverReason: 'wrecked' | 'viaduct_fall' | 'lava_fall' | 'time_expired' | null;
  playMode: PlayMode;
  campaignStage: CampaignStageId;
  stageProgress: number;
  stageTarget: number;
  stageTimeLeftSec: number | null;
  orbsCollected: number;
  nearMisses: number;
  thrusterActivations: number;
  laneSwitches: number;
  boostOvertakes: number;
  zeroDamageDistM: number;
  zeroDamageTimeSec: number;
}

export interface BestRecord {
  bestPts: number;
  bestKm: number;
}

export interface LeaderboardEntry {
  id: string;
  score: number;
  distanceKm: number;
  elapsedSeconds: number;
  sprint1KmSec: number | null;
  topSpeedKmh: number;
  carModel: CarModelId;
  weather: WeatherCondition;
  createdAt: number;
}

export interface LeaderboardData {
  topScores: LeaderboardEntry[];
  fastestTimes: LeaderboardEntry[];
}

export const INITIAL_HUD_STATE: HudState = {
  score: 0,
  distanceKm: 0,
  speedKmh: 0,
  elapsedSeconds: 0,
  sprint1KmSec: null,
  coldGasPct: 100,
  coldGasActive: false,
  surgeActive: false,
  isAirborne: false,
  shields: 3,
  maxShields: 3,
  gapsCleared: 0,
  topSpeedKmh: 0,
  weather: 'clear',
  callout: null,
  gameOverReason: null,
  playMode: 'endless',
  campaignStage: 1,
  stageProgress: 0,
  stageTarget: 1000,
  stageTimeLeftSec: null,
  orbsCollected: 0,
  nearMisses: 0,
  thrusterActivations: 0,
  laneSwitches: 0,
  boostOvertakes: 0,
  zeroDamageDistM: 0,
  zeroDamageTimeSec: 0,
};
