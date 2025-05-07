import 'dotenv/config'
import app from './app'
import { connectDB } from './config/db' // Update this line

const PORT = process.env.PORT || 5000

connectDB()
  .then(() => {
    console.log(` MongoDB connected`)
    app.listen(PORT, () => {
      console.log(` Server running at ${PORT}`)
    })
  })