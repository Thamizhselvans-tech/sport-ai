import { Equipment, EquipmentCondition, FullSystemState, Student } from '../types';
import {
  loadStoredState,
  saveStoredState,
  addStudentLocal,
  editStudentLocal,
  deleteStudentLocal,
  addEquipmentLocal,
  editEquipmentLocal,
  deleteEquipmentLocal,
} from './storage';

export interface RfidScanRequest {
  rfidTag: string;
  mode: 'issue' | 'return' | 'auto';
  studentReg?: string;
  durationHours?: number;
  source?: string;
}

export interface RfidScanResponse {
  success: boolean;
  status: 'success' | 'warning' | 'error' | 'student_verified';
  code: string;
  mode?: 'issue' | 'return';
  message: string;
  transactionId?: string | null;
  equipment?: {
    id: string;
    name: string;
    rfidTag?: string;
    status: string;
    rackLocation?: string;
    currentBorrowerName?: string;
    currentBorrowerRegNo?: string;
  };
  student?: {
    id: string;
    name: string;
    registerNumber: string;
    department: string;
    rfidCardId?: string;
  };
  returnedBy?: {
    name: string;
    registerNumber: string;
  };
  issueDate?: string;
  dueDate?: string;
  returnDate?: string;
}

export async function fetchSystemState(): Promise<FullSystemState> {
  try {
    const res = await fetch('/api/state', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch system state: ${res.status}`);
    }
    const data: FullSystemState = await res.json();
    saveStoredState(data);
    return data;
  } catch (err) {
    console.info('Backend unreachable, falling back to local persistent storage');
    return loadStoredState();
  }
}

export async function postRfidScan(payload: RfidScanRequest): Promise<{
  httpStatus: number;
  data: RfidScanResponse;
}> {
  try {
    const res = await fetch('/api/rfid/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { httpStatus: res.status, data };
  } catch (err: any) {
    return {
      httpStatus: 503,
      data: {
        success: false,
        status: 'error',
        code: 'HARDWARE_OFFLINE',
        message: 'Backend hardware listener offline.',
      },
    };
  }
}

export async function apiAddEquipment(
  item: Omit<Equipment, 'createdAt' | 'totalBorrowsCount'>
): Promise<FullSystemState> {
  try {
    const res = await fetch('/api/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (res.ok) {
      const data = await res.json();
      saveStoredState(data);
      return data;
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Server error: ${res.status}`);
  } catch (err: any) {
    // If backend offline or 404 (e.g. Vercel static hosting)
    if (err.message?.includes('Server error: 404') || err.message?.includes('Failed to fetch') || !window.navigator.onLine) {
      return addEquipmentLocal(item);
    }
    // If it's a validation error from server (like duplicate)
    if (err.message && !err.message.includes('fetch')) {
      throw err;
    }
    return addEquipmentLocal(item);
  }
}

export async function apiEditEquipment(item: Equipment): Promise<FullSystemState> {
  try {
    const res = await fetch(`/api/equipment/${encodeURIComponent(item.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (res.ok) {
      const data = await res.json();
      saveStoredState(data);
      return data;
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Server error: ${res.status}`);
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch') && !err.message.includes('404')) {
      throw err;
    }
    return editEquipmentLocal(item);
  }
}

export async function apiDeleteEquipment(id: string): Promise<FullSystemState> {
  try {
    const res = await fetch(`/api/equipment/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const data = await res.json();
      saveStoredState(data);
      return data;
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Server error: ${res.status}`);
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch') && !err.message.includes('404')) {
      throw err;
    }
    return deleteEquipmentLocal(id);
  }
}

export async function apiAddStudent(
  student: Omit<Student, 'createdAt' | 'activeBorrowsCount'>
): Promise<FullSystemState> {
  try {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student),
    });
    if (res.ok) {
      const data = await res.json();
      saveStoredState(data);
      return data;
    }
    const errData = await res.json().catch(() => ({}));
    // If server specifically returned 409 Conflict (Duplicate Register Number)
    if (res.status === 409) {
      throw new Error(errData.error || `Register number is already in use.`);
    }
    throw new Error(errData.error || `Server error: ${res.status}`);
  } catch (err: any) {
    // If it's a business logic error like 409 duplicate, throw it to user
    if (err.message && (err.message.includes('already registered') || err.message.includes('already in use'))) {
      throw err;
    }
    // Otherwise fallback to localStorage (e.g. Vercel static hosting)
    return addStudentLocal(student);
  }
}

export async function apiEditStudent(student: Student): Promise<FullSystemState> {
  try {
    const res = await fetch(`/api/students/${encodeURIComponent(student.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student),
    });
    if (res.ok) {
      const data = await res.json();
      saveStoredState(data);
      return data;
    }
    const errData = await res.json().catch(() => ({}));
    if (res.status === 409) {
      throw new Error(errData.error || `Register number is already in use.`);
    }
    throw new Error(errData.error || `Server error: ${res.status}`);
  } catch (err: any) {
    if (err.message && (err.message.includes('already registered') || err.message.includes('already in use'))) {
      throw err;
    }
    return editStudentLocal(student);
  }
}

export async function apiDeleteStudent(id: string): Promise<FullSystemState> {
  try {
    const res = await fetch(`/api/students/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const data = await res.json();
      saveStoredState(data);
      return data;
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Server error: ${res.status}`);
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch') && !err.message.includes('404')) {
      throw err;
    }
    return deleteStudentLocal(id);
  }
}

export async function apiManualIssue(params: {
  equipmentId: string;
  studentRegisterNumber: string;
  dueDate: string;
  issuedBy: string;
  notes?: string;
}): Promise<FullSystemState> {
  try {
    const res = await fetch('/api/transactions/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const data = await res.json();
      saveStoredState(data);
      return data;
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to issue equipment');
  } catch (err: any) {
    // Offline fallback issue
    const current = loadStoredState();
    const eq = current.equipment.find((e) => e.id === params.equipmentId);
    const stu = current.students.find(
      (s) => s.registerNumber.toUpperCase() === params.studentRegisterNumber.trim().toUpperCase()
    );
    if (!eq) throw new Error('Equipment not found');
    if (!stu) throw new Error(`Student with register number "${params.studentRegisterNumber}" not found.`);

    const nowIso = new Date().toISOString();
    const newTx = {
      id: `TXN-${Date.now().toString(36).toUpperCase()}`,
      type: 'issue' as const,
      equipmentId: eq.id,
      equipmentName: eq.name,
      rfidTag: eq.rfidTag,
      studentId: stu.id,
      studentRegisterNumber: stu.registerNumber,
      studentName: stu.name,
      studentDepartment: stu.department,
      issueDate: nowIso,
      dueDate: params.dueDate,
      status: 'active' as const,
      issuedBy: params.issuedBy || 'PET Dept',
      notes: params.notes,
    };

    const updatedEq = {
      ...eq,
      status: 'borrowed' as const,
      currentBorrowerId: stu.id,
      currentBorrowerName: stu.name,
      currentBorrowerRegNo: stu.registerNumber,
      issueDate: nowIso,
      dueDate: params.dueDate,
      totalBorrowsCount: eq.totalBorrowsCount + 1,
    };

    const updatedStu = {
      ...stu,
      activeBorrowsCount: stu.activeBorrowsCount + 1,
    };

    const updated: FullSystemState = {
      ...current,
      equipment: current.equipment.map((e) => (e.id === eq.id ? updatedEq : e)),
      students: current.students.map((s) => (s.id === stu.id ? updatedStu : s)),
      transactions: [newTx, ...current.transactions],
    };
    saveStoredState(updated);
    return updated;
  }
}

export async function apiManualReturn(params: {
  equipmentId: string;
  condition: EquipmentCondition;
  notes?: string;
}): Promise<FullSystemState> {
  try {
    const res = await fetch('/api/transactions/return', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const data = await res.json();
      saveStoredState(data);
      return data;
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to return equipment');
  } catch (err: any) {
    const current = loadStoredState();
    const eq = current.equipment.find((e) => e.id === params.equipmentId);
    if (!eq) throw new Error('Equipment not found');

    const borrowerRegNo = eq.currentBorrowerRegNo;
    const nowIso = new Date().toISOString();

    const activeTx = current.transactions.find(
      (t) => t.equipmentId === eq.id && (t.status === 'active' || t.status === 'overdue')
    );

    const updatedTxns = current.transactions.map((t) => {
      if (activeTx && t.id === activeTx.id) {
        return {
          ...t,
          status: 'returned' as const,
          returnDate: nowIso,
          returnCondition: params.condition,
          notes: params.notes || t.notes,
        };
      }
      return t;
    });

    const updatedEq = {
      ...eq,
      status: 'available' as const,
      condition: params.condition,
      currentBorrowerId: undefined,
      currentBorrowerName: undefined,
      currentBorrowerRegNo: undefined,
      issueDate: undefined,
      dueDate: undefined,
    };

    const updatedStudents = current.students.map((s) => {
      if (borrowerRegNo && s.registerNumber.toUpperCase() === borrowerRegNo.toUpperCase()) {
        return { ...s, activeBorrowsCount: Math.max(0, s.activeBorrowsCount - 1) };
      }
      return s;
    });

    const updated: FullSystemState = {
      ...current,
      equipment: current.equipment.map((e) => (e.id === eq.id ? updatedEq : e)),
      students: updatedStudents,
      transactions: updatedTxns,
    };
    saveStoredState(updated);
    return updated;
  }
}

export async function apiClearScanLogs(): Promise<FullSystemState> {
  try {
    const res = await fetch('/api/scan-logs', { method: 'DELETE' });
    if (res.ok) {
      const data = await res.json();
      saveStoredState(data);
      return data;
    }
  } catch {
    // fallback
  }
  const current = loadStoredState();
  const updated: FullSystemState = { ...current, scanLogs: [] };
  saveStoredState(updated);
  return updated;
}

export async function apiResetDatabase(): Promise<FullSystemState> {
  try {
    const res = await fetch('/api/reset', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      saveStoredState(data);
      return data;
    }
  } catch {
    // fallback
  }
  const initial = loadStoredState();
  saveStoredState(initial);
  return initial;
}
