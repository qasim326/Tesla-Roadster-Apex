import React, { useState } from 'react';
import {
  Flag,
  Home,
  Play,
  Rocket,
  RotateCcw,
  Sparkles,
  Timer,
  Trash2,
  Trophy,
} from 'lucide-react';
import { getStageMeta } from '../data/missionsAndCampaign';
import {
  CAR_MODEL_META,
  HudState,
  LeaderboardData,
  WEATHER_CONFIGS,
} from '../types/game';
import { formatRunTime } from '../utils/leaderboard';
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
  leaderboard: LeaderboardData;
  currentRunId: string | null;
  scoreRank: number | null;
  timeRank: number | null;
  onClearLeaderboard: () => void;
  onRetry: () => void;
  onExitToStudio: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  hud,
  isNewRecord,
  leaderboard,
  currentRunId,
  scoreRank,
  timeRank,
  onClearLeaderboard,
  onRetry,
  onExitToStudio,
}) => {
  const [boardTab, setBoardTab] = useState<'scores' | 'times'>(
    timeRank === 1 && scoreRank !== 1 ? 'times' : 'scores',
  );
  const [confirmClear, setConfirmClear] = useState(false);

  const headline =
    hud.gameOverReason === 'time_expired'
      ? 'TIME EXPIRED'
      : hud.gameOverReason === 'lava_fall'
        ? 'LAVA BREACH'
        : hud.gameOverReason === 'viaduct_fall'
          ? 'VIADUCT BREACH'
          : 'CHASSIS WRECKED';
  const subtitle =
    hud.gameOverReason === 'time_expired'
      ? 'Stage clock hit zero before reaching 1,000m. Hold W and fire Shift Surge Boost to maintain peak pace.'
      : hud.gameOverReason === 'lava_fall'
        ? 'Steer onto the intact highway lane or fire SpaceX cold-gas thrusters over collapsed lava sections.'
        : hud.gameOverReason === 'viaduct_fall'
          ? 'Ignite SpaceX cold-gas thrusters mid-air to clear open viaduct spans.'
          : 'Use hydraulic suspension jumps or ramps to vault barriers and weave through traffic.';

  const campaignMeta =
    hud.playMode === 'campaign' ? getStageMeta(hud.campaignStage) : null;

  const rows = boardTab === 'scores' ? leaderboard.topScores : leaderboard.fastestTimes;
  const hasAnyEntries =
    leaderboard.topScores.length > 0 || leaderboard.fastestTimes.length > 0;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 px-4 py-4"
      role="dialog"
      aria-label="Run Complete"
    >
      <div className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0b101b] border border-white/15 p-5 sm:p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3.5 shrink-0">
          <div>
            <span
              className={`font-mono-tech text-[11px] uppercase tracking-wider font-semibold ${
                isNewRecord || timeRank === 1 ? 'text-cyan-400' : 'text-red-400'
              }`}
            >
              {campaignMeta
                ? `STAGE ${campaignMeta.id}: ${campaignMeta.name}`
                : isNewRecord
                  ? 'NEW HIGH SCORE RECORD'
                  : timeRank === 1
                    ? 'NEW FASTEST 1 KM RECORD'
                    : 'RUN TERMINATED'}
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-wide mt-0.5">
              {headline}
            </h2>
          </div>

          {(scoreRank !== null || timeRank !== null) && (
            <div className="flex flex-col items-end gap-1 pt-1">
              {scoreRank !== null && (
                <span className="font-mono-tech text-[11px] font-semibold text-amber-400">
                  SCORE #{scoreRank}
                </span>
              )}
              {timeRank !== null && (
                <span className="font-mono-tech text-[11px] font-semibold text-cyan-400">
                  1 KM #{timeRank}
                </span>
              )}
            </div>
          )}
        </div>

        <p className="mt-2.5 text-xs leading-relaxed text-slate-300 shrink-0">{subtitle}</p>

        {/* Current Run Telemetry */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4 shrink-0">
          <div className="rounded-xl bg-[#111827] border border-white/10 px-3.5 py-2.5">
            <div className="text-[11px] text-slate-400">Score</div>
            <div className="font-display text-lg font-bold text-white tabular-nums mt-0.5">
              {hud.score.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl bg-[#111827] border border-white/10 px-3.5 py-2.5">
            <div className="text-[11px] text-slate-400">Distance</div>
            <div className="font-mono-tech text-lg font-bold text-cyan-400 tabular-nums mt-0.5">
              {hud.distanceKm.toFixed(2)} <span className="text-[11px]">KM</span>
            </div>
          </div>
          <div className="rounded-xl bg-[#111827] border border-white/10 px-3.5 py-2.5">
            <div className="text-[11px] text-slate-400">
              {hud.sprint1KmSec !== null ? '1 KM Split' : 'Run Time'}
            </div>
            <div className="font-mono-tech text-lg font-bold text-emerald-400 tabular-nums mt-0.5">
              {hud.sprint1KmSec !== null
                ? formatRunTime(hud.sprint1KmSec)
                : formatRunTime(hud.elapsedSeconds)}
            </div>
          </div>
          <div className="rounded-xl bg-[#111827] border border-white/10 px-3.5 py-2.5">
            <div className="text-[11px] text-slate-400">Peak Speed</div>
            <div className="font-mono-tech text-lg font-bold text-amber-400 tabular-nums mt-0.5">
              {hud.topSpeedKmh} <span className="text-[11px]">KM/H</span>
            </div>
          </div>
        </div>

        {/* Local Top 10 Leaderboard */}
        <div className="flex flex-col min-h-0 rounded-xl bg-[#0f1523] border border-white/10 mb-4 overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-white/10 bg-[#131b2c] shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setBoardTab('scores');
                  setConfirmClear(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  boardTab === 'scores'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Top 10 Scores</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setBoardTab('times');
                  setConfirmClear(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  boardTab === 'times'
                    ? 'bg-cyan-400 text-slate-950'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                <span>Fastest 1 KM</span>
              </button>
            </div>

            {hasAnyEntries && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  if (!confirmClear) {
                    setConfirmClear(true);
                  } else {
                    onClearLeaderboard();
                    setConfirmClear(false);
                  }
                }}
                onBlur={() => setConfirmClear(false)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  confirmClear
                    ? 'bg-red-500/20 text-red-300 border border-red-400/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Clear local leaderboard records"
              >
                <Trash2 className="w-3 h-3" />
                <span>{confirmClear ? 'Confirm Clear' : 'Clear'}</span>
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-[210px] divide-y divide-white/5">
            {rows.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-slate-400">
                {boardTab === 'scores'
                  ? 'No scores recorded yet.'
                  : 'Cross 1.00 KM in a single run to record an official 1 KM sprint time.'}
              </div>
            ) : (
              rows.map((entry, idx) => {
                const isCurrent = entry.id === currentRunId;
                const rank = idx + 1;
                const rankColor =
                  rank === 1
                    ? 'text-amber-400'
                    : rank === 2
                      ? 'text-cyan-300'
                      : rank === 3
                        ? 'text-slate-200'
                        : 'text-slate-500';
                const modelLabel = CAR_MODEL_META[entry.carModel]?.name ?? 'Apex Roadster';
                const weatherLabel = WEATHER_CONFIGS[entry.weather]?.shortLabel ?? 'Clear';

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between gap-3 px-3.5 py-2 text-xs ${
                      isCurrent ? 'bg-cyan-500/12 border-l-2 border-l-cyan-400' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`font-mono-tech font-bold w-6 shrink-0 tabular-nums ${rankColor}`}>
                        #{rank}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-100 truncate">
                            {modelLabel}
                          </span>
                          {isCurrent && (
                            <span className="font-mono-tech text-[10px] font-bold uppercase text-cyan-300 shrink-0">
                              THIS RUN
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono-tech">
                          {weatherLabel} · {entry.topSpeedKmh} km/h
                        </div>
                      </div>
                    </div>

                    {boardTab === 'scores' ? (
                      <div className="text-right shrink-0">
                        <div className="font-display font-bold text-white tabular-nums">
                          {entry.score.toLocaleString()}{' '}
                          <span className="text-[10px] font-normal text-slate-400">PTS</span>
                        </div>
                        <div className="font-mono-tech text-[11px] text-cyan-400 tabular-nums">
                          {entry.distanceKm.toFixed(2)} km · {formatRunTime(entry.elapsedSeconds)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-right shrink-0">
                        <div className="font-mono-tech font-bold text-cyan-300 tabular-nums text-sm">
                          {entry.sprint1KmSec !== null
                            ? formatRunTime(entry.sprint1KmSec)
                            : '--'}
                        </div>
                        <div className="font-mono-tech text-[11px] text-slate-400 tabular-nums">
                          {entry.score.toLocaleString()} pts · {entry.distanceKm.toFixed(2)} km
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {boardTab === 'times' && hud.sprint1KmSec === null && rows.length > 0 && (
            <div className="px-3.5 py-2 border-t border-white/10 bg-[#0b101b]/80 text-[11px] text-slate-400 shrink-0">
              Current run ended at {hud.distanceKm.toFixed(2)} KM — reach 1.00 KM to qualify for Fastest 1 KM.
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onRetry();
            }}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display text-sm font-bold tracking-wider transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{campaignMeta ? `RETRY STAGE ${campaignMeta.id}` : 'RETRY DRIVE'}</span>
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

interface StageCompleteModalProps {
  hud: HudState;
  onNextStage?: () => void;
  onReplay: () => void;
  onOpenCampaign: () => void;
  onExitToStudio: () => void;
}

export const StageCompleteModal: React.FC<StageCompleteModalProps> = ({
  hud,
  onNextStage,
  onReplay,
  onOpenCampaign,
  onExitToStudio,
}) => {
  const stageMeta = getStageMeta(hud.campaignStage);
  const isMarsVictory = hud.campaignStage === 5;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 px-4 py-4"
      role="dialog"
      aria-label={isMarsVictory ? 'Mars Colony Arrival Complete' : 'Stage Complete'}
    >
      <div
        className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${
          isMarsVictory
            ? 'bg-gradient-to-b from-[#23100b] to-[#0b101b] border-orange-400/50'
            : 'bg-[#0b101b] border-cyan-400/40'
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              {isMarsVictory ? (
                <Rocket className="w-4 h-4 text-orange-400" />
              ) : (
                <Sparkles className="w-4 h-4 text-emerald-400" />
              )}
              <span
                className={`font-mono-tech text-[11px] uppercase tracking-wider font-bold ${
                  isMarsVictory ? 'text-orange-400' : 'text-emerald-400'
                }`}
              >
                {isMarsVictory
                  ? 'FINAL FINISH LINE CROSSED · CAMPAIGN COMPLETE'
                  : `STAGE ${stageMeta.id} CLEARED`}
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-wide mt-1">
              {isMarsVictory ? 'MARS COLONY ARRIVAL' : stageMeta.name.toUpperCase()}
            </h2>
          </div>

          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${
              isMarsVictory
                ? 'bg-orange-500/20 border-orange-400/50 text-orange-300'
                : 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
            }`}
          >
            <Trophy className="w-5 h-5" />
          </div>
        </div>

        <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-200">
          {isMarsVictory
            ? 'Touchdown in Ares Red Sector! You cleared all speed gates, orbital debris, and crossed the Martian finish arch.'
            : `Objective complete: ${stageMeta.objectiveLabel}.`}
        </p>

        {/* Stage Reward Banner */}
        <div
          className={`mt-4 rounded-xl border px-4 py-3 flex items-center justify-between ${
            isMarsVictory
              ? 'bg-orange-950/35 border-orange-400/35'
              : 'bg-emerald-950/25 border-emerald-400/30'
          }`}
        >
          <span className="font-mono-tech text-xs uppercase tracking-wider text-slate-300">
            Expedition Reward
          </span>
          <span className="font-mono-tech text-sm font-bold text-amber-300">
            +{stageMeta.rewardPts.toLocaleString()} PTS · +{stageMeta.rewardCoins} CR
          </span>
        </div>

        {/* Run Telemetry */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
          <div className="rounded-xl bg-[#111827] border border-white/10 px-3 py-2.5">
            <div className="text-[10px] text-slate-400">Total Score</div>
            <div className="font-display text-base font-bold text-white tabular-nums mt-0.5">
              {hud.score.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl bg-[#111827] border border-white/10 px-3 py-2.5">
            <div className="text-[10px] text-slate-400">Distance</div>
            <div className="font-mono-tech text-base font-bold text-cyan-400 tabular-nums mt-0.5">
              {hud.distanceKm.toFixed(2)} km
            </div>
          </div>
          <div className="rounded-xl bg-[#111827] border border-white/10 px-3 py-2.5">
            <div className="text-[10px] text-slate-400">Run Time</div>
            <div className="font-mono-tech text-base font-bold text-emerald-400 tabular-nums mt-0.5">
              {formatRunTime(hud.elapsedSeconds)}
            </div>
          </div>
          <div className="rounded-xl bg-[#111827] border border-white/10 px-3 py-2.5">
            <div className="text-[10px] text-slate-400">Peak Speed</div>
            <div className="font-mono-tech text-base font-bold text-amber-400 tabular-nums mt-0.5">
              {hud.topSpeedKmh}
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {!isMarsVictory && onNextStage ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onNextStage();
              }}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display text-sm font-bold tracking-wider transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>LAUNCH STAGE {hud.campaignStage + 1}</span>
              <span className="font-mono-tech text-xs opacity-75">[ENTER]</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onReplay();
              }}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-orange-500 hover:bg-orange-400 text-slate-950 font-display text-sm font-bold tracking-wider transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>REPLAY MARS FINALE</span>
              <span className="font-mono-tech text-xs opacity-75">[ENTER]</span>
            </button>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onReplay();
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#141b2b] border border-white/12 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Replay</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onOpenCampaign();
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#141b2b] border border-white/12 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5 text-cyan-400" />
              <span>Stages</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onExitToStudio();
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#141b2b] border border-white/12 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
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
