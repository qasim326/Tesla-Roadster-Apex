import React from 'react';
import { CheckCircle2, Flame, Lock, Play, Star, X } from 'lucide-react';
import { CAMPAIGN_STAGES } from '../data/missionsAndCampaign';
import { CampaignStageId, MissionsProgressState } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

interface CampaignModalProps {
  missionsState: MissionsProgressState;
  selectedStage: CampaignStageId;
  onSelectAndLaunch: (stageId: CampaignStageId) => void;
  onClose: () => void;
}

export const CampaignModal: React.FC<CampaignModalProps> = ({
  missionsState,
  selectedStage,
  onSelectAndLaunch,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 px-4 py-4"
      role="dialog"
      aria-label="Campaign Mode"
    >
      <div className="w-full max-w-2xl max-h-[92dvh] flex flex-col rounded-2xl bg-[#0b101b] border border-white/15 p-5 sm:p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-cyan-400" />
              <span className="font-mono-tech text-[11px] uppercase tracking-wider text-cyan-400 font-semibold">
                5-Stage Planetary Expedition
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold text-white tracking-wide mt-0.5">
              CAMPAIGN MODE
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
            }}
            aria-label="Close campaign selector"
            className="w-9 h-9 rounded-lg bg-[#141b2b] border border-white/15 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5 overflow-y-auto pr-0.5">
          {CAMPAIGN_STAGES.map((stage) => {
            const unlocked = stage.id <= missionsState.unlockedStage;
            const completed = missionsState.completedStages.includes(stage.id);
            const isSelected = selectedStage === stage.id;
            const isMars = stage.theme === 'mars';

            return (
              <div
                key={stage.id}
                className={`rounded-xl border p-3.5 sm:p-4 transition-colors ${
                  !unlocked
                    ? 'bg-[#0b0f19] border-white/8 opacity-60'
                    : isMars
                      ? 'bg-gradient-to-r from-[#27110d] to-[#111827] border-orange-500/45'
                      : isSelected
                        ? 'bg-[#121c2e] border-cyan-400/50'
                        : 'bg-[#101726] border-white/12 hover:border-white/25'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-mono-tech text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          isMars
                            ? 'bg-orange-500/20 text-orange-300 border border-orange-400/40'
                            : 'bg-cyan-500/15 text-cyan-300'
                        }`}
                      >
                        STAGE {stage.id}
                      </span>
                      <h3 className="font-display text-base font-bold text-white tracking-wide">
                        {stage.name}
                      </h3>
                      {completed && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono-tech text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          CLEARED
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-slate-300">{stage.objectiveLabel}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-mono-tech">
                      <span className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < stage.difficulty
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </span>
                      <span className="text-slate-400">{stage.subtitle}</span>
                      <span className="text-amber-300 font-semibold">
                        +{stage.rewardPts} PTS · +{stage.rewardCoins} CR
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!unlocked}
                    onClick={() => {
                      soundEngine.playUiClick();
                      onSelectAndLaunch(stage.id);
                    }}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-display text-xs font-bold tracking-wider transition-colors shrink-0 ${
                      !unlocked
                        ? 'bg-slate-800/70 text-slate-500 cursor-not-allowed'
                        : isMars
                          ? 'bg-orange-500 hover:bg-orange-400 text-slate-950 cursor-pointer'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                    }`}
                  >
                    {unlocked ? (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{completed ? 'REPLAY' : 'LAUNCH'}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>LOCKED</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
