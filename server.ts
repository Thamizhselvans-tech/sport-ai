import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DB_PATH = process.env.DATABASE_PATH || (process.env.VERCEL ? '/tmp/sportsync.db' : path.join(__dirname, 'sportsync.db'));
const IOT_API_KEY = process.env.IOT_API_KEY || '';

// Initialize SQLite Database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create Persistent Schema (Students, Equipment, RFID Cards, Transactions, Admin Users, Scan Logs)
db.exec(`
  CREATE TABLE IF NOT EXISTS equipment (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    rfidTag TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'available',
    condition TEXT NOT NULL DEFAULT 'Excellent',
    rackLocation TEXT NOT NULL,
    totalBorrowsCount INTEGER NOT NULL DEFAULT 0,
    currentBorrowerId TEXT,
    currentBorrowerName TEXT,
    currentBorrowerRegNo TEXT,
    issueDate TEXT,
    dueDate TEXT,
    description TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    registerNumber TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    year TEXT NOT NULL,
    section TEXT,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    rfidCardId TEXT NOT NULL,
    activeBorrowsCount INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rfid_cards (
    id TEXT PRIMARY KEY,
    cardUid TEXT NOT NULL UNIQUE,
    cardType TEXT NOT NULL,
    assignedToId TEXT,
    assignedToName TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    equipmentId TEXT NOT NULL,
    equipmentName TEXT NOT NULL,
    rfidTag TEXT NOT NULL,
    studentId TEXT NOT NULL,
    studentRegisterNumber TEXT NOT NULL,
    studentName TEXT NOT NULL,
    studentDepartment TEXT NOT NULL,
    issueDate TEXT NOT NULL,
    dueDate TEXT NOT NULL,
    returnDate TEXT,
    status TEXT NOT NULL,
    issuedBy TEXT NOT NULL,
    returnCondition TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS scan_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    rfidTag TEXT NOT NULL,
    tagType TEXT NOT NULL,
    entityName TEXT,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT NOT NULL,
    rawHex TEXT NOT NULL,
    source TEXT DEFAULT 'ESP32_API'
  );
`);

// Seed Initial CKCET Data if database is empty
function seedDatabase(forceReset = false) {
  if (forceReset) {
    db.exec(`
      DELETE FROM scan_logs;
      DELETE FROM transactions;
      DELETE FROM equipment;
      DELETE FROM students;
    `);
  }

  const eqCount = db.prepare('SELECT COUNT(*) as count FROM equipment').get() as { count: number };
  if (eqCount.count > 0 && !forceReset) {
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

  const insertStudent = db.prepare(`
    INSERT INTO students (id, registerNumber, name, department, year, section, phone, email, rfidCardId, activeBorrowsCount, createdAt)
    VALUES (@id, @registerNumber, @name, @department, @year, @section, @phone, @email, @rfidCardId, @activeBorrowsCount, @createdAt)
  `);

  const insertEquipment = db.prepare(`
    INSERT INTO equipment (id, name, category, rfidTag, status, condition, rackLocation, totalBorrowsCount, currentBorrowerId, currentBorrowerName, currentBorrowerRegNo, issueDate, dueDate, description, createdAt)
    VALUES (@id, @name, @category, @rfidTag, @status, @condition, @rackLocation, @totalBorrowsCount, @currentBorrowerId, @currentBorrowerName, @currentBorrowerRegNo, @issueDate, @dueDate, @description, @createdAt)
  `);

  const insertTx = db.prepare(`
    INSERT INTO transactions (id, type, equipmentId, equipmentName, rfidTag, studentId, studentRegisterNumber, studentName, studentDepartment, issueDate, dueDate, returnDate, status, issuedBy, returnCondition, notes)
    VALUES (@id, @type, @equipmentId, @equipmentName, @rfidTag, @studentId, @studentRegisterNumber, @studentName, @studentDepartment, @issueDate, @dueDate, @returnDate, @status, @issuedBy, @returnCondition, @notes)
  `);

  const seedTransaction = db.transaction(() => {
    for (const s of initialStudents) insertStudent.run(s);
    for (const eq of initialEquipment) insertEquipment.run(eq);
    for (const tx of initialTransactions) insertTx.run(tx);
  });

  seedTransaction();
}

seedDatabase(false);

// Ensure essential IoT test student, equipment, cards, and admin users are guaranteed to exist
function ensureHardwareSeed() {
  const nowIso = new Date().toISOString();

  // 1. Ensure ESP32 test student exists
  const hasStudent = db.prepare('SELECT id FROM students WHERE UPPER(registerNumber) = ?').get('420723104053');
  if (!hasStudent) {
    db.prepare(`
      INSERT INTO students (id, registerNumber, name, department, year, section, phone, email, rfidCardId, activeBorrowsCount, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run('STU-007', '420723104053', 'Mohamed Amjath S', 'CSE', 'II', 'A', '+91 94432 87654', 'amjath.cse@ckcet.edu.in', '44B7F506_STU', nowIso);
  }

  // 2. Ensure ESP32 test equipment exists
  const hasEquipment = db.prepare('SELECT id FROM equipment WHERE UPPER(rfidTag) = ?').get('44B7F506');
  if (!hasEquipment) {
    db.prepare(`
      INSERT INTO equipment (id, name, category, rfidTag, status, condition, rackLocation, totalBorrowsCount, currentBorrowerId, currentBorrowerName, currentBorrowerRegNo, issueDate, dueDate, description, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, NULL, NULL, NULL, ?, ?)
    `).run('EQ-FB-11', 'Nike Strike IoT Pro Football', 'Football', '44B7F506', 'available', 'Excellent', 'Ball Cage A-1', 'Official IoT Test Ball for ESP32 + RC522', nowIso);
  }

  // 3. Ensure RFID cards table populated
  const hasCard = db.prepare('SELECT id FROM rfid_cards WHERE UPPER(cardUid) = ?').get('44B7F506');
  if (!hasCard) {
    db.prepare(`
      INSERT OR REPLACE INTO rfid_cards (id, cardUid, cardType, assignedToId, assignedToName, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('CARD-001', '44B7F506', 'equipment', 'EQ-FB-11', 'Nike Strike IoT Pro Football', 'active', nowIso);
  }

  // 4. Ensure Admin user exists
  const hasAdmin = db.prepare('SELECT id FROM admin_users WHERE username = ?').get('admin');
  if (!hasAdmin) {
    db.prepare(`
      INSERT OR REPLACE INTO admin_users (id, username, passwordHash, name, role, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('ADMIN-001', 'admin', 'admin123', 'Sports Director / PET In-Charge', 'superadmin', nowIso);
  }
}

ensureHardwareSeed();

// Synchronize overdue statuses in SQLite dynamically based on current server clock
function syncOverdueStatuses() {
  const nowIso = new Date().toISOString();
  db.prepare(`
    UPDATE equipment
    SET status = 'overdue'
    WHERE status = 'borrowed' AND dueDate IS NOT NULL AND dueDate < ?
  `).run(nowIso);

  db.prepare(`
    UPDATE transactions
    SET status = 'overdue'
    WHERE status = 'active' AND dueDate IS NOT NULL AND dueDate < ?
  `).run(nowIso);
}

// Track connected SSE clients for real-time dashboard updates
const sseClients = new Set<Response>();

// Track ESP32 Hardware connection telemetry (only updated when real hardware/API hits endpoints)
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

function getFullSystemState() {
  syncOverdueStatuses();
  const equipmentRaw = db.prepare('SELECT * FROM equipment ORDER BY createdAt DESC').all() as Record<string, unknown>[];
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

  const students = db.prepare('SELECT * FROM students ORDER BY name ASC').all();
  const transactionsRaw = db.prepare('SELECT * FROM transactions ORDER BY issueDate DESC').all() as Record<string, unknown>[];
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

  const scanLogs = db.prepare('SELECT * FROM scan_logs ORDER BY timestamp DESC LIMIT 50').all();

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
    students,
    transactions,
    scanLogs,
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

function broadcastStateUpdate(eventType = 'state_update', lastScanEvent?: unknown) {
  const payload = JSON.stringify({
    type: eventType,
    state: getFullSystemState(),
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

function recordScanLog(params: {
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

  db.prepare(`
    INSERT INTO scan_logs (id, timestamp, rfidTag, tagType, entityName, action, status, message, rawHex, source)
    VALUES (@id, @timestamp, @rfidTag, @tagType, @entityName, @action, @status, @message, @rawHex, @source)
  `).run(log);

  return log;
}

async function startServer() {
  const app = express();

  // Enable CORS so ESP32 hardware and external clients can call /api/rfid/scan from any network
  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'Accept'],
    })
  );

  // Multi-format request body parsers (JSON, urlencoded, text/plain from Arduino HTTPClient)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(express.text({ type: ['text/plain', 'text/html', 'application/json'] }));

  // Auto-parse stringified JSON if ESP32 sends raw text payload
  app.use((req, _res, next) => {
    if (typeof req.body === 'string' && req.body.trim().startsWith('{')) {
      try {
        req.body = JSON.parse(req.body);
      } catch {
        // keep string
      }
    }
    next();
  });

  // Strict API response header: guarantee all /api endpoints return application/json
  app.use('/api', (_req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
  });

  // ---------------------------------------------------------------------------
  // 1. REAL-TIME SSE STREAM & FULL SYSTEM STATE ENDPOINTS
  // ---------------------------------------------------------------------------
  app.get('/api/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    sseClients.add(res);

    // Send initial state snapshot immediately
    res.write(
      `data: ${JSON.stringify({
        type: 'initial_state',
        state: getFullSystemState(),
        timestamp: new Date().toISOString(),
      })}\n\n`
    );

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  app.get('/api/state', (_req: Request, res: Response) => {
    res.json(getFullSystemState());
  });

  // ESP32 Heartbeat Ping
  app.post('/api/rfid/heartbeat', (req: Request, res: Response) => {
    hardwareTelemetry.lastSeenAt = new Date().toISOString();
    hardwareTelemetry.lastIp = req.ip || req.socket.remoteAddress || 'ESP32';
    broadcastStateUpdate('hardware_heartbeat');
    res.json({
      success: true,
      status: 'online',
      message: 'SPORTSYNC AI Backend Online - Ready for RC522 RFID Scans',
      serverTime: new Date().toISOString(),
    });
  });

  // ---------------------------------------------------------------------------
  // 2. CORE HARDWARE ENDPOINT: POST & GET /api/rfid/scan
  // ---------------------------------------------------------------------------
  app.get(['/api/rfid/scan', '/api/rfid/scan/'], (_req: Request, res: Response) => {
    res.json({
      success: true,
      service: 'SPORTSYNC AI - ESP32 RC522 RFID Hardware Gateway',
      status: 'online',
      method: 'POST',
      endpoint: '/api/rfid/scan',
      expectedJsonFormat: {
        rfidTag: '44B7F506',
        mode: 'issue | return | auto',
        studentReg: '420723104053',
      },
      telemetry: {
        totalHardwareScans: hardwareTelemetry.totalHardwareScans,
        lastSeenAt: hardwareTelemetry.lastSeenAt,
        lastIp: hardwareTelemetry.lastIp,
        lastScannedTag: hardwareTelemetry.lastScannedTag,
      },
      message: 'ESP32 RFID API is active. Send HTTP POST with application/json.',
    });
  });

  app.post(['/api/rfid/scan', '/api/rfid/scan/'], (req: Request, res: Response) => {
    syncOverdueStatuses();

    // Optional API Key verification if client sends x-api-key header and IOT_API_KEY is configured
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

    // Update ESP32 telemetry if coming from ESP32 or API
    if (source === 'ESP32_RC522' || !req.body?.source) {
      hardwareTelemetry.lastSeenAt = new Date().toISOString();
      hardwareTelemetry.lastIp = req.ip || req.socket.remoteAddress || 'ESP32';
      hardwareTelemetry.totalHardwareScans += 1;
      if (rawTag) hardwareTelemetry.lastScannedTag = rawTag;
    }

    if (!rawTag) {
      const log = recordScanLog({
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

    // Step A: Prevent rapid duplicate scans of the exact same tag + mode within cooldown window
    const debounceKey = `${rawTag}:${rawMode}:${rawStudent}`;
    const lastScanMs = recentScanMap.get(debounceKey);
    const nowMs = Date.now();
    if (lastScanMs && nowMs - lastScanMs < DUPLICATE_COOLDOWN_MS) {
      const log = recordScanLog({
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

    // Step B: Check if scanned rfidTag is actually a Student Smart ID Card (supports 2-tap ESP32 workflow)
    const matchedStudentByTag = db
      .prepare('SELECT * FROM students WHERE UPPER(rfidCardId) = ? OR UPPER(registerNumber) = ?')
      .get(rawTag, rawTag) as Record<string, any> | undefined;

    if (matchedStudentByTag && !rawStudent) {
      hardwareTelemetry.pendingStudentScan = {
        studentId: matchedStudentByTag.id,
        registerNumber: matchedStudentByTag.registerNumber,
        name: matchedStudentByTag.name,
        department: matchedStudentByTag.department,
        rfidCardId: matchedStudentByTag.rfidCardId,
        scannedAt: nowMs,
      };

      const log = recordScanLog({
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
    const foundEquipment = db
      .prepare('SELECT * FROM equipment WHERE UPPER(rfidTag) = ? OR UPPER(id) = ?')
      .get(rawTag, rawTag) as Record<string, any> | undefined;

    if (!foundEquipment) {
      const log = recordScanLog({
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
        message: 'Equipment not registered',
        rfidTag: rawTag,
      });
      return;
    }

    // Determine effective mode ('issue' or 'return')
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
      // Resolve student from studentReg payload OR from 2-step pendingStudentScan
      const effectiveStudentIdentifier =
        rawStudent ||
        (hardwareTelemetry.pendingStudentScan &&
        nowMs - hardwareTelemetry.pendingStudentScan.scannedAt <= 60000
          ? hardwareTelemetry.pendingStudentScan.registerNumber
          : '');

      if (!effectiveStudentIdentifier) {
        const log = recordScanLog({
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
          message: 'Student registration number required for issue mode',
          rfidTag: rawTag,
          mode: 'issue',
        });
        return;
      }

      // Lookup Student by registerNumber OR rfidCardId
      const foundStudent = db
        .prepare('SELECT * FROM students WHERE UPPER(registerNumber) = ? OR UPPER(rfidCardId) = ?')
        .get(effectiveStudentIdentifier, effectiveStudentIdentifier) as Record<string, any> | undefined;

      if (!foundStudent) {
        const log = recordScanLog({
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
          message: 'Student not registered',
          studentReg: effectiveStudentIdentifier,
          rfidTag: rawTag,
        });
        return;
      }

      // Validate that equipment is currently available
      if (foundEquipment.status !== 'available') {
        const log = recordScanLog({
          rfidTag: rawTag,
          tagType: 'equipment',
          entityName: foundEquipment.name,
          action: 'Issue Blocked (Already Borrowed)',
          status: 'warning',
          message: `Cannot issue "${foundEquipment.name}" (${foundEquipment.id}): Currently ${foundEquipment.status.toUpperCase()} by ${foundEquipment.currentBorrowerName || 'another student'} (${foundEquipment.currentBorrowerRegNo || 'N/A'}).`,
          source,
        });
        broadcastStateUpdate('rfid_scan', { status: 'warning', log });
        res.status(409).json({
          success: false,
          message: 'Equipment is already borrowed by another student',
          rfidTag: rawTag,
          studentReg: effectiveStudentIdentifier,
          currentBorrower: foundEquipment.currentBorrowerName,
        });
        return;
      }

      // Perform atomic SQLite Issue Transaction
      const issueDate = new Date();
      const dueDate = new Date(issueDate.getTime() + durationHours * 60 * 60 * 1000);
      const txId = `TXN-${issueDate.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const executeIssue = db.transaction(() => {
        db.prepare(`
          UPDATE equipment
          SET status = 'borrowed',
              currentBorrowerId = ?,
              currentBorrowerName = ?,
              currentBorrowerRegNo = ?,
              issueDate = ?,
              dueDate = ?,
              totalBorrowsCount = totalBorrowsCount + 1
          WHERE id = ?
        `).run(
          foundStudent.id,
          foundStudent.name,
          foundStudent.registerNumber,
          issueDate.toISOString(),
          dueDate.toISOString(),
          foundEquipment.id
        );

        db.prepare(`
          INSERT INTO transactions (
            id, type, equipmentId, equipmentName, rfidTag,
            studentId, studentRegisterNumber, studentName, studentDepartment,
            issueDate, dueDate, returnDate, status, issuedBy, returnCondition, notes
          ) VALUES (?, 'issue', ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'active', ?, NULL, ?)
        `).run(
          txId,
          foundEquipment.id,
          foundEquipment.name,
          foundEquipment.rfidTag,
          foundStudent.id,
          foundStudent.registerNumber,
          foundStudent.name,
          foundStudent.department,
          issueDate.toISOString(),
          dueDate.toISOString(),
          'ESP32 RFID Terminal',
          `Issued via RFID scan (${source})`
        );

        db.prepare(`
          UPDATE students
          SET activeBorrowsCount = activeBorrowsCount + 1
          WHERE id = ?
        `).run(foundStudent.id);
      });

      executeIssue();
      hardwareTelemetry.pendingStudentScan = null;

      const log = recordScanLog({
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
        message: 'Equipment issued successfully',
        studentReg: foundStudent.registerNumber,
        rfidTag: foundEquipment.rfidTag,
        mode: 'issue',
        equipmentName: foundEquipment.name,
        studentName: foundStudent.name,
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
        const log = recordScanLog({
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
          message: 'Equipment already returned and available',
          rfidTag: rawTag,
          mode: 'return',
        });
        return;
      }

      // Optional verification if studentReg was passed on return: check if it matches borrower
      if (rawStudent && foundEquipment.currentBorrowerRegNo) {
        const borrowerStudent = db
          .prepare('SELECT * FROM students WHERE UPPER(registerNumber) = ?')
          .get(String(foundEquipment.currentBorrowerRegNo).toUpperCase()) as Record<string, any> | undefined;

        const matchesReg = String(foundEquipment.currentBorrowerRegNo).toUpperCase() === rawStudent;
        const matchesCard = borrowerStudent && String(borrowerStudent.rfidCardId).toUpperCase() === rawStudent;

        if (!matchesReg && !matchesCard) {
          const log = recordScanLog({
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

      const activeTx = db
        .prepare(`
          SELECT * FROM transactions
          WHERE equipmentId = ? AND status IN ('active', 'overdue')
          ORDER BY issueDate DESC LIMIT 1
        `)
        .get(foundEquipment.id) as Record<string, any> | undefined;

      const executeReturn = db.transaction(() => {
        db.prepare(`
          UPDATE equipment
          SET status = 'available',
              currentBorrowerId = NULL,
              currentBorrowerName = NULL,
              currentBorrowerRegNo = NULL,
              issueDate = NULL,
              dueDate = NULL
          WHERE id = ?
        `).run(foundEquipment.id);

        if (activeTx) {
          db.prepare(`
            UPDATE transactions
            SET status = 'returned',
                returnDate = ?,
                returnCondition = COALESCE(returnCondition, ?),
                notes = CASE
                  WHEN notes IS NOT NULL AND notes != '' THEN notes || ' | Returned via RFID (' || ? || ')'
                  ELSE 'Returned via RFID (' || ? || ')'
                END
            WHERE id = ?
          `).run(
            returnDate.toISOString(),
            foundEquipment.condition,
            source,
            source,
            activeTx.id
          );
        }

        if (previousBorrowerRegNo) {
          db.prepare(`
            UPDATE students
            SET activeBorrowsCount = MAX(0, activeBorrowsCount - 1)
            WHERE UPPER(registerNumber) = ?
          `).run(previousBorrowerRegNo.toUpperCase());
        }
      });

      executeReturn();
      hardwareTelemetry.pendingStudentScan = null;

      const log = recordScanLog({
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
        message: 'Equipment returned successfully',
        studentReg: previousBorrowerRegNo || rawStudent || 'N/A',
        rfidTag: foundEquipment.rfidTag,
        mode: 'return',
        equipmentName: foundEquipment.name,
        studentName: previousBorrowerName,
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
  app.post('/api/equipment', (req: Request, res: Response) => {
    const { id, name, category, rfidTag, condition, rackLocation, description } = req.body;
    if (!id || !name || !rfidTag) {
      res.status(400).json({ error: 'Equipment ID, Name, and RFID Tag are required.' });
      return;
    }

    const cleanId = String(id).trim().toUpperCase();
    const cleanRfid = String(rfidTag).trim().toUpperCase();

    const existing = db
      .prepare('SELECT id FROM equipment WHERE UPPER(id) = ? OR UPPER(rfidTag) = ?')
      .get(cleanId, cleanRfid);
    if (existing) {
      res.status(409).json({ error: 'Equipment ID or RFID Tag UID already exists in database.' });
      return;
    }

    const createdAt = new Date().toISOString();
    db.prepare(`
      INSERT INTO equipment (
        id, name, category, rfidTag, status, condition, rackLocation,
        totalBorrowsCount, currentBorrowerId, currentBorrowerName, currentBorrowerRegNo,
        issueDate, dueDate, description, createdAt
      ) VALUES (?, ?, ?, ?, 'available', ?, ?, 0, NULL, NULL, NULL, NULL, NULL, ?, ?)
    `).run(
      cleanId,
      String(name).trim(),
      category || 'General',
      cleanRfid,
      condition || 'Excellent',
      String(rackLocation || 'General Rack').trim(),
      description ? String(description).trim() : null,
      createdAt
    );

    broadcastStateUpdate('equipment_added');
    res.status(201).json(getFullSystemState());
  });

  app.put('/api/equipment/:id', (req: Request, res: Response) => {
    const targetId = req.params.id;
    const { name, category, rfidTag, condition, rackLocation, description } = req.body;
    const cleanRfid = String(rfidTag || '').trim().toUpperCase();

    const conflict = db
      .prepare('SELECT id FROM equipment WHERE UPPER(rfidTag) = ? AND id != ?')
      .get(cleanRfid, targetId);
    if (conflict) {
      res.status(409).json({ error: `RFID Tag "${cleanRfid}" is already assigned to another item.` });
      return;
    }

    db.prepare(`
      UPDATE equipment
      SET name = ?, category = ?, rfidTag = ?, condition = ?, rackLocation = ?, description = ?
      WHERE id = ?
    `).run(
      String(name).trim(),
      category,
      cleanRfid,
      condition,
      String(rackLocation || '').trim(),
      description ? String(description).trim() : null,
      targetId
    );

    broadcastStateUpdate('equipment_updated');
    res.json(getFullSystemState());
  });

  app.delete('/api/equipment/:id', (req: Request, res: Response) => {
    const targetId = req.params.id;
    const eq = db.prepare('SELECT * FROM equipment WHERE id = ?').get(targetId) as Record<string, any> | undefined;
    if (!eq) {
      res.status(404).json({ error: 'Equipment not found.' });
      return;
    }
    if (eq.status === 'borrowed' || eq.status === 'overdue') {
      res.status(409).json({ error: 'Cannot delete equipment while it is borrowed or overdue.' });
      return;
    }

    db.prepare('DELETE FROM equipment WHERE id = ?').run(targetId);
    broadcastStateUpdate('equipment_deleted');
    res.json(getFullSystemState());
  });

  // ---------------------------------------------------------------------------
  // 4. STUDENT CRUD ROUTES
  // ---------------------------------------------------------------------------
  app.post('/api/students', (req: Request, res: Response) => {
    const { id, registerNumber, name, department, year, section, phone, email, rfidCardId } = req.body;
    if (!registerNumber || !name) {
      res.status(400).json({ error: 'Student Name and Register Number are required.' });
      return;
    }

    const cleanReg = String(registerNumber).trim().toUpperCase();
    const cleanCard = String(rfidCardId || `STU_CARD_${Math.floor(100000 + Math.random() * 900000)}`).trim().toUpperCase();

    const existing = db
      .prepare('SELECT id FROM students WHERE UPPER(registerNumber) = ?')
      .get(cleanReg);
    if (existing) {
      res.status(409).json({ error: `Register Number "${cleanReg}" is already registered.` });
      return;
    }

    const studentId = id || `STU-${Math.floor(1000 + Math.random() * 9000)}`;
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO students (
        id, registerNumber, name, department, year, section, phone, email, rfidCardId, activeBorrowsCount, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      studentId,
      cleanReg,
      String(name).trim(),
      department || 'CSE',
      year || 'I',
      section || 'A',
      phone || '+91 90000 00000',
      email || `${cleanReg.toLowerCase()}@ckcet.edu.in`,
      cleanCard,
      createdAt
    );

    broadcastStateUpdate('student_added');
    res.status(201).json(getFullSystemState());
  });

  app.put('/api/students/:id', (req: Request, res: Response) => {
    const targetId = req.params.id;
    const { registerNumber, name, department, year, section, phone, email, rfidCardId } = req.body;
    const cleanReg = String(registerNumber || '').trim().toUpperCase();

    const conflict = db
      .prepare('SELECT id FROM students WHERE UPPER(registerNumber) = ? AND id != ?')
      .get(cleanReg, targetId);
    if (conflict) {
      res.status(409).json({ error: `Register Number "${cleanReg}" is already registered to another student.` });
      return;
    }

    db.prepare(`
      UPDATE students
      SET registerNumber = ?, name = ?, department = ?, year = ?, section = ?, phone = ?, email = ?, rfidCardId = ?
      WHERE id = ?
    `).run(
      cleanReg,
      String(name).trim(),
      department,
      year,
      section,
      phone,
      email,
      String(rfidCardId || '').trim().toUpperCase(),
      targetId
    );

    broadcastStateUpdate('student_updated');
    res.json(getFullSystemState());
  });

  app.delete('/api/students/:id', (req: Request, res: Response) => {
    const targetId = req.params.id;
    const st = db.prepare('SELECT * FROM students WHERE id = ?').get(targetId) as Record<string, any> | undefined;
    if (!st) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }
    if (st.activeBorrowsCount > 0) {
      res.status(409).json({ error: 'Cannot delete student with active borrowed equipment.' });
      return;
    }

    db.prepare('DELETE FROM students WHERE id = ?').run(targetId);
    broadcastStateUpdate('student_deleted');
    res.json(getFullSystemState());
  });

  // ---------------------------------------------------------------------------
  // 5. WEB PORTAL MANUAL ISSUE & RETURN ROUTES
  // ---------------------------------------------------------------------------
  app.post('/api/transactions/issue', (req: Request, res: Response) => {
    syncOverdueStatuses();
    const { equipmentId, studentRegisterNumber, dueDate, issuedBy, notes } = req.body;

    const eq = db.prepare('SELECT * FROM equipment WHERE id = ?').get(equipmentId) as Record<string, any> | undefined;
    if (!eq) {
      res.status(404).json({ error: 'Equipment not found.' });
      return;
    }
    if (eq.status !== 'available') {
      res.status(409).json({
        error: `Issue Blocked: "${eq.name}" (${eq.id}) is already ${eq.status.toUpperCase()} by ${eq.currentBorrowerName || 'another student'}.`,
      });
      return;
    }

    const st = db
      .prepare('SELECT * FROM students WHERE UPPER(registerNumber) = ?')
      .get(String(studentRegisterNumber || '').trim().toUpperCase()) as Record<string, any> | undefined;
    if (!st) {
      res.status(404).json({ error: `Student with Register Number "${studentRegisterNumber}" not found.` });
      return;
    }

    const issueDateIso = new Date().toISOString();
    const dueDateIso = dueDate || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const txId = `TXN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const runManualIssue = db.transaction(() => {
      db.prepare(`
        UPDATE equipment
        SET status = 'borrowed',
            currentBorrowerId = ?,
            currentBorrowerName = ?,
            currentBorrowerRegNo = ?,
            issueDate = ?,
            dueDate = ?,
            totalBorrowsCount = totalBorrowsCount + 1
        WHERE id = ?
      `).run(st.id, st.name, st.registerNumber, issueDateIso, dueDateIso, eq.id);

      db.prepare(`
        INSERT INTO transactions (
          id, type, equipmentId, equipmentName, rfidTag,
          studentId, studentRegisterNumber, studentName, studentDepartment,
          issueDate, dueDate, returnDate, status, issuedBy, returnCondition, notes
        ) VALUES (?, 'issue', ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'active', ?, NULL, ?)
      `).run(
        txId,
        eq.id,
        eq.name,
        eq.rfidTag,
        st.id,
        st.registerNumber,
        st.name,
        st.department,
        issueDateIso,
        dueDateIso,
        issuedBy || 'Mr. R. Shanmugam (PET)',
        notes || null
      );

      db.prepare(`
        UPDATE students
        SET activeBorrowsCount = activeBorrowsCount + 1
        WHERE id = ?
      `).run(st.id);
    });

    runManualIssue();
    broadcastStateUpdate('manual_issue');
    res.status(201).json(getFullSystemState());
  });

  app.post('/api/transactions/return', (req: Request, res: Response) => {
    syncOverdueStatuses();
    const { equipmentId, condition, notes } = req.body;

    const eq = db.prepare('SELECT * FROM equipment WHERE id = ?').get(equipmentId) as Record<string, any> | undefined;
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

    const activeTx = db
      .prepare(`
        SELECT * FROM transactions
        WHERE equipmentId = ? AND status IN ('active', 'overdue')
        ORDER BY issueDate DESC LIMIT 1
      `)
      .get(eq.id) as Record<string, any> | undefined;

    const runManualReturn = db.transaction(() => {
      db.prepare(`
        UPDATE equipment
        SET status = 'available',
            condition = ?,
            currentBorrowerId = NULL,
            currentBorrowerName = NULL,
            currentBorrowerRegNo = NULL,
            issueDate = NULL,
            dueDate = NULL
        WHERE id = ?
      `).run(condition || eq.condition, eq.id);

      if (activeTx) {
        const combinedNotes = notes
          ? activeTx.notes
            ? `${activeTx.notes} | ${notes}`
            : notes
          : activeTx.notes;

        db.prepare(`
          UPDATE transactions
          SET status = 'returned',
              returnDate = ?,
              returnCondition = ?,
              notes = ?
          WHERE id = ?
        `).run(returnDateIso, condition || eq.condition, combinedNotes, activeTx.id);
      }

      if (borrowerRegNo) {
        db.prepare(`
          UPDATE students
          SET activeBorrowsCount = MAX(0, activeBorrowsCount - 1)
          WHERE UPPER(registerNumber) = ?
        `).run(String(borrowerRegNo).toUpperCase());
      }
    });

    runManualReturn();
    broadcastStateUpdate('manual_return');
    res.json(getFullSystemState());
  });

  // ---------------------------------------------------------------------------
  // 6. SCAN LOGS & DATABASE RESET ROUTES
  // ---------------------------------------------------------------------------
  app.delete('/api/scan-logs', (_req: Request, res: Response) => {
    db.prepare('DELETE FROM scan_logs').run();
    broadcastStateUpdate('logs_cleared');
    res.json(getFullSystemState());
  });

  app.post('/api/reset', (_req: Request, res: Response) => {
    seedDatabase(true);
    recentScanMap.clear();
    hardwareTelemetry.pendingStudentScan = null;
    broadcastStateUpdate('database_reset');
    res.json(getFullSystemState());
  });

  // ---------------------------------------------------------------------------
  // 7. RFID CARDS & ADMIN USERS DATABASE ENDPOINTS
  // ---------------------------------------------------------------------------
  app.get('/api/rfid-cards', (_req: Request, res: Response) => {
    const cards = db.prepare('SELECT * FROM rfid_cards ORDER BY createdAt DESC').all();
    res.json({ success: true, count: cards.length, cards });
  });

  app.get('/api/admin-users', (_req: Request, res: Response) => {
    const admins = db.prepare('SELECT id, username, name, role, createdAt FROM admin_users').all();
    res.json({ success: true, count: admins.length, admins });
  });

  app.post('/api/admin-users/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username) as Record<string, any> | undefined;
    if (!user || user.passwordHash !== password) {
      res.status(401).json({ success: false, message: 'Invalid username or password' });
      return;
    }
    res.json({
      success: true,
      message: 'Login successful',
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
    });
  });

  app.get('/api/transactions', (_req: Request, res: Response) => {
    const txns = db.prepare('SELECT * FROM transactions ORDER BY issueDate DESC').all();
    res.json({ success: true, count: txns.length, transactions: txns });
  });

  // ---------------------------------------------------------------------------
  // 8. CATCH-ALL FOR ALL /api/* ROUTES - GUARANTEE JSON, NEVER HTML
  // ---------------------------------------------------------------------------
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `API endpoint "${req.method} ${req.originalUrl}" not found.`,
      availableEndpoints: [
        'POST /api/rfid/scan',
        'GET /api/rfid/scan',
        'GET /api/state',
        'GET /api/equipment',
        'GET /api/students',
        'GET /api/transactions',
        'GET /api/rfid-cards',
        'GET /api/admin-users',
        'GET /api/events',
      ],
    });
  });

  // Global API error handler ensuring JSON
  app.use('/api', (err: any, _req: Request, res: Response, _next: any) => {
    console.error('API Error:', err);
    res.status(err.status || 500).json({
      success: false,
      message: err?.message || 'Internal Server Error',
    });
  });

  // ---------------------------------------------------------------------------
  // 9. VITE DEV MIDDLEWARE OR PRODUCTION STATIC ASSETS
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
    console.log(`SPORTSYNC AI Full-Stack Server & SQLite DB running on http://0.0.0.0:${PORT}`);
    console.log(`Hardware RFID Endpoint ready: POST http://0.0.0.0:${PORT}/api/rfid/scan`);
  });
}

startServer();
