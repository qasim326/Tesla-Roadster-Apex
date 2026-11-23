/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { CampaignModal } from './components/CampaignModal';
import { GameCanvas, TouchControlsState } from './components/GameCanvas';
import { GameplayHud } from './components/GameplayHud';
import { MissionsModal } from './components/MissionsModal';
import { GameOverModal, PauseModal, StageCompleteModal } from './components/RunModals';
import { StudioConfigurator } from './components/StudioConfigurator';
import { TitleOverlay } from './components/TitleOverlay';
import {
  MISSION_MAP,
  getStageMeta,
  loadMissionsState,
  pickReplacementMission,
  replaceCompletedMissions,
  saveMissionsState,
} from './data/missionsAndCampaign';
import {
  BestRecord,
  CampaignStageId,
  CarSpec,
  DEFAULT_CAR_SPEC,
  GameMode,
  HudState,
  INITIAL_HUD_STATE,
  LeaderboardData,
  LeaderboardEntry,
  MissionBanner,
  MissionTypeId,
  MissionsProgressState,
  PlayMode,
  StudioTab,
  WeatherCondition,
} from './types/game';
import {
  clearLeaderboardStorage,
  loadLeaderboard,
  recordLeaderboardRun,
} from './utils/leaderboard';

const STORAGE_BEST_KEY = 'roadster_apex_best_v1';
const STORAGE_SPEC_KEY = 'roadster_apex_spec_v1';
const STORAGE_SWATCHES_KEY = 'roadster_apex_swatches_v1';

function loadBestRecord(): BestRecord {
  try {
    const raw = localStorage.getItem(STORAGE_BEST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BestRecord>;
      return {
        bestPts: typeof parsed.bestPts === 'number' ? parsed.bestPts : 0,
        bestKm: typeof parsed.bestKm === 'number' ? parsed.bestKm : 0,
      };
    }
  } catch {
    // ignore storage errors
  }
  return { bestPts: 0, bestKm: 0 };
}

function loadCarSpec(): CarSpec {
  try {
    const raw = localStorage.getItem(STORAGE_SPEC_KEY);
    if (raw) {
      return { ...DEFAULT_CAR_SPEC, ...(JSON.parse(raw) as Partial<CarSpec>) };
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_CAR_SPEC;
}

function loadCustomSwatches(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_SWATCHES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((s) => typeof s === 'string');
    }
  } catch {
    // ignore storage errors
  }
  return [];
}

const WEATHER_ORDER: WeatherCondition[] = ['clear', 'rainy', 'foggy'];

export default function App() {
  const [mode, setMode] = useState<GameMode>('title');
  const [playMode, setPlayMode] = useState<PlayMode>('endless');
  const [campaignStage, setCampaignStage] = useState<CampaignStageId>(1);
  const [carSpec, setCarSpec] = useState<CarSpec>(loadCarSpec);
  const [weather, setWeather] = useState<WeatherCondition>('clear');
  const [customSwatches, setCustomSwatches] = useState<string[]>(loadCustomSwatches);
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioTab, setStudioTab] = useState<StudioTab>('model');
  const [missionsModalOpen, setMissionsModalOpen] = useState(false);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [runNonce, setRunNonce] = useState(0);
  const [hud, setHud] = useState<HudState>(INITIAL_HUD_STATE);
  const [bestRecord, setBestRecord] = useState<BestRecord>(loadBestRecord);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData>(loadLeaderboard);
  const [missionsState, setMissionsState] = useState<MissionsProgressState>(loadMissionsState);
  const [missionBanner, setMissionBanner] = useState<MissionBanner | null>(null);

  const leaderboardRef = useRef<LeaderboardData>(leaderboard);
  const missionsStateRef = useRef<MissionsProgressState>(missionsState);
  const carModelRef = useRef(carSpec.carModel);
  const pendingMissionBonusRef = useRef<number>(0);
  const runMissionBaselineRef = useRef<Record<string, number>>({});
  const bannerTimeoutRef = useRef<number | null>(null);
  const bannerNonceRef = useRef(1);

  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [scoreRank, setScoreRank] = useState<number | null>(null);
  const [timeRank, setTimeRank] = useState<number | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    leaderboardRef.current = leaderboard;
  }, [leaderboard]);

  useEffect(() => {
    missionsStateRef.current = missionsState;
  }, [missionsState]);

  useEffect(() => {
    carModelRef.current = carSpec.carModel;
  }, [carSpec.carModel]);

  useEffect(() => {
    return () => {
      if (bannerTimeoutRef.current !== null) {
        window.clearTimeout(bannerTimeoutRef.current);
      }
    };
  }, []);

  const touchRef = useRef<TouchControlsState>({
    left: false,
    right: false,
    accel: false,
    brake: false,
    jump: false,
    surge: false,
    flip: false,
  });

  const handleSpecChange = useCallback((next: CarSpec) => {
    setCarSpec(next);
    try {
      localStorage.setItem(STORAGE_SPEC_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const handleAddSwatch = useCallback((hex: string) => {
    const norm = hex.toUpperCase();
    setCustomSwatches((prev) => {
      if (prev.includes(norm)) return prev;
      const next = [...prev, norm];
      try {
        localStorage.setItem(STORAGE_SWATCHES_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const handleResetSpec = useCallback(() => {
    handleSpecChange(DEFAULT_CAR_SPEC);
  }, [handleSpecChange]);

  const handleCycleWeather = useCallback(() => {
    soundEngine.playUiClick();
    setWeather((prev) => {
      const nextIdx = (WEATHER_ORDER.indexOf(prev) + 1) % WEATHER_ORDER.length;
      return WEATHER_ORDER[nextIdx];
    });
  }, []);

  const showMissionBanner = useCallback(
    (missionId: MissionTypeId, title: string, rewardPts: number, rewardCoins: number) => {
      if (bannerTimeoutRef.current !== null) {
        window.clearTimeout(bannerTimeoutRef.current);
      }
      const nextBanner: MissionBanner = {
        id: bannerNonceRef.current++,
        missionId,
        title,
        rewardPts,
        rewardCoins,
      };
      setMissionBanner(nextBanner);
      bannerTimeoutRef.current = window.setTimeout(() => {
        setMissionBanner(null);
      }, 3400);
    },
    [],
  );

  const startDrive = useCallback(
    (targetPlayMode: PlayMode = playMode, targetStage: CampaignStageId = campaignStage) => {
      soundEngine.unlock();
      setStudioOpen(false);
      setMissionsModalOpen(false);
      setCampaignModalOpen(false);
      setIsNewRecord(false);
      setCurrentRunId(null);
      setScoreRank(null);
      setTimeRank(null);
      setMissionBanner(null);
      pendingMissionBonusRef.current = 0;

      // Replace any completed missions & reset unfinished single-run mission counters
      const replaced = replaceCompletedMissions(missionsStateRef.current);
      const resetRunMissions = replaced.activeMissions.map((m) => {
        const def = MISSION_MAP[m.id];
        if (def?.perRun && !m.completed) {
          return { ...m, progress: 0 };
        }
        return m;
      });
      const preparedState: MissionsProgressState = {
        ...replaced,
        activeMissions: resetRunMissions,
      };
      missionsStateRef.current = preparedState;
      setMissionsState(preparedState);
      saveMissionsState(preparedState);

      const baseline: Record<string, number> = {};
      for (const m of preparedState.activeMissions) {
        const def = MISSION_MAP[m.id];
        if (def && !def.perRun) {
          baseline[m.id] = m.progress;
        }
      }
      runMissionBaselineRef.current = baseline;

      const stageMeta = getStageMeta(targetStage);
      const runWeather = targetPlayMode === 'campaign' ? stageMeta.weather : weather;
      if (targetPlayMode === 'campaign') {
        setWeather(runWeather);
      }

      setPlayMode(targetPlayMode);
      setCampaignStage(targetStage);
      setHud({
        ...INITIAL_HUD_STATE,
        speedKmh: 280,
        weather: runWeather,
        playMode: targetPlayMode,
        campaignStage: targetStage,
        stageTarget: stageMeta.targetValue,
        stageTimeLeftSec: stageMeta.timeLimitSec,
      });
      setRunNonce((n) => n + 1);
      setMode('playing');
    },
    [playMode, campaignStage, weather],
  );

  const recordRunResults = useCallback((finalHud: HudState) => {
    const entry: LeaderboardEntry = {
      id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      score: finalHud.score,
      distanceKm: finalHud.distanceKm,
      elapsedSeconds: finalHud.elapsedSeconds,
      sprint1KmSec: finalHud.sprint1KmSec,
      topSpeedKmh: finalHud.topSpeedKmh,
      carModel: carModelRef.current,
      weather: finalHud.weather,
      createdAt: Date.now(),
    };

    const { updated, scoreRank: nextScoreRank, timeRank: nextTimeRank } =
      recordLeaderboardRun(leaderboardRef.current, entry);
    leaderboardRef.current = updated;
    setLeaderboard(updated);
    setCurrentRunId(entry.id);
    setScoreRank(nextScoreRank);
    setTimeRank(nextTimeRank);

    setBestRecord((prev) => {
      const beatPts = finalHud.score > prev.bestPts;
      const beatKm = finalHud.distanceKm > prev.bestKm;
      if (beatPts) setIsNewRecord(true);
      const updatedBest: BestRecord = {
        bestPts: beatPts ? finalHud.score : prev.bestPts,
        bestKm: beatKm ? finalHud.distanceKm : prev.bestKm,
      };
      try {
        localStorage.setItem(STORAGE_BEST_KEY, JSON.stringify(updatedBest));
      } catch {
        // ignore
      }
      return updatedBest;
    });
  }, []);

  const handleHudUpdate = useCallback(
    (nextHud: HudState) => {
      setHud(nextHud);

      const curState = missionsStateRef.current;
      let changed = false;
      let newlyCompletedCount = 0;
      let newlyEarnedCoins = 0;
      let latestBanner: { id: MissionTypeId; title: string; pts: number; coins: number } | null =
        null;

      const updatedActive = curState.activeMissions.map((m) => {
        if (m.completed) return m;
        const def = MISSION_MAP[m.id];
        if (!def) return m;

        const base = runMissionBaselineRef.current[m.id] ?? 0;
        let rawProgress = m.progress;
        switch (m.id) {
          case 'thruster_burn':
            rawProgress = nextHud.thrusterActivations;
            break;
          case 'close_call':
            rawProgress = base + nextHud.nearMisses;
            break;
          case 'starman_speed':
            rawProgress = nextHud.zeroDamageDistM;
            break;
          case 'orbital_collector':
            rawProgress = base + nextHud.orbsCollected;
            break;
          case 'zero_damage_sprint':
            rawProgress = Math.floor(nextHud.zeroDamageTimeSec);
            break;
          case 'lane_weaver':
            rawProgress = nextHud.laneSwitches;
            break;
          case 'apex_score':
            rawProgress = nextHud.score;
            break;
          case 'rival_overtake':
            rawProgress = base + nextHud.boostOvertakes;
            break;
        }

        const clamped = Math.min(def.target, Math.max(m.progress, Math.floor(rawProgress)));
        const justFinished = clamped >= def.target;

        if (clamped !== m.progress || justFinished) {
          changed = true;
        }

        if (justFinished) {
          newlyCompletedCount += 1;
          newlyEarnedCoins += def.rewardCoins;
          pendingMissionBonusRef.current += def.rewardPts;
          latestBanner = {
            id: def.id,
            title: def.title,
            pts: def.rewardPts,
            coins: def.rewardCoins,
          };
          return { ...m, progress: def.target, completed: true, claimed: false };
        }

        return { ...m, progress: clamped };
      });

      if (changed) {
        const nextState: MissionsProgressState = {
          ...curState,
          activeMissions: updatedActive,
          missionsCompleted: curState.missionsCompleted + newlyCompletedCount,
          coins: curState.coins + newlyEarnedCoins,
        };
        missionsStateRef.current = nextState;
        setMissionsState(nextState);
        saveMissionsState(nextState);

        if (latestBanner) {
          soundEngine.playMissionComplete();
          const b = latestBanner as { id: MissionTypeId; title: string; pts: number; coins: number };
          showMissionBanner(b.id, b.title, b.pts, b.coins);
        }
      }
    },
    [showMissionBanner],
  );

  const handleGameOver = useCallback(
    (finalHud: HudState) => {
      setHud(finalHud);
      setMode('gameover');
      recordRunResults(finalHud);
    },
    [recordRunResults],
  );

  const handleStageComplete = useCallback(
    (finalHud: HudState) => {
      setHud(finalHud);
      setMode('stage_complete');
      recordRunResults(finalHud);

      const stageMeta = getStageMeta(finalHud.campaignStage);
      const curState = missionsStateRef.current;
      const completedSet = new Set<CampaignStageId>(curState.completedStages);
      completedSet.add(finalHud.campaignStage);
      const nextUnlock = Math.min(5, Math.max(curState.unlockedStage, finalHud.campaignStage + 1)) as CampaignStageId;

      const nextState: MissionsProgressState = {
        ...curState,
        coins: curState.coins + stageMeta.rewardCoins,
        unlockedStage: nextUnlock,
        completedStages: Array.from(completedSet),
      };
      missionsStateRef.current = nextState;
      setMissionsState(nextState);
      saveMissionsState(nextState);
    },
    [recordRunResults],
  );

  const handleClaimMission = useCallback((missionId: MissionTypeId) => {
    const curState = missionsStateRef.current;
    const remainingIds = curState.activeMissions
      .filter((m) => m.id !== missionId)
      .map((m) => m.id);
    const replacement = pickReplacementMission(remainingIds);
    const nextActive = curState.activeMissions.map((m) =>
      m.id === missionId ? replacement : m,
    );
    const nextState: MissionsProgressState = {
      ...curState,
      activeMissions: nextActive,
    };
    missionsStateRef.current = nextState;
    setMissionsState(nextState);
    saveMissionsState(nextState);
  }, []);

  const handleClearLeaderboard = useCallback(() => {
    const empty = clearLeaderboardStorage();
    leaderboardRef.current = empty;
    setLeaderboard(empty);
    setCurrentRunId(null);
    setScoreRank(null);
    setTimeRank(null);
  }, []);

  const handleToggleMute = useCallback(() => {
    soundEngine.unlock();
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleExitToStudio = useCallback(() => {
    setMode('title');
    setStudioOpen(false);
    setMissionBanner(null);
    setHud(INITIAL_HUD_STATE);
    const refreshed = replaceCompletedMissions(missionsStateRef.current);
    missionsStateRef.current = refreshed;
    setMissionsState(refreshed);
  }, []);

  // Global keyboard shortcuts (Enter to start/retry/advance, Esc to pause/resume/close)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Enter') {
        if (mode === 'title' && !missionsModalOpen && !campaignModalOpen) {
          e.preventDefault();
          startDrive('endless', 1);
        } else if (mode === 'gameover') {
          e.preventDefault();
          startDrive(playMode, campaignStage);
        } else if (mode === 'stage_complete') {
          e.preventDefault();
          const nextStage = (campaignStage < 5 ? campaignStage + 1 : 5) as CampaignStageId;
          startDrive('campaign', nextStage);
        }
      } else if (e.code === 'KeyV' && !e.repeat) {
        if (mode === 'playing' || mode === 'title') {
          e.preventDefault();
          handleCycleWeather();
        }
      } else if (e.code === 'Escape') {
        if (mode === 'playing') {
          e.preventDefault();
          setMode('paused');
        } else if (mode === 'paused') {
          e.preventDefault();
          setMode('playing');
        } else if (mode === 'title') {
          if (missionsModalOpen) {
            e.preventDefault();
            setMissionsModalOpen(false);
          } else if (campaignModalOpen) {
            e.preventDefault();
            setCampaignModalOpen(false);
          } else if (studioOpen) {
            e.preventDefault();
            setStudioOpen(false);
          }
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    mode,
    playMode,
    campaignStage,
    studioOpen,
    missionsModalOpen,
    campaignModalOpen,
    startDrive,
    handleCycleWeather,
  ]);

  // Unlock audio on first pointer interaction anywhere
  useEffect(() => {
    const unlockOnGesture = () => soundEngine.unlock();
    window.addEventListener('pointerdown', unlockOnGesture, { once: true });
    return () => window.removeEventListener('pointerdown', unlockOnGesture);
  }, []);

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-[#060911]">
      {/* Isolated 3D WebGL Viewport */}
      <GameCanvas
        mode={mode}
        playMode={playMode}
        campaignStage={campaignStage}
        carSpec={carSpec}
        weather={weather}
        studioOpen={studioOpen}
        studioTab={studioTab}
        runNonce={runNonce}
        touchRef={touchRef}
        pendingMissionBonusRef={pendingMissionBonusRef}
        onHudUpdate={handleHudUpdate}
        onGameOver={handleGameOver}
        onStageComplete={handleStageComplete}
        onContextLostChange={setContextLost}
      />

      {contextLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060911]/95 px-6 text-center">
          <div className="max-w-sm rounded-2xl border border-white/15 bg-[#0b101b] p-6">
            <h2 className="font-display text-lg font-bold text-white">
              Graphics Context Interrupted
            </h2>
            <p className="mt-2 text-xs text-slate-300">
              WebGL rendering paused by browser. Reload or switch back to resume your drive.
            </p>
          </div>
        </div>
      )}

      {/* Corner Creator Signature Mark */}
      <div className="fixed top-[68px] right-4 sm:right-6 z-20 pointer-events-none select-none hidden sm:block">
        <span className="font-mono-tech text-[11px] tracking-wider text-slate-300/80">
          made by <span className="text-amber-400 font-semibold">Qasim</span>
        </span>
      </div>

      {/* Title Showroom + Studio Configurator + Missions/Campaign Modals */}
      {mode === 'title' && (
        <>
          <TitleOverlay
            bestRecord={bestRecord}
            carSpec={carSpec}
            weather={weather}
            studioOpen={studioOpen}
            muted={muted}
            missionsState={missionsState}
            onStartEndless={() => startDrive('endless', 1)}
            onOpenCampaign={() => {
              setStudioOpen(false);
              setMissionsModalOpen(false);
              setCampaignModalOpen(true);
            }}
            onOpenMissions={() => {
              setStudioOpen(false);
              setCampaignModalOpen(false);
              setMissionsModalOpen(true);
            }}
            onToggleStudio={() => {
              setMissionsModalOpen(false);
              setCampaignModalOpen(false);
              setStudioOpen((v) => !v);
            }}
            onToggleMute={handleToggleMute}
            onChangeWeather={setWeather}
          />
          <StudioConfigurator
            carSpec={carSpec}
            studioOpen={studioOpen}
            studioTab={studioTab}
            customSwatches={customSwatches}
            onChangeSpec={handleSpecChange}
            onToggleStudio={() => setStudioOpen((v) => !v)}
            onChangeTab={setStudioTab}
            onAddCustomSwatch={handleAddSwatch}
            onResetSpec={handleResetSpec}
          />
          {missionsModalOpen && (
            <MissionsModal
              missionsState={missionsState}
              onClaimMission={handleClaimMission}
              onClose={() => setMissionsModalOpen(false)}
            />
          )}
          {campaignModalOpen && (
            <CampaignModal
              missionsState={missionsState}
              selectedStage={campaignStage}
              onSelectAndLaunch={(stageId) => startDrive('campaign', stageId)}
              onClose={() => setCampaignModalOpen(false)}
            />
          )}
        </>
      )}

      {/* Active Gameplay HUD */}
      {(mode === 'playing' || mode === 'paused') && (
        <GameplayHud
          hud={hud}
          weather={weather}
          muted={muted}
          activeMissions={missionsState.activeMissions}
          missionBanner={missionBanner}
          touchRef={touchRef}
          onToggleMute={handleToggleMute}
          onCycleWeather={handleCycleWeather}
          onPause={() => setMode((m) => (m === 'playing' ? 'paused' : 'playing'))}
        />
      )}

      {/* Pause Modal */}
      {mode === 'paused' && (
        <PauseModal
          hud={hud}
          onResume={() => setMode('playing')}
          onRestart={() => startDrive(playMode, campaignStage)}
          onExitToStudio={handleExitToStudio}
        />
      )}

      {/* Stage Complete / Mars Colony Arrival Modal */}
      {mode === 'stage_complete' && (
        <StageCompleteModal
          hud={hud}
          onNextStage={
            hud.campaignStage < 5
              ? () => startDrive('campaign', (hud.campaignStage + 1) as CampaignStageId)
              : undefined
          }
          onReplay={() => startDrive('campaign', hud.campaignStage)}
          onOpenCampaign={() => {
            handleExitToStudio();
            setCampaignModalOpen(true);
          }}
          onExitToStudio={handleExitToStudio}
        />
      )}

      {/* Game Over Modal */}
      {mode === 'gameover' && (
        <GameOverModal
          hud={hud}
          isNewRecord={isNewRecord}
          leaderboard={leaderboard}
          currentRunId={currentRunId}
          scoreRank={scoreRank}
          timeRank={timeRank}
          onClearLeaderboard={handleClearLeaderboard}
          onRetry={() => startDrive(playMode, campaignStage)}
          onExitToStudio={handleExitToStudio}
        />
      )}
    </div>
  );
}
