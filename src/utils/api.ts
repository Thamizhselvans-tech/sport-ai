import { Equipment, EquipmentCondition, FullSystemState, Student } from '../types';

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
  const res = await fetch('/api/state', {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch system state: ${res.status}`);
  }
  return res.json();
}

export async function postRfidScan(payload: RfidScanRequest): Promise<{
  httpStatus: number;
  data: RfidScanResponse;
}> {
  const res = await fetch('/api/rfid/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { httpStatus: res.status, data };
}

export async function apiAddEquipment(
  item: Omit<Equipment, 'createdAt' | 'totalBorrowsCount'>
): Promise<FullSystemState> {
  const res = await fetch('/api/equipment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to add equipment');
  }
  return data;
}

export async function apiEditEquipment(item: Equipment): Promise<FullSystemState> {
  const res = await fetch(`/api/equipment/${encodeURIComponent(item.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update equipment');
  }
  return data;
}

export async function apiDeleteEquipment(id: string): Promise<FullSystemState> {
  const res = await fetch(`/api/equipment/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to delete equipment');
  }
  return data;
}

export async function apiAddStudent(
  student: Omit<Student, 'createdAt' | 'activeBorrowsCount'>
): Promise<FullSystemState> {
  const res = await fetch('/api/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(student),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to register student');
  }
  return data;
}

export async function apiEditStudent(student: Student): Promise<FullSystemState> {
  const res = await fetch(`/api/students/${encodeURIComponent(student.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(student),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update student');
  }
  return data;
}

export async function apiDeleteStudent(id: string): Promise<FullSystemState> {
  const res = await fetch(`/api/students/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to delete student');
  }
  return data;
}

export async function apiManualIssue(params: {
  equipmentId: string;
  studentRegisterNumber: string;
  dueDate: string;
  issuedBy: string;
  notes?: string;
}): Promise<FullSystemState> {
  const res = await fetch('/api/transactions/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to issue equipment');
  }
  return data;
}

export async function apiManualReturn(params: {
  equipmentId: string;
  condition: EquipmentCondition;
  notes?: string;
}): Promise<FullSystemState> {
  const res = await fetch('/api/transactions/return', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to return equipment');
  }
  return data;
}

export async function apiClearScanLogs(): Promise<FullSystemState> {
  const res = await fetch('/api/scan-logs', {
    method: 'DELETE',
  });
  return res.json();
}

export async function apiResetDatabase(): Promise<FullSystemState> {
  const res = await fetch('/api/reset', {
    method: 'POST',
  });
  return res.json();
}
