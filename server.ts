import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInitialDb } from './src/data/seedData.ts';
import type { AppDatabase, ServerInfo } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'speednet_coo_db.json');

function ensureDb(): AppDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as AppDatabase;
    if (!parsed.jdItems || parsed.jdItems.length === 0) {
      const initial = createInitialDb();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    // Migrate existing DB if checklists array is missing or empty
    if (!parsed.checklists || parsed.checklists.length === 0) {
      const initial = createInitialDb();
      parsed.checklists = initial.checklists;
      saveDb(parsed);
    }
    // Update official CC email if it was previously info@speednetkhulna.com
    if (parsed.settings && (parsed.settings.branchOfficialCcEmail === 'info@speednetkhulna.com' || !parsed.settings.branchOfficialCcEmail.includes('dipu'))) {
      parsed.settings.branchOfficialCcEmail = 'dipu@speednetkhulna.com';
      saveDb(parsed);
    }
    return parsed;
  } catch {
    const initial = createInitialDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

function saveDb(db: AppDatabase): AppDatabase {
  db.updatedAt = new Date().toISOString();
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
  return db;
}

function detectLanUrls(port: number): string[] {
  const nets = os.networkInterfaces();
  const urls: string[] = [];
  for (const name of Object.keys(nets)) {
    const list = nets[name];
    if (!list) continue;
    for (const net of list) {
      if (net.family === 'IPv4' && !net.internal) {
        urls.push(`http://${net.address}:${port}`);
      }
    }
  }
  if (urls.length === 0) {
    urls.push(`http://127.0.0.1:${port}`);
  }
  return urls;
}

async function startServer() {
  ensureDb();

  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/server-info', (_req, res) => {
    const db = ensureDb();
    const info: ServerInfo = {
      hostname: os.hostname(),
      port: PORT,
      lanUrls: detectLanUrls(PORT),
      dbFilePath: 'data/speednet_coo_db.json',
      updatedAt: db.updatedAt,
      serverTime: new Date().toISOString(),
    };
    res.json(info);
  });

  app.get('/api/state', (_req, res) => {
    const db = ensureDb();
    res.json(db);
  });

  app.put('/api/settings', (req, res) => {
    const db = ensureDb();
    db.settings = { ...db.settings, ...req.body };
    res.json(saveDb(db));
  });

  app.patch('/api/jd/:id', (req, res) => {
    const db = ensureDb();
    const idx = db.jdItems.findIndex((item) => item.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'JD item not found' });
      return;
    }
    db.jdItems[idx] = {
      ...db.jdItems[idx],
      ...req.body,
      lastCheckedDate: new Date().toISOString().slice(0, 10),
    };
    res.json(saveDb(db));
  });

  app.post('/api/jd/reset-daily-checks', (_req, res) => {
    const db = ensureDb();
    db.jdItems = db.jdItems.map((item) =>
      item.cadence === 'daily' ? { ...item, dailyCheckedToday: false } : item
    );
    res.json(saveDb(db));
  });

  // Checklist APIs
  app.post('/api/checklist', (req, res) => {
    const db = ensureDb();
    const body = req.body;
    const newItem = {
      id: `chk-${body.cadence === 'monthly' ? 'm' : 'd'}-${body.categoryNumber || 1}-${Date.now()}`,
      cadence: body.cadence || 'daily',
      categoryNumber: Number(body.categoryNumber) || 1,
      categoryName: String(body.categoryName || 'General Operations').trim(),
      taskText: String(body.taskText || '').trim(),
      status: body.status || 'Pending',
      remarks: String(body.remarks || '').trim(),
      updatedAt: new Date().toISOString(),
    };
    db.checklists.push(newItem);
    res.json(saveDb(db));
  });

  app.patch('/api/checklist/:id', (req, res) => {
    const db = ensureDb();
    const idx = db.checklists.findIndex((item) => item.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Checklist item not found' });
      return;
    }
    db.checklists[idx] = {
      ...db.checklists[idx],
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    res.json(saveDb(db));
  });

  app.delete('/api/checklist/:id', (req, res) => {
    const db = ensureDb();
    db.checklists = db.checklists.filter((item) => item.id !== req.params.id);
    res.json(saveDb(db));
  });

  app.post('/api/checklist/reset', (req, res) => {
    const db = ensureDb();
    const cadence = req.body?.cadence as 'daily' | 'monthly' | undefined;
    db.checklists = db.checklists.map((item) => {
      if (!cadence || item.cadence === cadence) {
        return {
          ...item,
          status: 'Pending',
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    });
    res.json(saveDb(db));
  });

  app.post('/api/checklist/plan-next-day', (req, res) => {
    const db = ensureDb();
    const { carryoverItems, standardRoutineItemIds } = req.body as {
      carryoverItems?: { id: string; taskText: string; remarks: string; priority: boolean }[];
      standardRoutineItemIds?: string[];
    };

    // 1. Process daily checklist items
    db.checklists = db.checklists.map((item) => {
      if (item.cadence !== 'daily') return item;

      // Check if item is in carryover
      const carry = carryoverItems?.find((c) => c.id === item.id);
      if (carry) {
        const prefix = carry.priority ? '[Carryover - জরুরী] ' : '[Carryover] ';
        const cleanText = item.taskText.replace(/^\[Carryover.*?\]\s*/, '');
        return {
          ...item,
          taskText: `${prefix}${cleanText}`,
          status: 'Pending',
          remarks: carry.remarks ? `পূর্বের দিনের পেন্ডিং নোট: ${carry.remarks}` : item.remarks,
          updatedAt: new Date().toISOString(),
        };
      }

      // Standard routine item selected
      if (standardRoutineItemIds?.includes(item.id)) {
        const cleanText = item.taskText.replace(/^\[Carryover.*?\]\s*/, '');
        return {
          ...item,
          taskText: cleanText,
          status: 'Pending',
          remarks: '',
          updatedAt: new Date().toISOString(),
        };
      }

      // Default reset for other daily items
      return {
        ...item,
        status: 'Pending',
        remarks: '',
        updatedAt: new Date().toISOString(),
      };
    });

    // 2. Also reset daily checked items on JD
    db.jdItems = db.jdItems.map((jd) =>
      jd.cadence === 'daily' ? { ...jd, dailyCheckedToday: false } : jd
    );

    res.json(saveDb(db));
  });

  app.post('/api/tasks', (req, res) => {
    const db = ensureDb();
    const body = req.body;
    const newTask = {
      id: `tsk-${Date.now()}`,
      title: String(body.title || '').trim(),
      details: String(body.details || '').trim(),
      jdNo: String(body.jdNo || '01'),
      kpiGroupId: String(body.kpiGroupId || 'dept-supervision'),
      kpiWeight: Number(body.kpiWeight || 10),
      cadence: body.cadence || 'daily',
      assignedCoord: String(body.assignedCoord || 'Operations'),
      dueDate: String(body.dueDate || new Date().toISOString().slice(0, 10)),
      status: body.status || 'Pending',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    db.tasks.unshift(newTask);
    res.json(saveDb(db));
  });

  app.patch('/api/tasks/:id', (req, res) => {
    const db = ensureDb();
    const idx = db.tasks.findIndex((t) => t.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    const updated = { ...db.tasks[idx], ...req.body };
    if (req.body.status === 'Done' && !updated.completedAt) {
      updated.completedAt = new Date().toISOString();
    }
    db.tasks[idx] = updated;
    res.json(saveDb(db));
  });

  app.delete('/api/tasks/:id', (req, res) => {
    const db = ensureDb();
    db.tasks = db.tasks.filter((t) => t.id !== req.params.id);
    res.json(saveDb(db));
  });

  app.post('/api/renewals', (req, res) => {
    const db = ensureDb();
    const body = req.body;
    const newRenewal = {
      id: `ren-${Date.now()}`,
      title: String(body.title || '').trim(),
      category: body.category || 'Regulatory License',
      jdNo: String(body.jdNo || '12'),
      referenceOrLocation: String(body.referenceOrLocation || '').trim(),
      authorityOrVendor: String(body.authorityOrVendor || '').trim(),
      issueOrStartDate: String(body.issueOrStartDate || new Date().toISOString().slice(0, 10)),
      expiryDate: String(body.expiryDate || new Date().toISOString().slice(0, 10)),
      alertDaysBefore: Number(body.alertDaysBefore || 30),
      costEstimateBdt: String(body.costEstimateBdt || '').trim(),
      renewalStatus: body.renewalStatus || 'Active',
      notes: String(body.notes || '').trim(),
    };
    db.renewals.push(newRenewal);
    res.json(saveDb(db));
  });

  app.patch('/api/renewals/:id', (req, res) => {
    const db = ensureDb();
    const idx = db.renewals.findIndex((r) => r.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Renewal item not found' });
      return;
    }
    db.renewals[idx] = { ...db.renewals[idx], ...req.body };
    res.json(saveDb(db));
  });

  app.delete('/api/renewals/:id', (req, res) => {
    const db = ensureDb();
    db.renewals = db.renewals.filter((r) => r.id !== req.params.id);
    res.json(saveDb(db));
  });

  app.post('/api/reports', (req, res) => {
    const db = ensureDb();
    const body = req.body;
    const report = {
      id: `rep-${Date.now()}`,
      templateId: String(body.templateId || 'daily-ops-report'),
      templateTitle: String(body.templateTitle || 'Operational Report'),
      cadence: body.cadence || 'monthly',
      submittedTo: String(body.submittedTo || 'MD'),
      periodLabel: String(body.periodLabel || ''),
      createdAt: new Date().toISOString(),
      preparedBy: String(body.preparedBy || db.settings.employeeName),
      ccSpeedNetKhulnaConfirmed: Boolean(body.ccSpeedNetKhulnaConfirmed),
      summaryText: String(body.summaryText || ''),
      structuredFields: body.structuredFields || {},
      capacityRows: body.capacityRows || undefined,
      critiqueCommentary: String(body.critiqueCommentary || ''),
    };
    db.reports.unshift(report);
    res.json(saveDb(db));
  });

  app.delete('/api/reports/:id', (req, res) => {
    const db = ensureDb();
    db.reports = db.reports.filter((r) => r.id !== req.params.id);
    res.json(saveDb(db));
  });

  app.post('/api/backup/import', (req, res) => {
    const incoming = req.body as AppDatabase;
    if (!incoming || !Array.isArray(incoming.jdItems) || !Array.isArray(incoming.kpiGroups)) {
      res.status(400).json({ error: 'Invalid backup JSON format' });
      return;
    }
    res.json(saveDb(incoming));
  });

  const isProd = process.env.NODE_ENV === 'production' || fs.existsSync(path.join(__dirname, 'dist', 'index.html')) && process.argv.includes('--prod');

  if (!isProd && process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const lanUrls = detectLanUrls(PORT);
    console.log(`SpeedNet COO Hub running on http://localhost:${PORT}`);
    console.log(`LAN Access URLs: ${lanUrls.join(', ')}`);
  });
}

startServer();
