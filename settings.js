"use strict";

const SETTINGS_STORAGE_KEY = "shinobi-sudoku-settings";
const DEFAULT_SETTINGS = {
  theme: "shinobi",
  numberSize: "normal",
  voiceAssistance: false,
  focusLens: true,
  relaxMode: false,
};

function readSettings() {
  const savedSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!savedSettings) return { ...DEFAULT_SETTINGS };

  const settings = JSON.parse(savedSettings);
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    throw new Error("Saved settings have an unexpected format.");
  }
  if (
    (settings.theme !== undefined && !["light", "dark", "shinobi"].includes(settings.theme)) ||
    (settings.numberSize !== undefined && !["normal", "large"].includes(settings.numberSize)) ||
    ["voiceAssistance", "focusLens", "relaxMode"].some(
      (key) => settings[key] !== undefined && typeof settings[key] !== "boolean",
    )
  ) {
    throw new Error("Saved settings contain an unsupported option.");
  }

  return {
    theme: ["light", "dark", "shinobi"].includes(settings.theme)
      ? settings.theme
      : DEFAULT_SETTINGS.theme,
    numberSize: ["normal", "large"].includes(settings.numberSize)
      ? settings.numberSize
      : DEFAULT_SETTINGS.numberSize,
    voiceAssistance:
      typeof settings.voiceAssistance === "boolean"
        ? settings.voiceAssistance
        : DEFAULT_SETTINGS.voiceAssistance,
    focusLens:
      typeof settings.focusLens === "boolean" ? settings.focusLens : DEFAULT_SETTINGS.focusLens,
    relaxMode:
      typeof settings.relaxMode === "boolean" ? settings.relaxMode : DEFAULT_SETTINGS.relaxMode,
  };
}

function applySettings(settings) {
  document.body.dataset.theme = settings.theme;
  document.body.classList.toggle("large-numbers", settings.numberSize === "large");
  document.body.classList.toggle("focus-lens-off", !settings.focusLens);
  document.body.classList.toggle("relax-mode", settings.relaxMode);
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    const themeColors = {
      dark: "#202528",
      light: "#f7f8f4",
      shinobi: "#f5eee2",
    };
    themeColor.content = themeColors[settings.theme];
  }
  window.shinobiSettings = settings;
}

function announceGameMessages(enabled) {
  const gameMessage = document.querySelector("#game-message");
  if (!gameMessage) return;

  if (gameMessage.announcementObserver) {
    gameMessage.announcementObserver.disconnect();
    delete gameMessage.announcementObserver;
  }
  if (!enabled || !("speechSynthesis" in window)) return;

  const observer = new MutationObserver(() => {
    const text = gameMessage.textContent.trim();
    if (!text) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  });
  observer.observe(gameMessage, { childList: true, characterData: true, subtree: true });
  gameMessage.announcementObserver = observer;
}

let settings;
let settingsLoadFailed = false;
try {
  settings = readSettings();
} catch (error) {
  console.error("Could not load Sudoku settings.", error);
  settings = { ...DEFAULT_SETTINGS };
  settingsLoadFailed = true;
}
applySettings(settings);
announceGameMessages(settings.voiceAssistance);

const settingsForm = document.querySelector("#settings-form");
if (settingsForm) {
  const themeInput = settingsForm.elements.namedItem("theme");
  const numberSizeInput = settingsForm.elements.namedItem("numberSize");
  const voiceInput = settingsForm.elements.namedItem("voiceAssistance");
  const focusInput = settingsForm.elements.namedItem("focusLens");
  const relaxInput = settingsForm.elements.namedItem("relaxMode");
  const settingsStatus = document.querySelector("#settings-status");

  if (settingsLoadFailed) {
    settingsStatus.textContent = "Saved settings could not be read. Default settings are active.";
    settingsStatus.classList.add("settings-error");
  }

  themeInput.value = settings.theme;
  numberSizeInput.value = settings.numberSize;
  voiceInput.checked = settings.voiceAssistance;
  focusInput.checked = settings.focusLens;
  relaxInput.checked = settings.relaxMode;

  settingsForm.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement)) return;

    if (input.name === "theme" && ["light", "dark", "shinobi"].includes(input.value)) {
      settings.theme = input.value;
    } else if (input.name === "numberSize" && ["normal", "large"].includes(input.value)) {
      settings.numberSize = input.value;
    } else if (input.name === "voiceAssistance") {
      settings.voiceAssistance = input.checked;
    } else if (input.name === "focusLens") {
      settings.focusLens = input.checked;
    } else if (input.name === "relaxMode") {
      settings.relaxMode = input.checked;
    } else {
      return;
    }

    applySettings(settings);
    announceGameMessages(settings.voiceAssistance);
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      settingsStatus.textContent = "Your settings are saved on this device.";
      settingsStatus.classList.remove("settings-error");
    } catch (error) {
      console.error("Could not save Sudoku settings.", error);
      settingsStatus.textContent = "Settings changed, but could not be saved on this device.";
      settingsStatus.classList.add("settings-error");
    }
  });
}
