import { Equipment, Student, Transaction } from '../types';

function downloadFile(content: string, fileName: string, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvField(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportEquipmentToCsv(equipment: Equipment[]) {
  const headers = [
    'Equipment ID',
    'Equipment Name',
    'Category',
    'RFID Tag UID',
    'Status',
    'Condition',
    'Rack / Location',
    'Total Times Borrowed',
    'Current Borrower Name',
    'Current Borrower Reg No',
    'Issue Date',
    'Return Due Date',
  ];

  const rows = equipment.map((eq) => [
    escapeCsvField(eq.id),
    escapeCsvField(eq.name),
    escapeCsvField(eq.category),
    escapeCsvField(eq.rfidTag),
    escapeCsvField(eq.status.toUpperCase()),
    escapeCsvField(eq.condition),
    escapeCsvField(eq.rackLocation),
    escapeCsvField(eq.totalBorrowsCount),
    escapeCsvField(eq.currentBorrowerName || 'N/A'),
    escapeCsvField(eq.currentBorrowerRegNo || 'N/A'),
    escapeCsvField(eq.issueDate ? new Date(eq.issueDate).toLocaleString() : 'N/A'),
    escapeCsvField(eq.dueDate ? new Date(eq.dueDate).toLocaleString() : 'N/A'),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadFile(csvContent, `SPORTSYNC_Equipment_Inventory_${dateStr}.csv`);
}

export function exportTransactionsToCsv(transactions: Transaction[]) {
  const headers = [
    'Transaction ID',
    'Action Type',
    'Equipment ID',
    'Equipment Name',
    'RFID Tag',
    'Student Register No',
    'Student Name',
    'Department',
    'Issue Date & Time',
    'Due Date & Time',
    'Return Date & Time',
    'Status',
    'Issued By (PET/Staff)',
    'Return Condition',
    'Notes',
  ];

  const rows = transactions.map((tx) => [
    escapeCsvField(tx.id),
    escapeCsvField(tx.type.toUpperCase()),
    escapeCsvField(tx.equipmentId),
    escapeCsvField(tx.equipmentName),
    escapeCsvField(tx.rfidTag),
    escapeCsvField(tx.studentRegisterNumber),
    escapeCsvField(tx.studentName),
    escapeCsvField(tx.studentDepartment),
    escapeCsvField(tx.issueDate ? new Date(tx.issueDate).toLocaleString() : 'N/A'),
    escapeCsvField(tx.dueDate ? new Date(tx.dueDate).toLocaleString() : 'N/A'),
    escapeCsvField(tx.returnDate ? new Date(tx.returnDate).toLocaleString() : 'Pending Return'),
    escapeCsvField(tx.status.toUpperCase()),
    escapeCsvField(tx.issuedBy),
    escapeCsvField(tx.returnCondition || 'N/A'),
    escapeCsvField(tx.notes || ''),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadFile(csvContent, `SPORTSYNC_Transactions_Report_${dateStr}.csv`);
}

export function exportOverdueToCsv(transactions: Transaction[], equipment: Equipment[]) {
  const overdueTxns = transactions.filter((t) => t.status === 'overdue');

  const headers = [
    'Equipment ID',
    'Equipment Name',
    'RFID Tag',
    'Student Register No',
    'Student Name',
    'Department',
    'Issue Date',
    'Expected Due Date',
    'Overdue Hours (Approx)',
    'PET In-Charge',
  ];

  const nowMs = Date.now();
  const rows = overdueTxns.map((tx) => {
    const dueMs = new Date(tx.dueDate).getTime();
    const hoursOverdue = Math.max(0, Math.round((nowMs - dueMs) / (1000 * 60 * 60)));
    return [
      escapeCsvField(tx.equipmentId),
      escapeCsvField(tx.equipmentName),
      escapeCsvField(tx.rfidTag),
      escapeCsvField(tx.studentRegisterNumber),
      escapeCsvField(tx.studentName),
      escapeCsvField(tx.studentDepartment),
      escapeCsvField(new Date(tx.issueDate).toLocaleString()),
      escapeCsvField(new Date(tx.dueDate).toLocaleString()),
      escapeCsvField(`${hoursOverdue} hrs`),
      escapeCsvField(tx.issuedBy),
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadFile(csvContent, `SPORTSYNC_Overdue_Report_${dateStr}.csv`);
}

export function exportStudentsToCsv(students: Student[]) {
  const headers = [
    'Student ID',
    'Register Number',
    'Full Name',
    'Department',
    'Year',
    'Section',
    'Phone',
    'Email',
    'Smart RFID Card UID',
    'Active Borrowed Items',
  ];

  const rows = students.map((st) => [
    escapeCsvField(st.id),
    escapeCsvField(st.registerNumber),
    escapeCsvField(st.name),
    escapeCsvField(st.department),
    escapeCsvField(st.year),
    escapeCsvField(st.section || 'N/A'),
    escapeCsvField(st.phone),
    escapeCsvField(st.email),
    escapeCsvField(st.rfidCardId),
    escapeCsvField(st.activeBorrowsCount),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadFile(csvContent, `SPORTSYNC_Students_Directory_${dateStr}.csv`);
}
