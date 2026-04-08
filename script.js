const menuScreen = document.getElementById("menuScreen");
const settingsScreen = document.getElementById("settingsScreen");
const gameScreen = document.getElementById("gameScreen");

const settingsModeText = document.getElementById("settingsModeText");
const boardSizeInput = document.getElementById("boardSizeInput");
const winLengthInput = document.getElementById("winLengthInput");
const shieldIntervalInput = document.getElementById("shieldIntervalInput");
const maxShieldsPerTurnInput = document.getElementById("maxShieldsPerTurnInput");
const overtimeSecondsInput = document.getElementById("overtimeSecondsInput");
const mainGameSecondsInput = document.getElementById("mainGameSecondsInput");
const shieldsOffInput = document.getElementById("shieldsOffInput");

const startGameBtn = document.getElementById("startGameBtn");
const backToModeSelectBtn = document.getElementById("backToModeSelect");
const backToMenuBtn = document.getElementById("backToMenuBtn");
const restartBtn = document.getElementById("restart");
const enterOvertimeBtn = document.getElementById("enterOvertimeBtn");

const board = document.getElementById("board");
const statusText = document.getElementById("status");
const shieldsText = document.getElementById("shields");
const shieldCountdownText = document.getElementById("shieldCountdown");
const turnShieldUsageText = document.getElementById("turnShieldUsage");
const moveTimerText = document.getElementById("moveTimer");
const overtimeTimerText = document.getElementById("overtimeTimer");
const overtimePlayersBox = document.getElementById("overtimePlayersBox");
const overtimePlayers = document.getElementById("overtimePlayers");
const logList = document.getElementById("logList");
const gameTitle = document.getElementById("gameTitle");

const PLAYER_SETS = {
  2: ["X", "O"],
  3: ["X", "O", "△"],
  4: ["X", "O", "△", "□"]
};

const PLAYER_CLASSES = {
  "X": "x",
  "O": "o",
  "△": "triangle",
  "□": "square"
};

const PLAYER_THEME_CLASSES = {
  "X": "theme-x",
  "O": "theme-o",
  "△": "theme-triangle",
  "□": "theme-square"
};

const DEFAULTS = {
  2: {
    boardSize: 5,
    winLength: 4,
    shieldInterval: 5,
    maxShieldsPerTurn: 1,
    overtimeSeconds: 5,
    mainGameSeconds: 30,
    shieldsOff: false
  },
  3: {
    boardSize: 6,
    winLength: 4,
    shieldInterval: 3,
    maxShieldsPerTurn: 1,
    overtimeSeconds: 5,
    mainGameSeconds: 30,
    shieldsOff: false
  },
  4: {
    boardSize: 7,
    winLength: 4,
    shieldInterval: 2,
    maxShieldsPerTurn: 1,
    overtimeSeconds: 5,
    mainGameSeconds: 30,
    shieldsOff: false
  }
};

let selectedPlayerCount = 3;

let config = {
  playerCount: 3,
  boardSize: 6,
  shieldInterval: 3,
  maxShieldsPerTurn: 1,
  overtimeSeconds: 5,
  mainGameSeconds: 30,
  shieldsOff: false,
  winLength: 4
};

let players = [];
let currentPlayerIndex = 0;
let gameOver = false;
let boardState = [];
let cells = [];
let shields = [];
let turnCount = 0;
let shieldsUsedThisTurn = 0;
let playerPlacedSymbolThisTurn = false;

let drawPendingOvertime = false;
let isOvertime = false;
let activePlayers = [];
let moveSecondsLeft = 30;
let moveTimerId = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function showScreen(screen) {
  menuScreen.classList.remove("active");
  settingsScreen.classList.remove("active");
  gameScreen.classList.remove("active");
  screen.classList.add("active");
}

function applyBodyThemeForPlayer(symbol) {
  document.body.classList.remove("theme-x", "theme-o", "theme-triangle", "theme-square");
  const themeClass = PLAYER_THEME_CLASSES[symbol];
  if (themeClass) document.body.classList.add(themeClass);
}

function createEmptyBoard(size) {
  return Array(size).fill(null).map(() => Array(size).fill(""));
}

function getPlayerLabel(symbol) {
  return `Player ${players.indexOf(symbol) + 1}`;
}

function addLog(message) {
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.textContent = message;
  logList.prepend(entry);
}

function clearLogs() {
  logList.innerHTML = "";
}

function openSettings(playerCount) {
  selectedPlayerCount = playerCount;
  const defaults = DEFAULTS[playerCount];

  settingsModeText.textContent = `${playerCount} Player Mode`;
  boardSizeInput.value = defaults.boardSize;
  winLengthInput.value = defaults.winLength;
  shieldIntervalInput.value = defaults.shieldInterval;
  maxShieldsPerTurnInput.value = defaults.maxShieldsPerTurn;
  overtimeSecondsInput.value = defaults.overtimeSeconds;
  mainGameSecondsInput.value = defaults.mainGameSeconds;
  shieldsOffInput.checked = defaults.shieldsOff;

  showScreen(settingsScreen);
}

function sanitizeSettingsInputs() {
  let boardSizeRaw = boardSizeInput.value.trim();
  if (boardSizeRaw !== "") {
    let boardSize = parseInt(boardSizeRaw);
    if (isNaN(boardSize)) {
      boardSizeInput.value = "";
    } else {
      boardSize = clamp(boardSize, 3, 10);
      boardSizeInput.value = boardSize;
    }
  }

  const currentBoardSize = boardSizeInput.value.trim() === ""
    ? 10
    : clamp(parseInt(boardSizeInput.value), 3, 10);

  let winLengthRaw = winLengthInput.value.trim();
  if (winLengthRaw !== "") {
    let winLength = parseInt(winLengthRaw);
    if (isNaN(winLength)) {
      winLengthInput.value = "";
    } else {
      winLength = clamp(winLength, 3, 10);
      winLength = Math.min(winLength, currentBoardSize);
      winLengthInput.value = winLength;
    }
  }

  let intervalRaw = shieldIntervalInput.value.trim();
  if (intervalRaw === "") {
    shieldsOffInput.checked = true;
  } else {
    let interval = parseInt(intervalRaw);
    if (isNaN(interval)) {
      shieldIntervalInput.value = "";
      shieldsOffInput.checked = true;
    } else {
      interval = clamp(interval, 0, 50);
      shieldIntervalInput.value = interval;
      shieldsOffInput.checked = interval === 0;
    }
  }

  let maxShieldsRaw = maxShieldsPerTurnInput.value.trim();
  if (maxShieldsRaw !== "") {
    let maxShields = parseInt(maxShieldsRaw);
    if (isNaN(maxShields)) {
      maxShieldsPerTurnInput.value = "";
    } else {
      maxShields = clamp(maxShields, 1, 50);
      maxShieldsPerTurnInput.value = maxShields;
    }
  }

  let overtimeRaw = overtimeSecondsInput.value.trim();
  if (overtimeRaw !== "") {
    let overtime = parseInt(overtimeRaw);
    if (isNaN(overtime)) {
      overtimeSecondsInput.value = "";
    } else {
      overtime = clamp(overtime, 1, 60);
      overtimeSecondsInput.value = overtime;
    }
  }

  let mainRaw = mainGameSecondsInput.value.trim();
  if (mainRaw !== "") {
    let mainSeconds = parseInt(mainRaw);
    if (isNaN(mainSeconds)) {
      mainGameSecondsInput.value = "";
    } else {
      mainSeconds = clamp(mainSeconds, 1, 300);
      mainGameSecondsInput.value = mainSeconds;
    }
  }
}

function syncShieldsOffWithInput() {
  const raw = shieldIntervalInput.value.trim();

  if (raw === "") {
    shieldsOffInput.checked = true;
    return;
  }

  const value = parseInt(raw);
  shieldsOffInput.checked = isNaN(value) || value === 0;
}

function updateBoardSizing() {
  const size = config.boardSize;
  let cellSize;
  let gapSize;

  if (size <= 3) {
    cellSize = 96;
    gapSize = 4;
  } else if (size === 4) {
    cellSize = 88;
    gapSize = 4;
  } else if (size === 5) {
    cellSize = 80;
    gapSize = 4;
  } else if (size === 6) {
    cellSize = 72;
    gapSize = 4;
  } else if (size === 7) {
    cellSize = 64;
    gapSize = 4;
  } else if (size === 8) {
    cellSize = 58;
    gapSize = 3;
  } else if (size === 9) {
    cellSize = 52;
    gapSize = 3;
  } else {
    cellSize = 47;
    gapSize = 2;
  }

  board.style.setProperty("--board-count", size);
  board.style.setProperty("--cell-size", `${cellSize}px`);
  board.style.setProperty("--gap-size", `${gapSize}px`);
}

function startGame() {
  let boardSize = parseInt(boardSizeInput.value);
  if (isNaN(boardSize)) boardSize = DEFAULTS[selectedPlayerCount].boardSize;
  boardSize = clamp(boardSize, 3, 10);
  boardSizeInput.value = boardSize;

  let winLength = parseInt(winLengthInput.value);
  if (isNaN(winLength)) winLength = DEFAULTS[selectedPlayerCount].winLength;
  winLength = clamp(winLength, 3, 10);
  winLength = Math.min(winLength, boardSize);
  winLengthInput.value = winLength;

  let shieldIntervalRaw = shieldIntervalInput.value.trim();
  let shieldInterval = parseInt(shieldIntervalRaw);
  if (shieldIntervalRaw === "" || isNaN(shieldInterval)) shieldInterval = 0;
  shieldInterval = clamp(shieldInterval, 0, 50);
  shieldIntervalInput.value = shieldInterval;

  let maxShieldsPerTurn = parseInt(maxShieldsPerTurnInput.value);
  if (isNaN(maxShieldsPerTurn)) maxShieldsPerTurn = DEFAULTS[selectedPlayerCount].maxShieldsPerTurn;
  maxShieldsPerTurn = clamp(maxShieldsPerTurn, 1, 50);
  maxShieldsPerTurnInput.value = maxShieldsPerTurn;

  let overtimeSeconds = parseInt(overtimeSecondsInput.value);
  if (isNaN(overtimeSeconds)) overtimeSeconds = DEFAULTS[selectedPlayerCount].overtimeSeconds;
  overtimeSeconds = clamp(overtimeSeconds, 1, 60);
  overtimeSecondsInput.value = overtimeSeconds;

  let mainGameSeconds = parseInt(mainGameSecondsInput.value);
  if (isNaN(mainGameSeconds)) mainGameSeconds = DEFAULTS[selectedPlayerCount].mainGameSeconds;
  mainGameSeconds = clamp(mainGameSeconds, 1, 300);
  mainGameSecondsInput.value = mainGameSeconds;

  const shieldsOff = shieldsOffInput.checked || shieldInterval === 0;

  config = {
    playerCount: selectedPlayerCount,
    boardSize,
    winLength,
    shieldInterval,
    maxShieldsPerTurn,
    overtimeSeconds,
    mainGameSeconds,
    shieldsOff
  };

  players = PLAYER_SETS[config.playerCount].slice();
  gameTitle.textContent = `${config.playerCount} Player Tic Tac Toe`;

  createBoard();
  showScreen(gameScreen);
}

function clearMoveTimer() {
  if (moveTimerId) {
    clearInterval(moveTimerId);
    moveTimerId = null;
  }
}

function resetOvertimeState() {
  clearMoveTimer();
  drawPendingOvertime = false;
  isOvertime = false;
  activePlayers = [];
  moveSecondsLeft = config.mainGameSeconds || 30;
  moveTimerText.textContent = "";
  overtimeTimerText.textContent = "";
  enterOvertimeBtn.classList.add("hidden");
  overtimePlayers.innerHTML = "";
}

function createBoard() {
  board.innerHTML = "";
  updateBoardSizing();

  cells = [];
  boardState = createEmptyBoard(config.boardSize);
  currentPlayerIndex = 0;
  gameOver = false;
  turnCount = 0;
  shields = Array(config.playerCount).fill(0);
  shieldsUsedThisTurn = 0;
  playerPlacedSymbolThisTurn = false;

  resetOvertimeState();
  clearLogs();
  addLog(`Started ${config.playerCount}-player game.`);

  for (let row = 0; row < config.boardSize; row++) {
    for (let col = 0; col < config.boardSize; col++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.row = row;
      cell.dataset.col = col;

      cell.addEventListener("click", handleLeftClick);
      cell.addEventListener("contextmenu", handleRightClick);

      board.appendChild(cell);
      cells.push(cell);
    }
  }

  updateStatus();
  updateShieldDisplay();
  updateOvertimePlayersDisplay();
  startMoveTimer();
}

function clearBoardForOvertime() {
  boardState = createEmptyBoard(config.boardSize);
  for (const cell of cells) {
    cell.textContent = "";
    cell.className = "cell";
  }
}

function updateStatus() {
  const currentPlayer = players[currentPlayerIndex];
  statusText.textContent = isOvertime ? `OVERTIME - Turn: ${currentPlayer}` : `Turn: ${currentPlayer}`;
  applyBodyThemeForPlayer(currentPlayer);
}

function getFullRoundsCompleted() {
  if (players.length === 0) return 0;
  return Math.floor(turnCount / players.length);
}

function getRoundsUntilShield() {
  if (config.shieldsOff || config.shieldInterval === 0) return null;

  const fullRoundsCompleted = getFullRoundsCompleted();
  const roundsProgress = fullRoundsCompleted % config.shieldInterval;
  let remaining = config.shieldInterval - roundsProgress;

  if (remaining === 0) remaining = config.shieldInterval;
  return remaining;
}

function updateOvertimePlayersDisplay() {
  overtimePlayers.innerHTML = "";

  const symbolsToShow = isOvertime ? activePlayers : players;

  for (const symbol of players) {
    const badge = document.createElement("div");
    badge.className = `overtime-symbol ${PLAYER_CLASSES[symbol]}`;

    if (isOvertime) {
      if (!activePlayers.includes(symbol)) {
        badge.classList.add("eliminated");
      }
    } else if (!symbolsToShow.includes(symbol)) {
      badge.classList.add("eliminated");
    }

    badge.textContent = symbol;
    overtimePlayers.appendChild(badge);
  }
}

function updateShieldDisplay() {
  let html = "";

  for (let i = 0; i < players.length; i++) {
    const symbol = players[i];
    const className = PLAYER_CLASSES[symbol];
    html += `<span class="${className}">${symbol}</span> 🛡 ${shields[i]}`;
    if (i < players.length - 1) html += ` &nbsp;&nbsp; `;
  }

  shieldsText.innerHTML = html;

  if (isOvertime) {
    shieldCountdownText.textContent = "Shields removed in overtime";
    turnShieldUsageText.textContent = `Overtime move timer: ${config.overtimeSeconds}s`;
    overtimeTimerText.textContent = `Time left: ${moveSecondsLeft}s`;
    updateOvertimePlayersDisplay();
    return;
  }

  if (config.shieldsOff || config.shieldInterval === 0) {
    shieldCountdownText.textContent = "Shields are OFF";
    turnShieldUsageText.textContent = "";
  } else {
    const roundsUntilShield = getRoundsUntilShield();
    shieldCountdownText.textContent = `${roundsUntilShield} full turn${roundsUntilShield === 1 ? "" : "s"} until all players gain +1 shield`;
    turnShieldUsageText.textContent = `Shields used this turn: ${shieldsUsedThisTurn}/${config.maxShieldsPerTurn}`;
  }

  moveTimerText.textContent = `Main game move timer: ${moveSecondsLeft}s`;
  overtimeTimerText.textContent = "";
  updateOvertimePlayersDisplay();
}

function getCellElement(row, col) {
  return cells.find(
    cell =>
      parseInt(cell.dataset.row) === row &&
      parseInt(cell.dataset.col) === col
  );
}

function isPlayerActive(symbol) {
  if (!isOvertime) return true;
  return activePlayers.includes(symbol);
}

function animatePlacedCell(cell) {
  cell.classList.remove("pop");
  void cell.offsetWidth;
  cell.classList.add("pop");
}

function triggerDrawState() {
  clearMoveTimer();

  if (isOvertime) {
    statusText.textContent = "Overtime draw!";
    gameOver = true;
    updateShieldDisplay();
    addLog("Overtime ended in a draw.");
    return;
  }

  statusText.textContent = "It's a draw!";
  drawPendingOvertime = true;
  enterOvertimeBtn.classList.remove("hidden");
  updateShieldDisplay();
  addLog("Game ended in a draw. Overtime is available.");
}

function handleLeftClick(e) {
  if (gameOver || drawPendingOvertime) return;
  if (playerPlacedSymbolThisTurn) return;

  const currentPlayer = players[currentPlayerIndex];
  if (!isPlayerActive(currentPlayer)) return;

  const cell = e.currentTarget;
  const row = parseInt(cell.dataset.row);
  const col = parseInt(cell.dataset.col);

  if (boardState[row][col] !== "") return;

  boardState[row][col] = currentPlayer;
  cell.textContent = currentPlayer;
  cell.classList.add("taken", PLAYER_CLASSES[currentPlayer]);
  animatePlacedCell(cell);

  playerPlacedSymbolThisTurn = true;
  finishTurn(currentPlayer);
}

function handleRightClick(e) {
  e.preventDefault();

  if (gameOver || drawPendingOvertime) return;
  if (isOvertime) return;
  if (config.shieldsOff || config.shieldInterval === 0) return;
  if (playerPlacedSymbolThisTurn) return;
  if (shieldsUsedThisTurn >= config.maxShieldsPerTurn) return;
  if (shields[currentPlayerIndex] <= 0) return;

  const currentPlayer = players[currentPlayerIndex];
  if (!isPlayerActive(currentPlayer)) return;

  const cell = e.currentTarget;
  const row = parseInt(cell.dataset.row);
  const col = parseInt(cell.dataset.col);

  if (boardState[row][col] !== "") return;

  boardState[row][col] = "BLOCK";
  cell.textContent = "🛡";
  cell.classList.add("taken", "shield");
  animatePlacedCell(cell);

  shields[currentPlayerIndex]--;
  shieldsUsedThisTurn++;
  addLog(`${getPlayerLabel(currentPlayer)} used a shield.`);
  updateShieldDisplay();

  if (isBoardFull()) triggerDrawState();
}

function awardShieldsIfNeeded() {
  if (isOvertime) return;
  if (config.shieldsOff || config.shieldInterval === 0) return;
  if (players.length === 0) return;

  if (turnCount > 0 && turnCount % players.length === 0) {
    const fullRoundsCompleted = turnCount / players.length;
    if (fullRoundsCompleted % config.shieldInterval === 0) {
      for (let i = 0; i < shields.length; i++) {
        shields[i]++;
      }
      addLog("All players gained +1 shield.");
    }
  }
}

function finishTurn(player) {
  clearMoveTimer();
  turnCount++;

  if (!isOvertime) awardShieldsIfNeeded();

  const winningCells = checkWin(player);

  if (winningCells) {
    highlightWinningCells(winningCells);
    statusText.textContent = `${player} wins!`;
    gameOver = true;
    updateShieldDisplay();
    enterOvertimeBtn.classList.add("hidden");
    addLog(`${getPlayerLabel(player)} won the game.`);
    return;
  }

  if (isBoardFull()) {
    triggerDrawState();
    return;
  }

  moveToNextPlayer();
}

function moveToNextPlayer() {
  if (isOvertime) {
    let nextIndex = currentPlayerIndex;
    let attempts = 0;

    do {
      nextIndex = (nextIndex + 1) % players.length;
      attempts++;
      if (attempts > players.length) break;
    } while (!isPlayerActive(players[nextIndex]));

    currentPlayerIndex = nextIndex;

    if (activePlayers.length <= 1) {
      if (activePlayers.length === 1) {
        statusText.textContent = `${activePlayers[0]} wins by survival!`;
        addLog(`${getPlayerLabel(activePlayers[0])} won by survival in overtime.`);
      } else {
        statusText.textContent = "No players left!";
        addLog("All players were eliminated.");
      }
      gameOver = true;
      updateShieldDisplay();
      enterOvertimeBtn.classList.add("hidden");
      clearMoveTimer();
      return;
    }

    shieldsUsedThisTurn = 0;
    playerPlacedSymbolThisTurn = false;
    updateStatus();
    updateShieldDisplay();
    startMoveTimer();
    return;
  }

  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  shieldsUsedThisTurn = 0;
  playerPlacedSymbolThisTurn = false;
  updateStatus();
  updateShieldDisplay();
  startMoveTimer();
}

function removeCurrentPlayerForTimeout() {
  const currentPlayer = players[currentPlayerIndex];

  if (isOvertime) {
    activePlayers = activePlayers.filter(symbol => symbol !== currentPlayer);
    markRemovedPlayerCells(currentPlayer);
    updateOvertimePlayersDisplay();
    addLog(`${getPlayerLabel(currentPlayer)} eliminated for taking too long in overtime.`);
  } else {
    players = players.filter(symbol => symbol !== currentPlayer);
    shields = shields.filter((_, index) => index !== currentPlayerIndex);

    addLog(`${getPlayerLabel(currentPlayer)} eliminated for taking too long in the main game.`);

    if (players.length === 0) {
      statusText.textContent = "No players left!";
      gameOver = true;
      clearMoveTimer();
      updateShieldDisplay();
      return;
    }

    if (players.length === 1) {
      statusText.textContent = `${players[0]} wins by survival!`;
      gameOver = true;
      clearMoveTimer();
      updateShieldDisplay();
      addLog(`${getPlayerLabel(players[0])} won by survival.`);
      return;
    }

    if (currentPlayerIndex >= players.length) {
      currentPlayerIndex = 0;
    }
  }

  if (isOvertime && activePlayers.length <= 1) {
    if (activePlayers.length === 1) {
      statusText.textContent = `${activePlayers[0]} wins by survival!`;
      addLog(`${getPlayerLabel(activePlayers[0])} won by survival in overtime.`);
    } else {
      statusText.textContent = "No players left!";
      addLog("All players were eliminated.");
    }
    gameOver = true;
    clearMoveTimer();
    updateShieldDisplay();
    return;
  }

  shieldsUsedThisTurn = 0;
  playerPlacedSymbolThisTurn = false;
  updateStatus();
  updateShieldDisplay();
  startMoveTimer();
}

function startMoveTimer() {
  clearMoveTimer();
  if (gameOver || drawPendingOvertime) return;

  moveSecondsLeft = isOvertime ? config.overtimeSeconds : config.mainGameSeconds;
  updateShieldDisplay();

  moveTimerId = setInterval(() => {
    moveSecondsLeft--;
    updateShieldDisplay();

    if (moveSecondsLeft <= 0) {
      clearMoveTimer();
      removeCurrentPlayerForTimeout();
    }
  }, 1000);
}

function isBoardFull() {
  for (let row = 0; row < config.boardSize; row++) {
    for (let col = 0; col < config.boardSize; col++) {
      if (boardState[row][col] === "") return false;
    }
  }
  return true;
}

function checkLine(player, startRow, startCol, rowStep, colStep) {
  const line = [];

  for (let i = 0; i < config.winLength; i++) {
    const row = startRow + i * rowStep;
    const col = startCol + i * colStep;

    if (boardState[row][col] !== player) return null;
    line.push([row, col]);
  }

  return line;
}

function checkWin(player) {
  const size = config.boardSize;
  const len = config.winLength;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col <= size - len; col++) {
      const line = checkLine(player, row, col, 0, 1);
      if (line) return line;
    }
  }

  for (let row = 0; row <= size - len; row++) {
    for (let col = 0; col < size; col++) {
      const line = checkLine(player, row, col, 1, 0);
      if (line) return line;
    }
  }

  for (let row = 0; row <= size - len; row++) {
    for (let col = 0; col <= size - len; col++) {
      const line = checkLine(player, row, col, 1, 1);
      if (line) return line;
    }
  }

  for (let row = 0; row <= size - len; row++) {
    for (let col = len - 1; col < size; col++) {
      const line = checkLine(player, row, col, 1, -1);
      if (line) return line;
    }
  }

  return null;
}

function highlightWinningCells(winningCells) {
  for (const [row, col] of winningCells) {
    const cell = getCellElement(row, col);
    if (cell) cell.classList.add("win");
  }
}

function markRemovedPlayerCells(symbol) {
  for (const cell of cells) {
    if (cell.textContent === symbol) cell.classList.add("removed");
  }
}

function enterOvertime() {
  if (!drawPendingOvertime || gameOver) return;

  drawPendingOvertime = false;
  isOvertime = true;
  activePlayers = [...players];

  clearBoardForOvertime();

  shieldsUsedThisTurn = 0;
  playerPlacedSymbolThisTurn = false;
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;

  enterOvertimeBtn.classList.add("hidden");

  addLog("Entered overtime. Board cleared and shields removed.");

  updateStatus();
  updateShieldDisplay();
  updateOvertimePlayersDisplay();
  startMoveTimer();
}

function returnToMenu() {
  showScreen(menuScreen);
  document.body.classList.remove("theme-x", "theme-o", "theme-triangle", "theme-square");
  document.body.classList.add("theme-x");
  resetOvertimeState();
}

document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    openSettings(parseInt(btn.dataset.players));
  });
});

boardSizeInput.addEventListener("input", sanitizeSettingsInputs);
winLengthInput.addEventListener("input", sanitizeSettingsInputs);

shieldIntervalInput.addEventListener("input", () => {
  syncShieldsOffWithInput();
});

maxShieldsPerTurnInput.addEventListener("input", () => {
  let raw = maxShieldsPerTurnInput.value.trim();
  if (raw === "") return;

  let value = parseInt(raw);
  if (isNaN(value)) {
    maxShieldsPerTurnInput.value = "";
    return;
  }

  value = clamp(value, 1, 50);
  maxShieldsPerTurnInput.value = value;
});

overtimeSecondsInput.addEventListener("input", () => {
  let raw = overtimeSecondsInput.value.trim();
  if (raw === "") return;

  let value = parseInt(raw);
  if (isNaN(value)) {
    overtimeSecondsInput.value = "";
    return;
  }

  value = clamp(value, 1, 60);
  overtimeSecondsInput.value = value;
});

mainGameSecondsInput.addEventListener("input", () => {
  let raw = mainGameSecondsInput.value.trim();
  if (raw === "") return;

  let value = parseInt(raw);
  if (isNaN(value)) {
    mainGameSecondsInput.value = "";
    return;
  }

  value = clamp(value, 1, 300);
  mainGameSecondsInput.value = value;
});

shieldsOffInput.addEventListener("change", () => {
  if (!shieldsOffInput.checked) {
    if (shieldIntervalInput.value.trim() === "" || parseInt(shieldIntervalInput.value) === 0) {
      shieldIntervalInput.value = DEFAULTS[selectedPlayerCount].shieldInterval;
    }
  }
});

startGameBtn.addEventListener("click", startGame);
backToModeSelectBtn.addEventListener("click", () => showScreen(menuScreen));
backToMenuBtn.addEventListener("click", returnToMenu);
restartBtn.addEventListener("click", createBoard);
enterOvertimeBtn.addEventListener("click", enterOvertime);

document.body.classList.add("theme-x");
showScreen(menuScreen);
