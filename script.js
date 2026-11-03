"use strict";

const PROGRESS_STORAGE_KEY = "shinobi-sudoku-progress";
const PUZZLE_SEQUENCE_KEY = "shinobi-sudoku-puzzle-sequence";
const DIFFICULTIES = {
  easy: { label: "Easy", clues: 40 },
  medium: { label: "Medium", clues: 32 },
  hard: { label: "Hard", clues: 28 },
};

const board = document.querySelector("#sudoku-board");
const timerDisplay = document.querySelector("#timer");
const mistakesDisplay = document.querySelector("#mistakes");
const message = document.querySelector("#game-message");
const difficultyLabel = document.querySelector("#difficulty-label");
const gameNumberDisplay = document.querySelector("#game-number");
let puzzle = [];
let solution = [];
let entries = [];
let selectedCell = null;
let mistakes = 0;
let secondsElapsed = 0;
let timerInterval = null;
let gameStarted = false;
let gameComplete = false;
let difficulty = "medium";
let puzzleNumber = 1;

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function generateSolution() {
  const bands = shuffle([0, 1, 2]);
  const rows = bands.flatMap((band) =>
    shuffle([0, 1, 2]).map((row) => band * 3 + row),
  );
  const stacks = shuffle([0, 1, 2]);
  const columns = stacks.flatMap((stack) =>
    shuffle([0, 1, 2]).map((column) => stack * 3 + column),
  );
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  return rows.map((row) =>
    columns.map((column) => {
      const pattern = (row * 3 + Math.floor(row / 3) + column) % 9;
      return String(digits[pattern]);
    }),
  );
}

function countSolutions(cells, limit = 2) {
  const rowMasks = Array(9).fill(0);
  const columnMasks = Array(9).fill(0);
  const boxMasks = Array(9).fill(0);

  for (let row = 0; row < 9; row += 1) {
    for (let column = 0; column < 9; column += 1) {
      const value = cells[row][column];
      if (value === 0) continue;

      const bit = 1 << (value - 1);
      const box = Math.floor(row / 3) * 3 + Math.floor(column / 3);
      if ((rowMasks[row] & bit) || (columnMasks[column] & bit) || (boxMasks[box] & bit)) {
        return 0;
      }
      rowMasks[row] |= bit;
      columnMasks[column] |= bit;
      boxMasks[box] |= bit;
    }
  }

  function search() {
    let bestRow = -1;
    let bestColumn = -1;
    let bestCandidates = 0;
    let fewestCandidates = 10;

    for (let row = 0; row < 9; row += 1) {
      for (let column = 0; column < 9; column += 1) {
        if (cells[row][column] !== 0) continue;
        const box = Math.floor(row / 3) * 3 + Math.floor(column / 3);
        const candidates =
          0x1ff & ~(rowMasks[row] | columnMasks[column] | boxMasks[box]);
        const candidateCount = candidates.toString(2).replace(/0/g, "").length;
        if (candidateCount === 0) return 0;
        if (candidateCount < fewestCandidates) {
          bestRow = row;
          bestColumn = column;
          bestCandidates = candidates;
          fewestCandidates = candidateCount;
          if (candidateCount === 1) break;
        }
      }
      if (fewestCandidates === 1) break;
    }

    if (bestRow === -1) return 1;

    let solutionsFound = 0;
    const box = Math.floor(bestRow / 3) * 3 + Math.floor(bestColumn / 3);
    for (let digit = 1; digit <= 9; digit += 1) {
      const bit = 1 << (digit - 1);
      if (!(bestCandidates & bit)) continue;

      cells[bestRow][bestColumn] = digit;
      rowMasks[bestRow] |= bit;
      columnMasks[bestColumn] |= bit;
      boxMasks[box] |= bit;

      solutionsFound += search();

      cells[bestRow][bestColumn] = 0;
      rowMasks[bestRow] ^= bit;
      columnMasks[bestColumn] ^= bit;
      boxMasks[box] ^= bit;

      if (solutionsFound >= limit) return solutionsFound;
    }
    return solutionsFound;
  }

  return search();
}

function generatePuzzle(selectedDifficulty) {
  const generatedSolution = generateSolution();
  const cells = generatedSolution.map((row) => row.map(Number));
  const positions = shuffle(Array.from({ length: 81 }, (_, index) => index));
  const targetClues = DIFFICULTIES[selectedDifficulty].clues;
  let clues = 81;

  for (const position of positions) {
    if (clues <= targetClues) break;
    const row = Math.floor(position / 9);
    const column = position % 9;
    const value = cells[row][column];
    cells[row][column] = 0;

    if (countSolutions(cells) === 1) {
      clues -= 1;
    } else {
      cells[row][column] = value;
    }
  }

  return {
    puzzle: cells.map((row) => row.map(String)),
    solution: generatedSolution,
  };
}

function getNextPuzzleNumber() {
  try {
    const savedNumber = window.localStorage.getItem(PUZZLE_SEQUENCE_KEY);
    const nextNumber = savedNumber === null ? 1 : Number(savedNumber) + 1;
    if (!Number.isSafeInteger(nextNumber) || nextNumber < 1) {
      throw new Error("Saved puzzle number has an unexpected format.");
    }
    window.localStorage.setItem(PUZZLE_SEQUENCE_KEY, String(nextNumber));
    return nextNumber;
  } catch (error) {
    console.error("Could not save the puzzle number.", error);
    return puzzleNumber + 1;
  }
}

function startNewPuzzle(nextDifficulty = difficulty) {
  difficulty = nextDifficulty;
  const generated = generatePuzzle(difficulty);
  puzzle = generated.puzzle;
  solution = generated.solution;
  entries = Array.from({ length: 9 }, () => Array(9).fill(""));
  selectedCell = null;
  mistakes = 0;
  secondsElapsed = 0;
  gameStarted = false;
  gameComplete = false;
  window.clearInterval(timerInterval);
  timerDisplay.textContent = "00:00";
  mistakesDisplay.textContent = "0";
  difficultyLabel.textContent = DIFFICULTIES[difficulty].label;
  gameNumberDisplay.textContent = `Puzzle ${puzzleNumber}`;
  message.textContent = "Choose a square and make your move.";
  message.className = "game-message";
  document.querySelectorAll(".difficulty-option").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.difficulty === difficulty));
  });
  renderBoard();
  updateBoard();
}

function renderBoard() {
  const fragment = document.createDocumentFragment();

  puzzle.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "sudoku-cell";
      cell.dataset.row = String(rowIndex);
      cell.dataset.column = String(columnIndex);
      cell.setAttribute("aria-label", `Row ${rowIndex + 1}, column ${columnIndex + 1}`);
      cell.setAttribute("aria-pressed", "false");

      if (value !== "0") {
        cell.textContent = value;
        cell.classList.add("given");
        cell.disabled = true;
        cell.setAttribute(
          "aria-label",
          `Row ${rowIndex + 1}, column ${columnIndex + 1}, given ${value}`,
        );
      }

      fragment.append(cell);
    });
  });

  board.replaceChildren(fragment);
}

function updateBoard() {
  Array.from(board.children).forEach((cell) => {
    const row = Number(cell.dataset.row);
    const column = Number(cell.dataset.column);
    const selected = selectedCell?.row === row && selectedCell?.column === column;
    const focusLensEnabled = window.shinobiSettings?.focusLens !== false;
    const related =
      focusLensEnabled &&
      selectedCell &&
      (selectedCell.row === row ||
        selectedCell.column === column ||
        (Math.floor(selectedCell.row / 3) === Math.floor(row / 3) &&
          Math.floor(selectedCell.column / 3) === Math.floor(column / 3)));
    const value = puzzle[row][column] !== "0" ? puzzle[row][column] : entries[row][column];

    cell.classList.toggle("selected", Boolean(selected));
    cell.classList.toggle("related", Boolean(related && !selected));
    cell.classList.toggle(
      "same-number",
      Boolean(
        focusLensEnabled &&
          value &&
          selectedCell &&
          value === getCellValue(selectedCell.row, selectedCell.column),
      ),
    );
    cell.classList.toggle(
      "error",
      Boolean(
        !window.shinobiSettings?.relaxMode &&
          entries[row][column] &&
          entries[row][column] !== solution[row][column],
      ),
    );
    cell.textContent = value;
    cell.setAttribute("aria-pressed", String(Boolean(selected)));
    cell.setAttribute(
      "aria-label",
      `Row ${row + 1}, column ${column + 1}${value ? `, ${value}` : ", empty"}`,
    );
  });
}

function getCellValue(row, column) {
  return puzzle[row][column] !== "0" ? puzzle[row][column] : entries[row][column];
}

function startTimer() {
  if (gameStarted || gameComplete) return;
  gameStarted = true;
  timerInterval = window.setInterval(() => {
    secondsElapsed += 1;
    const minutes = String(Math.floor(secondsElapsed / 60)).padStart(2, "0");
    const seconds = String(secondsElapsed % 60).padStart(2, "0");
    timerDisplay.textContent = `${minutes}:${seconds}`;
  }, 1000);
}

function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function savePuzzleProgress(timeInSeconds) {
  const savedProgress = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
  const progress = savedProgress
    ? JSON.parse(savedProgress)
    : { completedDates: [], bestTimeSeconds: null };

  if (
    !progress ||
    !Array.isArray(progress.completedDates) ||
    (progress.bestTimeSeconds !== null &&
      (!Number.isInteger(progress.bestTimeSeconds) || progress.bestTimeSeconds < 0))
  ) {
    throw new Error("Saved progress has an unexpected format.");
  }

  const today = getLocalDateString(new Date());
  const previousSolvedCount = Number.isSafeInteger(progress.puzzlesSolved)
    ? progress.puzzlesSolved
    : progress.completedDates.length;
  if (!progress.completedDates.includes(today)) {
    progress.completedDates.push(today);
  }
  progress.puzzlesSolved = previousSolvedCount + 1;
  if (progress.bestTimeSeconds === null || timeInSeconds < progress.bestTimeSeconds) {
    progress.bestTimeSeconds = timeInSeconds;
  }

  window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

function enterNumber(number) {
  if (!selectedCell || gameComplete) return;
  const { row, column } = selectedCell;
  if (puzzle[row][column] !== "0") return;

  const previousValue = entries[row][column];
  entries[row][column] = number;
  const isCorrect = number === solution[row][column];
  if (!isCorrect && number !== previousValue && !window.shinobiSettings?.relaxMode) {
    mistakes += 1;
    mistakesDisplay.textContent = String(mistakes);
    message.textContent = "Not quite — take another look at that square.";
    message.className = "game-message error-message";
  } else if (isCorrect || window.shinobiSettings?.relaxMode) {
    message.textContent = "Nice and steady. Keep going.";
    message.className = "game-message";
  } else {
    message.textContent = "That square still needs another look.";
    message.className = "game-message error-message";
  }
  updateBoard();
  checkForCompletion();
}

function eraseSelected() {
  if (!selectedCell || gameComplete) return;
  const { row, column } = selectedCell;
  if (puzzle[row][column] !== "0") return;

  entries[row][column] = "";
  message.textContent = "Square cleared. Take your time.";
  message.className = "game-message";
  updateBoard();
}

function checkForCompletion() {
  const complete = entries.every((row, rowIndex) =>
    row.every((value, columnIndex) =>
      puzzle[rowIndex][columnIndex] !== "0" || value === solution[rowIndex][columnIndex],
    ),
  );

  if (complete) {
    gameComplete = true;
    window.clearInterval(timerInterval);
    message.textContent = `Beautifully done. You completed puzzle ${puzzleNumber} in ${timerDisplay.textContent}.`;
    message.className = "game-message success";
    try {
      savePuzzleProgress(secondsElapsed);
    } catch (error) {
      console.error("Could not save Sudoku progress.", error);
      message.textContent += " Your progress could not be saved on this device.";
      message.className = "game-message error-message";
    }
  }
}

function checkPuzzle() {
  if (gameComplete) return;

  const emptyCount = entries.reduce(
    (total, row, rowIndex) =>
      total +
      row.filter((value, columnIndex) => puzzle[rowIndex][columnIndex] === "0" && !value).length,
    0,
  );
  const wrongCount = entries.reduce(
    (total, row, rowIndex) =>
      total +
      row.filter(
        (value, columnIndex) =>
          puzzle[rowIndex][columnIndex] === "0" &&
          value &&
          value !== solution[rowIndex][columnIndex],
      ).length,
    0,
  );

  if (wrongCount > 0) {
    message.textContent = "A few numbers need a second look. You’ve got this.";
    message.className = "game-message error-message";
  } else if (emptyCount > 0) {
    message.textContent = `${emptyCount} squares to go. Keep finding your way.`;
    message.className = "game-message";
  } else {
    checkForCompletion();
  }
}

function resetPuzzle() {
  if (gameComplete) return;
  entries.forEach((row) => row.fill(""));
  mistakes = 0;
  secondsElapsed = 0;
  gameStarted = false;
  window.clearInterval(timerInterval);
  timerDisplay.textContent = "00:00";
  mistakesDisplay.textContent = "0";
  message.textContent = "Choose a square and make your move.";
  message.className = "game-message";
  updateBoard();
}

board.addEventListener("click", (event) => {
  const cell = event.target.closest(".sudoku-cell");
  if (!cell || gameComplete) return;

  selectedCell = {
    row: Number(cell.dataset.row),
    column: Number(cell.dataset.column),
  };
  startTimer();
  updateBoard();
});

document.querySelector(".number-pad").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.hasAttribute("data-erase")) {
    eraseSelected();
  } else if (button.dataset.number) {
    enterNumber(button.dataset.number);
  }
});

document.addEventListener("keydown", (event) => {
  if (!selectedCell || gameComplete || event.altKey || event.ctrlKey || event.metaKey) return;
  if (/^[1-9]$/.test(event.key)) {
    enterNumber(event.key);
  } else if (event.key === "Backspace" || event.key === "Delete") {
    eraseSelected();
  }
});

document.querySelectorAll(".difficulty-option").forEach((button) => {
  button.addEventListener("click", () => {
    const nextDifficulty = button.dataset.difficulty;
    if (!DIFFICULTIES[nextDifficulty]) {
      throw new Error(`Unknown Sudoku difficulty: ${nextDifficulty}`);
    }
    puzzleNumber = getNextPuzzleNumber();
    startNewPuzzle(nextDifficulty);
  });
});

document.querySelector("#next-button").addEventListener("click", () => {
  puzzleNumber = getNextPuzzleNumber();
  startNewPuzzle();
});
document.querySelector("#check-button").addEventListener("click", checkPuzzle);
document.querySelector("#clear-button").addEventListener("click", resetPuzzle);

puzzleNumber = getNextPuzzleNumber();
startNewPuzzle("medium");
