import {
  ActiveMission,
  CampaignStageId,
  CampaignStageMeta,
  MissionDefinition,
  MissionTypeId,
  MissionsProgressState,
  PilotRankInfo,
} from '../types/game';

const STORAGE_MISSIONS_KEY = 'roadster_apex_missions_v1';

export const MISSION_POOL: MissionDefinition[] = [
  {
    id: 'thruster_burn',
    title: 'Thruster Burn',
    description: 'Activate the SpaceX Thruster Boost 5 times in a single run.',
    unit: 'boosts',
    target: 5,
    perRun: true,
    rewardPts: 500,
    rewardCoins: 150,
  },
  {
    id: 'close_call',
    title: 'Close Call',
    description: 'Perform 8 near-misses with traffic vehicles.',
    unit: 'near-misses',
    target: 8,
    perRun: false,
    rewardPts: 600,
    rewardCoins: 180,
  },
  {
    id: 'starman_speed',
    title: 'Starman Speed',
    description: 'Travel 1,500 meters without crashing.',
    unit: 'm',
    target: 1500,
    perRun: true,
    rewardPts: 750,
    rewardCoins: 220,
  },
  {
    id: 'orbital_collector',
    title: 'Orbital Collector',
    description: 'Collect 40 energy orbs / coins.',
    unit: 'orbs',
    target: 40,
    perRun: false,
    rewardPts: 650,
    rewardCoins: 200,
  },
  {
    id: 'zero_damage_sprint',
    title: 'Zero-Damage Sprint',
    description: 'Survive for 45 seconds at high speed without damage.',
    unit: 's',
    target: 45,
    perRun: true,
    rewardPts: 800,
    rewardCoins: 250,
  },
  {
    id: 'lane_weaver',
    title: 'Lane Weaver',
    description: 'Switch lanes 25 times in one run.',
    unit: 'switches',
    target: 25,
    perRun: true,
    rewardPts: 550,
    rewardCoins: 160,
  },
  {
    id: 'apex_score',
    title: 'Apex Score',
    description: 'Reach a score of 5,000 points in a run.',
    unit: 'pts',
    target: 5000,
    perRun: true,
    rewardPts: 900,
    rewardCoins: 260,
  },
  {
    id: 'rival_overtake',
    title: 'Rival Takedown',
    description: 'Pass 30 cars while boosting.',
    unit: 'cars',
    target: 30,
    perRun: false,
    rewardPts: 850,
    rewardCoins: 240,
  },
];

export const MISSION_MAP: Record<MissionTypeId, MissionDefinition> = MISSION_POOL.reduce(
  (acc, m) => {
    acc[m.id] = m;
    return acc;
  },
  {} as Record<MissionTypeId, MissionDefinition>,
);

export const CAMPAIGN_STAGES: CampaignStageMeta[] = [
  {
    id: 1,
    name: 'Earth Highway Test',
    subtitle: 'Proving Grounds · Orbital Viaduct',
    objectiveLabel: 'Reach 1,000m within 40 seconds',
    theme: 'earth',
    goalKind: 'distance_timed',
    targetValue: 1000,
    timeLimitSec: 40,
    difficulty: 1,
    rewardPts: 1000,
    rewardCoins: 250,
    weather: 'clear',
  },
  {
    id: 2,
    name: 'Meteor Rush',
    subtitle: 'Orbital Debris Corridor',
    objectiveLabel: 'Dodge falling space debris & collect 30 fuel cells',
    theme: 'orbit',
    goalKind: 'fuel_cells',
    targetValue: 30,
    timeLimitSec: null,
    difficulty: 2,
    rewardPts: 1500,
    rewardCoins: 350,
    weather: 'clear',
  },
  {
    id: 3,
    name: 'Thruster Overdrive',
    subtitle: 'High-Velocity Traffic Gauntlet',
    objectiveLabel: 'Maintain boost speed & pass 25 rival cars',
    theme: 'orbit',
    goalKind: 'overtakes',
    targetValue: 25,
    timeLimitSec: null,
    difficulty: 3,
    rewardPts: 2000,
    rewardCoins: 450,
    weather: 'rainy',
  },
  {
    id: 4,
    name: 'Stratosphere Ascent',
    subtitle: 'Midnight Heavy Traffic Sprint',
    objectiveLabel: 'Survive dense night traffic up to 3,000m',
    theme: 'orbit',
    goalKind: 'distance',
    targetValue: 3000,
    timeLimitSec: null,
    difficulty: 4,
    rewardPts: 2600,
    rewardCoins: 600,
    weather: 'foggy',
  },
  {
    id: 5,
    name: 'Mars Colony Arrival',
    subtitle: 'Final Boss Run · Ares Red Sector',
    objectiveLabel: 'Hit Speed Gates & cross the 2,500m Mars Finish Line',
    theme: 'mars',
    goalKind: 'mars_boss',
    targetValue: 2500,
    timeLimitSec: null,
    difficulty: 5,
    rewardPts: 4000,
    rewardCoins: 1000,
    weather: 'clear',
  },
];

export function getStageMeta(stageId: CampaignStageId): CampaignStageMeta {
  return CAMPAIGN_STAGES.find((s) => s.id === stageId) ?? CAMPAIGN_STAGES[0];
}

const RANK_TIERS = [
  { title: 'Cadet', min: 0 },
  { title: 'Orbital Pilot', min: 3 },
  { title: 'Astronaut', min: 6 },
  { title: 'Mars Commander', min: 10 },
  { title: 'Apex Legend', min: 16 },
];

export function getPilotRank(missionsCompleted: number): PilotRankInfo {
  let idx = 0;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (missionsCompleted >= RANK_TIERS[i].min) idx = i;
  }
  const current = RANK_TIERS[idx];
  const next = RANK_TIERS[idx + 1] ?? null;
  return {
    title: current.title,
    level: idx + 1,
    nextTitle: next ? next.title : null,
    currentMin: current.min,
    nextMin: next ? next.min : null,
  };
}

export function pickReplacementMission(excludeIds: MissionTypeId[]): ActiveMission {
  const candidates = MISSION_POOL.filter((m) => !excludeIds.includes(m.id));
  const pool = candidates.length > 0 ? candidates : MISSION_POOL;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  return {
    id: chosen.id,
    progress: 0,
    completed: false,
    claimed: false,
  };
}

function createInitialActiveMissions(): ActiveMission[] {
  return [
    { id: 'thruster_burn', progress: 0, completed: false, claimed: false },
    { id: 'close_call', progress: 0, completed: false, claimed: false },
    { id: 'orbital_collector', progress: 0, completed: false, claimed: false },
  ];
}

export function loadMissionsState(): MissionsProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_MISSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MissionsProgressState>;
      const validIds = new Set(MISSION_POOL.map((m) => m.id));
      const active = Array.isArray(parsed.activeMissions)
        ? parsed.activeMissions
            .filter(
              (m): m is ActiveMission =>
                !!m &&
                typeof m === 'object' &&
                typeof m.id === 'string' &&
                validIds.has(m.id as MissionTypeId) &&
                typeof m.progress === 'number',
            )
            .slice(0, 3)
        : [];
      while (active.length < 3) {
        active.push(pickReplacementMission(active.map((a) => a.id)));
      }
      const unlocked =
        typeof parsed.unlockedStage === 'number' &&
        parsed.unlockedStage >= 1 &&
        parsed.unlockedStage <= 5
          ? (parsed.unlockedStage as CampaignStageId)
          : 1;
      const completedStages = Array.isArray(parsed.completedStages)
        ? parsed.completedStages.filter(
            (s): s is CampaignStageId => typeof s === 'number' && s >= 1 && s <= 5,
          )
        : [];
      return {
        activeMissions: active,
        missionsCompleted:
          typeof parsed.missionsCompleted === 'number' ? parsed.missionsCompleted : 0,
        coins: typeof parsed.coins === 'number' ? parsed.coins : 0,
        unlockedStage: unlocked,
        completedStages,
      };
    }
  } catch {
    // ignore storage errors
  }

  return {
    activeMissions: createInitialActiveMissions(),
    missionsCompleted: 0,
    coins: 0,
    unlockedStage: 1,
    completedStages: [],
  };
}

export function saveMissionsState(state: MissionsProgressState): void {
  try {
    localStorage.setItem(STORAGE_MISSIONS_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

export function replaceCompletedMissions(state: MissionsProgressState): MissionsProgressState {
  const hasCompleted = state.activeMissions.some((m) => m.completed);
  if (!hasCompleted) return state;

  const nextActive: ActiveMission[] = [];
  for (const m of state.activeMissions) {
    if (!m.completed) {
      nextActive.push(m);
    }
  }
  while (nextActive.length < 3) {
    nextActive.push(pickReplacementMission(nextActive.map((a) => a.id)));
  }

  const nextState: MissionsProgressState = {
    ...state,
    activeMissions: nextActive,
  };
  saveMissionsState(nextState);
  return nextState;
}
