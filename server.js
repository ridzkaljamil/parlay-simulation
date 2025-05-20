const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const path = require("path")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

// Serve static files
app.use(express.static("public"))

// Serve client.html as the main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "client.html"))
})

// Serve admin.html
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"))
})

// Game state
let gameState = {
  balance: 100000,
  spinCount: 0,
  winAmount: 0,
  isSpinning: false,
  freeSpins: 0,
  multiplier: 1,
  consecutiveWins: 0,
}

// Rigged settings
let riggedSettings = {
  active: false,
  spinNumber: 5,
  winAmount: 20000,
}

// Win/Loss Pattern settings
const patternSettings = {
  active: false,
  winFrequency: 10, // Win once every X spins (default: 1 in 10)
  currentPattern: [], // Will be generated based on winFrequency
  patternIndex: 0, // Current position in the pattern
  forceNextResult: null, // Can be 'win' or 'lose' to force next result
}

// Debug mode
const DEBUG = false

// Spin history
let spinHistory = []

// Connected clients tracking
let adminConnected = false
let clientConnected = false

// Define symbols
const symbols = [
  { id: "diamond", name: "Permata Biru", color: "bg-blue-100", icon: "💎" },
  { id: "crown", name: "Mahkota", color: "bg-yellow-100", icon: "👑" },
  { id: "bell", name: "Lonceng", color: "bg-yellow-50", icon: "🔔" },
  { id: "clover", name: "Daun Keberuntungan", color: "bg-green-100", icon: "🍀" },
  { id: "heart", name: "Hati", color: "bg-red-100", icon: "❤️" },
  { id: "circle", name: "Bola Ungu", color: "bg-purple-100", icon: "🟣" },
]

// Paytable
const payTable = {
  diamond: { 3: 15000, 4: 30000, 5: 60000, 6: 120000 },
  crown: { 3: 20000, 4: 40000, 5: 80000, 6: 160000 },
  bell: { 3: 10000, 4: 20000, 5: 40000, 6: 80000 },
  clover: { 3: 8000, 4: 16000, 5: 32000, 6: 64000 },
  heart: { 3: 5000, 4: 10000, 5: 20000, 6: 40000 },
  circle: { 3: 3000, 4: 6000, 5: 12000, 6: 24000 },
}

// Generate win/loss pattern based on frequency
function generatePattern(winFrequency) {
  const pattern = []
  for (let i = 0; i < winFrequency; i++) {
    pattern.push(i === 0) // true for win (first position), false for loss
  }

  // Shuffle the pattern to make it less predictable
  for (let i = pattern.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pattern[i], pattern[j]] = [pattern[j], pattern[i]]
  }

  if (DEBUG) {
    console.log("Generated pattern:", pattern)
  }

  return pattern
}

// Initialize pattern
patternSettings.currentPattern = generatePattern(patternSettings.winFrequency)

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("New connection:", socket.id)

  // Send symbols and paytable to all clients
  socket.emit("gameData", { symbols, payTable })

  // Identify client type
  socket.on("register", (type) => {
    console.log(`Client registered as: ${type}`)

    if (type === "admin") {
      adminConnected = true
      socket.join("admin")

      // Send initial data to admin
      socket.emit("gameState", gameState)
      socket.emit("spinHistory", spinHistory)
      socket.emit("clientStatus", { connected: clientConnected })
      socket.emit("patternSettings", patternSettings)

      // Notify client that admin connected
      io.to("client").emit("adminStatus", { connected: true })
    } else if (type === "client") {
      clientConnected = true
      socket.join("client")

      // Send initial data to client
      socket.emit("gameState", gameState)
      socket.emit("adminStatus", { connected: adminConnected })

      // Notify admin that client connected
      io.to("admin").emit("clientStatus", { connected: true })
    }

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`)

      if (type === "admin") {
        adminConnected = false
        io.to("client").emit("adminStatus", { connected: false })
      } else if (type === "client") {
        clientConnected = false
        io.to("admin").emit("clientStatus", { connected: false })
      }
    })
  })

  // Handle spin request from client
  socket.on("spin", (data) => {
    if (gameState.isSpinning) return

    // Update game state
    gameState.isSpinning = true

    const usingFreeSpin = gameState.freeSpins > 0

    if (usingFreeSpin) {
      gameState.freeSpins--
    } else {
      if (gameState.balance < 10000) {
        socket.emit("error", { message: "Saldo tidak cukup!" })
        gameState.isSpinning = false
        return
      }
      gameState.balance -= 10000
    }

    gameState.spinCount++

    // Broadcast updated state
    io.emit("gameState", gameState)
    io.to("admin").emit("clientAction", {
      action: usingFreeSpin ? "Menggunakan free spin" : "Melakukan spin dengan biaya Rp10.000",
    })

    // Process spin result after delay (simulating animation)
    setTimeout(() => {
      let result
      let resultType = "random" // For debugging

      // Determine if this spin should be a win or loss based on pattern
      let shouldWin = false

      // Check if rigged settings are active
      if (riggedSettings.active && gameState.spinCount === riggedSettings.spinNumber) {
        // Force a win with the specified amount
        result = generateSpinResult(riggedSettings.winAmount)
        resultType = "rigged"
        io.to("admin").emit("clientAction", { action: `Spin #${gameState.spinCount} dimanipulasi oleh admin` })
      }
      // Check if we have a forced next result
      else if (patternSettings.forceNextResult) {
        if (patternSettings.forceNextResult === "win") {
          // Generate a winning result with random win amount
          const minWin = 3000 // Minimum win amount
          const maxWin = 20000 // Maximum win amount
          const targetWin = Math.floor(Math.random() * (maxWin - minWin + 1)) + minWin
          result = generateSpinResult(targetWin)
          resultType = "forced win"
        } else {
          // Generate a losing result
          result = generateLosingResult()
          resultType = "forced loss"
        }
        // Reset the forced result
        patternSettings.forceNextResult = null
      }
      // Check if pattern control is active
      else if (patternSettings.active) {
        shouldWin = patternSettings.currentPattern[patternSettings.patternIndex]

        if (DEBUG) {
          console.log(`Pattern active: Index ${patternSettings.patternIndex}, Should win: ${shouldWin}`)
        }

        // Update pattern index for next spin
        patternSettings.patternIndex = (patternSettings.patternIndex + 1) % patternSettings.currentPattern.length

        if (shouldWin) {
          // Generate a winning result with random win amount
          const minWin = 3000 // Minimum win amount
          const maxWin = 20000 // Maximum win amount
          const targetWin = Math.floor(Math.random() * (maxWin - minWin + 1)) + minWin
          result = generateSpinResult(targetWin)
          resultType = "pattern win"
        } else {
          // Generate a losing result
          result = generateLosingResult()
          resultType = "pattern loss"
        }
      }
      // Normal random result with reduced win chance
      else {
        // Reduced win chance - only 5% chance to win (reduced from 15%)
        const winChance = 0.05
        if (Math.random() < winChance) {
          // Generate a winning result with random win amount
          const minWin = 3000 // Minimum win amount
          const maxWin = 20000 // Maximum win amount
          const targetWin = Math.floor(Math.random() * (maxWin - minWin + 1)) + minWin
          result = generateSpinResult(targetWin)
          resultType = "random win"
        } else {
          // Generate a losing result
          result = generateLosingResult()
          resultType = "random loss"
        }
      }

      if (DEBUG) {
        console.log(`Spin #${gameState.spinCount} result type: ${resultType}, Win amount: ${result.winAmount}`)
        if (result.wins && result.wins.length > 0) {
          console.log("Winning combinations:", result.wins)
        }
      }

      // Double-check the result to ensure it matches what we expect
      if (
        (resultType.includes("win") && result.winAmount === 0) ||
        (resultType.includes("loss") && result.winAmount > 0)
      ) {
        console.error("Result inconsistency detected!")
        console.error(`Expected: ${resultType}, Got: ${result.winAmount > 0 ? "win" : "loss"}`)

        // Force the correct result
        if (resultType.includes("win") && result.winAmount === 0) {
          // We expected a win but got a loss, force a win
          const minWin = 3000
          const maxWin = 20000
          const targetWin = Math.floor(Math.random() * (maxWin - minWin + 1)) + minWin
          result = generateSpinResult(targetWin, true) // true = force win
          console.log("Forced correction to win:", result.winAmount)
        } else if (resultType.includes("loss") && result.winAmount > 0) {
          // We expected a loss but got a win, force a loss
          result = generateLosingResult(true) // true = force loss
          console.log("Forced correction to loss")
        }
      }

      // Update game state with result
      gameState.winAmount = result.winAmount
      gameState.balance += result.winAmount
      gameState.isSpinning = false

      // Update consecutive wins and multiplier
      if (result.winAmount > 0) {
        gameState.consecutiveWins++

        // Apply multiplier for next spin if 2 consecutive wins
        if (gameState.consecutiveWins === 2) {
          gameState.multiplier = 2
        }

        // Check for free spin bonus (based on result)
        if (result.hasFreeSpinBonus) {
          gameState.freeSpins++
          io.to("admin").emit("clientAction", { action: "Mendapatkan 1 free spin dari 5 simbol diamond" })
        }
      } else {
        gameState.consecutiveWins = 0
        gameState.multiplier = 1
      }

      // Add to history
      const historyItem = {
        spinNumber: gameState.spinCount,
        winAmount: result.winAmount,
        timestamp: Date.now(),
        grid: result.grid,
      }

      spinHistory.unshift(historyItem)
      if (spinHistory.length > 10) spinHistory.pop()

      // Random bonus every 10 spins (30% chance)
      if (gameState.spinCount % 10 === 0 && Math.random() < 0.3) {
        const randomBonus = 10000
        gameState.balance += randomBonus
        socket.emit("notification", {
          message: `Selamat! Anda mendapatkan hadiah acak Rp${randomBonus.toLocaleString()}`,
        })
        io.to("admin").emit("clientAction", { action: `Mendapatkan hadiah acak Rp${randomBonus.toLocaleString()}` })
      }

      // Broadcast results
      io.emit("spinResult", {
        grid: result.grid,
        wins: result.wins,
        winAmount: result.winAmount,
      })

      io.emit("gameState", gameState)
      io.emit("spinHistory", spinHistory)

      // Notify admin
      io.to("admin").emit("clientAction", {
        action:
          result.winAmount > 0
            ? `Menang Rp${result.winAmount.toLocaleString()} pada spin #${gameState.spinCount}`
            : `Tidak menang pada spin #${gameState.spinCount}`,
      })
    }, 2000) // 2 second delay for animation
  })

  // Handle admin actions
  socket.on("adjustBalance", (amount) => {
    gameState.balance += amount
    io.emit("gameState", gameState)
    io.to("client").emit("notification", {
      message: `Admin mengubah saldo: ${amount > 0 ? "+" : ""}${amount.toLocaleString()}`,
    })
  })

  socket.on("giveFreeSpin", (count) => {
    gameState.freeSpins += Number.parseInt(count)
    io.emit("gameState", gameState)
    io.to("client").emit("notification", {
      message: `Admin memberikan ${count} free spin`,
    })
  })

  socket.on("setRiggedSettings", (settings) => {
    riggedSettings = settings
    socket.emit("riggedSettings", riggedSettings)
  })

  // Handle pattern settings update
  socket.on("setPatternSettings", (settings) => {
    patternSettings.active = settings.active
    patternSettings.winFrequency = settings.winFrequency

    // Generate new pattern
    patternSettings.currentPattern = generatePattern(patternSettings.winFrequency)
    patternSettings.patternIndex = 0

    // Send updated settings back to admin
    socket.emit("patternSettings", patternSettings)
  })

  // Handle force next result
  socket.on("forceNextResult", (result) => {
    patternSettings.forceNextResult = result // 'win' or 'lose'
    socket.emit("notification", {
      message: `Hasil berikutnya akan di-${result === "win" ? "menangkan" : "kalahkan"}`,
    })
  })

  socket.on("resetGame", () => {
    gameState = {
      balance: 100000,
      spinCount: 0,
      winAmount: 0,
      isSpinning: false,
      freeSpins: 0,
      multiplier: 1,
      consecutiveWins: 0,
    }

    spinHistory = []

    io.emit("gameState", gameState)
    io.emit("spinHistory", spinHistory)
    io.to("client").emit("notification", { message: "Admin mereset permainan" })
  })
})

// Helper function to generate a losing result
function generateLosingResult(forceCheck = false) {
  // Create a grid with no winning combinations
  const grid = generateNonWinningGrid()

  // Double-check to make sure there are no winning combinations
  if (forceCheck) {
    const wins = checkWins(grid)
    if (wins.length > 0) {
      console.error("Non-winning grid still has wins! Retrying...")
      return generateLosingResult(forceCheck)
    }
  }

  return {
    grid,
    wins: [],
    winAmount: 0,
    hasFreeSpinBonus: false,
  }
}

// Helper function to generate a non-winning grid
function generateNonWinningGrid() {
  let grid = []
  let hasWinningCombination = true
  let attempts = 0
  const maxAttempts = 10

  // Keep generating grids until we get one with no winning combinations
  while (hasWinningCombination && attempts < maxAttempts) {
    attempts++
    grid = []

    // Create a grid with more randomness to avoid patterns
    for (let row = 0; row < 5; row++) {
      const rowSymbols = []
      for (let col = 0; col < 6; col++) {
        // Add more randomness by ensuring adjacent cells are different
        let newSymbol
        let symbolAttempts = 0
        const maxSymbolAttempts = 10

        do {
          symbolAttempts++
          newSymbol = symbols[Math.floor(Math.random() * symbols.length)].id

          // Check if this symbol would create a potential winning combination
          const leftSymbol = col > 0 ? rowSymbols[col - 1] : null
          const leftLeftSymbol = col > 1 ? rowSymbols[col - 2] : null
          const aboveSymbol = row > 0 ? grid[row - 1][col] : null
          const aboveAboveSymbol = row > 1 ? grid[row - 2][col] : null

          // Avoid 3 in a row horizontally
          if (leftSymbol === newSymbol && leftLeftSymbol === newSymbol) {
            if (symbolAttempts < maxSymbolAttempts) continue
          }

          // Avoid 3 in a row vertically
          if (aboveSymbol === newSymbol && aboveAboveSymbol === newSymbol) {
            if (symbolAttempts < maxSymbolAttempts) continue
          }

          // Avoid 2 in a row horizontally if we're at the start of a potential 3
          if (col >= 1 && col <= 3) {
            if (leftSymbol === newSymbol) {
              if (symbolAttempts < maxSymbolAttempts) continue
            }
          }

          // Avoid 2 in a row vertically if we're at the start of a potential 3
          if (row >= 1 && row <= 2) {
            if (aboveSymbol === newSymbol) {
              if (symbolAttempts < maxSymbolAttempts) continue
            }
          }

          break
        } while (symbolAttempts < maxSymbolAttempts)

        rowSymbols.push(newSymbol)
      }
      grid.push(rowSymbols)
    }

    // Check if this grid has any winning combinations
    const wins = checkWins(grid)
    hasWinningCombination = wins.length > 0

    if (hasWinningCombination && DEBUG) {
      console.log(`Attempt ${attempts}: Grid still has winning combinations:`, wins)
    }
  }

  // If we couldn't generate a non-winning grid after max attempts,
  // manually break any winning combinations
  if (hasWinningCombination) {
    if (DEBUG) {
      console.log("Failed to generate non-winning grid after max attempts, manually breaking combinations")
    }

    const wins = checkWins(grid)

    // Break each winning combination
    wins.forEach((win) => {
      if (win.type === "horizontal") {
        // Replace the middle symbol of the winning combination
        const row = win.row
        const middleCol = Math.floor((win.startCol + win.endCol) / 2)

        // Find a different symbol
        const currentSymbol = grid[row][middleCol]
        let newSymbol
        do {
          newSymbol = symbols[Math.floor(Math.random() * symbols.length)].id
        } while (newSymbol === currentSymbol)

        grid[row][middleCol] = newSymbol
      } else if (win.type === "vertical") {
        // Replace the middle symbol of the winning combination
        const col = win.col
        const middleRow = Math.floor((win.startRow + win.endRow) / 2)

        // Find a different symbol
        const currentSymbol = grid[middleRow][col]
        let newSymbol
        do {
          newSymbol = symbols[Math.floor(Math.random() * symbols.length)].id
        } while (newSymbol === currentSymbol)

        grid[middleRow][col] = newSymbol
      }
    })

    // Verify we've broken all winning combinations
    const remainingWins = checkWins(grid)
    if (remainingWins.length > 0 && DEBUG) {
      console.log("Warning: Still have winning combinations after manual breaking:", remainingWins)
    }
  }

  return grid
}

// Helper function to generate spin result
function generateSpinResult(targetWinAmount = null, forceWin = false) {
  // Generate random grid or rigged grid
  let grid = []
  let wins = []
  let winAmount = 0
  let attempts = 0
  const maxAttempts = 5

  // Keep trying until we get a winning grid or reach max attempts
  while ((winAmount === 0 || (targetWinAmount && winAmount > targetWinAmount)) && attempts < maxAttempts) {
    attempts++

    if (targetWinAmount) {
      // Create a rigged grid to achieve target win amount
      grid = createRiggedGrid(targetWinAmount)
    } else if (forceWin) {
      // Create a grid with at least one winning combination
      grid = createForcedWinGrid()
    } else {
      // Create random grid
      for (let row = 0; row < 5; row++) {
        const rowSymbols = []
        for (let col = 0; col < 6; col++) {
          rowSymbols.push(symbols[Math.floor(Math.random() * symbols.length)].id)
        }
        grid.push(rowSymbols)
      }
    }

    // Check for wins
    wins = checkWins(grid)

    // Calculate win amount
    winAmount = 0
    wins.forEach((win) => {
      const symbolPayouts = payTable[win.symbol]
      if (symbolPayouts && symbolPayouts[win.count]) {
        winAmount += symbolPayouts[win.count]
      }
    })

    if (DEBUG && attempts > 1) {
      console.log(`Attempt ${attempts} to generate winning grid: ${winAmount > 0 ? "Success" : "Failed"}`)
    }
  }

  // If we still don't have a winning grid after max attempts and we need to force a win,
  // create a guaranteed winning grid
  if (winAmount === 0 && forceWin) {
    if (DEBUG) {
      console.log("Failed to generate winning grid after max attempts, creating guaranteed win")
    }

    // Create a grid with a guaranteed 3-in-a-row of the lowest value symbol
    grid = []
    for (let row = 0; row < 5; row++) {
      const rowSymbols = []
      for (let col = 0; col < 6; col++) {
        rowSymbols.push(symbols[Math.floor(Math.random() * symbols.length)].id)
      }
      grid.push(rowSymbols)
    }

    // Add a guaranteed win in the first row
    grid[0][0] = "circle" // Lowest value symbol
    grid[0][1] = "circle"
    grid[0][2] = "circle"

    // Recalculate wins and win amount
    wins = checkWins(grid)
    winAmount = 0
    wins.forEach((win) => {
      const symbolPayouts = payTable[win.symbol]
      if (symbolPayouts && symbolPayouts[win.count]) {
        winAmount += symbolPayouts[win.count]
      }
    })
  }

  // Apply multiplier if active
  if (gameState.multiplier > 1) {
    winAmount *= gameState.multiplier
  }

  // Check for free spin bonus (5 diamond symbols)
  const hasFreeSpinBonus = wins.some((win) => win.symbol === "diamond" && win.count >= 5)

  return {
    grid,
    wins,
    winAmount,
    hasFreeSpinBonus,
  }
}

// Helper function to create a forced win grid
function createForcedWinGrid() {
  // Create random grid
  const grid = []
  for (let row = 0; row < 5; row++) {
    const rowSymbols = []
    for (let col = 0; col < 6; col++) {
      rowSymbols.push(symbols[Math.floor(Math.random() * symbols.length)].id)
    }
    grid.push(rowSymbols)
  }

  // Add a guaranteed win in the first row with a random symbol
  const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)].id
  grid[0][0] = randomSymbol
  grid[0][1] = randomSymbol
  grid[0][2] = randomSymbol

  return grid
}

// Helper function to create a rigged grid
function createRiggedGrid(targetWinAmount) {
  // Find symbol and count that can produce the desired win amount
  let selectedSymbol = null
  let requiredCount = 0

  // Find combination closest to target
  Object.entries(payTable).forEach(([symbol, payouts]) => {
    Object.entries(payouts).forEach(([count, amount]) => {
      if (amount <= targetWinAmount && (!selectedSymbol || amount > payTable[selectedSymbol][requiredCount])) {
        selectedSymbol = symbol
        requiredCount = Number.parseInt(count)
      }
    })
  })

  // If no matching combination, use smallest one
  if (!selectedSymbol) {
    selectedSymbol = "circle"
    requiredCount = 3
  }

  // Create random grid
  const grid = []
  for (let row = 0; row < 5; row++) {
    const rowSymbols = []
    for (let col = 0; col < 6; col++) {
      rowSymbols.push(symbols[Math.floor(Math.random() * symbols.length)].id)
    }
    grid.push(rowSymbols)
  }

  // Add winning combination in first row
  for (let i = 0; i < requiredCount; i++) {
    grid[0][i] = selectedSymbol
  }

  return grid
}

// Helper function to check wins
function checkWins(grid) {
  const wins = []

  // Check horizontal
  for (let row = 0; row < 5; row++) {
    let currentSymbol = null
    let count = 0

    for (let col = 0; col < 6; col++) {
      if (grid[row][col] === currentSymbol && currentSymbol !== null) {
        count++

        // If this is the last column and we have at least 3 matching symbols
        if (col === 5 && count >= 3) {
          wins.push({
            symbol: currentSymbol,
            count: count,
            type: "horizontal",
            row: row,
            startCol: col - count + 1,
            endCol: col,
          })
        }
      } else {
        // If we have at least 3 matching symbols before symbol changes
        if (count >= 3) {
          wins.push({
            symbol: currentSymbol,
            count: count,
            type: "horizontal",
            row: row,
            startCol: col - count,
            endCol: col - 1,
          })
        }

        currentSymbol = grid[row][col]
        count = 1
      }
    }
  }

  // Check vertical
  for (let col = 0; col < 6; col++) {
    let currentSymbol = null
    let count = 0

    for (let row = 0; row < 5; row++) {
      if (grid[row][col] === currentSymbol && currentSymbol !== null) {
        count++

        // If this is the last row and we have at least 3 matching symbols
        if (row === 4 && count >= 3) {
          wins.push({
            symbol: currentSymbol,
            count: count,
            type: "vertical",
            col: col,
            startRow: row - count + 1,
            endRow: row,
          })
        }
      } else {
        // If we have at least 3 matching symbols before symbol changes
        if (count >= 3) {
          wins.push({
            symbol: currentSymbol,
            count: count,
            type: "vertical",
            col: col,
            startRow: row - count,
            endRow: row - 1,
          })
        }

        currentSymbol = grid[row][col]
        count = 1
      }
    }
  }

  return wins
}

// Start server
const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
