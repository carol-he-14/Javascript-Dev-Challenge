const express = require('express')
const path = require('path')
const stocks = require('./stocks')
const cors = require('cors')

const app = express()
app.use(express.static(path.join(__dirname, 'static')))
app.use(cors())

app.get('/stocks', async (req, res) => {
  try {
    const stockSymbols = await stocks.getStocks()
    res.status(200).send({ stockSymbols })
  } catch (error) {
    res.status(500).send({ message: error.message})
  }
})

app.get('/stocks/:symbol', async (req, res) => {
  try {
    const { params: { symbol } } = req
    const data = await stocks.getStockPoints(symbol, new Date())
    res.status(200).send(data)
  } catch (error) {
    res.status(500).send({ message: error.message})
  }
})

app.listen(3000, () => console.log('Server is running!'))
