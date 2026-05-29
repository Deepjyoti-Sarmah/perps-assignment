import express from 'express'
import routes from './routes'

const app = express()

app.use("/api", routes)


app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000')
})
