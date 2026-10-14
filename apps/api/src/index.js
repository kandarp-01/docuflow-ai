import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { z } from 'zod';

import { connectDatabase, isDatabaseConnected } from './config/database.js';
import { connectQueue, enqueueDocumentJob, isQueueConnected } from './config/redis.js';
import User from './models/User.js';
import Workspace from './models/Workspace.js';
import Job from './models/Job.js';

dotenv.config({ path: process.cwd() + '/.env' });

const app = express();
const port = Number(process.env.PORT ?? 4000);
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'docuflow_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const isProduction = process.env.NODE_ENV === 'production';

const ALLOWED_UPLOAD_TYPES = new Map([
  ['application/pdf', '.pdf'],
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/jpg', '.jpg']
]);

const demoUsers = [
  {
    id: 'user-demo',
    firstName: 'Alicia',
    lastName: 'Morgan',
    email: 'owner@docuflow.ai',
    passwordHash: bcrypt.hashSync('Password123!', 10),
    role: 'workspace_owner',
    workspaceId: 'workspace-demo'
  }
];

const demoWorkspaces = [
  {
    id: 'workspace-demo',
    name: 'Acme Operations',
    slug: 'acme-operations',
    role: 'workspace_owner',
    members: 5,
    status: 'active',
    settings: {
      invoiceTemplate: 'supplier-invoice-v1',
      fileSizeLimitMb: 25,
      maxFilesPerJob: 20
    }
  }
];

const demoJobs = [
  {
    id: 'job-1001',
    workspaceId: 'workspace-demo',
    templateId: 'supplier-invoice-v1',
    status: 'PROCESSING',
    fileCount: 3,
    progress: 62,
    createdAt: new Date().toISOString()
  },
  {
    id: 'job-1002',
    workspaceId: 'workspace-demo',
    templateId: 'supplier-invoice-v1',
    status: 'NEEDS_REVIEW',
    fileCount: 1,
    progress: 100,
    createdAt: new Date().toISOString()
  }
];

const fallbackJobTimers = new Map();

function updateFallbackJob(jobId, updates) {
  const target = demoJobs.find((job) => job.id === jobId);

  if (!target) {
    return;
  }

  Object.assign(target, updates);
}

function scheduleFallbackJobLifecycle(job) {
  const jobId = job.id;

  if (fallbackJobTimers.has(jobId)) {
    for (const timer of fallbackJobTimers.get(jobId)) {
      clearTimeout(timer);
    }
    fallbackJobTimers.delete(jobId);
  }

  const timers = [
    setTimeout(() => {
      updateFallbackJob(jobId, { status: 'PROCESSING', progress: 35 });
    }, 1200),
    setTimeout(() => {
      updateFallbackJob(jobId, { status: 'NEEDS_REVIEW', progress: 100 });
    }, 4200)
  ];

  fallbackJobTimers.set(jobId, timers);
}

function serializeUser(user) {
  if (!user) return null;

  const id = user._id ? user._id.toString() : user.id;

  return {
    id,
    email: user.email,
    role: user.role,
    workspaceId: user.workspaceId,
    firstName: user.firstName,
    lastName: user.lastName
  };
}

function serializeWorkspace(workspace) {
  if (!workspace) return null;

  const id = workspace._id ? workspace._id.toString() : workspace.id;

  return {
    id,
    name: workspace.name,
    slug: workspace.slug,
    role: workspace.role ?? 'workspace_owner',
    members: workspace.members ?? 1,
    status: workspace.status ?? 'active',
    settings: workspace.settings ?? {
      invoiceTemplate: 'supplier-invoice-v1',
      fileSizeLimitMb: 25,
      maxFilesPerJob: 20
    }
  };
}

function serializeJob(job) {
  if (!job) return null;

  const id = job._id ? job._id.toString() : job.id;

  return {
    id,
    workspaceId: job.workspaceId,
    templateId: job.templateId,
    status: job.status,
    fileCount: job.fileCount,
    progress: job.progress ?? 0,
    source: job.source,
    createdAt: job.createdAt ? new Date(job.createdAt).toISOString() : new Date().toISOString(),
    queueConnected: job.queueConnected ?? isQueueConnected(),
    invoiceNumber: job.invoiceNumber ?? null,
    vendorName: job.vendorName ?? null,
    totalAmount: job.totalAmount ?? null,
    reviewStatus: job.reviewStatus ?? 'pending_review',
    exportPath: job.exportPath ?? null,
    reviewSummary: job.reviewSummary ?? null
  };
}

async function ensureDemoSeed() {
  if (!isDatabaseConnected()) {
    return;
  }

  const workspace = await Workspace.findOne({ slug: 'acme-operations' }).lean();

  if (!workspace) {
    const createdWorkspace = await Workspace.create({
      name: 'Acme Operations',
      slug: 'acme-operations',
      ownerId: 'user-demo',
      members: ['user-demo'],
      status: 'active',
      settings: {
        invoiceTemplate: 'supplier-invoice-v1',
        fileSizeLimitMb: 25,
        maxFilesPerJob: 20
      }
    });

    await Workspace.updateOne(
      { _id: createdWorkspace._id },
      { $set: { ownerId: 'user-demo', members: ['user-demo'] } }
    );
  }

  const existingUser = await User.findOne({ email: 'owner@docuflow.ai' }).lean();

  if (!existingUser) {
    const createdWorkspace = await Workspace.findOne({ slug: 'acme-operations' }).lean();
    const workspaceId = createdWorkspace ? createdWorkspace._id.toString() : 'workspace-demo';

    await User.create({
      firstName: 'Alicia',
      lastName: 'Morgan',
      email: 'owner@docuflow.ai',
      passwordHash: bcrypt.hashSync('Password123!', 10),
      role: 'workspace_owner',
      workspaceId
    });
  }
}

async function findUserByEmail(email) {
  if (isDatabaseConnected()) {
    return User.findOne({ email: email.toLowerCase() }).lean();
  }

  return demoUsers.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

async function findUserById(id) {
  if (isDatabaseConnected()) {
    return User.findById(id).lean();
  }

  return demoUsers.find((user) => user.id === id) ?? null;
}

async function getAllWorkspacesForUser(user) {
  if (isDatabaseConnected()) {
    const workspaceIds = [user.workspaceId].filter(Boolean);
    const docs = await Workspace.find({
      $or: [
        { _id: { $in: workspaceIds } },
        { ownerId: user.id },
        { members: user.id }
      ]
    }).lean();

    return docs.map(serializeWorkspace);
  }

  return demoWorkspaces.filter((workspace) => workspace.id === user.workspaceId || workspace.role === user.role);
}

async function getJobsForUser(user) {
  if (isDatabaseConnected()) {
    const docs = await Job.find({
      workspaceId: user.workspaceId
    }).sort({ createdAt: -1 }).lean();

    return docs.map(serializeJob);
  }

  return demoJobs.filter((job) => job.workspaceId === user.workspaceId).map(serializeJob);
}

app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true
}));
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8)
});

const jobCreateSchema = z.object({
  workspaceId: z.string().min(1),
  templateId: z.string().min(1),
  fileCount: z.number().int().min(1).max(50),
  source: z.enum(['upload', 'api'])
});

const presignSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive().max(25 * 1024 * 1024)
});

function setAuthCookie(res, token) {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS
  });
}

function getTokenFromRequest(req) {
  return req.cookies?.[SESSION_COOKIE_NAME] ?? null;
}

async function authRequired(req, res, next) {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const currentUser = await findUserById(payload.userId);

    if (!currentUser) {
      return res.status(401).json({ message: 'User session invalid' });
    }

    req.user = currentUser;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Session expired or invalid' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }

    return next();
  };
}

function createToken(user) {
  const userId = user._id ? user._id.toString() : user.id;

  return jwt.sign({ userId, role: user.role, workspaceId: user.workspaceId }, JWT_SECRET, {
    expiresIn: '7d'
  });
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'docuflow-api',
    environment: process.env.NODE_ENV ?? 'development',
    database: isDatabaseConnected() ? 'connected' : 'fallback',
    queue: isQueueConnected() ? 'connected' : 'fallback',
    time: new Date().toISOString()
  });
});

app.get('/api/queue/status', (_req, res) => {
  res.json({
    connected: isQueueConnected(),
    queueName: 'docuflow-processing',
    mode: isQueueConnected() ? 'live' : 'fallback'
  });
});

app.post('/api/auth/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }

  const { firstName, lastName, email, password } = parsed.data;
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    return res.status(409).json({ message: 'A user with this email already exists' });
  }

  let user;

  if (isDatabaseConnected()) {
    const workspace = await Workspace.findOne({ slug: 'acme-operations' }).lean();
    user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      passwordHash: bcrypt.hashSync(password, 10),
      role: 'workspace_owner',
      workspaceId: workspace ? workspace._id.toString() : null
    });
  } else {
    user = {
      id: `user-${Date.now()}`,
      firstName,
      lastName,
      email: email.toLowerCase(),
      passwordHash: bcrypt.hashSync(password, 10),
      role: 'workspace_owner',
      workspaceId: 'workspace-demo'
    };
    demoUsers.push(user);
  }

  const token = createToken(user);
  setAuthCookie(res, token);

  return res.status(201).json({
    message: 'Registration successful',
    user: serializeUser(user)
  });
});

app.post('/api/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }

  const { email, password } = parsed.data;
  const user = await findUserByEmail(email);

  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const passwordHash = user.passwordHash ?? user.passwordhash;
  if (!passwordHash || !bcrypt.compareSync(password, passwordHash)) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const token = createToken(user);
  setAuthCookie(res, token);

  return res.json({
    message: 'Authentication successful',
    user: serializeUser(user)
  });
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, { httpOnly: true, secure: isProduction, sameSite: 'lax' });
  return res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/me', authRequired, async (req, res) => {
  res.json({
    user: serializeUser(req.user)
  });
});

app.get('/api/workspaces', authRequired, async (req, res) => {
  const workspaces = await getAllWorkspacesForUser(req.user);
  res.json({ workspaces });
});

app.post('/api/workspaces', authRequired, requireRole('workspace_owner'), async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    slug: z.string().min(2)
  });

  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }

  if (isDatabaseConnected()) {
    const ownerId = req.user._id ? req.user._id.toString() : req.user.id;
    const workspace = await Workspace.create({
      name: parsed.data.name,
      slug: parsed.data.slug,
      ownerId,
      members: [ownerId],
      status: 'active',
      settings: {
        invoiceTemplate: 'supplier-invoice-v1',
        fileSizeLimitMb: 25,
        maxFilesPerJob: 20
      }
    });

    await User.updateOne({ _id: req.user._id ?? req.user.id }, { $set: { workspaceId: workspace._id.toString() } });

    return res.status(201).json({ workspace: serializeWorkspace(workspace) });
  }

  const workspace = {
    id: `workspace-${Date.now()}`,
    name: parsed.data.name,
    slug: parsed.data.slug,
    role: 'workspace_owner',
    members: 1,
    status: 'active',
    settings: {
      invoiceTemplate: 'supplier-invoice-v1',
      fileSizeLimitMb: 25,
      maxFilesPerJob: 20
    }
  };

  demoWorkspaces.push(workspace);

  return res.status(201).json({ workspace: serializeWorkspace(workspace) });
});

app.get('/api/jobs', authRequired, async (req, res) => {
  const jobs = await getJobsForUser(req.user);
  res.json({ jobs });
});

app.get('/api/jobs/:jobId', authRequired, async (req, res) => {
  const jobList = await getJobsForUser(req.user);
  const job = jobList.find((entry) => entry.id === req.params.jobId || entry._id === req.params.jobId);

  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }

  return res.json({ job });
});

app.post('/api/jobs', authRequired, requireRole('workspace_owner', 'workspace_member'), async (req, res) => {
  const parsed = jobCreateSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }

  const data = parsed.data;

  if (data.workspaceId !== req.user.workspaceId) {
    return res.status(403).json({ message: 'You cannot create jobs for another workspace' });
  }

  let job;

  if (isDatabaseConnected()) {
    job = await Job.create({
      workspaceId: data.workspaceId,
      templateId: data.templateId,
      status: 'QUEUED',
      fileCount: data.fileCount,
      source: data.source,
      progress: 0,
      queueName: 'docuflow-processing'
    });
  } else {
    job = {
      id: `job-${Date.now()}`,
      workspaceId: data.workspaceId,
      templateId: data.templateId,
      status: 'QUEUED',
      fileCount: data.fileCount,
      source: data.source,
      progress: 0,
      createdAt: new Date().toISOString(),
      queueConnected: isQueueConnected()
    };
    demoJobs.unshift(job);
    scheduleFallbackJobLifecycle(job);
  }

  const queuedJob = await enqueueDocumentJob({
    jobId: job._id ? job._id.toString() : job.id,
    workspaceId: data.workspaceId,
    templateId: data.templateId,
    fileCount: data.fileCount,
    source: data.source
  });

  const responseJob = serializeJob(job);

  if (queuedJob) {
    responseJob.queueId = queuedJob.id;
  }

  return res.status(201).json({ job: responseJob });
});

app.post('/api/uploads/presign', authRequired, (req, res) => {
  const parsed = presignSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }

  const { filename, size, contentType } = parsed.data;
  const normalizedName = filename.toLowerCase();
  const allowedExtension = ALLOWED_UPLOAD_TYPES.get(contentType);

  if (!allowedExtension) {
    return res.status(415).json({
      message: 'Unsupported file type. Accepted: PDF, PNG, JPG, and JPEG.'
    });
  }

  const hasValidExtension = normalizedName.endsWith(allowedExtension);

  if (!hasValidExtension) {
    return res.status(400).json({
      message: 'File extension does not match the provided MIME type.'
    });
  }

  if (size > 25 * 1024 * 1024) {
    return res.status(413).json({ message: 'File exceeds the 25 MB per-file limit.' });
  }

  const fileKey = `workspaces/${req.user.workspaceId}/uploads/${Date.now()}-${filename}`;

  return res.json({
    uploadUrl: 'https://example-storage.local/upload',
    fileKey,
    fields: {
      policy: 'demo-policy',
      signature: 'demo-signature',
      checksum: 'sha256-demo-checksum'
    },
    accepted: true
  });
});

app.use((_req, res) => {
  res.status(404).json({ message: 'Resource not found' });
});

async function startServer() {
  await connectDatabase();
  await ensureDemoSeed();
  await connectQueue();

  app.listen(port, () => {
    console.log(`DocuFlow API listening on http://localhost:${port}`);
  });
}

startServer();
