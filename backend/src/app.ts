import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import propertiesRouter from './routes/properties'
import agentsRouter    from './routes/agents'
import logsRouter      from './routes/logs'
import uploadRouter    from './routes/upload'
import draftsRouter    from './routes/drafts'
import authRouter      from './routes/auth'
import usersRouter     from './routes/users'
import servicesRouter  from './routes/services'
import proposalsRouter from './routes/proposals'
import billingRouter   from './routes/billing'
import clientsRouter   from './routes/clients'
import bookingsRouter  from './routes/bookings'
import emailRouter     from './routes/email'

const app = express()

app.use(helmet())

const isLocal = (process.env.STAGE ?? 'local') === 'local'

app.use(cors({
  origin: [
    process.env.FRONTEND_URL ?? 'https://staging-portal.neswcorp.com',
    ...(isLocal ? ['http://localhost:5173', 'http://localhost:5174'] : []),
  ],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '10mb' }))

// 10 login attempts per 15 minutes per IP
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false })

// 20 emails per hour per authenticated user (falls back to IP)
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as { userId?: string }).userId ?? req.ip ?? 'unknown',
})

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.use('/api/auth/login', loginLimiter)
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
app.use('/api/clients',    clientsRouter)
app.use('/api/bookings',   bookingsRouter)
app.use('/api/email',      emailLimiter, emailRouter)

app.use((_req, res) => res.status(404).json({ error: 'Not found' }))

export default app
