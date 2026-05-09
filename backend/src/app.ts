import express from 'express'
import cors from 'cors'
import propertiesRouter from './routes/properties'
import agentsRouter    from './routes/agents'
import logsRouter      from './routes/logs'
import uploadRouter    from './routes/upload'
import draftsRouter    from './routes/drafts'
import authRouter      from './routes/auth'
import usersRouter     from './routes/users'
import servicesRouter  from './routes/services'   // v2
import proposalsRouter from './routes/proposals'  // v2
import billingRouter   from './routes/billing'

const app = express()

app.use(cors({
  origin: [
    process.env.FRONTEND_URL ?? 'https://staging-portal.neswcorp.com',
    'http://localhost:5173',
    'http://localhost:5174',
  ],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Agent-Id', 'X-Agent-Email'],
}))

app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', stage: process.env.STAGE ?? 'local', ts: new Date().toISOString() })
})

app.use('/api/auth',       authRouter)
app.use('/api/users',      usersRouter)
app.use('/api/properties', propertiesRouter)
app.use('/api/agents',     agentsRouter)
app.use('/api/logs',       logsRouter)
app.use('/api/upload',     uploadRouter)
app.use('/api/drafts',     draftsRouter)
app.use('/api/services',   servicesRouter)
app.use('/api/proposals',  proposalsRouter)
app.use('/api/billing',    billingRouter)

app.use((_req, res) => res.status(404).json({ error: 'Not found' }))

export default app
