"use strict";

const PROGRESS_STORAGE_KEY = "shinobi-sudoku-progress";
const puzzlesSolvedDisplay = document.querySelector("#puzzles-solved");
const bestTimeDisplay = document.querySelector("#best-time");
const currentStreakDisplay = document.querySelector("#current-streak");
const storageNote = document.querySelector("#storage-note");
const levelHistoryNote = document.querySelector("#level-history-note");
const difficultyNames = ["easy", "medium", "hard"];

function createEmptyLevels() {
  return {
    easy: { puzzlesSolved: 0, bestTimeSeconds: null },
    medium: { puzzlesSolved: 0, bestTimeSeconds: null },
    hard: { puzzlesSolved: 0, bestTimeSeconds: null },
  };
}

function readProgress() {
  const savedProgress = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
  if (!savedProgress) {
    return {
      completedDates: [],
      puzzlesSolved: 0,
      bestTimeSeconds: null,
      levels: createEmptyLevels(),
      hasUncategorizedHistory: false,
    };
  }

  const progress = JSON.parse(savedProgress);
  if (
    !progress ||
    !Array.isArray(progress.completedDates) ||
    (progress.puzzlesSolved !== undefined &&
      (!Number.isSafeInteger(progress.puzzlesSolved) || progress.puzzlesSolved < 0)) ||
    (progress.bestTimeSeconds !== undefined &&
      progress.bestTimeSeconds !== null &&
      (!Number.isInteger(progress.bestTimeSeconds) || progress.bestTimeSeconds < 0)) ||
    (progress.levels !== undefined &&
      (!progress.levels || typeof progress.levels !== "object" || Array.isArray(progress.levels)))
  ) {
    throw new Error("Saved progress has an unexpected format.");
  }

  const puzzlesSolved = Number.isSafeInteger(progress.puzzlesSolved)
    ? progress.puzzlesSolved
    : progress.completedDates.length;
  const hasLevelHistory = progress.levels !== undefined;
  const levels = { ...createEmptyLevels(), ...(progress.levels ?? {}) };

  if (!progress.levels && puzzlesSolved > 0) {
    levelHistoryNote.hidden = false;
  }

  for (const difficulty of difficultyNames) {
    const level = levels[difficulty];
    if (
      !level ||
      typeof level !== "object" ||
      (level.puzzlesSolved !== undefined &&
        (!Number.isSafeInteger(level.puzzlesSolved) || level.puzzlesSolved < 0)) ||
      (level.bestTimeSeconds !== undefined &&
        level.bestTimeSeconds !== null &&
        (!Number.isInteger(level.bestTimeSeconds) || level.bestTimeSeconds < 0))
    ) {
      throw new Error(`Saved ${difficulty} statistics have an unexpected format.`);
    }
    levels[difficulty] = {
      puzzlesSolved: level.puzzlesSolved ?? 0,
      bestTimeSeconds: level.bestTimeSeconds ?? null,
    };
  }

  return {
    completedDates: progress.completedDates.filter(
      (date) => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date),
    ),
    puzzlesSolved,
    bestTimeSeconds: progress.bestTimeSeconds ?? null,
    levels,
    hasUncategorizedHistory: !hasLevelHistory && puzzlesSolved > 0,
  };
}

function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentStreak(completedDates) {
  const completed = new Set(completedDates);
  const today = new Date();
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayString = getLocalDateString(cursor);

  if (!completed.has(todayString)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!completed.has(getLocalDateString(cursor))) return 0;
  }

  let streak = 0;
  while (completed.has(getLocalDateString(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function formatTime(totalSeconds) {
  if (totalSeconds === null) return "—";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

try {
  const progress = readProgress();
  puzzlesSolvedDisplay.textContent = String(progress.puzzlesSolved);
  bestTimeDisplay.textContent = formatTime(progress.bestTimeSeconds);
  currentStreakDisplay.textContent = String(getCurrentStreak(progress.completedDates));
  levelHistoryNote.hidden = !progress.hasUncategorizedHistory;
  for (const difficulty of difficultyNames) {
    const level = progress.levels[difficulty];
    document.querySelector(`#${difficulty}-solved`).textContent = String(level.puzzlesSolved);
    document.querySelector(`#${difficulty}-best`).textContent = formatTime(level.bestTimeSeconds);
  }
} catch (error) {
  console.error("Could not load Sudoku progress.", error);
  storageNote.textContent = "Progress could not be loaded from this device.";
  storageNote.classList.add("storage-error");
}
