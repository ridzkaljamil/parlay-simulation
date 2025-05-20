// Definisi simbol
const symbols = [
  { id: 'diamond', name: 'Permata Biru', color: 'bg-blue-100', icon: '💎' },
  { id: 'crown', name: 'Mahkota', color: 'bg-yellow-100', icon: '👑' },
  { id: 'bell', name: 'Lonceng', color: 'bg-yellow-50', icon: '🔔' },
  { id: 'clover', name: 'Daun Keberuntungan', color: 'bg-green-100', icon: '🍀' },
  { id: 'heart', name: 'Hati', color: 'bg-red-100', icon: '❤️' },
  { id: 'circle', name: 'Bola Ungu', color: 'bg-purple-100', icon: '🟣' },
];

// Tabel pembayaran
const payTable = {
  diamond: { 3: 15000, 4: 30000, 5: 60000, 6: 120000 },
  crown: { 3: 20000, 4: 40000, 5: 80000, 6: 160000 },
  bell: { 3: 10000, 4: 20000, 5: 40000, 6: 80000 },
  clover: { 3: 8000, 4: 16000, 5: 32000, 6: 64000 },
  heart: { 3: 5000, 4: 10000, 5: 20000, 6: 40000 },
  circle: { 3: 3000, 4: 6000, 5: 12000, 6: 24000 },
};

// Format number to currency
function formatCurrency(amount) {
  return 'Rp ' + amount.toLocaleString();
}

// Show notification
function showNotification(message, duration = 3000) {
  const notification = document.getElementById('notification');
  const notificationMessage = document.getElementById('notification-message');
  
  if (notification && notificationMessage) {
    notificationMessage.textContent = message;
    notification.classList.remove('translate-x-full');
    
    setTimeout(() => {
      notification.classList.add('translate-x-full');
    }, duration);
  }
}

// Get symbol by ID
function getSymbolById(id) {
  return symbols.find(s => s.id === id) || symbols[0];
}

// Initialize empty grid
function initializeEmptyGrid() {
  const grid = [];
  for (let row = 0; row < 5; row++) {
    const rowSymbols = [];
    for (let col = 0; col < 6; col++) {
      rowSymbols.push('diamond'); // Default symbol
    }
    grid.push(rowSymbols);
  }
  return grid;
}