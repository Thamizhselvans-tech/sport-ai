/**
 * SPORTSYNC AI - Persistent Storage & Offline Fallback Engine
 * Handles local state persistence (localStorage) with seed data,
 * ensuring the app works both with the SQLite backend AND in standalone/Vercel environments.
 */

import { FullSystemState, Student, Equipment, Transaction, RfidScanLog } from '../types';

const STORAGE_KEY = 'sportsync_ai_system_state_v1';

export function generateId(prefix: string): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
}

export function generateRfidTag(): string {
  const hex = '0123456789ABCDEF';
  let tag = 'E200';
  for (let i = 0; i < 8; i++) {
    tag += hex.charAt(Math.floor(Math.random() * hex.length));
  }
  return tag;
}

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();
const hoursAhead = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000).toISOString();

export function getInitialState(): FullSystemState {
  const students: Student[] = [
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

  const equipment: Equipment[] = [
    {
      id: 'EQ-FB-01',
      name: 'Nike Strike Pro Football',
      category: 'Football',
      rfidTag: 'E2003411B802',
      status: 'available',
      condition: 'Excellent',
      rackLocation: 'Ball Cage A-1',
      totalBorrowsCount: 24,
      createdAt: daysAgo(120),
      description: 'FIFA certified size 5 match ball for ground tournament practice',
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
      createdAt: daysAgo(110),
      description: 'English Willow Short Handle bat used for net practice',
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
      createdAt: daysAgo(100),
      description: 'Head-light graphite frame with BG65 string tension 24 lbs',
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
      createdAt: daysAgo(95),
      description: '18-panel synthetic leather volleyball with high visibility yellow/blue pattern',
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
      createdAt: daysAgo(90),
      description: 'Composite leather outdoor/indoor competition basketball (Size 7)',
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
      createdAt: daysAgo(85),
      description: 'Precision 97 sq inch tennis racket with synthetic grip',
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
      createdAt: daysAgo(70),
      description: 'Durable rubberized molded training football',
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
      createdAt: daysAgo(60),
      description: 'Pair of 5-ply ITTF approved rackets with 6 seamless 3-star balls',
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
      createdAt: daysAgo(75),
      description: 'Lightweight bat for college internal practice sessions',
    },
    {
      id: 'EQ-AT-10',
      name: 'Athletics Aluminum Relay Batons (Set)',
      category: 'Athletics',
      rfidTag: 'E2005511E811',
      status: 'available',
      condition: 'Excellent',
      rackLocation: 'Track Locker T-3',
      totalBorrowsCount: 12,
      createdAt: daysAgo(80),
      description: 'Anodized aluminum hollow batons (8 colors) for sports day practice',
    },
  ];

  const transactions: Transaction[] = [
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
      status: 'active',
      issuedBy: 'Mr. R. Shanmugam (PET)',
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
      status: 'overdue',
      issuedBy: 'Mr. R. Shanmugam (PET)',
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
      status: 'active',
      issuedBy: 'Dr. V. Anand (Sports Director)',
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
  ];

  const scanLogs: RfidScanLog[] = [
    {
      id: 'LOG-001',
      timestamp: hoursAgo(1),
      rfidTag: 'E2006766A407',
      tagType: 'equipment',
      entityName: 'Wilson Pro Staff Tennis Racket',
      action: 'ISSUE',
      status: 'success',
      message: 'Issued to Mohamed Amjath S (910423104042)',
      rawHex: 'E2006766A407',
      source: 'ESP32_RC522',
    },
    {
      id: 'LOG-002',
      timestamp: hoursAgo(2),
      rfidTag: 'E2004522C911',
      tagType: 'equipment',
      entityName: 'SG Cobra Cricket Bat',
      action: 'ISSUE',
      status: 'success',
      message: 'Issued to Aravind Kumar R (910423104001)',
      rawHex: 'E2004522C911',
      source: 'ESP32_RC522',
    },
  ];

  return {
    equipment,
    students,
    transactions,
    scanLogs,
    hardwareStatus: {
      connected: true,
      lastSeenAt: new Date().toISOString(),
      lastIp: '192.168.1.104',
      totalHardwareScans: 48,
      lastScannedTag: 'E2006766A407',
      pendingStudentScan: null,
    },
  };
}

export function loadStoredState(): FullSystemState {
  if (typeof window === 'undefined') {
    return getInitialState();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialState();
      saveStoredState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.students)) {
      const initial = getInitialState();
      saveStoredState(initial);
      return initial;
    }
    return parsed;
  } catch (e) {
    console.warn('Failed to parse local state, resetting to initial seed:', e);
    const initial = getInitialState();
    saveStoredState(initial);
    return initial;
  }
}

export function saveStoredState(state: FullSystemState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

// Local student operations
export function addStudentLocal(student: Omit<Student, 'createdAt' | 'activeBorrowsCount'>): FullSystemState {
  const current = loadStoredState();
  const cleanReg = student.registerNumber.trim().toUpperCase();

  const exists = current.students.some((s) => s.registerNumber.toUpperCase() === cleanReg);
  if (exists) {
    throw new Error(`Register Number "${cleanReg}" is already registered.`);
  }

  const newStudent: Student = {
    ...student,
    registerNumber: cleanReg,
    activeBorrowsCount: 0,
    createdAt: new Date().toISOString(),
  };

  const updated: FullSystemState = {
    ...current,
    students: [newStudent, ...current.students],
  };
  saveStoredState(updated);
  return updated;
}

export function editStudentLocal(student: Student): FullSystemState {
  const current = loadStoredState();
  const cleanReg = student.registerNumber.trim().toUpperCase();

  const conflict = current.students.some((s) => s.id !== student.id && s.registerNumber.toUpperCase() === cleanReg);
  if (conflict) {
    throw new Error(`Register Number "${cleanReg}" is already registered to another student.`);
  }

  const updated: FullSystemState = {
    ...current,
    students: current.students.map((s) => (s.id === student.id ? { ...student, registerNumber: cleanReg } : s)),
  };
  saveStoredState(updated);
  return updated;
}

export function deleteStudentLocal(id: string): FullSystemState {
  const current = loadStoredState();
  const target = current.students.find((s) => s.id === id);
  if (target && target.activeBorrowsCount > 0) {
    throw new Error(`Cannot delete student ${target.name} because they have ${target.activeBorrowsCount} active borrows.`);
  }
  const updated: FullSystemState = {
    ...current,
    students: current.students.filter((s) => s.id !== id),
  };
  saveStoredState(updated);
  return updated;
}

// Local equipment operations
export function addEquipmentLocal(item: Omit<Equipment, 'createdAt' | 'totalBorrowsCount'>): FullSystemState {
  const current = loadStoredState();
  const cleanTag = item.rfidTag.trim().toUpperCase();

  const exists = current.equipment.some((e) => e.rfidTag.toUpperCase() === cleanTag);
  if (exists) {
    throw new Error(`RFID Tag "${cleanTag}" is already registered.`);
  }

  const newEquipment: Equipment = {
    ...item,
    rfidTag: cleanTag,
    totalBorrowsCount: 0,
    createdAt: new Date().toISOString(),
  };

  const updated: FullSystemState = {
    ...current,
    equipment: [newEquipment, ...current.equipment],
  };
  saveStoredState(updated);
  return updated;
}

export function editEquipmentLocal(item: Equipment): FullSystemState {
  const current = loadStoredState();
  const cleanTag = item.rfidTag.trim().toUpperCase();

  const conflict = current.equipment.some((e) => e.id !== item.id && e.rfidTag.toUpperCase() === cleanTag);
  if (conflict) {
    throw new Error(`RFID Tag "${cleanTag}" is already assigned to another equipment.`);
  }

  const updated: FullSystemState = {
    ...current,
    equipment: current.equipment.map((e) => (e.id === item.id ? { ...item, rfidTag: cleanTag } : e)),
  };
  saveStoredState(updated);
  return updated;
}

export function deleteEquipmentLocal(id: string): FullSystemState {
  const current = loadStoredState();
  const target = current.equipment.find((e) => e.id === id);
  if (target && target.status === 'borrowed') {
    throw new Error(`Cannot delete equipment "${target.name}" because it is currently borrowed.`);
  }
  const updated: FullSystemState = {
    ...current,
    equipment: current.equipment.filter((e) => e.id !== id),
  };
  saveStoredState(updated);
  return updated;
}
