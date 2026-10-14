// Virtual Farm Tycoon Game Logic
class VirtualFarmTycoon {
  constructor() {
    this.gameState = {
      // Serve denaro iniziale: senza, ogni entrata richiede un raccolto che
      // richiede una semina che richiede denaro — il gioco non può iniziare.
      coins: 250,
      day: 1,
      weather: '☀️',
      weatherCycle: ['☀️', '☀️', '🌧️', '⛈️', '☁️', '🌧️', '❄️', '☀️'],
      landSize: { rows: 1, cols: 1 },
      maxLand: { rows: 5, cols: 5 },
      farm: [],
      // Personaggi: il primo contadino è incluso, gli altri si assumono.
      workers: [{ id: 1, type: 'field', since: 1 }],
      inventory: {
        crops: {
          corn: { count: 5, price: 10 },
          wheat: { count: 5, price: 8 },
          tomato: { count: 5, price: 12 },
          carrot: { count: 3, price: 9 },
          potato: { count: 3, price: 11 }
        },
        animals: { chicken: { count: 2, feedCost: 5 }, cow: { count: 0, feedCost: 15 } },
        tools: { hoe: { count: 1, cost: 50 }, water_can: { count: 1, cost: 30 }, harvester: { count: 0, cost: 200 } }
      },
      achievements: { first_harvest: false, first_animal: false, land_expansion: false }
    }
    
    this.cropTypes = {
      corn: { growthTime: 3, harvestAmount: 2, sellPrice: 10, seedCost: 5, icon: '🌽' },
      wheat: { growthTime: 2, harvestAmount: 3, sellPrice: 8, seedCost: 4, icon: '🌾' },
      tomato: { growthTime: 4, harvestAmount: 1, sellPrice: 12, seedCost: 6, icon: '🍅' },
      carrot: { growthTime: 3, harvestAmount: 2, sellPrice: 9, seedCost: 5, icon: '🥕' },
      potato: { growthTime: 2, harvestAmount: 3, sellPrice: 11, seedCost: 6, icon: '🥔' }
    }
    
    this.animalTypes = {
      chicken: { feedCost: 5, produce: 2, icon: '🐔', needsFeed: true },
      cow: { feedCost: 15, produce: 5, icon: '🐄', needsFeed: true },
      sheep: { feedCost: 10, produce: 3, icon: '🐑', needsFeed: true }
    }

    // I personaggi danno una spinta alla crescita: con un solo contadino la
    // fattoria avanza, ma assumere aiutanti la fa andare più veloce.
    this.farmerTypes = {
      field:  { name: 'Campagnolo', icon: '🧑‍🌾', cost: 0,   boost: 0.00 },
      helper: { name: 'Aiutante',   icon: '👩‍🌾', cost: 40,  boost: 0.25 },
      expert: { name: 'Mastro',     icon: '🧑‍🔬', cost: 120, boost: 0.60 },
    }
    
    this.weatherEffects = {
      '☀️': { growthBoost: 1.2, waterNeeded: 1, feedBonus: 0 },
      '🌧️': { growthBoost: 1.0, waterNeeded: 2, feedBonus: 0 },
      '⛈️': { growthBoost: 0.8, waterNeeded: 3, feedBonus: 0 },
      '☁️': { growthBoost: 1.1, waterNeeded: 1, feedBonus: 0 },
      '❄️': { growthBoost: 0.6, waterNeeded: 0, feedBonus: -1 }
    }
    
    this.init()
  }
  
  init() {
    // Register the service worker (required for offline support + install prompt)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js').catch(() => {})
    }

    // Load saved game
    this.loadGame()
    
    // Setup event listeners
    this.setupEventListeners()
    
    // Start daily cycle
    this.startDailyCycle()
    
    // Initialize UI
    this.renderUI()

    // La griglia va costruita SEMPRE. Prima dipendeva da hideOverlay(), che
    // gira una sola volta: a ogni visita successiva restava una griglia
    // vuota, senza celle cliccabili, quindi impossibile piantare.
    this.createFarmGrid()

    // Show overlay if first visit
    if (this.gameState.day === 1 && !localStorage.getItem('visited')) {
      this.showOverlay()
      localStorage.setItem('visited', 'true')
    }
  }
  
  setupEventListeners() {
    // Install prompt
    const installBtn = document.getElementById('install-btn')
    const installLater = document.getElementById('install-later')
    const installPrompt = document.getElementById('install-prompt')
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        installPrompt.classList.remove('hidden')
      })
    }
    
    installBtn?.addEventListener('click', () => this.installApp())
    installLater?.addEventListener('click', () => installPrompt.classList.add('hidden'))
    
    // Farm grid click handling
    document.getElementById('farm-grid')?.addEventListener('click', (e) => {
      const cell = e.target.closest('.farm-cell')
      if (cell) this.handleCellClick(cell)
    })
    
    // Tool buttons
    document.getElementById('sell-all-btn')?.addEventListener('click', () => this.sellAllCrops())
    document.getElementById('plant-all-btn')?.addEventListener('click', () => this.plantAll())
    document.getElementById('next-day-btn')?.addEventListener('click', () => this.nextDay())
    
    // Overlay play button
    document.getElementById('overlay-play')?.addEventListener('click', () => this.hideOverlay())
    
    // Window before unload to save game
    window.addEventListener('beforeunload', () => this.saveGame())
  }
  
  createFarmGrid() {
    const gridElement = document.getElementById('farm-grid')
    gridElement.innerHTML = ''
    
    for (let row = 0; row < this.gameState.landSize.rows; row++) {
      for (let col = 0; col < this.gameState.landSize.cols; col++) {
        const cell = document.createElement('div')
        cell.className = 'farm-cell'
        cell.dataset.row = row
        cell.dataset.col = col
        
        const existingPlot = this.gameState.farm.find(p => p.row === row && p.col === col)
        if (existingPlot) {
          cell.appendChild(this.createPlotElement(existingPlot))
        } else {
          cell.innerHTML = '➕'
        }
        
        gridElement.appendChild(cell)
      }
    }
    
    this.renderInventory()
  }
  
  createPlotElement(plot) {
    const plotDiv = document.createElement('div')
    plotDiv.style.position = 'relative'
    plotDiv.style.width = '100%'
    plotDiv.style.height = '100%'
    
    if (plot.type === 'crop') {
      const icon = document.createElement('span')
      icon.className = 'crop-icon'
      icon.textContent = this.cropTypes[plot.cropType].icon
      plotDiv.appendChild(icon)
      
      if (plot.growth > 0) {
        const progressBar = document.createElement('div')
        progressBar.className = 'growth-indicator'
        const bar = document.createElement('div')
        bar.className = 'growth-bar'
        bar.style.width = `${(plot.growth / this.cropTypes[plot.cropType].growthTime) * 100}%`
        progressBar.appendChild(bar)
        plotDiv.appendChild(progressBar)
      }
      
      if (plot.watered) {
        const waterIcon = document.createElement('span')
        waterIcon.textContent = '💧'
        waterIcon.style.position = 'absolute'
        waterIcon.style.top = '0'
        waterIcon.style.right = '0'
        plotDiv.appendChild(waterIcon)
      }
    }
    
    else if (plot.type === 'animal') {
      const icon = document.createElement('span')
      icon.className = 'animal-icon'
      icon.textContent = this.animalTypes[plot.animalType].icon
      plotDiv.appendChild(icon)
      
      const feedIndicator = document.createElement('span')
      feedIndicator.textContent = plot.feedToday ? '✅' : '🍽️'
      feedIndicator.style.position = 'absolute'
      feedIndicator.style.bottom = '0'
      feedIndicator.style.right = '0'
      plotDiv.appendChild(feedIndicator)
    }
    
    return plotDiv
  }
  
  handleCellClick(cell) {
    const row = parseInt(cell.dataset.row)
    const col = parseInt(cell.dataset.col)
    const plot = this.gameState.farm.find(p => p.row === row && p.col === col)
    
    if (!plot) {
      // Empty cell - plant something
      this.showPlantMenu(row, col)
    } else {
      // Existing plot - show actions
      this.showPlotActions(plot)
    }
  }
  
  showPlantMenu(row, col) {
    const plants = Object.entries(this.cropTypes).map(([type, data]) => ({ type, data }))
    
    const menu = document.createElement('div')
    menu.className = 'overlay'
    menu.innerHTML = `
      <div class="panel">
        <h2>Plant Something</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 10px;">
          ${plants.map(({ type, data }) => `
            <div style="text-align: center; cursor: pointer; padding: 10px; border: 2px solid #4caf50; border-radius: 8px;" onclick="game.plantCrop('${type}', ${row}, ${col})">
              <div style="font-size: 2em;">${data.icon}</div>
              <div style="font-size: 0.8em;">${type}</div>
              <div style="font-size: 0.7em; color: #666;">${(this.gameState.inventory.crops[type]?.count || 0) > 0 ? 'in dispensa' : data.seedCost + ' coins'}</div>
            </div>
          `).join('')}
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="btn danger">Cancel</button>
      </div>
    `
    
    document.body.appendChild(menu)
  }
  
  showPlotActions(plot) {
    const plotData = this.gameState.farm.find(p => p.row === plot.row && p.col === plot.col)
    const cell = document.querySelector(`.farm-cell[data-row="${plot.row}"][data-col="${plot.col}"]`)
    
    if (plot.type === 'crop') {
      const actions = []
      
      if (plot.growth >= this.cropTypes[plot.cropType].growthTime) {
        actions.push(`<div onclick="game.harvestCrop(${plot.row}, ${plot.col})" class="btn">Harvest 🌾</div>`)
      }
      
      if (!plot.watered) {
        actions.push(`<div onclick="game.waterCrop(${plot.row}, ${plot.col})" class="btn">Water 💧</div>`)
      }
      
      actions.push(`<div onclick="removeActions()" class="btn danger">Cancel</div>`)
      
      cell.innerHTML = `
        <div style="text-align: center; padding: 10px;">
          <div style="font-size: 2em;">${this.cropTypes[plot.cropType].icon}</div>
          <div>Growth: ${plot.growth}/${this.cropTypes[plot.cropType].growthTime}</div>
          <div style="margin-top: 10px;">${actions.join(' ')}</div>
        </div>
      `
    } else if (plot.type === 'animal') {
      const actions = []
      
      if (plot.feedToday) {
        actions.push(`<div onclick="game.milkAnimal(${plot.row}, ${plot.col})" class="btn">Collect Product 🧥</div>`)
      } else {
        actions.push(`<div onclick="game.feedAnimal(${plot.row}, ${plot.col})" class="btn">Feed 🍽️</div>`)
      }
      
      actions.push(`<div onclick="removeActions()" class="btn danger">Cancel</div>`)
      
      cell.innerHTML = `
        <div style="text-align: center; padding: 10px;">
          <div style="font-size: 2em;">${this.animalTypes[plot.animalType].icon}</div>
          <div>Animal: ${plot.animalType}</div>
          <div>Fed today: ${plot.feedToday ? '✅' : '❌'}</div>
          <div style="margin-top: 10px;">${actions.join(' ')}</div>
        </div>
      `
    }
    
    const removeActions = () => {
      this.createFarmGrid()
    }
    
    window.removeActions = removeActions
  }
  
  plantCrop(cropType, row, col) {
    const def = this.cropTypes[cropType]
    if (!def) return

    if (this.gameState.farm.some(p => p.row === row && p.col === col)) {
      this.showMessage('That plot is already used!')
      return
    }

    // Un seme già in dispensa è gratis; altrimenti si compra al prezzo.
    const stock = this.gameState.inventory.crops[cropType]
    if (stock && stock.count > 0) {
      stock.count--
    } else {
      if (this.gameState.coins < def.seedCost) {
        this.showMessage('Not enough coins to plant!')
        return
      }
      this.gameState.coins -= def.seedCost
    }

    this.gameState.farm.push({
      type: 'crop',
      cropType: cropType,
      growth: 0,
      row: row,
      col: col,
      plantedDay: this.gameState.day,
      watered: false
    })

    this.saveGame()
    this.createFarmGrid()
  }

  // I raccolti non maturi non fruttano nulla: senza questo controllo
  // harvestCrop() e sellAllCrops() pagavano a pieno prezzo appena piantato.
  isRipe(plot) {
    return plot.type === 'crop' && plot.growth >= this.cropTypes[plot.cropType].growthTime
  }
  
  waterCrop(row, col) {
    const plot = this.gameState.farm.find(p => p.row === row && p.col === col)
    if (plot && plot.type === 'crop') {
      plot.watered = true
      this.saveGame()
      this.createFarmGrid()
    }
  }
  
  harvestCrop(row, col) {
    const plotIndex = this.gameState.farm.findIndex(p => p.row === row && p.col === col)
    if (plotIndex === -1) return
    
    const plot = this.gameState.farm[plotIndex]
    if (plot.type !== 'crop') return

    if (!this.isRipe(plot)) {
      this.showMessage('🌱 Not ripe yet — let it grow!')
      return
    }

    const cropData = this.cropTypes[plot.cropType]
    const harvestAmount = cropData.harvestAmount

    this.gameState.coins += harvestAmount * cropData.sellPrice
    // il raccolto torna in dispensa come sementi
    const stock = this.gameState.inventory.crops[plot.cropType]
    if (stock) stock.count += 1
    
    // Check for achievements
    if (!this.gameState.achievements.first_harvest) {
      this.gameState.achievements.first_harvest = true
      this.showMessage('🏆 Achievement Unlocked: First Harvest!')
    }
    
    // Remove the harvested crop
    this.gameState.farm.splice(plotIndex, 1)
    this.saveGame()
    this.createFarmGrid()
  }
  
  feedAnimal(row, col) {
    const plot = this.gameState.farm.find(p => p.row === row && p.col === col)
    if (!plot || plot.type !== 'animal') return
    
    const animalData = this.animalTypes[plot.animalType]
    if (this.gameState.coins < animalData.feedCost) {
      this.showMessage('Not enough coins to feed!')
      return
    }
    
    this.gameState.coins -= animalData.feedCost
    plot.feedToday = true
    this.saveGame()
    this.createFarmGrid()
  }
  
  milkAnimal(row, col) {
    const plot = this.gameState.farm.find(p => p.row === row && p.col === col)
    if (!plot || plot.type !== 'animal') return
    
    const animalData = this.animalTypes[plot.animalType]
    this.gameState.coins += animalData.produce
    
    // Check for achievements
    if (!this.gameState.achievements.first_animal) {
      this.gameState.achievements.first_animal = true
      this.showMessage('🏆 Achievement Unlocked: First Animal!')
    }
    
    plot.feedToday = false
    this.saveGame()
    this.createFarmGrid()
  }
  
  sellAllCrops() {
    const cropsToSell = this.gameState.farm.filter(p => this.isRipe(p))
    let totalEarnings = 0

    cropsToSell.forEach(plot => {
      const cropData = this.cropTypes[plot.cropType]
      const harvestAmount = cropData.harvestAmount
      totalEarnings += harvestAmount * cropData.sellPrice
      const stock = this.gameState.inventory.crops[plot.cropType]
      if (stock) stock.count += 1
    })

    if (totalEarnings === 0) {
      this.showMessage('Nothing ripe to sell yet.')
      return
    }

    this.gameState.coins += totalEarnings
    const sold = new Set(cropsToSell)
    this.gameState.farm = this.gameState.farm.filter(p => !sold.has(p))
    
    this.showMessage(`Sold all crops for ${totalEarnings} coins!`)
    this.saveGame()
    this.createFarmGrid()
  }
  
  plantAll() {
    const emptyCells = []
    const cropTypes = Object.keys(this.cropTypes)
    
    for (let row = 0; row < this.gameState.landSize.rows; row++) {
      for (let col = 0; col < this.gameState.landSize.cols; col++) {
        const existingPlot = this.gameState.farm.find(p => p.row === row && p.col === col)
        if (!existingPlot) {
          emptyCells.push({ row, col })
        }
      }
    }
    
    emptyCells.forEach((cell, index) => {
      const cropType = cropTypes[index % cropTypes.length]
      this.plantCrop(cropType, cell.row, cell.col)
    })
  }

  // Spinta alla crescita data dai personaggi: 0 con il solo contadino iniziale.
  workerBoost() {
    const list = this.gameState.workers || []
    return list.reduce((a, w) => a + (this.farmerTypes[w.type]?.boost || 0), 0)
  }

  hireWorker(type) {
    const def = this.farmerTypes[type]
    if (!def) return
    const list = this.gameState.workers || (this.gameState.workers = [])
    if (list.length >= 4) {
      this.showMessage('The farm is fully staffed!')
      return
    }
    if (def.cost > 0 && this.gameState.coins < def.cost) {
      this.showMessage(`Hiring a ${def.name} costs ${def.cost} coins.`)
      return
    }
    this.gameState.coins -= def.cost
    list.push({ id: list.length + 1, type: type, since: this.gameState.day })
    this.showMessage(`👋 ${def.name} joins the farm.`)
    this.saveGame()
    this.renderStaff()
    this.renderUI()
  }
  
  startDailyCycle() {
    setInterval(() => {
      this.nextDay()
    }, 5000) // Advance day every 5 seconds for demo
  }
  
  nextDay() {
    this.gameState.day++
    
    // Change weather
    const weatherIndex = Math.floor(Math.random() * this.gameState.weatherCycle.length)
    this.gameState.weather = this.gameState.weatherCycle[weatherIndex]
    
    // Update crops growth
    this.gameState.farm = this.gameState.farm.map(plot => {
      if (plot.type === 'crop') {
        const cropData = this.cropTypes[plot.cropType]
        
        // Apply weather effects
        const weatherEffect = this.weatherEffects[this.gameState.weather]
        const growthRate = weatherEffect.growthBoost * (1 + this.workerBoost())

        // Check if crop needs water
        if (!plot.watered && plot.growth > 0) {
          this.gameState.coins = Math.max(0, this.gameState.coins - 5) // Water cost
        }
        
        plot.growth += growthRate
        plot.watered = false // Reset water status for new day
        
        if (plot.growth > cropData.growthTime) {
          plot.growth = cropData.growthTime
        }
      }
      
      else if (plot.type === 'animal') {
        const animalData = this.animalTypes[plot.animalType]
        
        // Check if animal needs feeding
        if (animalData.needsFeed && !plot.feedToday) {
          if (this.gameState.coins < animalData.feedCost) {
            // Remove animal if can't feed
            return null
          }
          this.gameState.coins -= animalData.feedCost
          plot.feedToday = true
        }
      }
      
      return plot
    }).filter(plot => plot !== null)
    
    // Remove dead animals
    this.gameState.farm = this.gameState.farm.filter(plot => plot !== null)
    
    this.saveGame()
    this.renderUI()
    
    if (this.gameState.day % 3 === 0) {
      this.showMessage('Market Day! Prices may be volatile.')
    }
  }
  
  expandLand() {
    if (this.gameState.coins < 100 || this.gameState.landSize.cols >= this.gameState.maxLand.cols) {
      this.showMessage('Not enough coins or land at max capacity!')
      return
    }
    
    this.gameState.coins -= 100
    this.gameState.landSize.cols++
    
    if (!this.gameState.achievements.land_expansion) {
      this.gameState.achievements.land_expansion = true
      this.showMessage('🏆 Achievement Unlocked: Land Expansion!')
    }
    
    this.saveGame()
    this.createFarmGrid()
  }
  
  buyAnimal(animalType) {
    if (this.gameState.coins < 50) {
      this.showMessage('Not enough coins!')
      return
    }
    
    this.gameState.coins -= 50
    this.gameState.farm.push({
      type: 'animal',
      animalType: animalType,
      row: Math.floor(Math.random() * this.gameState.landSize.rows),
      col: Math.floor(Math.random() * this.gameState.landSize.cols),
      feedToday: false
    })
    
    this.saveGame()
    this.createFarmGrid()
  }
  
  renderInventory() {
    // Render crops inventory
    const cropInventory = document.getElementById('crop-inventory')
    if (cropInventory) {
      cropInventory.innerHTML = Object.entries(this.gameState.inventory.crops).map(([type, data]) => `
        <div class="inventory-item" onclick="game.buyCrop('${type}')">
          <div class="inventory-icon">${this.cropTypes[type].icon}</div>
          <div style="font-size: 0.7em;">${data.count}</div>
        </div>
      `).join('')
    }
    
    // Render animals inventory
    const animalInventory = document.getElementById('animal-inventory')
    if (animalInventory) {
      animalInventory.innerHTML = Object.entries(this.gameState.inventory.animals).map(([type, data]) => `
        <div class="inventory-item" onclick="game.buyAnimal('${type}')">
          <div class="inventory-icon">${this.animalTypes[type].icon}</div>
          <div style="font-size: 0.7em;">${data.count}</div>
        </div>
      `).join('')
    }
    
    // Render tools inventory
    const toolInventory = document.getElementById('tool-inventory')
    if (toolInventory) {
      toolInventory.innerHTML = Object.entries(this.gameState.inventory.tools).map(([type, data]) => `
        <div class="inventory-item" onclick="game.buyTool('${type}')">
          <div class="inventory-icon">🛠️</div>
          <div style="font-size: 0.7em;">${data.count}</div>
        </div>
      `).join('')
    }
  }
  
  renderUI() {
    document.getElementById('coins').textContent = this.gameState.coins
    document.getElementById('day').textContent = this.gameState.day
    document.getElementById('weather').textContent = this.gameState.weather
    document.getElementById('land-size').textContent = `${this.gameState.landSize.rows}x${this.gameState.landSize.cols}`
    const sc = document.getElementById('staff-count')
    if (sc) sc.textContent = (this.gameState.workers || []).length
    this.renderStaff()
  }

  // La squadra: i personaggi che danno la spinta alla crescita.
  renderStaff() {
    const el = document.getElementById('farm-staff')
    if (!el) return
    const list = this.gameState.workers || []
    const names = Object.entries(this.farmerTypes)
      .filter(([, d]) => d.cost > 0)
      .map(([key, d]) =>
        `<button class="btn sm" onclick="game.hireWorker('${key}')" ` +
        `title="+${Math.round(d.boost * 100)}% growth">${d.icon} Hire ${d.name} · ${d.cost}</button>`
      ).join('')
    el.innerHTML =
      `<div class="staff-row">👥 <strong>${list.length}</strong> · ` +
      list.map(w => {
        const d = this.farmerTypes[w.type]
        return `<span class="worker-chip" title="${d.name}">${d.icon}</span>`
      }).join('') +
      ` <small style="opacity:.6">growth +${Math.round(this.workerBoost() * 100)}%</small></div>` +
      `<div class="staff-hire">${names || '<small>Fully staffed</small>'}</div>`
  }
  
  showMessage(message) {
    const msg = document.createElement('div')
    msg.style.position = 'fixed'
    msg.style.bottom = '20px'
    msg.style.left = '50%'
    msg.style.transform = 'translateX(-50%)'
    msg.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)'
    msg.style.color = 'white'
    msg.style.padding = '15px 25px'
    msg.style.borderRadius = '25px'
    msg.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)'
    msg.style.zIndex = '1000'
    msg.textContent = message
    document.body.appendChild(msg)
    
    setTimeout(() => {
      msg.remove()
    }, 3000)
  }
  
  showOverlay() {
    const overlay = document.getElementById('overlay')
    overlay.classList.remove('hidden')
  }
  
  hideOverlay() {
    const overlay = document.getElementById('overlay')
    overlay.classList.add('hidden')
    this.createFarmGrid()
  }
  
  installApp() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showInstallPrompt()
      })
    }
  }
  
  saveGame() {
    localStorage.setItem('farmTycoonSave-v2', JSON.stringify(this.gameState))
  }

  loadGame() {
    const saved = localStorage.getItem('farmTycoonSave-v2')
    if (saved) {
      try {
        this.gameState = { ...this.gameState, ...JSON.parse(saved) }
      } catch (e) {
        console.error('Failed to load saved game:', e)
      }
    }
    // I salvataggi pre-v2 hanno zero monete e nessun personaggio: senza
    // ripartire da zero il gioco resta irraggiungibile per sempre.
    if (!this.gameState.workers || !this.gameState.workers.length) {
      this.gameState.workers = [{ id: 1, type: 'field', since: 1 }]
    }
    if (this.gameState.coins === 0) this.gameState.coins = 250
    this.gameState.inventory.crops.carrot ||= { count: 3, price: 9 }
    this.gameState.inventory.crops.potato ||= { count: 3, price: 11 }
  }
}

// Initialize game
const game = new VirtualFarmTycoon()

// Add global functions for onclick handlers
window.plantCrop = (cropType, row, col) => game.plantCrop(cropType, row, col)
window.harvestCrop = (row, col) => game.harvestCrop(row, col)
window.waterCrop = (row, col) => game.waterCrop(row, col)
window.feedAnimal = (row, col) => game.feedAnimal(row, col)
window.milkAnimal = (row, col) => game.milkAnimal(row, col)
window.sellAllCrops = () => game.sellAllCrops()
window.plantAll = () => game.plantAll()
window.nextDay = () => game.nextDay()
window.expandLand = () => game.expandLand()
window.buyAnimal = (animalType) => game.buyAnimal(animalType)
window.buyCrop = (cropType) => game.buyCrop(cropType)
window.buyTool = (toolType) => game.buyTool(toolType)
window.hireWorker = (type) => game.hireWorker(type)

// Buy crop method
game.buyCrop = function(cropType) {
  const def = this.cropTypes[cropType]
  const cost = def ? def.seedCost : 50
  if (this.gameState.coins < cost) {
    this.showMessage('Not enough coins!')
    return
  }
  
  this.gameState.coins -= cost
  this.gameState.inventory.crops[cropType].count++
  this.saveGame()
  this.renderInventory()
}

// Buy tool method  
game.buyTool = function(toolType) {
  if (this.gameState.coins < this.gameState.inventory.tools[toolType].cost) {
    this.showMessage('Not enough coins!')
    return
  }
  
  this.gameState.coins -= this.gameState.inventory.tools[toolType].cost
  this.gameState.inventory.tools[toolType].count++
  this.saveGame()
  this.renderInventory()
}