"use strict";

const PROGRESS_STORAGE_KEY = "shinobi-sudoku-progress";
const puzzlesSolvedDisplay = document.querySelector("#puzzles-solved");
const bestTimeDisplay = document.querySelector("#best-time");
const currentStreakDisplay = document.querySelector("#current-streak");
const storageNote = document.querySelector("#storage-note");

function readProgress() {
  const savedProgress = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
  if (!savedProgress) {
    return { completedDates: [], bestTimeSeconds: null };
  }

  const progress = JSON.parse(savedProgress);
  if (
    !progress ||
    !Array.isArray(progress.completedDates) ||
    (progress.bestTimeSeconds !== null &&
      (!Number.isInteger(progress.bestTimeSeconds) || progress.bestTimeSeconds < 0))
  ) {
    throw new Error("Saved progress has an unexpected format.");
  }

  return {
    completedDates: progress.completedDates.filter(
      (date) => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date),
    ),
    bestTimeSeconds: progress.bestTimeSeconds,
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
  puzzlesSolvedDisplay.textContent = String(progress.completedDates.length);
  bestTimeDisplay.textContent = formatTime(progress.bestTimeSeconds);
  currentStreakDisplay.textContent = String(getCurrentStreak(progress.completedDates));
} catch (error) {
  console.error("Could not load Sudoku progress.", error);
  storageNote.textContent = "Progress could not be loaded from this device.";
  storageNote.classList.add("storage-error");
}
