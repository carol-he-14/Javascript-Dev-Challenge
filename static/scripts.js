// DO I NEED TO USE TRY/CATCH EVERY TIME I USE AWAIT/ASYNC?

const canvas = document.getElementById('chart')
const spinner = document.getElementById('spinner')
const ctx = canvas.getContext('2d')
const errors = document.getElementById('errors')
const data = document.getElementById('data')

function drawLine (start, end, style) {
  ctx.beginPath()
  ctx.strokeStyle = style || 'black'
  ctx.moveTo(...start)
  ctx.lineTo(...end)
  ctx.stroke()
}

function drawTriangle (apex1, apex2, apex3) {
  ctx.beginPath()
  ctx.moveTo(...apex1)
  ctx.lineTo(...apex2)
  ctx.lineTo(...apex3)
  ctx.fill()
}

const getStockSymbols = async () => {
  try {
    const response = await fetch('http://localhost:3000/stocks')
    const data = await response.json()
    if (response.status === 200) {
      return data.stockSymbols
    } else if (response.status === 500) {
      // DO ERROR HANDLING
      console.error('Some error happened:', data.message)
      return null
    } else {
      console.error('Some error happened')
      return null
    }
  } catch (error) {
    console.error('Some error happened:', error)
    return null
  }
}

const getAllStockPoints = async (stockSymbols) => {
  const stockError = []
  const promises = stockSymbols.map(async symbol => {
    let stockPoints = null
    try {
      const response = await fetch('http://localhost:3000/stocks/' + symbol)
      const data = await response.json()
      if (response.status === 200) {
        console.log('stockPoints:', data)
        stockPoints = data
      } else if (response.status === 500) {
        // DO ERROR HANDLING
        console.error('Some error happened:', data.message)
        stockError.push(symbol)
      } else {
        console.error('Some error happened')
        stockError.push(symbol)
      }
    } catch (error) {
      console.error('Some error happened:', error)
      stockError.push(symbol)
    }
    return { symbol, stockPoints }
  })

  // Wait for all promises to resolve
  const stockData = await Promise.all(promises)
  return { data: stockData, error: stockError }
}

const getStockData = async () => {
  try {
    const stockSymbols = await getStockSymbols()
    
    if (!stockSymbols) {
      console.error('Some error happened when retreiving the stock symbols')
      return { data: null, error: { message: 'Some error happened when retreiving the stock symbols'}}
    }

    return getAllStockPoints(stockSymbols)
  } catch (error) {
    console.error('Some error happened')
    return { data: null, error: { message: 'Some error happened'}}
  }
}

function fetchData() {
  // Here should be your api call, I`m using setTimeout here just for async example
  return new Promise(resolve => setTimeout(resolve, 2000, 'my content'))
}

const displayElements = async () => {
  const { data: stockData, error: stockError } = await getStockData()
  console.log('Stock Data:', stockData)
  await fetchData()

  spinner.style.display = 'none'

  if (!stockData) {
    errors.innerHTML = stockError.message
    return
  }

  canvas.style.display = 'block'

  if (stockError?.length > 0) {
    errors.innerHTML = 'Some error has occurred when obtaining information about the following stocks, so these stocks are not included in the chart: ' + stockError.toString();
  }

  data.innerHTML = JSON.stringify(stockData)

  drawLine([50, 50], [50, 550])
  drawTriangle([35, 50], [65, 50], [50, 35])
  drawLine([50, 550], [950, 550])
  drawTriangle([950, 535], [950, 565], [965, 550])
}

displayElements()