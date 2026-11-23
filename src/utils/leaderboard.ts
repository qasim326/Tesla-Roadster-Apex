import { LeaderboardData, LeaderboardEntry } from '../types/game';

const STORAGE_LEADERBOARD_KEY = 'roadster_apex_leaderboard_v1';
const MAX_ENTRIES = 10;

function isValidEntry(item: unknown): item is LeaderboardEntry {
  if (!item || typeof item !== 'object') return false;
  const e = item as Partial<LeaderboardEntry>;
  return (
    typeof e.id === 'string' &&
    typeof e.score === 'number' &&
    typeof e.distanceKm === 'number' &&
    typeof e.elapsedSeconds === 'number' &&
    (e.sprint1KmSec === null || typeof e.sprint1KmSec === 'number') &&
    typeof e.topSpeedKmh === 'number' &&
    typeof e.carModel === 'string' &&
    typeof e.weather === 'string' &&
    typeof e.createdAt === 'number'
  );
}

export function loadLeaderboard(): LeaderboardData {
  try {
    const raw = localStorage.getItem(STORAGE_LEADERBOARD_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LeaderboardData>;
      const topScores = Array.isArray(parsed.topScores)
        ? parsed.topScores.filter(isValidEntry).slice(0, MAX_ENTRIES)
        : [];
      const fastestTimes = Array.isArray(parsed.fastestTimes)
        ? parsed.fastestTimes
            .filter((e): e is LeaderboardEntry => isValidEntry(e) && e.sprint1KmSec !== null)
            .slice(0, MAX_ENTRIES)
        : [];
      return { topScores, fastestTimes };
    }
  } catch {
    // ignore storage errors
  }
  return { topScores: [], fastestTimes: [] };
}

export function saveLeaderboard(data: LeaderboardData): void {
  try {
    localStorage.setItem(STORAGE_LEADERBOARD_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

export function recordLeaderboardRun(
  current: LeaderboardData,
  entry: LeaderboardEntry,
): {
  updated: LeaderboardData;
  scoreRank: number | null;
  timeRank: number | null;
} {
  const nextTopScores = [...current.topScores, entry]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.distanceKm !== a.distanceKm) return b.distanceKm - a.distanceKm;
      return b.topSpeedKmh - a.topSpeedKmh;
    })
    .slice(0, MAX_ENTRIES);

  const scoreIdx = nextTopScores.findIndex((e) => e.id === entry.id);
  const scoreRank = scoreIdx >= 0 ? scoreIdx + 1 : null;

  let nextFastestTimes = current.fastestTimes;
  let timeRank: number | null = null;

  if (entry.sprint1KmSec !== null) {
    nextFastestTimes = [...current.fastestTimes, entry]
      .filter((e) => e.sprint1KmSec !== null)
      .sort((a, b) => {
        const at = a.sprint1KmSec ?? Number.MAX_SAFE_INTEGER;
        const bt = b.sprint1KmSec ?? Number.MAX_SAFE_INTEGER;
        if (at !== bt) return at - bt;
        if (b.topSpeedKmh !== a.topSpeedKmh) return b.topSpeedKmh - a.topSpeedKmh;
        return b.score - a.score;
      })
      .slice(0, MAX_ENTRIES);

    const timeIdx = nextFastestTimes.findIndex((e) => e.id === entry.id);
    timeRank = timeIdx >= 0 ? timeIdx + 1 : null;
  }

  const updated: LeaderboardData = {
    topScores: nextTopScores,
    fastestTimes: nextFastestTimes,
  };
  saveLeaderboard(updated);

  return { updated, scoreRank, timeRank };
}

export function clearLeaderboardStorage(): LeaderboardData {
  const empty: LeaderboardData = { topScores: [], fastestTimes: [] };
  saveLeaderboard(empty);
  return empty;
}

export function formatRunTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const rem = (seconds % 60).toFixed(1).padStart(4, '0');
  return `${mins}:${rem}`;
}
