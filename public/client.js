// Initialize socket connection
const socket = io();

// Helper functions (These would ideally be in separate modules)
function initializeEmptyGrid() {
  return Array(5)
    .fill(null)
    .map(() => Array(6).fill(0));
}

function showNotification(message) {
  alert(message); // Replace with a more sophisticated notification system
}

function getSymbolById(id) {
  // Example symbols (replace with your actual symbol data)
  const symbols = [
    { id: 0, name: "Cherry", icon: "🍒", color: "bg-red-200" },
    { id: 1, name: "Lemon", icon: "🍋", color: "bg-yellow-200" },
    { id: 2, name: "Orange", icon: "🍊", color: "bg-orange-200" },
    { id: 3, name: "Plum", icon: "🍇", color: "bg-purple-200" },
    { id: 4, name: "Bell", icon: "🔔", color: "bg-yellow-400" },
    { id: 5, name: "Bar", icon: "🍫", color: "bg-brown-200" },
    { id: 6, name: "Seven", icon: "7️⃣", color: "bg-red-400" },
  ];
  return symbols[id] || { id: -1, name: "Unknown", icon: "❓", color: "bg-gray-200" };
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

// Example paytable (replace with your actual paytable data)
const payTable = {
  0: { 3: 1000, 4: 5000, 5: 20000 }, // Cherry
  1: { 3: 1500, 4: 7500, 5: 30000 }, // Lemon
  2: { 3: 2000, 4: 10000, 5: 40000 }, // Orange
  3: { 3: 2500, 4: 12500, 5: 50000 }, // Plum
  4: { 3: 3000, 4: 15000, 5: 60000 }, // Bell
  5: { 3: 4000, 4: 20000, 5: 80000 }, // Bar
  6: { 3: 5000, 4: 25000, 5: 100000 }, // Seven
};

// Example symbols array for paytable population
const symbols = [
  { id: 0, name: "Cherry", icon: "🍒" },
  { id: 1, name: "Lemon", icon: "🍋" },
  { id: 2, name: "Orange", icon: "🍊" },
  { id: 3, name: "Plum", icon: "🍇" },
  { id: 4, name: "Bell", icon: "🔔" },
  { id: 5, name: "Bar", icon: "🍫" },
  { id: 6, name: "Seven", icon: "7️⃣" },
];

// Register as client
socket.emit("register", "client");

// DOM elements
const slotGrid = document.getElementById("slot-grid");
const spinButton = document.getElementById("spin-button");
const balanceElement = document.getElementById("balance");
const winAmountElement = document.getElementById("win-amount");
const spinCountElement = document.getElementById("spin-count");
const consecutiveWinsElement = document.getElementById("consecutive-wins");
const statusIndicators = document.getElementById("status-indicators");
const infoButton = document.getElementById("info-button");
const infoModal = document.getElementById("info-modal");
const closeInfoModal = document.getElementById("close-info-modal");
const paytableContent = document.getElementById("paytable-content");

// Game state
let gameState = {
  balance: 100000,
  spinCount: 0,
  winAmount: 0,
  isSpinning: false,
  freeSpins: 0,
  multiplier: 1,
  consecutiveWins: 0,
};

let grid = initializeEmptyGrid();
let wins = [];

// Initialize the grid
renderGrid();
populatePaytable();

// Event listeners
spinButton.addEventListener("click", () => {
  if (gameState.isSpinning) return;

  socket.emit("spin");

  // Update UI immediately
  spinButton.textContent = "SPINNING...";
  spinButton.disabled = true;
  slotGrid.classList.add("animate-pulse");
});

infoButton.addEventListener("click", () => {
  infoModal.classList.remove("hidden");
});

closeInfoModal.addEventListener("click", () => {
  infoModal.classList.add("hidden");
});

// Socket event handlers
socket.on("gameState", (state) => {
  gameState = state;
  updateUI();
});

socket.on("spinResult", (result) => {
  grid = result.grid;
  wins = result.wins;

  renderGrid();

  // Remove spinning state
  slotGrid.classList.remove("animate-pulse");
  spinButton.disabled = false;

  if (gameState.freeSpins > 0) {
    spinButton.textContent = `FREE SPIN (${gameState.freeSpins})`;
  } else {
    spinButton.textContent = "SPIN (Rp 5.000)";
  }
});

socket.on("adminStatus", (status) => {
  updateAdminStatus(status.connected);
});

socket.on("notification", (data) => {
  showNotification(data.message);
});

socket.on("error", (data) => {
  showNotification(data.message);

  // Reset spinning state
  slotGrid.classList.remove("animate-pulse");
  spinButton.disabled = false;

  if (gameState.freeSpins > 0) {
    spinButton.textContent = `FREE SPIN (${gameState.freeSpins})`;
  } else {
    spinButton.textContent = "SPIN (Rp 5.000)";
  }
});

// Functions
function renderGrid() {
  slotGrid.innerHTML = "";

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 6; col++) {
      const symbolId = grid[row][col];
      const symbol = getSymbolById(symbolId);
      const isWinning = isWinningPosition(row, col);

      const cell = document.createElement("div");
      cell.className = `relative aspect-square rounded-lg flex items-center justify-center p-1 ${symbol.color} ${isWinning ? "animate-pulse ring-2 ring-yellow-400" : ""}`;
      cell.innerHTML = `<span class="text-3xl">${symbol.icon}</span>`;

      slotGrid.appendChild(cell);
    }
  }
}

function isWinningPosition(row, col) {
  return wins.some((win) => {
    if (win.type === "horizontal" && win.row === row) {
      return col >= win.startCol && col <= win.endCol;
    }
    if (win.type === "vertical" && win.col === col) {
      return row >= win.startRow && row <= win.endRow;
    }
    return false;
  });
}

function updateUI() {
  // Update balance and win amount
  balanceElement.textContent = formatCurrency(gameState.balance);
  winAmountElement.textContent = formatCurrency(gameState.winAmount);
  spinCountElement.textContent = gameState.spinCount;
  consecutiveWinsElement.textContent = gameState.consecutiveWins;

  // Update spin button
  if (gameState.isSpinning) {
    spinButton.textContent = "SPINNING...";
    spinButton.disabled = true;
  } else {
    if (gameState.freeSpins > 0) {
      spinButton.textContent = `FREE SPIN (${gameState.freeSpins})`;
    } else {
      spinButton.textContent = "SPIN (Rp 5.000)";
    }
    spinButton.disabled = gameState.balance < 5000 && gameState.freeSpins === 0;
  }

  // Update status indicators
  updateStatusIndicators();
}

function updateStatusIndicators() {
  statusIndicators.innerHTML = "";

  // Free spins indicator
  if (gameState.freeSpins > 0) {
    const freeSpinIndicator = document.createElement("div");
    freeSpinIndicator.className = "bg-green-600 px-2 py-1 rounded text-sm";
    freeSpinIndicator.textContent = `FREE: ${gameState.freeSpins}`;
    statusIndicators.appendChild(freeSpinIndicator);
  }

  // Multiplier indicator
  if (gameState.multiplier > 1) {
    const multiplierIndicator = document.createElement("div");
    multiplierIndicator.className = "bg-red-600 px-2 py-1 rounded text-sm";
    multiplierIndicator.textContent = `X${gameState.multiplier}`;
    statusIndicators.appendChild(multiplierIndicator);
  }
}

function updateAdminStatus(connected) {
  // Remove existing admin indicator if any
  const existingIndicator = document.querySelector(".admin-indicator");
  if (existingIndicator) {
    existingIndicator.remove();
  }

  if (connected) {
    const adminIndicator = document.createElement("div");
    adminIndicator.className = "bg-blue-600 px-2 py-1 rounded text-sm admin-indicator";
    adminIndicator.textContent = "ADMIN ONLINE";
    statusIndicators.appendChild(adminIndicator);
  }
}

function populatePaytable() {
  const container = document.createElement("div");
  container.className = "contents";

  symbols.forEach((symbol) => {
    // Symbol name and icon
    const symbolCell = document.createElement("div");
    symbolCell.className = "flex items-center gap-1";
    symbolCell.innerHTML = `<span class="text-xl">${symbol.icon}</span> <span>${symbol.name}</span>`;
    container.appendChild(symbolCell);

    // Payouts for 3, 4, and 5 matches
    for (let i = 3; i <= 5; i++) {
      const payoutCell = document.createElement("div");
      payoutCell.textContent = formatCurrency(payTable[symbol.id][i]);
      container.appendChild(payoutCell);
    }
  });

  paytableContent.appendChild(container);
}
