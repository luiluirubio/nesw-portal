import express from 'express'
import cors from 'cors'
import propertiesRouter from './routes/properties'
import agentsRouter    from './routes/agents'
import logsRouter      from './routes/logs'
import uploadRouter    from './routes/upload'
import draftsRouter    from './routes/drafts'

const app = express()

app.use(cors({
  origin: [
    process.env.FRONTEND_URL ?? 'https://staging-portal.neswcorp.com',
    'http://localhost:5173',
    'http://localhost:5174',
  ],
  credentials: true,
}))

app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', stage: process.env.STAGE ?? 'local', ts: new Date().toISOString() })
})

app.use('/api/properties', propertiesRouter)
app.use('/api/agents',     agentsRouter)
app.use('/api/logs',       logsRouter)
app.use('/api/upload',     uploadRouter)
app.use('/api/drafts',     draftsRouter)

app.use((_req, res) => res.status(404).json({ error: 'Not found' }))

export default app
