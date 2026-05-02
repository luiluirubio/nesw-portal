// Local development server (not used in Lambda)
import app from './app'

const PORT = process.env.PORT ?? 4000
app.listen(PORT, () => {
  console.log(`NESW API running on http://localhost:${PORT}`)
})
