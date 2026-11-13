export type EquipmentCategory = 
  | 'Football' 
  | 'Cricket' 
  | 'Badminton' 
  | 'Volleyball' 
  | 'Basketball' 
  | 'Tennis' 
  | 'Indoor Games' 
  | 'Athletics'
  | 'General';

export type EquipmentStatus = 'available' | 'borrowed' | 'overdue' | 'maintenance';

export type EquipmentCondition = 'Excellent' | 'Good' | 'Fair' | 'Damaged';

export interface Equipment {
  id: string; // e.g. EQ-FB-01
  name: string;
  category: EquipmentCategory;
  rfidTag: string; // e.g. E2003411B802
  status: EquipmentStatus;
  condition: EquipmentCondition;
  rackLocation: string; // e.g. "Rack A-1", "Locker 04"
  totalBorrowsCount: number;
  currentBorrowerId?: string;
  currentBorrowerName?: string;
  currentBorrowerRegNo?: string;
  issueDate?: string; // ISO string
  dueDate?: string; // ISO string
  description?: string;
  createdAt: string;
}

export interface Student {
  id: string;
  registerNumber: string; // e.g. "910423104001"
  name: string;
  department: string; // "CSE", "ECE", "MECH", "IT", "CIVIL", "AIDS"
  year: 'I' | 'II' | 'III' | 'IV';
  section?: string;
  phone: string;
  email: string;
  rfidCardId: string; // student smart ID card UID
  activeBorrowsCount: number;
  createdAt: string;
}

export type TransactionType = 'issue' | 'return';

export interface Transaction {
  id: string;
  type: TransactionType;
  equipmentId: string;
  equipmentName: string;
  rfidTag: string;
  studentId: string;
  studentRegisterNumber: string;
  studentName: string;
  studentDepartment: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'active' | 'returned' | 'overdue';
  issuedBy: string; // PET Teacher name
  returnCondition?: EquipmentCondition;
  notes?: string;
}

export interface RfidScanLog {
  id: string;
  timestamp: string;
  rfidTag: string;
  tagType: 'equipment' | 'student' | 'unknown';
  entityName?: string;
  action: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  rawHex: string;
  source?: string;
}

export interface HardwareStatus {
  connected: boolean;
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

export interface FullSystemState {
  equipment: Equipment[];
  students: Student[];
  transactions: Transaction[];
  scanLogs: RfidScanLog[];
  hardwareStatus: HardwareStatus;
}

export interface SystemStats {
  totalEquipment: number;
  availableEquipment: number;
  borrowedEquipment: number;
  overdueEquipment: number;
  totalStudents: number;
  activeTransactionsCount: number;
  totalTransactionsHistory: number;
}
