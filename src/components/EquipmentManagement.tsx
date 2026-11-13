import React, { useState } from 'react';
import { 
  Dumbbell, 
  Search, 
  Filter, 
  Plus, 
  Edit3, 
  Trash2, 
  Radio, 
  Tag, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowLeftRight,
  Sparkles,
  Download,
  X
} from 'lucide-react';
import { Equipment, EquipmentCategory, EquipmentCondition, EquipmentStatus } from '../types';
import { generateId, generateRfidTag } from '../utils/storage';
import { exportEquipmentToCsv } from '../utils/exportCsv';
import { playRfidBeep } from '../utils/audio';

interface EquipmentManagementProps {
  equipment: Equipment[];
  onAddEquipment: (item: Omit<Equipment, 'createdAt' | 'totalBorrowsCount'>) => void;
  onEditEquipment: (item: Equipment) => void;
  onDeleteEquipment: (id: string) => void;
  onQuickIssue: (equipmentId: string) => void;
  onQuickReturn: (equipmentId: string) => void;
}

const CATEGORIES: EquipmentCategory[] = [
  'Football',
  'Cricket',
  'Badminton',
  'Volleyball',
  'Basketball',
  'Tennis',
  'Indoor Games',
  'Athletics',
  'General',
];

export const EquipmentManagement: React.FC<EquipmentManagementProps> = ({
  equipment,
  onAddEquipment,
  onEditEquipment,
  onDeleteEquipment,
  onQuickIssue,
  onQuickReturn,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states for Add/Edit
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    category: 'Football' as EquipmentCategory,
    rfidTag: '',
    condition: 'Excellent' as EquipmentCondition,
    rackLocation: '',
    description: '',
  });

  const openAddModal = () => {
    const newId = generateId('EQ');
    const newRfid = generateRfidTag();
    setFormError(null);
    setFormData({
      id: newId,
      name: '',
      category: 'Football',
      rfidTag: newRfid,
      condition: 'Excellent',
      rackLocation: 'Rack A-1',
      description: '',
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: Equipment) => {
    setFormError(null);
    setEditingItem(item);
    setFormData({
      id: item.id,
      name: item.name,
      category: item.category,
      rfidTag: item.rfidTag,
      condition: item.condition,
      rackLocation: item.rackLocation,
      description: item.description || '',
    });
  };

  const handleGenerateRfid = () => {
    playRfidBeep();
    setFormData((prev) => ({ ...prev, rfidTag: generateRfidTag() }));
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.name.trim() || !formData.id.trim() || !formData.rfidTag.trim()) {
      setFormError('Please fill in Equipment Name, ID, and RFID Tag.');
      return;
    }

    // Check duplicate ID or RFID
    const duplicateId = equipment.some((eq) => eq.id.toLowerCase() === formData.id.toLowerCase().trim());
    if (duplicateId) {
      setFormError(`Equipment ID "${formData.id}" already exists. Please use a unique ID.`);
      return;
    }

    const duplicateRfid = equipment.some((eq) => eq.rfidTag.toLowerCase() === formData.rfidTag.toLowerCase().trim());
    if (duplicateRfid) {
      setFormError(`RFID Tag "${formData.rfidTag}" is already assigned to another equipment item.`);
      return;
    }

    onAddEquipment({
      id: formData.id.trim(),
      name: formData.name.trim(),
      category: formData.category,
      rfidTag: formData.rfidTag.trim(),
      status: 'available',
      condition: formData.condition,
      rackLocation: formData.rackLocation.trim() || 'General Rack',
      description: formData.description.trim(),
    });

    setIsAddModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setFormError(null);

    if (!formData.name.trim() || !formData.rfidTag.trim()) {
      setFormError('Please fill in required fields.');
      return;
    }

    // Check duplicate RFID with other items
    const duplicateRfid = equipment.some(
      (eq) => eq.id !== editingItem.id && eq.rfidTag.toLowerCase() === formData.rfidTag.toLowerCase().trim()
    );
    if (duplicateRfid) {
      setFormError(`RFID Tag "${formData.rfidTag}" is already assigned to another equipment item.`);
      return;
    }

    onEditEquipment({
      ...editingItem,
      name: formData.name.trim(),
      category: formData.category,
      rfidTag: formData.rfidTag.trim(),
      condition: formData.condition,
      rackLocation: formData.rackLocation.trim(),
      description: formData.description.trim(),
    });

    setEditingItem(null);
  };

  const initiateDelete = (item: Equipment) => {
    if (item.status === 'borrowed' || item.status === 'overdue') {
      setDeleteWarning(`Cannot delete "${item.name}" while it is currently borrowed by ${item.currentBorrowerName || 'a student'}. Please return the equipment first.`);
      setDeletingId(null);
    } else {
      setDeleteWarning(null);
      setDeletingId(item.id);
    }
  };

  const confirmDelete = () => {
    if (deletingId) {
      onDeleteEquipment(deletingId);
      setDeletingId(null);
    }
  };

  // Filtered list
  const filteredEquipment = equipment.filter((eq) => {
    const matchesSearch = 
      eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.rfidTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (eq.currentBorrowerName && eq.currentBorrowerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (eq.currentBorrowerRegNo && eq.currentBorrowerRegNo.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || eq.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || eq.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Search / Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-amber-400" />
            <span>Sports Equipment Inventory</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
              {filteredEquipment.length} of {equipment.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage athletic equipment, RFID tags, storage locations, and current availability
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => exportEquipmentToCsv(equipment)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#141824] hover:bg-[#1a2030] text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Download CSV Inventory Report"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)] transition cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 text-black stroke-[3]" />
            <span>Add New Equipment</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#11141e] border border-amber-500/20 shadow-md flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID (EQ-FB-01), RFID UID, or borrower..."
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

        {/* Category Filter */}
        <div className="w-full md:w-48">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-[#161a26] border border-slate-800 focus:border-amber-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-44">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-[#161a26] border border-slate-800 focus:border-amber-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="borrowed">Borrowed</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Equipment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEquipment.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-2xl bg-[#11141e] border border-slate-800">
            <Dumbbell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-300">No equipment found</h3>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or category filters.</p>
          </div>
        ) : (
          filteredEquipment.map((item) => {
            const isAvailable = item.status === 'available';
            const isOverdue = item.status === 'overdue';
            const isBorrowed = item.status === 'borrowed';

            return (
              <div
                key={item.id}
                className={`group rounded-2xl bg-[#11141e] border p-5 transition-all duration-200 flex flex-col justify-between hover:shadow-lg ${
                  isOverdue
                    ? 'border-rose-500/40 hover:border-rose-500 bg-gradient-to-b from-[#11141e] to-[#1a0e14]'
                    : isBorrowed
                    ? 'border-amber-500/30 hover:border-amber-500/60'
                    : 'border-slate-800 hover:border-amber-500/40'
                }`}
              >
                <div>
                  {/* Top Bar: Category & Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                      {item.category}
                    </span>

                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isAvailable
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : isOverdue
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                        : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isAvailable ? 'bg-emerald-400' : isOverdue ? 'bg-rose-400' : 'bg-amber-400'
                      }`}></span>
                      {item.status}
                    </span>
                  </div>

                  {/* Title & Equipment ID */}
                  <div className="mt-3">
                    <h3 className="font-bold text-base text-white group-hover:text-amber-200 transition">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span className="font-mono text-amber-400/90 font-semibold">{item.id}</span>
                      <span>•</span>
                      <span>{item.rackLocation}</span>
                      <span>•</span>
                      <span className="text-slate-500">Cond: {item.condition}</span>
                    </div>
                  </div>

                  {/* RFID Simulation Tag Pill */}
                  <div className="mt-3 p-2 rounded-xl bg-[#161a26] border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Radio className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[10px] uppercase font-bold text-slate-400">RFID UID:</span>
                      <span className="font-mono text-amber-300 font-semibold">{item.rfidTag}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">13.56 MHz</span>
                  </div>

                  {/* Borrower Details if Borrowed / Overdue */}
                  {(isBorrowed || isOverdue) && (
                    <div className={`mt-3 p-2.5 rounded-xl text-xs ${
                      isOverdue ? 'bg-rose-950/40 border border-rose-500/30' : 'bg-[#181d2a] border border-amber-500/20'
                    }`}>
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-slate-300">{item.currentBorrowerName || 'Unknown Student'}</span>
                        <span className="font-mono text-amber-300">{item.currentBorrowerRegNo}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[11px]">
                        <span className="text-slate-400">Due:</span>
                        <span className={isOverdue ? 'text-rose-400 font-bold' : 'text-slate-300 font-mono'}>
                          {item.dueDate ? new Date(item.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          {isOverdue && ' (EXPIRED)'}
                        </span>
                      </div>
                    </div>
                  )}

                  {item.description && (
                    <p className="text-xs text-slate-400 mt-2.5 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="text-[10px] text-slate-500">
                    Borrowed: <span className="font-bold text-amber-400 font-mono">{item.totalBorrowsCount}x</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isAvailable ? (
                      <button
                        onClick={() => onQuickIssue(item.id)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition cursor-pointer"
                      >
                        Issue
                      </button>
                    ) : (
                      <button
                        onClick={() => onQuickReturn(item.id)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer"
                      >
                        Return
                      </button>
                    )}

                    <button
                      onClick={() => openEditModal(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                      title="Edit Equipment Details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => initiateDelete(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Delete Equipment"
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

      {/* Add Equipment Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#11141e] border border-amber-500/40 rounded-2xl p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" /> Add New Sports Equipment
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="mt-4 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {formError}
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Equipment Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cosco Super Volley Volleyball"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:border-amber-500/50 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Equipment ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="EQ-FB-01"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 font-mono text-amber-300 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as EquipmentCategory })}
                    className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500/50 focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* RFID Tag with auto-generator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300">RFID Tag UID (ESP32/RC522) *</label>
                  <button
                    type="button"
                    onClick={handleGenerateRfid}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Generate Random Tag
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Radio className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
                    <input
                      type="text"
                      required
                      placeholder="E2003411B802"
                      value={formData.rfidTag}
                      onChange={(e) => setFormData({ ...formData, rfidTag: e.target.value.toUpperCase() })}
                      className="w-full bg-[#161a26] border border-slate-800 rounded-xl pl-9 pr-3 py-2 font-mono text-amber-300 focus:border-amber-500/50 focus:outline-none uppercase"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Unique hex RFID tag UID attached to this physical sports item.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Condition</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value as EquipmentCondition })}
                    className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500/50 focus:outline-none"
                  >
                    <option value="Excellent">Excellent (New/Flawless)</option>
                    <option value="Good">Good (Minor wear)</option>
                    <option value="Fair">Fair (Needs monitor)</option>
                    <option value="Damaged">Damaged</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Storage Location / Rack</label>
                  <input
                    type="text"
                    placeholder="e.g. Ball Cage A-1, Rack C-3"
                    value={formData.rackLocation}
                    onChange={(e) => setFormData({ ...formData, rackLocation: e.target.value })}
                    className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description / Specifications</label>
                <textarea
                  rows={2}
                  placeholder="Official specifications, string tension, size, or tournament usage details"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  Save Equipment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Equipment Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#11141e] border border-amber-500/40 rounded-2xl p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" /> Edit Equipment: {editingItem.id}
              </h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {formError}
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Equipment Name *</label>
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
                  <label className="block font-semibold text-slate-300 mb-1">Equipment ID</label>
                  <input
                    type="text"
                    disabled
                    value={formData.id}
                    className="w-full bg-[#161a26]/50 border border-slate-800 rounded-xl px-3 py-2 font-mono text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as EquipmentCategory })}
                    className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500/50 focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">RFID Tag UID *</label>
                <input
                  type="text"
                  required
                  value={formData.rfidTag}
                  onChange={(e) => setFormData({ ...formData, rfidTag: e.target.value.toUpperCase() })}
                  className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 font-mono text-amber-300 focus:border-amber-500/50 focus:outline-none uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Condition</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value as EquipmentCondition })}
                    className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500/50 focus:outline-none"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Damaged">Damaged</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Storage Location</label>
                  <input
                    type="text"
                    value={formData.rackLocation}
                    onChange={(e) => setFormData({ ...formData, rackLocation: e.target.value })}
                    className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#161a26] border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500/50 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold cursor-pointer"
                >
                  Update Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#11141e] border border-rose-500/40 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center gap-2 text-rose-400 pb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-base text-white">Confirm Equipment Deletion</h3>
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Are you sure you want to remove equipment <span className="font-mono text-amber-300 font-bold">{deletingId}</span> from the inventory? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                Yes, Delete Equipment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Warning Modal (e.g. equipment is currently borrowed) */}
      {deleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#11141e] border border-amber-500/40 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center gap-2 text-amber-400 pb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-base text-white">Action Prohibited</h3>
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              {deleteWarning}
            </p>
            <div className="flex items-center justify-end mt-5">
              <button
                onClick={() => setDeleteWarning(null)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
