import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { MongoClient, Db, Collection } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sportsync-ai';
const DB_NAME = process.env.DATABASE_NAME || 'sportsync-ai';
const IOT_API_KEY = process.env.IOT_API_KEY || '';

// MongoDB collections (initialized in startServer)
let db: Db;
let equipmentCol: Collection;
let studentsCol: Collection;
let transactionsCol: Collection;
let scanLogsCol: Collection;

// Seed Initial CKCET Data if database is empty
async function seedDatabase(forceReset = false) {
  if (forceReset) {
    await scanLogsCol.deleteMany({});
    await transactionsCol.deleteMany({});
    await equipmentCol.deleteMany({});
    await studentsCol.deleteMany({});
  }

  const eqCount = await equipmentCol.countDocuments();
  if (eqCount > 0 && !forceReset) {
    return;
  }

  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();
  const hoursAhead = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000).toISOString();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

  const initialStudents = [
    {
      id: 'STU-001',
      registerNumber: '910423104001',
      name: 'Aravind Kumar R',
      department: 'CSE',
      year: 'III',
      section: 'A',
      phone: '+91 98401 23456',
      email: 'aravind.cse23@ckcet.edu.in',
      rfidCardId: 'STU_CARD_9104A1',
      activeBorrowsCount: 1,
      createdAt: daysAgo(60),
    },
    {
      id: 'STU-002',
      registerNumber: '910423104018',
      name: 'Dinesh Karthik M',
      department: 'CSE',
      year: 'II',
      section: 'B',
      phone: '+91 97102 34567',
      email: 'dinesh.cse24@ckcet.edu.in',
      rfidCardId: 'STU_CARD_9104B8',
      activeBorrowsCount: 1,
      createdAt: daysAgo(50),
    },
    {
      id: 'STU-003',
      registerNumber: '910423104035',
      name: 'Kavitha Sundaram',
      department: 'ECE',
      year: 'IV',
      section: 'A',
      phone: '+91 96555 12890',
      email: 'kavitha.ece22@ckcet.edu.in',
      rfidCardId: 'STU_CARD_9104C5',
      activeBorrowsCount: 0,
      createdAt: daysAgo(90),
    },
    {
      id: 'STU-004',
      registerNumber: '910423104042',
      name: 'Mohamed Amjath S',
      department: 'CSE',
      year: 'I',
      section: 'A',
      phone: '+91 94432 87654',
      email: 'amjath.cse26@ckcet.edu.in',
      rfidCardId: 'STU_CARD_9104D2',
      activeBorrowsCount: 1,
      createdAt: daysAgo(30),
    },
    {
      id: 'STU-005',
      registerNumber: '910423104056',
      name: 'Praveen Raj V',
      department: 'MECH',
      year: 'III',
      section: 'A',
      phone: '+91 98840 91234',
      email: 'praveen.mech23@ckcet.edu.in',
      rfidCardId: 'STU_CARD_9104E9',
      activeBorrowsCount: 0,
      createdAt: daysAgo(45),
    },
    {
      id: 'STU-006',
      registerNumber: '910423104068',
      name: 'Sneha Priyadharshini',
      department: 'IT',
      year: 'II',
      section: 'A',
      phone: '+91 97900 45678',
      email: 'sneha.it24@ckcet.edu.in',
      rfidCardId: 'STU_CARD_9104F3',
      activeBorrowsCount: 0,
      createdAt: daysAgo(20),
    },
  ];

  const initialEquipment = [
    {
      id: 'EQ-FB-01',
      name: 'Nike Strike Pro Football',
      category: 'Football',
      rfidTag: 'E2003411B802',
      status: 'available',
      condition: 'Excellent',
      rackLocation: 'Ball Cage A-1',
      totalBorrowsCount: 24,
      currentBorrowerId: null,
      currentBorrowerName: null,
      currentBorrowerRegNo: null,
      issueDate: null,
      dueDate: null,
      description: 'FIFA certified size 5 match ball for ground tournament practice',
      createdAt: daysAgo(120),
    },
    {
      id: 'EQ-CB-02',
      name: 'SG Cobra Cricket Bat',
      category: 'Cricket',
      rfidTag: 'E2004522C911',
      status: 'borrowed',
      condition: 'Good',
      rackLocation: 'Cricket Locker C-2',
      totalBorrowsCount: 38,
      currentBorrowerId: 'STU-001',
      currentBorrowerName: 'Aravind Kumar R',
      currentBorrowerRegNo: '910423104001',
      issueDate: hoursAgo(2),
      dueDate: hoursAhead(2),
      description: 'English Willow Short Handle bat used for net practice',
      createdAt: daysAgo(110),
    },
    {
      id: 'EQ-BR-03',
      name: 'Yonex Nanoray 70 Badminton Racket',
      category: 'Badminton',
      rfidTag: 'E2007833D104',
      status: 'available',
      condition: 'Excellent',
      rackLocation: 'Racket Stand R-1',
      totalBorrowsCount: 42,
      currentBorrowerId: null,
      currentBorrowerName: null,
      currentBorrowerRegNo: null,
      issueDate: null,
      dueDate: null,
      description: 'Head-light graphite frame with BG65 string tension 24 lbs',
      createdAt: daysAgo(100),
    },
    {
      id: 'EQ-VB-04',
      name: 'Cosco Super Volley Volleyball',
      category: 'Volleyball',
      rfidTag: 'E2008944E205',
      status: 'overdue',
      condition: 'Good',
      rackLocation: 'Ball Cage A-2',
      totalBorrowsCount: 19,
      currentBorrowerId: 'STU-002',
      currentBorrowerName: 'Dinesh Karthik M',
      currentBorrowerRegNo: '910423104018',
      issueDate: hoursAgo(28),
      dueDate: hoursAgo(4),
      description: '18-panel synthetic leather volleyball with high visibility yellow/blue pattern',
      createdAt: daysAgo(95),
    },
    {
      id: 'EQ-BB-05',
      name: 'Spalding NBA Gold Basketball',
      category: 'Basketball',
      rfidTag: 'E2001255F306',
      status: 'available',
      condition: 'Good',
      rackLocation: 'Ball Cage B-1',
      totalBorrowsCount: 31,
      currentBorrowerId: null,
      currentBorrowerName: null,
      currentBorrowerRegNo: null,
      issueDate: null,
      dueDate: null,
      description: 'Composite leather outdoor/indoor competition basketball (Size 7)',
      createdAt: daysAgo(90),
    },
    {
      id: 'EQ-TR-06',
      name: 'Wilson Pro Staff Tennis Racket',
      category: 'Tennis',
      rfidTag: 'E2006766A407',
      status: 'borrowed',
      condition: 'Good',
      rackLocation: 'Racket Stand R-2',
      totalBorrowsCount: 15,
      currentBorrowerId: 'STU-004',
      currentBorrowerName: 'Mohamed Amjath S',
      currentBorrowerRegNo: '910423104042',
      issueDate: hoursAgo(1),
      dueDate: hoursAhead(3),
      description: 'Precision 97 sq inch tennis racket with synthetic grip',
      createdAt: daysAgo(85),
    },
    {
      id: 'EQ-FB-07',
      name: 'Nivia Storm Football',
      category: 'Football',
      rfidTag: 'E2009077B508',
      status: 'available',
      condition: 'Good',
      rackLocation: 'Ball Cage A-1',
      totalBorrowsCount: 18,
      currentBorrowerId: null,
      currentBorrowerName: null,
      currentBorrowerRegNo: null,
      issueDate: null,
      dueDate: null,
      description: 'Durable rubberized molded training football',
      createdAt: daysAgo(70),
    },
    {
      id: 'EQ-TT-08',
      name: 'Stiga Pro Table Tennis Set',
      category: 'Indoor Games',
      rfidTag: 'E2003388C609',
      status: 'available',
      condition: 'Excellent',
      rackLocation: 'Indoor Cabinet T-1',
      totalBorrowsCount: 29,
      currentBorrowerId: null,
      currentBorrowerName: null,
      currentBorrowerRegNo: null,
      issueDate: null,
      dueDate: null,
      description: 'Pair of 5-ply ITTF approved rackets with 6 seamless 3-star balls',
      createdAt: daysAgo(60),
    },
    {
      id: 'EQ-CB-09',
      name: 'SS Kashmir Willow Bat',
      category: 'Cricket',
      rfidTag: 'E2004499D710',
      status: 'available',
      condition: 'Fair',
      rackLocation: 'Cricket Locker C-1',
      totalBorrowsCount: 35,
      currentBorrowerId: null,
      currentBorrowerName: null,
      currentBorrowerRegNo: null,
      issueDate: null,
      dueDate: null,
      description: 'Lightweight bat for college internal practice sessions',
      createdAt: daysAgo(75),
    },
    {
      id: 'EQ-AT-10',
      name: 'Athletics Aluminum Relay Batons (Set)',
      category: 'Athletics',
      rfidTag: 'E2005511E812',
      status: 'available',
      condition: 'Excellent',
      rackLocation: 'Athletics Box AT-3',
      totalBorrowsCount: 12,
      currentBorrowerId: null,
      currentBorrowerName: null,
      currentBorrowerRegNo: null,
      issueDate: null,
      dueDate: null,
      description: 'Anodized official track relay batons with smooth rolled edges',
      createdAt: daysAgo(40),
    },
  ];

  const initialTransactions = [
    {
      id: 'TXN-2026-001',
      type: 'issue',
      equipmentId: 'EQ-CB-02',
      equipmentName: 'SG Cobra Cricket Bat',
      rfidTag: 'E2004522C911',
      studentId: 'STU-001',
      studentRegisterNumber: '910423104001',
      studentName: 'Aravind Kumar R',
      studentDepartment: 'CSE',
      issueDate: hoursAgo(2),
      dueDate: hoursAhead(2),
      returnDate: null,
      status: 'active',
      issuedBy: 'Mr. R. Shanmugam (PET)',
      returnCondition: null,
      notes: 'For inter-department cricket tournament practice',
    },
    {
      id: 'TXN-2026-002',
      type: 'issue',
      equipmentId: 'EQ-VB-04',
      equipmentName: 'Cosco Super Volley Volleyball',
      rfidTag: 'E2008944E205',
      studentId: 'STU-002',
      studentRegisterNumber: '910423104018',
      studentName: 'Dinesh Karthik M',
      studentDepartment: 'CSE',
      issueDate: hoursAgo(28),
      dueDate: hoursAgo(4),
      returnDate: null,
      status: 'overdue',
      issuedBy: 'Mr. R. Shanmugam (PET)',
      returnCondition: null,
      notes: 'Volleyball court practice - pending return',
    },
    {
      id: 'TXN-2026-003',
      type: 'issue',
      equipmentId: 'EQ-TR-06',
      equipmentName: 'Wilson Pro Staff Tennis Racket',
      rfidTag: 'E2006766A407',
      studentId: 'STU-004',
      studentRegisterNumber: '910423104042',
      studentName: 'Mohamed Amjath S',
      studentDepartment: 'CSE',
      issueDate: hoursAgo(1),
      dueDate: hoursAhead(3),
      returnDate: null,
      status: 'active',
      issuedBy: 'Dr. V. Anand (Sports Director)',
      returnCondition: null,
      notes: 'Singles practice on Court 2',
    },
    {
      id: 'TXN-2026-004',
      type: 'return',
      equipmentId: 'EQ-FB-01',
      equipmentName: 'Nike Strike Pro Football',
      rfidTag: 'E2003411B802',
      studentId: 'STU-003',
      studentRegisterNumber: '910423104035',
      studentName: 'Kavitha Sundaram',
      studentDepartment: 'ECE',
      issueDate: daysAgo(2),
      dueDate: daysAgo(2),
      returnDate: daysAgo(2),
      status: 'returned',
      issuedBy: 'Mr. R. Shanmugam (PET)',
      returnCondition: 'Excellent',
      notes: 'Returned on time in clean condition',
    },
    {
      id: 'TXN-2026-005',
      type: 'return',
      equipmentId: 'EQ-BR-03',
      equipmentName: 'Yonex Nanoray 70 Badminton Racket',
      rfidTag: 'E2007833D104',
      studentId: 'STU-005',
      studentRegisterNumber: '910423104056',
      studentName: 'Praveen Raj V',
      studentDepartment: 'MECH',
      issueDate: daysAgo(3),
      dueDate: daysAgo(3),
      returnDate: daysAgo(3),
      status: 'returned',
      issuedBy: 'Mr. R. Shanmugam (PET)',
      returnCondition: 'Excellent',
      notes: 'Returned after indoor stadium practice',
    },
    {
      id: 'TXN-2026-006',
      type: 'return',
      equipmentId: 'EQ-BB-05',
      equipmentName: 'Spalding NBA Gold Basketball',
      rfidTag: 'E2001255F306',
      studentId: 'STU-006',
      studentRegisterNumber: '910423104068',
      studentName: 'Sneha Priyadharshini',
      studentDepartment: 'IT',
      issueDate: daysAgo(4),
      dueDate: daysAgo(4),
      returnDate: daysAgo(4),
      status: 'returned',
      issuedBy: 'Dr. V. Anand (Sports Director)',
      returnCondition: 'Good',
      notes: 'Basketball court practice',
    },
  ];

  await studentsCol.insertMany(initialStudents);
  await equipmentCol.insertMany(initialEquipment);
  await transactionsCol.insertMany(initialTransactions);

  console.log('✅ Database seeded with initial CKCET data');
}

// Synchronize overdue statuses dynamically based on current server clock
async function syncOverdueStatuses() {
  const nowIso = new Date().toISOString();

  await equipmentCol.updateMany(
    { status: 'borrowed', dueDate: { $ne: null, $lt: nowIso } },
    { $set: { status: 'overdue' } }
  );

  await transactionsCol.updateMany(
    { status: 'active', dueDate: { $ne: null, $lt: nowIso } },
    { $set: { status: 'overdue' } }
  );
}

// Track connected SSE clients for real-time dashboard updates
const sseClients = new Set<Response>();

// Track ESP32 Hardware connection telemetry
interface HardwareTelemetry {
  lastSeenAt: string | null;
  lastIp: string | null;
  totalHardwareScans: number;
  lastScannedTag: string | null;
  pendingStudentScan: {
    studentId: string;
    registerNumber: string;
    name: string;
    department: string;
    rfidCardId: string;
    scannedAt: number;
  } | null;
}

const hardwareTelemetry: HardwareTelemetry = {
  lastSeenAt: null,
  lastIp: null,
  totalHardwareScans: 0,
  lastScannedTag: null,
  pendingStudentScan: null,
};

// Duplicate scan debounce map: key -> timestamp ms
const recentScanMap = new Map<string, number>();
const DUPLICATE_COOLDOWN_MS = 2500;

function formatRawHex(tag: string): string {
  return tag.match(/.{1,2}/g)?.map((b) => `0x${b}`).join(' ') || tag;
}

async function getFullSystemState() {
  await syncOverdueStatuses();

  const equipmentRaw = await equipmentCol.find({}).sort({ createdAt: -1 }).toArray();
  const equipment = equipmentRaw.map((eq) => ({
    id: eq.id,
    name: eq.name,
    category: eq.category,
    rfidTag: eq.rfidTag,
    status: eq.status,
    condition: eq.condition,
    rackLocation: eq.rackLocation,
    totalBorrowsCount: eq.totalBorrowsCount,
    currentBorrowerId: eq.currentBorrowerId || undefined,
    currentBorrowerName: eq.currentBorrowerName || undefined,
    currentBorrowerRegNo: eq.currentBorrowerRegNo || undefined,
    issueDate: eq.issueDate || undefined,
    dueDate: eq.dueDate || undefined,
    description: eq.description || undefined,
    createdAt: eq.createdAt,
  }));

  const students = await studentsCol.find({}).sort({ name: 1 }).toArray();
  const studentsClean = students.map((s) => ({
    id: s.id,
    registerNumber: s.registerNumber,
    name: s.name,
    department: s.department,
    year: s.year,
    section: s.section,
    phone: s.phone,
    email: s.email,
    rfidCardId: s.rfidCardId,
    activeBorrowsCount: s.activeBorrowsCount,
    createdAt: s.createdAt,
  }));

  const transactionsRaw = await transactionsCol.find({}).sort({ issueDate: -1 }).toArray();
  const transactions = transactionsRaw.map((tx) => ({
    id: tx.id,
    type: tx.type,
    equipmentId: tx.equipmentId,
    equipmentName: tx.equipmentName,
    rfidTag: tx.rfidTag,
    studentId: tx.studentId,
    studentRegisterNumber: tx.studentRegisterNumber,
    studentName: tx.studentName,
    studentDepartment: tx.studentDepartment,
    issueDate: tx.issueDate,
    dueDate: tx.dueDate,
    returnDate: tx.returnDate || undefined,
    status: tx.status,
    issuedBy: tx.issuedBy,
    returnCondition: tx.returnCondition || undefined,
    notes: tx.notes || undefined,
  }));

  const scanLogs = await scanLogsCol.find({}).sort({ timestamp: -1 }).limit(50).toArray();
  const scanLogsClean = scanLogs.map((log) => ({
    id: log.id,
    timestamp: log.timestamp,
    rfidTag: log.rfidTag,
    tagType: log.tagType,
    entityName: log.entityName,
    action: log.action,
    status: log.status,
    message: log.message,
    rawHex: log.rawHex,
    source: log.source,
  }));

  // Check if pending student scan expired (> 60s)
  if (
    hardwareTelemetry.pendingStudentScan &&
    Date.now() - hardwareTelemetry.pendingStudentScan.scannedAt > 60000
  ) {
    hardwareTelemetry.pendingStudentScan = null;
  }

  const isEsp32RecentlyActive =
    hardwareTelemetry.lastSeenAt !== null &&
    Date.now() - new Date(hardwareTelemetry.lastSeenAt).getTime() < 5 * 60 * 1000;

  return {
    equipment,
    students: studentsClean,
    transactions,
    scanLogs: scanLogsClean,
    hardwareStatus: {
      connected: isEsp32RecentlyActive,
      lastSeenAt: hardwareTelemetry.lastSeenAt,
      lastIp: hardwareTelemetry.lastIp,
      totalHardwareScans: hardwareTelemetry.totalHardwareScans,
      lastScannedTag: hardwareTelemetry.lastScannedTag,
      pendingStudentScan: hardwareTelemetry.pendingStudentScan,
    },
  };
}

async function broadcastStateUpdate(eventType = 'state_update', lastScanEvent?: unknown) {
  const payload = JSON.stringify({
    type: eventType,
    state: await getFullSystemState(),
    lastScanEvent,
    timestamp: new Date().toISOString(),
  });
  for (const client of sseClients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

async function recordScanLog(params: {
  rfidTag: string;
  tagType: 'equipment' | 'student' | 'unknown';
  entityName?: string;
  action: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  source?: string;
}) {
  const log = {
    id: `LOG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    timestamp: new Date().toISOString(),
    rfidTag: params.rfidTag,
    tagType: params.tagType,
    entityName: params.entityName || null,
    action: params.action,
    status: params.status,
    message: params.message,
    rawHex: formatRawHex(params.rfidTag),
    source: params.source || 'ESP32_API',
  };

  await scanLogsCol.insertOne(log);
  return log;
}

async function startServer() {
  // Connect to MongoDB Atlas
  console.log('🔗 Connecting to MongoDB Atlas...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(DB_NAME);

  // Initialize collections
  equipmentCol = db.collection('equipment');
  studentsCol = db.collection('students');
  transactionsCol = db.collection('transactions');
  scanLogsCol = db.collection('scan_logs');

  // Create indexes for fast lookups
  await equipmentCol.createIndex({ id: 1 }, { unique: true });
  await equipmentCol.createIndex({ rfidTag: 1 }, { unique: true });
  await studentsCol.createIndex({ id: 1 }, { unique: true });
  await studentsCol.createIndex({ registerNumber: 1 }, { unique: true });
  await studentsCol.createIndex({ rfidCardId: 1 });
  await transactionsCol.createIndex({ id: 1 }, { unique: true });
  await transactionsCol.createIndex({ equipmentId: 1 });
  await transactionsCol.createIndex({ status: 1 });
  await scanLogsCol.createIndex({ timestamp: -1 });

  console.log('✅ Connected to MongoDB Atlas successfully!');

  // Seed database with initial data if empty
  await seedDatabase(false);

  const app = express();

  // Enable CORS so ESP32 hardware and external clients can call /api/rfid/scan from any network
  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    })
  );

  app.use(express.json());

  // ---------------------------------------------------------------------------
  // 1. REAL-TIME SSE STREAM & FULL SYSTEM STATE ENDPOINTS
  // ---------------------------------------------------------------------------
  app.get('/api/events', async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    sseClients.add(res);

    // Send initial state snapshot immediately
    const state = await getFullSystemState();
    res.write(
      `data: ${JSON.stringify({
        type: 'initial_state',
        state,
        timestamp: new Date().toISOString(),
      })}\n\n`
    );

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  app.get('/api/state', async (_req: Request, res: Response) => {
    res.json(await getFullSystemState());
  });

  // ESP32 Heartbeat Ping
  app.post('/api/rfid/heartbeat', (_req: Request, res: Response) => {
    hardwareTelemetry.lastSeenAt = new Date().toISOString();
    hardwareTelemetry.lastIp = _req.ip || _req.socket.remoteAddress || 'ESP32';
    broadcastStateUpdate('hardware_heartbeat');
    res.json({
      success: true,
      status: 'online',
      message: 'SPORTSYNC AI Backend Online - Ready for RC522 RFID Scans',
      serverTime: new Date().toISOString(),
    });
  });

  // ---------------------------------------------------------------------------
  // 2. CORE HARDWARE ENDPOINT: POST /api/rfid/scan
  // ---------------------------------------------------------------------------
  app.post('/api/rfid/scan', async (req: Request, res: Response) => {
    await syncOverdueStatuses();

    // Optional API Key verification
    const providedKey = req.headers['x-api-key'] as string | undefined;
    if (IOT_API_KEY && providedKey && providedKey !== IOT_API_KEY) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED_DEVICE',
        message: 'Invalid x-api-key header provided by device.',
      });
      return;
    }

    const rawTag = String(req.body?.rfidTag || '').trim().toUpperCase();
    const rawMode = String(req.body?.mode || 'issue').trim().toLowerCase();
    const rawStudent = String(req.body?.studentReg || '').trim().toUpperCase();
    const durationHours = Number(req.body?.durationHours) || 2;
    const source = String(req.body?.source || 'ESP32_RC522');

    // Update ESP32 telemetry
    if (source === 'ESP32_RC522' || !req.body?.source) {
      hardwareTelemetry.lastSeenAt = new Date().toISOString();
      hardwareTelemetry.lastIp = req.ip || req.socket.remoteAddress || 'ESP32';
      hardwareTelemetry.totalHardwareScans += 1;
      if (rawTag) hardwareTelemetry.lastScannedTag = rawTag;
    }

    if (!rawTag) {
      const log = await recordScanLog({
        rfidTag: 'EMPTY_UID',
        tagType: 'unknown',
        action: `RFID Scan (${rawMode.toUpperCase()})`,
        status: 'error',
        message: 'Missing rfidTag in request payload.',
        source,
      });
      broadcastStateUpdate('rfid_scan', { status: 'error', log });
      res.status(400).json({
        success: false,
        status: 'error',
        code: 'MISSING_RFID_TAG',
        message: 'rfidTag field is required in JSON payload.',
      });
      return;
    }

    // Step A: Prevent rapid duplicate scans
    const debounceKey = `${rawTag}:${rawMode}:${rawStudent}`;
    const lastScanMs = recentScanMap.get(debounceKey);
    const nowMs = Date.now();
    if (lastScanMs && nowMs - lastScanMs < DUPLICATE_COOLDOWN_MS) {
      const log = await recordScanLog({
        rfidTag: rawTag,
        tagType: 'equipment',
        action: 'Duplicate Scan Blocked',
        status: 'warning',
        message: `Duplicate scan of tag ${rawTag} ignored within ${DUPLICATE_COOLDOWN_MS / 1000}s debounce window.`,
        source,
      });
      broadcastStateUpdate('rfid_scan', { status: 'warning', log });
      res.status(429).json({
        success: false,
        status: 'warning',
        code: 'DUPLICATE_SCAN',
        message: `Duplicate scan blocked: Tag ${rawTag} was just scanned less than ${DUPLICATE_COOLDOWN_MS / 1000} seconds ago.`,
        rfidTag: rawTag,
      });
      return;
    }
    recentScanMap.set(debounceKey, nowMs);

    // Step B: Check if scanned rfidTag is actually a Student Smart ID Card
    const matchedStudentByTag = await studentsCol.findOne({
      $or: [
        { rfidCardId: { $regex: new RegExp(`^${rawTag}$`, 'i') } },
        { registerNumber: { $regex: new RegExp(`^${rawTag}$`, 'i') } },
      ],
    });

    if (matchedStudentByTag && !rawStudent) {
      hardwareTelemetry.pendingStudentScan = {
        studentId: matchedStudentByTag.id,
        registerNumber: matchedStudentByTag.registerNumber,
        name: matchedStudentByTag.name,
        department: matchedStudentByTag.department,
        rfidCardId: matchedStudentByTag.rfidCardId,
        scannedAt: nowMs,
      };

      const log = await recordScanLog({
        rfidTag: rawTag,
        tagType: 'student',
        entityName: matchedStudentByTag.name,
        action: 'Student ID Card Verified',
        status: 'success',
        message: `Student card verified for ${matchedStudentByTag.name} (${matchedStudentByTag.registerNumber}). Tap equipment tag within 60s to complete checkout.`,
        source,
      });

      broadcastStateUpdate('rfid_scan', { status: 'success', log });
      res.status(200).json({
        success: true,
        status: 'student_verified',
        code: 'STUDENT_CARD_SCANNED',
        message: `Student verified: ${matchedStudentByTag.name} (${matchedStudentByTag.registerNumber}). Now scan the sports equipment RFID tag.`,
        student: {
          id: matchedStudentByTag.id,
          name: matchedStudentByTag.name,
          registerNumber: matchedStudentByTag.registerNumber,
          department: matchedStudentByTag.department,
          rfidCardId: matchedStudentByTag.rfidCardId,
        },
      });
      return;
    }

    // Step C: Look up Equipment by RFID Tag UID (or Equipment ID)
    const foundEquipment = await equipmentCol.findOne({
      $or: [
        { rfidTag: { $regex: new RegExp(`^${rawTag}$`, 'i') } },
        { id: { $regex: new RegExp(`^${rawTag}$`, 'i') } },
      ],
    });

    if (!foundEquipment) {
      const log = await recordScanLog({
        rfidTag: rawTag,
        tagType: 'unknown',
        action: `Unauthorized RFID Blocked (${rawMode.toUpperCase()})`,
        status: 'error',
        message: `Unauthorized / Unregistered RFID UID "${rawTag}" rejected by database.`,
        source,
      });
      broadcastStateUpdate('rfid_scan', { status: 'error', log });
      res.status(404).json({
        success: false,
        status: 'error',
        code: 'UNAUTHORIZED_RFID_TAG',
        message: `Unauthorized or unregistered RFID Tag UID "${rawTag}". Not found in CKCET Sports Inventory.`,
        rfidTag: rawTag,
      });
      return;
    }

    // Determine effective mode
    const effectiveMode =
      rawMode === 'auto'
        ? foundEquipment.status === 'available'
          ? 'issue'
          : 'return'
        : rawMode;

    // -------------------------------------------------------------------------
    // MODE 1: ISSUE EQUIPMENT VIA RFID
    // -------------------------------------------------------------------------
    if (effectiveMode === 'issue') {
      const effectiveStudentIdentifier =
        rawStudent ||
        (hardwareTelemetry.pendingStudentScan &&
        nowMs - hardwareTelemetry.pendingStudentScan.scannedAt <= 60000
          ? hardwareTelemetry.pendingStudentScan.registerNumber
          : '');

      if (!effectiveStudentIdentifier) {
        const log = await recordScanLog({
          rfidTag: rawTag,
          tagType: 'equipment',
          entityName: foundEquipment.name,
          action: 'Issue Incomplete (No Student ID)',
          status: 'warning',
          message: `Equipment "${foundEquipment.name}" scanned, but no student register number or student RFID card was provided.`,
          source,
        });
        broadcastStateUpdate('rfid_scan', { status: 'warning', log });
        res.status(400).json({
          success: false,
          status: 'warning',
          code: 'STUDENT_REQUIRED',
          message: `Equipment "${foundEquipment.name}" (${foundEquipment.id}) identified. Provide "studentReg" (register number or student RFID card UID) to issue.`,
          equipment: {
            id: foundEquipment.id,
            name: foundEquipment.name,
            rfidTag: foundEquipment.rfidTag,
            status: foundEquipment.status,
          },
        });
        return;
      }

      // Lookup Student
      const foundStudent = await studentsCol.findOne({
        $or: [
          { registerNumber: { $regex: new RegExp(`^${effectiveStudentIdentifier}$`, 'i') } },
          { rfidCardId: { $regex: new RegExp(`^${effectiveStudentIdentifier}$`, 'i') } },
        ],
      });

      if (!foundStudent) {
        const log = await recordScanLog({
          rfidTag: rawTag,
          tagType: 'equipment',
          entityName: foundEquipment.name,
          action: 'Unauthorized Student Card / Reg No',
          status: 'error',
          message: `Student ID "${effectiveStudentIdentifier}" is not registered in CKCET student directory.`,
          source,
        });
        broadcastStateUpdate('rfid_scan', { status: 'error', log });
        res.status(404).json({
          success: false,
          status: 'error',
          code: 'STUDENT_NOT_FOUND',
          message: `Student "${effectiveStudentIdentifier}" is not registered in the CKCET Student Directory.`,
          studentReg: effectiveStudentIdentifier,
        });
        return;
      }

      // Validate equipment is available
      if (foundEquipment.status !== 'available') {
        const log = await recordScanLog({
          rfidTag: rawTag,
          tagType: 'equipment',
          entityName: foundEquipment.name,
          action: 'Issue Blocked (Already Borrowed)',
          status: 'warning',
          message: `Cannot issue "${foundEquipment.name}" (${foundEquipment.id}): Currently ${String(foundEquipment.status).toUpperCase()} by ${foundEquipment.currentBorrowerName || 'another student'} (${foundEquipment.currentBorrowerRegNo || 'N/A'}).`,
          source,
        });
        broadcastStateUpdate('rfid_scan', { status: 'warning', log });
        res.status(409).json({
          success: false,
          status: 'warning',
          code: 'EQUIPMENT_ALREADY_BORROWED',
          message: `Cannot issue "${foundEquipment.name}": Already ${String(foundEquipment.status).toUpperCase()} by ${foundEquipment.currentBorrowerName} (${foundEquipment.currentBorrowerRegNo}).`,
          equipment: {
            id: foundEquipment.id,
            name: foundEquipment.name,
            status: foundEquipment.status,
            currentBorrowerName: foundEquipment.currentBorrowerName,
            currentBorrowerRegNo: foundEquipment.currentBorrowerRegNo,
          },
        });
        return;
      }

      // Perform Issue
      const issueDate = new Date();
      const dueDate = new Date(issueDate.getTime() + durationHours * 60 * 60 * 1000);
      const txId = `TXN-${issueDate.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      await equipmentCol.updateOne(
        { id: foundEquipment.id },
        {
          $set: {
            status: 'borrowed',
            currentBorrowerId: foundStudent.id,
            currentBorrowerName: foundStudent.name,
            currentBorrowerRegNo: foundStudent.registerNumber,
            issueDate: issueDate.toISOString(),
            dueDate: dueDate.toISOString(),
          },
          $inc: { totalBorrowsCount: 1 },
        }
      );

      await transactionsCol.insertOne({
        id: txId,
        type: 'issue',
        equipmentId: foundEquipment.id,
        equipmentName: foundEquipment.name,
        rfidTag: foundEquipment.rfidTag,
        studentId: foundStudent.id,
        studentRegisterNumber: foundStudent.registerNumber,
        studentName: foundStudent.name,
        studentDepartment: foundStudent.department,
        issueDate: issueDate.toISOString(),
        dueDate: dueDate.toISOString(),
        returnDate: null,
        status: 'active',
        issuedBy: 'ESP32 RFID Terminal',
        returnCondition: null,
        notes: `Issued via RFID scan (${source})`,
      });

      await studentsCol.updateOne(
        { id: foundStudent.id },
        { $inc: { activeBorrowsCount: 1 } }
      );

      hardwareTelemetry.pendingStudentScan = null;

      const log = await recordScanLog({
        rfidTag: foundEquipment.rfidTag,
        tagType: 'equipment',
        entityName: foundEquipment.name,
        action: 'RFID Issue Confirmed',
        status: 'success',
        message: `Issued "${foundEquipment.name}" (${foundEquipment.id}) to ${foundStudent.name} (${foundStudent.registerNumber}).`,
        source,
      });

      const responsePayload = {
        success: true,
        status: 'success',
        code: 'ISSUE_SUCCESS',
        mode: 'issue',
        message: `Issued "${foundEquipment.name}" to ${foundStudent.name} (${foundStudent.registerNumber}).`,
        transactionId: txId,
        equipment: {
          id: foundEquipment.id,
          name: foundEquipment.name,
          rfidTag: foundEquipment.rfidTag,
          status: 'borrowed',
          rackLocation: foundEquipment.rackLocation,
        },
        student: {
          id: foundStudent.id,
          name: foundStudent.name,
          registerNumber: foundStudent.registerNumber,
          department: foundStudent.department,
        },
        issueDate: issueDate.toISOString(),
        dueDate: dueDate.toISOString(),
      };

      broadcastStateUpdate('rfid_scan', { status: 'success', log, result: responsePayload });
      res.status(200).json(responsePayload);
      return;
    }

    // -------------------------------------------------------------------------
    // MODE 2: RETURN EQUIPMENT VIA RFID
    // -------------------------------------------------------------------------
    if (effectiveMode === 'return') {
      if (foundEquipment.status === 'available') {
        const log = await recordScanLog({
          rfidTag: rawTag,
          tagType: 'equipment',
          entityName: foundEquipment.name,
          action: 'Return Blocked (Already Available)',
          status: 'warning',
          message: `"${foundEquipment.name}" (${foundEquipment.id}) is already marked AVAILABLE in ${foundEquipment.rackLocation}.`,
          source,
        });
        broadcastStateUpdate('rfid_scan', { status: 'warning', log });
        res.status(409).json({
          success: false,
          status: 'warning',
          code: 'EQUIPMENT_ALREADY_AVAILABLE',
          message: `"${foundEquipment.name}" (${foundEquipment.id}) is already marked AVAILABLE in ${foundEquipment.rackLocation}.`,
          equipment: {
            id: foundEquipment.id,
            name: foundEquipment.name,
            status: 'available',
          },
        });
        return;
      }

      // Optional borrower verification
      if (rawStudent && foundEquipment.currentBorrowerRegNo) {
        const borrowerStudent = await studentsCol.findOne({
          registerNumber: { $regex: new RegExp(`^${String(foundEquipment.currentBorrowerRegNo)}$`, 'i') },
        });

        const matchesReg = String(foundEquipment.currentBorrowerRegNo).toUpperCase() === rawStudent;
        const matchesCard = borrowerStudent && String(borrowerStudent.rfidCardId).toUpperCase() === rawStudent;

        if (!matchesReg && !matchesCard) {
          const log = await recordScanLog({
            rfidTag: rawTag,
            tagType: 'equipment',
            entityName: foundEquipment.name,
            action: 'Return Borrower Mismatch',
            status: 'error',
            message: `Borrower mismatch: "${foundEquipment.name}" was borrowed by ${foundEquipment.currentBorrowerName} (${foundEquipment.currentBorrowerRegNo}), not "${rawStudent}".`,
            source,
          });
          broadcastStateUpdate('rfid_scan', { status: 'error', log });
          res.status(403).json({
            success: false,
            status: 'error',
            code: 'BORROWER_MISMATCH',
            message: `Student ID mismatch: "${foundEquipment.name}" is checked out to ${foundEquipment.currentBorrowerName} (${foundEquipment.currentBorrowerRegNo}), not ${rawStudent}.`,
          });
          return;
        }
      }

      const returnDate = new Date();
      const previousBorrowerName = foundEquipment.currentBorrowerName || 'Student';
      const previousBorrowerRegNo = foundEquipment.currentBorrowerRegNo || '';

      const activeTx = await transactionsCol.findOne(
        { equipmentId: foundEquipment.id, status: { $in: ['active', 'overdue'] } },
        { sort: { issueDate: -1 } }
      );

      // Update equipment
      await equipmentCol.updateOne(
        { id: foundEquipment.id },
        {
          $set: {
            status: 'available',
            currentBorrowerId: null,
            currentBorrowerName: null,
            currentBorrowerRegNo: null,
            issueDate: null,
            dueDate: null,
          },
        }
      );

      // Update transaction
      if (activeTx) {
        const existingNotes = activeTx.notes || '';
        const newNotes = existingNotes
          ? `${existingNotes} | Returned via RFID (${source})`
          : `Returned via RFID (${source})`;

        await transactionsCol.updateOne(
          { id: activeTx.id },
          {
            $set: {
              status: 'returned',
              returnDate: returnDate.toISOString(),
              returnCondition: activeTx.returnCondition || foundEquipment.condition,
              notes: newNotes,
            },
          }
        );
      }

      // Update student borrow count
      if (previousBorrowerRegNo) {
        await studentsCol.updateOne(
          { registerNumber: { $regex: new RegExp(`^${previousBorrowerRegNo}$`, 'i') } },
          [{ $set: { activeBorrowsCount: { $max: [0, { $subtract: ['$activeBorrowsCount', 1] }] } } }]
        );
      }

      hardwareTelemetry.pendingStudentScan = null;

      const log = await recordScanLog({
        rfidTag: foundEquipment.rfidTag,
        tagType: 'equipment',
        entityName: foundEquipment.name,
        action: 'RFID Return Confirmed',
        status: 'success',
        message: `Returned "${foundEquipment.name}" (${foundEquipment.id}) from ${previousBorrowerName} (${previousBorrowerRegNo || 'Verified'}). Restored to ${foundEquipment.rackLocation}.`,
        source,
      });

      const responsePayload = {
        success: true,
        status: 'success',
        code: 'RETURN_SUCCESS',
        mode: 'return',
        message: `Returned "${foundEquipment.name}" from ${previousBorrowerName}. Marked AVAILABLE in ${foundEquipment.rackLocation}.`,
        transactionId: activeTx?.id || null,
        equipment: {
          id: foundEquipment.id,
          name: foundEquipment.name,
          rfidTag: foundEquipment.rfidTag,
          status: 'available',
          rackLocation: foundEquipment.rackLocation,
        },
        returnedBy: {
          name: previousBorrowerName,
          registerNumber: previousBorrowerRegNo,
        },
        returnDate: returnDate.toISOString(),
      };

      broadcastStateUpdate('rfid_scan', { status: 'success', log, result: responsePayload });
      res.status(200).json(responsePayload);
      return;
    }

    res.status(400).json({
      success: false,
      status: 'error',
      code: 'INVALID_MODE',
      message: `Invalid mode "${rawMode}". Supported modes are "issue", "return", or "auto".`,
    });
  });

  // ---------------------------------------------------------------------------
  // 3. EQUIPMENT CRUD ROUTES
  // ---------------------------------------------------------------------------
  app.post('/api/equipment', async (req: Request, res: Response) => {
    const { id, name, category, rfidTag, condition, rackLocation, description } = req.body;
    if (!id || !name || !rfidTag) {
      res.status(400).json({ error: 'Equipment ID, Name, and RFID Tag are required.' });
      return;
    }

    const cleanId = String(id).trim().toUpperCase();
    const cleanRfid = String(rfidTag).trim().toUpperCase();

    const existing = await equipmentCol.findOne({
      $or: [
        { id: { $regex: new RegExp(`^${cleanId}$`, 'i') } },
        { rfidTag: { $regex: new RegExp(`^${cleanRfid}$`, 'i') } },
      ],
    });
    if (existing) {
      res.status(409).json({ error: 'Equipment ID or RFID Tag UID already exists in database.' });
      return;
    }

    const createdAt = new Date().toISOString();
    await equipmentCol.insertOne({
      id: cleanId,
      name: String(name).trim(),
      category: category || 'General',
      rfidTag: cleanRfid,
      status: 'available',
      condition: condition || 'Excellent',
      rackLocation: String(rackLocation || 'General Rack').trim(),
      totalBorrowsCount: 0,
      currentBorrowerId: null,
      currentBorrowerName: null,
      currentBorrowerRegNo: null,
      issueDate: null,
      dueDate: null,
      description: description ? String(description).trim() : null,
      createdAt,
    });

    broadcastStateUpdate('equipment_added');
    res.status(201).json(await getFullSystemState());
  });

  app.put('/api/equipment/:id', async (req: Request, res: Response) => {
    const targetId = req.params.id;
    const { name, category, rfidTag, condition, rackLocation, description } = req.body;
    const cleanRfid = String(rfidTag || '').trim().toUpperCase();

    const conflict = await equipmentCol.findOne({
      rfidTag: { $regex: new RegExp(`^${cleanRfid}$`, 'i') },
      id: { $ne: targetId },
    });
    if (conflict) {
      res.status(409).json({ error: `RFID Tag "${cleanRfid}" is already assigned to another item.` });
      return;
    }

    await equipmentCol.updateOne(
      { id: targetId },
      {
        $set: {
          name: String(name).trim(),
          category,
          rfidTag: cleanRfid,
          condition,
          rackLocation: String(rackLocation || '').trim(),
          description: description ? String(description).trim() : null,
        },
      }
    );

    broadcastStateUpdate('equipment_updated');
    res.json(await getFullSystemState());
  });

  app.delete('/api/equipment/:id', async (req: Request, res: Response) => {
    const targetId = req.params.id;
    const eq = await equipmentCol.findOne({ id: targetId });
    if (!eq) {
      res.status(404).json({ error: 'Equipment not found.' });
      return;
    }
    if (eq.status === 'borrowed' || eq.status === 'overdue') {
      res.status(409).json({ error: 'Cannot delete equipment while it is borrowed or overdue.' });
      return;
    }

    await equipmentCol.deleteOne({ id: targetId });
    broadcastStateUpdate('equipment_deleted');
    res.json(await getFullSystemState());
  });

  // ---------------------------------------------------------------------------
  // 4. STUDENT CRUD ROUTES
  // ---------------------------------------------------------------------------
  app.post('/api/students', async (req: Request, res: Response) => {
    const { id, registerNumber, name, department, year, section, phone, email, rfidCardId } = req.body;
    if (!registerNumber || !name) {
      res.status(400).json({ error: 'Student Name and Register Number are required.' });
      return;
    }

    const cleanReg = String(registerNumber).trim().toUpperCase();
    const cleanCard = String(rfidCardId || `STU_CARD_${Math.floor(100000 + Math.random() * 900000)}`).trim().toUpperCase();

    const existing = await studentsCol.findOne({
      registerNumber: { $regex: new RegExp(`^${cleanReg}$`, 'i') },
    });
    if (existing) {
      res.status(409).json({ error: `Register Number "${cleanReg}" is already registered.` });
      return;
    }

    const studentId = id || `STU-${Math.floor(1000 + Math.random() * 9000)}`;
    const createdAt = new Date().toISOString();

    await studentsCol.insertOne({
      id: studentId,
      registerNumber: cleanReg,
      name: String(name).trim(),
      department: department || 'CSE',
      year: year || 'I',
      section: section || 'A',
      phone: phone || '+91 90000 00000',
      email: email || `${cleanReg.toLowerCase()}@ckcet.edu.in`,
      rfidCardId: cleanCard,
      activeBorrowsCount: 0,
      createdAt,
    });

    broadcastStateUpdate('student_added');
    res.status(201).json(await getFullSystemState());
  });

  app.put('/api/students/:id', async (req: Request, res: Response) => {
    const targetId = req.params.id;
    const { registerNumber, name, department, year, section, phone, email, rfidCardId } = req.body;
    const cleanReg = String(registerNumber || '').trim().toUpperCase();

    const conflict = await studentsCol.findOne({
      registerNumber: { $regex: new RegExp(`^${cleanReg}$`, 'i') },
      id: { $ne: targetId },
    });
    if (conflict) {
      res.status(409).json({ error: `Register Number "${cleanReg}" is already registered to another student.` });
      return;
    }

    await studentsCol.updateOne(
      { id: targetId },
      {
        $set: {
          registerNumber: cleanReg,
          name: String(name).trim(),
          department,
          year,
          section,
          phone,
          email,
          rfidCardId: String(rfidCardId || '').trim().toUpperCase(),
        },
      }
    );

    broadcastStateUpdate('student_updated');
    res.json(await getFullSystemState());
  });

  app.delete('/api/students/:id', async (req: Request, res: Response) => {
    const targetId = req.params.id;
    const st = await studentsCol.findOne({ id: targetId });
    if (!st) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }
    if (st.activeBorrowsCount > 0) {
      res.status(409).json({ error: 'Cannot delete student with active borrowed equipment.' });
      return;
    }

    await studentsCol.deleteOne({ id: targetId });
    broadcastStateUpdate('student_deleted');
    res.json(await getFullSystemState());
  });

  // ---------------------------------------------------------------------------
  // 5. WEB PORTAL MANUAL ISSUE & RETURN ROUTES
  // ---------------------------------------------------------------------------
  app.post('/api/transactions/issue', async (req: Request, res: Response) => {
    await syncOverdueStatuses();
    const { equipmentId, studentRegisterNumber, dueDate, issuedBy, notes } = req.body;

    const eq = await equipmentCol.findOne({ id: equipmentId });
    if (!eq) {
      res.status(404).json({ error: 'Equipment not found.' });
      return;
    }
    if (eq.status !== 'available') {
      res.status(409).json({
        error: `Issue Blocked: "${eq.name}" (${eq.id}) is already ${String(eq.status).toUpperCase()} by ${eq.currentBorrowerName || 'another student'}.`,
      });
      return;
    }

    const st = await studentsCol.findOne({
      registerNumber: { $regex: new RegExp(`^${String(studentRegisterNumber || '').trim()}$`, 'i') },
    });
    if (!st) {
      res.status(404).json({ error: `Student with Register Number "${studentRegisterNumber}" not found.` });
      return;
    }

    const issueDateIso = new Date().toISOString();
    const dueDateIso = dueDate || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const txId = `TXN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await equipmentCol.updateOne(
      { id: eq.id },
      {
        $set: {
          status: 'borrowed',
          currentBorrowerId: st.id,
          currentBorrowerName: st.name,
          currentBorrowerRegNo: st.registerNumber,
          issueDate: issueDateIso,
          dueDate: dueDateIso,
        },
        $inc: { totalBorrowsCount: 1 },
      }
    );

    await transactionsCol.insertOne({
      id: txId,
      type: 'issue',
      equipmentId: eq.id,
      equipmentName: eq.name,
      rfidTag: eq.rfidTag,
      studentId: st.id,
      studentRegisterNumber: st.registerNumber,
      studentName: st.name,
      studentDepartment: st.department,
      issueDate: issueDateIso,
      dueDate: dueDateIso,
      returnDate: null,
      status: 'active',
      issuedBy: issuedBy || 'Mr. R. Shanmugam (PET)',
      returnCondition: null,
      notes: notes || null,
    });

    await studentsCol.updateOne(
      { id: st.id },
      { $inc: { activeBorrowsCount: 1 } }
    );

    broadcastStateUpdate('manual_issue');
    res.status(201).json(await getFullSystemState());
  });

  app.post('/api/transactions/return', async (req: Request, res: Response) => {
    await syncOverdueStatuses();
    const { equipmentId, condition, notes } = req.body;

    const eq = await equipmentCol.findOne({ id: equipmentId });
    if (!eq) {
      res.status(404).json({ error: 'Equipment not found.' });
      return;
    }
    if (eq.status === 'available') {
      res.status(409).json({ error: `"${eq.name}" is already marked as Available.` });
      return;
    }

    const borrowerRegNo = eq.currentBorrowerRegNo;
    const returnDateIso = new Date().toISOString();

    const activeTx = await transactionsCol.findOne(
      { equipmentId: eq.id, status: { $in: ['active', 'overdue'] } },
      { sort: { issueDate: -1 } }
    );

    await equipmentCol.updateOne(
      { id: eq.id },
      {
        $set: {
          status: 'available',
          condition: condition || eq.condition,
          currentBorrowerId: null,
          currentBorrowerName: null,
          currentBorrowerRegNo: null,
          issueDate: null,
          dueDate: null,
        },
      }
    );

    if (activeTx) {
      const combinedNotes = notes
        ? activeTx.notes
          ? `${activeTx.notes} | ${notes}`
          : notes
        : activeTx.notes;

      await transactionsCol.updateOne(
        { id: activeTx.id },
        {
          $set: {
            status: 'returned',
            returnDate: returnDateIso,
            returnCondition: condition || eq.condition,
            notes: combinedNotes,
          },
        }
      );
    }

    if (borrowerRegNo) {
      await studentsCol.updateOne(
        { registerNumber: { $regex: new RegExp(`^${String(borrowerRegNo)}$`, 'i') } },
        [{ $set: { activeBorrowsCount: { $max: [0, { $subtract: ['$activeBorrowsCount', 1] }] } } }]
      );
    }

    broadcastStateUpdate('manual_return');
    res.json(await getFullSystemState());
  });

  // ---------------------------------------------------------------------------
  // 6. SCAN LOGS & DATABASE RESET ROUTES
  // ---------------------------------------------------------------------------
  app.delete('/api/scan-logs', async (_req: Request, res: Response) => {
    await scanLogsCol.deleteMany({});
    broadcastStateUpdate('logs_cleared');
    res.json(await getFullSystemState());
  });

  app.post('/api/reset', async (_req: Request, res: Response) => {
    await seedDatabase(true);
    recentScanMap.clear();
    hardwareTelemetry.pendingStudentScan = null;
    broadcastStateUpdate('database_reset');
    res.json(await getFullSystemState());
  });

  // ---------------------------------------------------------------------------
  // 7. VITE DEV MIDDLEWARE OR PRODUCTION STATIC ASSETS
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🏀 SPORTSYNC AI Full-Stack Server & MongoDB running on http://0.0.0.0:${PORT}`);
    console.log(`🔗 MongoDB Atlas: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//<credentials>@')}`);
    console.log(`📡 Hardware RFID Endpoint ready: POST http://0.0.0.0:${PORT}/api/rfid/scan`);
  });
}

startServer();
