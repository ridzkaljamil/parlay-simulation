// Initialize socket connection
const socket = io();

// Register as admin
socket.emit("register", "admin");

// DOM elements
const connectionIndicator = document.getElementById("connection-indicator");
const connectionStatus = document.getElementById("connection-status");
const clientStatusCard = document.getElementById("client-status-card");
const clientBalance = document.getElementById("client-balance");
const clientSpinCount = document.getElementById("client-spin-count");
const clientWinAmount = document.getElementById("client-win-amount");
const clientStatus = document.getElementById("client-status");
const clientLastAction = document.getElementById("client-last-action");
const adjustBalanceButtons = document.querySelectorAll(".adjust-balance-btn");
const riggedActiveCheckbox = document.getElementById("rigged-active");
const riggedSpinNumber = document.getElementById("rigged-spin-number");
const riggedWinAmount = document.getElementById("rigged-win-amount");
const quickAmountButtons = document.getElementById("quick-amount-buttons");
const saveRiggedSettings = document.getElementById("save-rigged-settings");
const freeSpinCount = document.getElementById("free-spin-count");
const giveFreeSpinButton = document.getElementById("give-free-spin");
const resetGameButton = document.getElementById("reset-game");
const spinHistoryContainer = document.getElementById("spin-history");
const confirmModal = document.getElementById("confirm-modal");
const confirmMessage = document.getElementById("confirm-message");
const cancelConfirmButton = document.getElementById("cancel-confirm");
const proceedConfirmButton = document.getElementById("proceed-confirm");

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

let riggedSettings = {
  active: false,
  spinNumber: 5,
  winAmount: 20000,
};

let spinHistory = [];
let confirmCallback = null;

// Mocked data for payTable and getSymbolById
const payTable = {
  cherry: [0, 0, 5, 20],
  lemon: [0, 0, 10, 40],
  orange: [0, 0, 15, 60],
  plum: [0, 0, 20, 80],
  bell: [0, 0, 25, 100],
  bar: [0, 0, 50, 200],
  seven: [0, 0, 100, 400],
  diamond: [0, 0, 250, 1000],
};

function getSymbolById(symbolId) {
  switch (symbolId) {
    case "cherry":
      return { id: "cherry", name: "Cherry", icon: "🍒" };
    case "lemon":
      return { id: "lemon", name: "Lemon", icon: "🍋" };
    case "orange":
      return { id: "orange", name: "Orange", icon: "🍊" };
    case "plum":
      return { id: "plum", name: "Plum", icon: "🍇" };
    case "bell":
      return { id: "bell", name: "Bell", icon: "🔔" };
    case "bar":
      return { id: "bar", name: "Bar", icon: "🍫" };
    case "seven":
      return { id: "seven", name: "Seven", icon: "7️⃣" };
    case "diamond":
      return { id: "diamond", name: "Diamond", icon: "💎" };
    default:
      return { id: "unknown", name: "Unknown", icon: "❓" };
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(amount);
}

function showNotification(message) {
  const notificationElement = document.getElementById("notification");
  const notificationMessage = document.getElementById("notification-message");

  notificationMessage.textContent = message;
  notificationElement.classList.remove("translate-x-full");

  setTimeout(() => {
    notificationElement.classList.add("translate-x-full");
  }, 3000);
}

// Initialize quick amount buttons
initializeQuickAmountButtons();

// Event listeners
adjustBalanceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const amount = parseInt(button.dataset.amount);
    socket.emit("adjustBalance", amount);
  });
});

saveRiggedSettings.addEventListener("click", () => {
  riggedSettings = {
    active: riggedActiveCheckbox.checked,
    spinNumber: parseInt(riggedSpinNumber.value),
    winAmount: parseInt(riggedWinAmount.value),
  };

  socket.emit("setRiggedSettings", riggedSettings);
  showNotification("Pengaturan manipulasi disimpan");
});

giveFreeSpinButton.addEventListener("click", () => {
  const count = parseInt(freeSpinCount.value);
  if (count > 0) {
    socket.emit("giveFreeSpin", count);
  }
});

resetGameButton.addEventListener("click", () => {
  showConfirmation("Apakah Anda yakin ingin mereset permainan? Semua data akan dihapus.", () => {
    socket.emit("resetGame");
  });
});

cancelConfirmButton.addEventListener("click", () => {
  confirmModal.classList.add("hidden");
});

proceedConfirmButton.addEventListener("click", () => {
  if (confirmCallback) {
    confirmCallback();
    confirmCallback = null;
  }
  confirmModal.classList.add("hidden");
});

// Socket event handlers
socket.on("gameState", (state) => {
  gameState = state;
  updateUI();
});

socket.on("spinHistory", (history) => {
  spinHistory = history;
  updateSpinHistory();
});

socket.on("clientStatus", (status) => {
  updateClientStatus(status.connected);
});

socket.on("clientAction", (data) => {
  clientLastAction.textContent = data.action;
});

socket.on("riggedSettings", (settings) => {
  riggedSettings = settings;
  updateRiggedSettingsUI();
});

// Functions
function updateUI() {
  // Update client info
  clientBalance.textContent = formatCurrency(gameState.balance);
  clientSpinCount.textContent = gameState.spinCount;
  clientWinAmount.textContent = formatCurrency(gameState.winAmount);
  clientStatus.textContent = gameState.isSpinning ? "Sedang Spin" : "Idle";

  // Update rigged spin number min value
  riggedSpinNumber.min = gameState.spinCount + 1;

  // If current spin count is greater than rigged spin number, increment it
  if (gameState.spinCount >= riggedSpinNumber.value) {
    riggedSpinNumber.value = gameState.spinCount + 1;
  }
}

function updateClientStatus(connected) {
  if (connected) {
    connectionIndicator.classList.remove("bg-red-500");
    connectionIndicator.classList.add("bg-green-500");
    connectionStatus.textContent = "Client terhubung dan aktif";
    clientStatusCard.classList.remove("border-red-500");
    clientStatusCard.classList.add("border-green-500");
  } else {
    connectionIndicator.classList.remove("bg-green-500");
    connectionIndicator.classList.add("bg-red-500");
    connectionStatus.textContent = "Client tidak terhubung atau tidak aktif";
    clientStatusCard.classList.remove("border-green-500");
    clientStatusCard.classList.add("border-red-500");
  }
}

function updateRiggedSettingsUI() {
  riggedActiveCheckbox.checked = riggedSettings.active;
  riggedSpinNumber.value = riggedSettings.spinNumber;
  riggedWinAmount.value = riggedSettings.winAmount;
}

function updateSpinHistory() {
  if (spinHistory.length === 0) {
    spinHistoryContainer.innerHTML = '<div class="text-center py-8 text-gray-500">Belum ada riwayat spin</div>';
    return;
  }

  spinHistoryContainer.innerHTML = "";

  spinHistory.forEach((item, index) => {
    const historyItem = document.createElement("div");
    historyItem.className = "bg-gray-700 p-3 rounded-lg flex justify-between";

    const spinInfo = document.createElement("div");
    spinInfo.innerHTML = `
      <span class="font-medium text-white">Spin #${item.spinNumber}</span>
      <span class="text-gray-400 text-sm ml-2">${new Date(item.timestamp).toLocaleTimeString()}</span>
    `;

    const winInfo = document.createElement("span");
    winInfo.className = item.winAmount > 0 ? "text-green-400 font-bold" : "text-gray-400";
    winInfo.textContent = item.winAmount > 0 ? `+${formatCurrency(item.winAmount)}` : "Tidak Menang";

    historyItem.appendChild(spinInfo);
    historyItem.appendChild(winInfo);

    spinHistoryContainer.appendChild(historyItem);
  });
}

function initializeQuickAmountButtons() {
  quickAmountButtons.innerHTML = "";

  Object.entries(payTable).forEach(([symbolId, payouts]) => {
    const symbol = getSymbolById(symbolId);

    const button = document.createElement("button");
    button.className = "flex flex-col items-center p-2 bg-gray-700 hover:bg-gray-600 rounded";
    button.innerHTML = `
      <span class="text-2xl mb-1">${symbol.icon}</span>
      <span class="text-xs text-white">${symbol.name}</span>
      <span class="text-xs font-bold text-white">${formatCurrency(payouts[3])}</span>
    `;

    button.addEventListener("click", () => {
      riggedWinAmount.value = payouts[3];
    });

    quickAmountButtons.appendChild(button);
  });
}

function showConfirmation(message, callback) {
  confirmMessage.textContent = message;
  confirmCallback = callback;
  confirmModal.classList.remove("hidden");
}

// Create notification element if it doesn't exist
if (!document.getElementById("notification")) {
  const notificationElement = document.createElement("div");
  notificationElement.id = "notification";
  notificationElement.className = "fixed top-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg shadow-lg transform transition-transform duration-300 translate-x-full";

  const notificationMessage = document.createElement("p");
  notificationMessage.id = "notification-message";

  notificationElement.appendChild(notificationMessage);
  document.body.appendChild(notificationElement);
}
