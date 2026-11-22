/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { GameCanvas, TouchControlsState } from './components/GameCanvas';
import { GameplayHud } from './components/GameplayHud';
import { GameOverModal, PauseModal } from './components/RunModals';
import { StudioConfigurator } from './components/StudioConfigurator';
import { TitleOverlay } from './components/TitleOverlay';
import {
  BestRecord,
  CarSpec,
  DEFAULT_CAR_SPEC,
  GameMode,
  HudState,
  INITIAL_HUD_STATE,
  StudioTab,
  WeatherCondition,
} from './types/game';

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
  const [carSpec, setCarSpec] = useState<CarSpec>(loadCarSpec);
  const [weather, setWeather] = useState<WeatherCondition>('clear');
  const [customSwatches, setCustomSwatches] = useState<string[]>(loadCustomSwatches);
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioTab, setStudioTab] = useState<StudioTab>('model');
  const [muted, setMuted] = useState(false);
  const [runNonce, setRunNonce] = useState(0);
  const [hud, setHud] = useState<HudState>(INITIAL_HUD_STATE);
  const [bestRecord, setBestRecord] = useState<BestRecord>(loadBestRecord);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [contextLost, setContextLost] = useState(false);

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

  const startDrive = useCallback(() => {
    soundEngine.unlock();
    setStudioOpen(false);
    setIsNewRecord(false);
    setHud({ ...INITIAL_HUD_STATE, speedKmh: 280, weather });
    setRunNonce((n) => n + 1);
    setMode('playing');
  }, [weather]);

  const handleGameOver = useCallback(
    (finalHud: HudState) => {
      setHud(finalHud);
      setMode('gameover');
      setBestRecord((prev) => {
        const beatPts = finalHud.score > prev.bestPts;
        const beatKm = finalHud.distanceKm > prev.bestKm;
        if (beatPts) setIsNewRecord(true);
        const updated: BestRecord = {
          bestPts: beatPts ? finalHud.score : prev.bestPts,
          bestKm: beatKm ? finalHud.distanceKm : prev.bestKm,
        };
        try {
          localStorage.setItem(STORAGE_BEST_KEY, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    },
    [],
  );

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
    setHud(INITIAL_HUD_STATE);
  }, []);

  // Global keyboard shortcuts (Enter to start/retry, Esc to pause/resume)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Enter') {
        if (mode === 'title' || mode === 'gameover') {
          e.preventDefault();
          startDrive();
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
        } else if (mode === 'title' && studioOpen) {
          e.preventDefault();
          setStudioOpen(false);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, studioOpen, startDrive, handleCycleWeather]);

  // Unlock audio on first pointer interaction anywhere
  useEffect(() => {
    const unlockOnGesture = () => soundEngine.unlock();
    window.addEventListener('pointerdown', unlockOnGesture, { once: true });
    return () => window.removeEventListener('pointerdown', unlockOnGesture);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#060911]">
      {/* Isolated 3D WebGL Viewport */}
      <GameCanvas
        mode={mode}
        carSpec={carSpec}
        weather={weather}
        studioOpen={studioOpen}
        studioTab={studioTab}
        runNonce={runNonce}
        touchRef={touchRef}
        onHudUpdate={setHud}
        onGameOver={handleGameOver}
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
      <div className="fixed top-[72px] right-6 sm:right-8 z-20 pointer-events-none select-none">
        <span className="font-mono-tech text-[11px] tracking-wider text-slate-300/80">
          made by <span className="text-amber-400 font-semibold">Qasim</span>
        </span>
      </div>

      {/* Title Showroom + Studio Configurator */}
      {mode === 'title' && (
        <>
          <TitleOverlay
            bestRecord={bestRecord}
            carSpec={carSpec}
            weather={weather}
            studioOpen={studioOpen}
            muted={muted}
            onStartDrive={startDrive}
            onToggleStudio={() => setStudioOpen((v) => !v)}
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
        </>
      )}

      {/* Active Gameplay HUD */}
      {(mode === 'playing' || mode === 'paused') && (
        <GameplayHud
          hud={hud}
          weather={weather}
          muted={muted}
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
          onRestart={startDrive}
          onExitToStudio={handleExitToStudio}
        />
      )}

      {/* Game Over Modal */}
      {mode === 'gameover' && (
        <GameOverModal
          hud={hud}
          isNewRecord={isNewRecord}
          onRetry={startDrive}
          onExitToStudio={handleExitToStudio}
        />
      )}
    </div>
  );
}
