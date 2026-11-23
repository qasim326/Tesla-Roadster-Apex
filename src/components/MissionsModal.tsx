import React from 'react';
import { Award, CheckCircle2, Coins, Rocket, Sparkles, X } from 'lucide-react';
import { MISSION_MAP, getPilotRank } from '../data/missionsAndCampaign';
import { MissionsProgressState, MissionTypeId } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

interface MissionsModalProps {
  missionsState: MissionsProgressState;
  onClaimMission: (missionId: MissionTypeId) => void;
  onClose: () => void;
}

export const MissionsModal: React.FC<MissionsModalProps> = ({
  missionsState,
  onClaimMission,
  onClose,
}) => {
  const rank = getPilotRank(missionsState.missionsCompleted);
  const rankProgressPct =
    rank.nextMin !== null
      ? Math.min(
          100,
          Math.round(
            ((missionsState.missionsCompleted - rank.currentMin) /
              (rank.nextMin - rank.currentMin)) *
              100,
          ),
        )
      : 100;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 px-4 py-4"
      role="dialog"
      aria-label="SpaceX Missions"
    >
      <div className="w-full max-w-xl max-h-[92dvh] flex flex-col rounded-2xl bg-[#0b101b] border border-white/15 p-5 sm:p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-amber-400" />
              <span className="font-mono-tech text-[11px] uppercase tracking-wider text-amber-400 font-semibold">
                SpaceX Flight Operations
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold text-white tracking-wide mt-0.5">
              ACTIVE MISSIONS
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
            }}
            aria-label="Close missions"
            className="w-9 h-9 rounded-lg bg-[#141b2b] border border-white/15 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pilot Rank & Orbital Credits Card */}
        <div className="my-4 rounded-xl bg-[#111827] border border-white/10 p-4 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="font-mono-tech text-[10px] uppercase tracking-wider text-slate-400">
                  Pilot Rank · Level {rank.level}
                </div>
                <div className="font-display text-lg font-bold text-white tracking-wide">
                  {rank.title}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[10px] font-mono-tech uppercase text-slate-400">
                  Completed
                </div>
                <div className="font-mono-tech text-base font-bold text-cyan-400 tabular-nums">
                  {missionsState.missionsCompleted}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono-tech uppercase text-slate-400">
                  Credits
                </div>
                <div className="flex items-center gap-1 font-mono-tech text-base font-bold text-amber-400 tabular-nums">
                  <Coins className="w-3.5 h-3.5" />
                  <span>{missionsState.coins.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] font-mono-tech text-slate-400 mb-1">
              <span>
                {rank.nextTitle
                  ? `Next Rank: ${rank.nextTitle}`
                  : 'Maximum Rank Achieved'}
              </span>
              <span className="tabular-nums">
                {rank.nextMin !== null
                  ? `${missionsState.missionsCompleted} / ${rank.nextMin} missions`
                  : 'APEX'}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-cyan-400 transition-[width] duration-300"
                style={{ width: `${rankProgressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3 Active Missions */}
        <div className="space-y-3 overflow-y-auto pr-0.5">
          {missionsState.activeMissions.map((m) => {
            const def = MISSION_MAP[m.id];
            if (!def) return null;
            const clampedProgress = Math.min(def.target, Math.floor(m.progress));
            const pct = Math.min(100, Math.round((clampedProgress / def.target) * 100));

            return (
              <div
                key={m.id}
                className={`rounded-xl border p-4 transition-colors ${
                  m.completed
                    ? 'bg-emerald-950/25 border-emerald-400/45'
                    : 'bg-[#101726] border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-sm sm:text-base font-bold text-white tracking-wide">
                        {def.title}
                      </h3>
                      {def.perRun && (
                        <span className="font-mono-tech text-[10px] uppercase tracking-wider text-slate-400 border border-white/10 rounded px-1.5 py-0.5">
                          Single Run
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-300">{def.description}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono-tech text-xs font-bold text-amber-400">
                      +{def.rewardPts} PTS
                    </div>
                    <div className="font-mono-tech text-[11px] text-cyan-300">
                      +{def.rewardCoins} CR
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-[11px] font-mono-tech mb-1">
                      <span className={m.completed ? 'text-emerald-300 font-semibold' : 'text-slate-400'}>
                        {m.completed ? 'OBJECTIVE COMPLETE' : 'PROGRESS'}
                      </span>
                      <span className="text-white font-semibold tabular-nums">
                        {clampedProgress.toLocaleString()} / {def.target.toLocaleString()} {def.unit}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-[width] duration-300 ${
                          m.completed ? 'bg-emerald-400' : 'bg-cyan-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {m.completed && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playMissionComplete();
                        onClaimMission(m.id);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-display text-xs font-bold tracking-wider transition-colors shrink-0 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>CLAIM</span>
                    </button>
                  )}

                  {!m.completed && (
                    <CheckCircle2 className="w-4 h-4 text-slate-600 shrink-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-[11px] text-slate-400 text-center shrink-0">
          Missions progress automatically during Endless and Campaign drives.
        </p>
      </div>
    </div>
  );
};
