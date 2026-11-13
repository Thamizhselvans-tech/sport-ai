import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  History, 
  CreditCard, 
  Phone, 
  Mail, 
  GraduationCap, 
  Download, 
  AlertCircle,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Student, Transaction } from '../types';
import { generateId } from '../utils/storage';
import { exportStudentsToCsv } from '../utils/exportCsv';

interface StudentManagementProps {
  students: Student[];
  transactions: Transaction[];
  onAddStudent: (student: Omit<Student, 'createdAt' | 'activeBorrowsCount'>) => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onFastIssueToStudent?: (studentRegNo: string) => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({
  students,
  transactions,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onFastIssueToStudent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingHistoryStudent, setViewingHistoryStudent] = useState<Student | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    registerNumber: '',
    department: 'CSE',
    year: 'I' as 'I' | 'II' | 'III' | 'IV',
    section: 'A',
    phone: '',
    email: '',
    rfidCardId: '',
  });

  const departments = ['CSE', 'ECE', 'MECH', 'IT', 'CIVIL', 'AIDS'];

  const openAddModal = () => {
    setErrorMsg(null);
    const randomCard = `STU_CARD_${Math.floor(100000 + Math.random() * 900000).toString(16).toUpperCase()}`;
    setFormData({
      name: '',
      registerNumber: '',
      department: 'CSE',
      year: 'I',
      section: 'A',
      phone: '',
      email: '',
      rfidCardId: randomCard,
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (st: Student) => {
    setErrorMsg(null);
    setEditingStudent(st);
    setFormData({
      name: st.name,
      registerNumber: st.registerNumber,
      department: st.department,
      year: st.year,
      section: st.section || 'A',
      phone: st.phone,
      email: st.email,
      rfidCardId: st.rfidCardId,
    });
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const regNo = formData.registerNumber.trim();
    const name = formData.name.trim();

    if (!regNo || !name) {
      setErrorMsg('Student Name and Register Number are strictly required.');
      return;
    }

    // Check Duplicate Register Number
    const exists = students.some(
      (s) => s.registerNumber.toLowerCase() === regNo.toLowerCase()
    );
    if (exists) {
      setErrorMsg(`Register Number "${regNo}" is already registered. Duplicate register numbers are not allowed.`);
      return;
    }

    onAddStudent({
      id: generateId('STU'),
      registerNumber: regNo,
      name: name,
      department: formData.department,
      year: formData.year,
      section: formData.section.toUpperCase(),
      phone: formData.phone.trim() || '+91 90000 00000',
      email: formData.email.trim() || `${regNo.toLowerCase()}@ckcet.edu.in`,
      rfidCardId: formData.rfidCardId.trim(),
    });

    setIsAddModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setErrorMsg(null);

    const regNo = formData.registerNumber.trim();
    const name = formData.name.trim();

    if (!regNo || !name) {
      setErrorMsg('Student Name and Register Number are required.');
      return;
    }

    // Check duplicate with others
    const exists = students.some(
      (s) => s.id !== editingStudent.id && s.registerNumber.toLowerCase() === regNo.toLowerCase()
    );
    if (exists) {
      setErrorMsg(`Register Number "${regNo}" is already in use by another student.`);
      return;
    }

    onEditStudent({
      ...editingStudent,
      name,
      registerNumber: regNo,
      department: formData.department,
      year: formData.year,
      section: formData.section.toUpperCase(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      rfidCardId: formData.rfidCardId.trim(),
    });

    setEditingStudent(null);
  };

  const confirmDelete = () => {
    if (deletingId) {
      const st = students.find((s) => s.id === deletingId);
      if (st && st.activeBorrowsCount > 0) {
        setErrorMsg(`Cannot delete student ${st.name} because they have ${st.activeBorrowsCount} active borrowed equipment items.`);
        return;
      }
      onDeleteStudent(deletingId);
      setDeletingId(null);
      setErrorMsg(null);
    }
  };

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.registerNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rfidCardId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = selectedDept === 'all' || s.department === selectedDept;

    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <span>Student Sports Directory</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
              {filteredStudents.length} Students
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage student registrations, college register numbers, smart RFID cards, and track borrower history
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => exportStudentsToCsv(students)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#141824] hover:bg-[#1a2030] text-slate-300 border border-slate-700 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)] transition cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 text-black stroke-[3]" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Search and Department Filter */}
      <div className="p-4 rounded-2xl bg-[#11141e] border border-amber-500/20 shadow-md flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name, register number (9104...), or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#161a26] border border-slate-800 focus:border-amber-500/50 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="w-full sm:w-48">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full bg-[#161a26] border border-slate-800 focus:border-amber-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-2xl bg-[#11141e] border border-slate-800">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-300">No students matched</h3>
            <p className="text-xs text-slate-500 mt-1">Try another search term or click "Add Student" to create one.</p>
          </div>
        ) : (
          filteredStudents.map((st) => {
            const studentTxns = transactions.filter(
              (t) => t.studentRegisterNumber.toLowerCase() === st.registerNumber.toLowerCase()
            );
            const activeTxns = studentTxns.filter((t) => t.status === 'active' || t.status === 'overdue');

            return (
              <div
                key={st.id}
                className="group rounded-2xl bg-[#11141e] border border-slate-800 hover:border-amber-500/40 p-5 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Dept Badge & Active Borrow Pill */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                      {st.department} • Year {st.year} {st.section ? `(${st.section})` : ''}
                    </span>

                    {activeTxns.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse">
                        <Clock className="w-3 h-3 text-amber-400" />
                        {activeTxns.length} Holding
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Clear
                      </span>
                    )}
                  </div>

                  {/* Student Name & Register Number */}
                  <div className="mt-3">
                    <h3 className="font-bold text-base text-white group-hover:text-amber-200 transition">
                      {st.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs text-amber-400 font-bold bg-[#171c2a] px-2 py-0.5 rounded border border-slate-800">
                        {st.registerNumber}
                      </span>
                      <span className="text-xs text-slate-500">{st.id}</span>
                    </div>
                  </div>

                  {/* Smart Card UID & Contact */}
                  <div className="mt-3.5 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-slate-400 text-[11px]">RFID Card:</span>
                      <span className="font-mono text-amber-300 text-[11px] font-semibold">{st.rfidCardId}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{st.phone}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400 text-[11px] truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{st.email}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setViewingHistoryStudent(st)}
                    className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>History ({studentTxns.length})</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(st)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                      title="Edit Student Information"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setDeletingId(st.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Delete Student"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#11141e] border border-amber-500/40 rounded-2xl p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" /> Register New Student
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveAdd} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aravind Kumar R"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:border-amber-500/50 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Register Number * <span className="text-[10px] text-amber-400/80">(Unique)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="910423104001"
                    value={formData.registerNumber}
                    onChange={(e) => setFormData({ ...formData, registerNumber: e.target.value.toUpperCase() })}
                    className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 font-mono text-amber-300 focus:border-amber-500/50 focus:outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500/50 focus:outline-none"
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Year of Study</label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value as any })}
                    className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500/50 focus:outline-none"
                  >
                    <option value="I">1st Year (2026 Batch)</option>
                    <option value="II">2nd Year (2025 Batch)</option>
                    <option value="III">3rd Year (2024 Batch)</option>
                    <option value="IV">4th Year (Final Year)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Section</label>
                  <input
                    type="text"
                    placeholder="A / B / C"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">RFID Smart Card UID</label>
                  <input
                    type="text"
                    placeholder="STU_CARD_9104A1"
                    value={formData.rfidCardId}
                    onChange={(e) => setFormData({ ...formData, rfidCardId: e.target.value.toUpperCase() })}
                    className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 font-mono text-amber-300 focus:border-amber-500/50 focus:outline-none uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">College Email</label>
                <input
                  type="email"
                  placeholder="student@ckcet.edu.in"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500/50 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold shadow-md cursor-pointer"
                >
                  Register Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#11141e] border border-amber-500/40 rounded-2xl p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" /> Edit Student: {editingStudent.name}
              </h3>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:border-amber-500/50 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Register Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.registerNumber}
                    onChange={(e) => setFormData({ ...formData, registerNumber: e.target.value.toUpperCase() })}
                    className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 font-mono text-amber-300 focus:border-amber-500/50 focus:outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500/50 focus:outline-none"
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">RFID Card UID</label>
                  <input
                    type="text"
                    value={formData.rfidCardId}
                    onChange={(e) => setFormData({ ...formData, rfidCardId: e.target.value.toUpperCase() })}
                    className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 font-mono text-amber-300 focus:border-amber-500/50 focus:outline-none uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500/50 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold cursor-pointer"
                >
                  Update Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student History Modal */}
      {viewingHistoryStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#11141e] border border-amber-500/40 rounded-2xl p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-amber-500/20">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-400" />
                  Borrowing History: {viewingHistoryStudent.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Reg No: <span className="font-mono text-amber-300 font-semibold">{viewingHistoryStudent.registerNumber}</span> • {viewingHistoryStudent.department} Dept
                </p>
              </div>
              <button onClick={() => setViewingHistoryStudent(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Transactions for this student */}
            <div className="mt-4 max-h-96 overflow-y-auto space-y-3">
              {transactions.filter(
                (t) => t.studentRegisterNumber.toLowerCase() === viewingHistoryStudent.registerNumber.toLowerCase()
              ).length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No equipment borrowing records found for this student.
                </div>
              ) : (
                transactions
                  .filter((t) => t.studentRegisterNumber.toLowerCase() === viewingHistoryStudent.registerNumber.toLowerCase())
                  .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
                  .map((tx) => {
                    const isOverdue = tx.status === 'overdue';
                    const isReturned = tx.status === 'returned';

                    return (
                      <div
                        key={tx.id}
                        className={`p-3.5 rounded-xl border text-xs ${
                          isOverdue
                            ? 'bg-rose-950/20 border-rose-500/40'
                            : isReturned
                            ? 'bg-[#141926] border-slate-800'
                            : 'bg-amber-500/10 border-amber-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-white text-sm">{tx.equipmentName}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            isReturned
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : isOverdue
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-amber-500/10 text-amber-300'
                          }`}>
                            {tx.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-slate-400">
                          <div>
                            <span>Item ID: </span>
                            <span className="font-mono text-slate-300">{tx.equipmentId}</span>
                          </div>
                          <div>
                            <span>RFID Tag: </span>
                            <span className="font-mono text-amber-300/80">{tx.rfidTag}</span>
                          </div>
                          <div>
                            <span>Issued: </span>
                            <span className="text-slate-300">{new Date(tx.issueDate).toLocaleString()}</span>
                          </div>
                          <div>
                            <span>Due Date: </span>
                            <span className={isOverdue ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                              {new Date(tx.dueDate).toLocaleString()}
                            </span>
                          </div>
                          {tx.returnDate && (
                            <div className="col-span-2 text-emerald-400 font-medium">
                              Returned on: {new Date(tx.returnDate).toLocaleString()}
                              {tx.returnCondition && ` • Condition: ${tx.returnCondition}`}
                            </div>
                          )}
                          {tx.notes && (
                            <div className="col-span-2 text-slate-400 italic">
                              PET Notes: {tx.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            <div className="flex items-center justify-end pt-4 mt-4 border-t border-slate-800">
              <button
                onClick={() => setViewingHistoryStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#11141e] border border-rose-500/40 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center gap-2 text-rose-400 pb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-base text-white">Remove Student</h3>
            </div>
            {errorMsg ? (
              <div className="mt-2 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            ) : (
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Are you sure you want to remove this student record? This should only be done if the student graduated or transferred.
              </p>
            )}
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => { setDeletingId(null); setErrorMsg(null); }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              {!errorMsg && (
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                >
                  Yes, Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
