"use strict";

const puzzle = [
  "530070000",
  "600195000",
  "098000060",
  "800060003",
  "400803001",
  "700020006",
  "060000280",
  "000419005",
  "000080079",
];

const solution = [
  "534678912",
  "672195348",
  "198342567",
  "859761423",
  "426853791",
  "713924856",
  "961537284",
  "287419635",
  "345286179",
];

const board = document.querySelector("#sudoku-board");
const timerDisplay = document.querySelector("#timer");
const mistakesDisplay = document.querySelector("#mistakes");
const message = document.querySelector("#game-message");
const entries = Array.from({ length: 9 }, () => Array(9).fill(""));
let selectedCell = null;
let mistakes = 0;
let secondsElapsed = 0;
let timerInterval = null;
let gameStarted = false;
let gameComplete = false;

function renderBoard() {
  const fragment = document.createDocumentFragment();

  puzzle.forEach((row, rowIndex) => {
    Array.from(row).forEach((value, columnIndex) => {
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
  const cells = Array.from(board.children);

  cells.forEach((cell) => {
    const row = Number(cell.dataset.row);
    const column = Number(cell.dataset.column);
    const selected = selectedCell?.row === row && selectedCell?.column === column;
    const related =
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
      Boolean(value && selectedCell && value === getCellValue(selectedCell.row, selectedCell.column)),
    );
    cell.classList.toggle(
      "error",
      Boolean(entries[row][column] && entries[row][column] !== solution[row][column]),
    );
    cell.textContent = puzzle[row][column] !== "0" ? puzzle[row][column] : entries[row][column];
    cell.setAttribute("aria-pressed", String(Boolean(selected)));
    cell.setAttribute(
      "aria-label",
      `Row ${row + 1}, column ${column + 1}${cell.textContent ? `, ${cell.textContent}` : ", empty"}`,
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

function enterNumber(number) {
  if (!selectedCell || gameComplete) return;
  const { row, column } = selectedCell;
  if (puzzle[row][column] !== "0") return;

  const previousValue = entries[row][column];
  entries[row][column] = number;
  if (number !== solution[row][column] && number !== previousValue) {
    mistakes += 1;
    mistakesDisplay.textContent = String(mistakes);
    message.textContent = "Not quite — take another look at that square.";
    message.className = "game-message error-message";
  } else {
    message.textContent = "Nice and steady. Keep going.";
    message.className = "game-message";
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
    message.textContent = `Beautifully done. You found your flow in ${timerDisplay.textContent}.`;
    message.className = "game-message success";
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

function clearEntries() {
  entries.forEach((row) => row.fill(""));
  mistakes = 0;
  secondsElapsed = 0;
  gameStarted = false;
  gameComplete = false;
  window.clearInterval(timerInterval);
  timerDisplay.textContent = "00:00";
  mistakesDisplay.textContent = "0";
  message.textContent = "Choose a square and take your time.";
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

document.querySelector("#check-button").addEventListener("click", checkPuzzle);
document.querySelector("#clear-button").addEventListener("click", clearEntries);

document.querySelectorAll("[data-start-game]").forEach((link) => {
  link.addEventListener("click", () => {
    startTimer();
    const firstEmptyCell = board.querySelector(".sudoku-cell:not(.given)");
    if (firstEmptyCell) {
      selectedCell = {
        row: Number(firstEmptyCell.dataset.row),
        column: Number(firstEmptyCell.dataset.column),
      };
      updateBoard();
    }
  });
});

renderBoard();
updateBoard();
