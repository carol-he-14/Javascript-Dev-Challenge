/* Constants */

// HTML elements
const spinner = document.getElementById('spinner-container')
const content = document.getElementById('content')
const errors = document.getElementById('errors')
const canvas = document.getElementById('chart')
const ctx = canvas.getContext('2d')

// Graph constants
const GRAPH_TOP = 50
const GRAPH_BOTTOM = 550
const GRAPH_LEFT = 100
const GRAPH_RIGHT = 1000
const GRAPH_HEIGHT = 500
const GRAPH_WIDTH = 900
const NUM_HOURS = 9
const COLORS = ['red', 'orange', 'green', 'blue', 'purple']


/* Functions for drawing the chart */

// Draw a line
const drawLine = (start, end, style) => {
  ctx.beginPath()
  ctx.strokeStyle = style || 'black'
  ctx.moveTo(...start)
  ctx.lineTo(...end)
  ctx.stroke()
}

// Draw a triangle
const drawTriangle = (apex1, apex2, apex3) => {
  ctx.beginPath()
  ctx.moveTo(...apex1)
  ctx.lineTo(...apex2)
  ctx.lineTo(...apex3)
  ctx.fill()
}

// Draw chart labels
const drawLabels = (maxValue = 0) => {
  // Axis titles
  ctx.font = 'bold 14px Times New Roman'
  ctx.fillText('Time (Hours Ago)', GRAPH_WIDTH / 2 + GRAPH_LEFT, GRAPH_BOTTOM + 50)
  ctx.fillText( 'Price ($)', GRAPH_LEFT - 85, GRAPH_HEIGHT / 2 + GRAPH_TOP)

  // X-axis reference values
  ctx.font = '14px Times New Roman'
  let yCoord = GRAPH_BOTTOM + 25
  ctx.fillText(NUM_HOURS, GRAPH_LEFT, yCoord)
  for (let i = 0; i < NUM_HOURS; i++) {
    ctx.fillText(i, (NUM_HOURS - i) / NUM_HOURS * GRAPH_WIDTH + GRAPH_LEFT, yCoord)
  }

  // Y-axis reference values
  for (let i = 0; i < maxValue; i += 10) {
    let yCoord = GRAPH_BOTTOM - i / maxValue * GRAPH_HEIGHT
    ctx.fillText(i, GRAPH_LEFT - 25, yCoord)

    // Reference lines
    if (i > 0) {
      drawLine([GRAPH_LEFT, yCoord], [GRAPH_RIGHT, yCoord], '#BBB')
    }
  }
}

// Draw line chart for a single stock
const drawLineChart = (stockData, stockIndex, maxValue, minTimestamp, maxTimestamp) => {
  // Get stock data
  const { symbol, values, timestamps } = stockData[stockIndex]

  // Calculate x-coordinate for a point
  const xCoord = (pointIndex) => {
    return (timestamps[pointIndex] - minTimestamp) / (maxTimestamp - minTimestamp) * GRAPH_WIDTH + GRAPH_LEFT
  }

  // Calculate y-coordinate for a point
  const yCoord = (pointIndex) => {
    return GRAPH_BOTTOM - values[pointIndex] / maxValue * GRAPH_HEIGHT
  }

  // Draw line chart
  ctx.beginPath()
  ctx.lineJoin = 'round'
  ctx.strokeStyle = COLORS[stockIndex] || 'black'
  ctx.moveTo(xCoord(0), yCoord(0))
  for (let pointIndex = 1; pointIndex < values.length; pointIndex++) {
    ctx.lineTo(xCoord(pointIndex), yCoord(pointIndex))
  }
  ctx.stroke()

  // Update legend
  ctx.font = 'bold 14px Times New Roman'
  let metrics = ctx.measureText(symbol)
  let fontHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent
  let startX = stockIndex / stockData.length * GRAPH_WIDTH + GRAPH_LEFT + 1 / stockData.length * GRAPH_WIDTH / 2
  let startY = GRAPH_TOP - fontHeight / 3 - 15
  drawLine([startX, startY], [startX + 20, startY], COLORS[stockIndex])
  ctx.fillText(symbol, startX + 25, startY + fontHeight / 3)
}

// Draw entire chart
const drawChart = (stockData) => {
  // Draw x and y axes
  drawLine([GRAPH_LEFT, GRAPH_TOP - 15], [GRAPH_LEFT, GRAPH_BOTTOM])
  drawTriangle([GRAPH_LEFT - 15, GRAPH_TOP - 15], [GRAPH_LEFT + 15, GRAPH_TOP - 15], [GRAPH_LEFT, GRAPH_TOP - 30])
  drawLine([GRAPH_LEFT, GRAPH_BOTTOM], [GRAPH_RIGHT + 15, GRAPH_BOTTOM])
  drawTriangle([GRAPH_RIGHT + 15, GRAPH_BOTTOM - 15], [GRAPH_RIGHT + 15, GRAPH_BOTTOM + 15], [GRAPH_RIGHT + 30, GRAPH_BOTTOM])

  // If no stock data is available, only display the chart labels
  if (stockData.length === 0) {
    drawLabels()
    return
  }

  // Calculate bounds for x and y axis reference values
  const maxValue = Math.max(...stockData.map(stock => Math.max(...stock.values)))
  const maxTimestamp = new Date()
  const minTimestamp = new Date(maxTimestamp.getTime())
  minTimestamp.setHours(minTimestamp.getHours() - NUM_HOURS)

  // Draw axis labels with appropriate bounds
  drawLabels(maxValue)

  // Draw line charts
  ctx.lineWidth = 3
  for (let i = 0; i < stockData.length; i++) {
    drawLineChart(stockData, i, maxValue, minTimestamp, maxTimestamp)
  }
}


/* Functions for processing stock data */

// Get list of stock symbols
const getStockSymbols = async () => {
  try {
    const response = await fetch('http://localhost:3000/stocks')
    const data = await response.json()

    if (response.status === 200) {
      return data.stockSymbols
    } else if (response.status === 500) {
      console.error('Some error happened while getting stock symbols:', data.message)
      return null
    } else {
      console.error('Some error happened while getting stock symbols')
      return null
    }
  } catch (error) {
    console.error('Some error happened while getting stock symbols:', error.message)
    return null
  }
}

// Get data for each stock
const getAllStockPoints = async (stockSymbols) => {
  // List for keeping track of errors
  const stockError = []

  // Iterate through each stock symbol
  const promises = stockSymbols.map(async symbol => {
    let stockPoints = null
    try {
      const response = await fetch('http://localhost:3000/stocks/' + symbol)
      const data = await response.json()

      if (response.status === 200) {
        stockPoints = data
      } else if (response.status === 500) {
        console.error(`Some error happened when getting data for the stock ${symbol}:`, data.message)
        stockError.push(symbol)
      } else {
        console.error(`Some error happened when getting data for the stock ${symbol}`)
        stockError.push(symbol)
      }
    } catch (error) {
      console.error(`Some error happened when getting data for the stock ${symbol}:`, error.message)
      stockError.push(symbol)
    }
    return { symbol, stockPoints }
  })
  const stockData = await Promise.all(promises)

  return { data: stockData, error: stockError }
}

// Get data for all stocks
const getStockData = async () => {
  try {
    // Get all stock symbols
    const stockSymbols = await getStockSymbols()

    // If there are no stock symbols, some error happened
    if (!stockSymbols) {
      return { data: null, error: { message: 'Some error happened when retreiving the stock symbols'}}
    }

    // Get stock data for each stock symbol
    return getAllStockPoints(stockSymbols)
  } catch (error) {
    console.error('Some error happened when getting data for all stock symbols:', error.message)
    return { data: null, error: { message: 'Some error happened when getting data for all stock symbols'}}
  }
}

// Reformat stock data to aid chart drawing
const processStockData = (stockData) => {
  const validData = stockData.filter(stock => stock.stockPoints)
  return validData.map(stock => {
    return {
      symbol: stock.symbol,
      values: stock.stockPoints.map(data => data.value),
      timestamps: stock.stockPoints.map(data => data.timestamp)
    }
  })
}


/* Driver */

const displayElements = async () => {
  // Try to get stock data
  const { data, error } = await getStockData()

  // Log stock data retrieved
  console.log('Stock Data:', data)

  // Hide spinner and display website content
  spinner.style.display = 'none'
  content.style.display = 'flex'

  // If no stock data, display error message
  if (!data) {
    errors.innerHTML = error.message
    return
  }

  // If can't get data for 1 stock, display appropriate error message
  if (error?.length === 1) {
    errors.innerHTML = 'The following stock is not included in the chart \
                        because some error has occurred when obtaining its \
                        information: <b>' + error.toString() + '</b>'
  }
  // If can't get data for > 1 stock, display appropriate error message
  else if (error?.length > 1) {
    errors.innerHTML = 'The following stocks are not included in the chart \
                        because some error has occurred when obtaining their \
                        information: <b>' + error.toString().replace(/,/g , ', ') + '</b>'
  }

  // Reformat stock data to aid chart drawing
  const stockData = processStockData(data)

  // Draw chart
  drawChart(stockData)

  // Display chart
  canvas.style.display = 'block'
}

displayElements()