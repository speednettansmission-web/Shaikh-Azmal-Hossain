import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  FileText,
  Filter,
  ListPlus,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { AppDatabase, ChecklistItem, ChecklistStatus } from '../types.ts';
import { NextDayPlannerModal } from './NextDayPlannerModal.tsx';

interface ChecklistViewProps {
  db: AppDatabase;
  onAddChecklistItem: (item: Partial<ChecklistItem>) => Promise<void>;
  onUpdateChecklistItem: (id: string, patch: Partial<ChecklistItem>) => Promise<void>;
  onDeleteChecklistItem: (id: string) => Promise<void>;
  onResetChecklist: (cadence: 'daily' | 'monthly') => Promise<void>;
  onNavigateToReports: (templateId?: string) => void;
  onPlanNextDay?: (payload: {
    carryoverItems: { id: string; taskText: string; remarks: string; priority: boolean }[];
    standardRoutineItemIds: string[];
  }) => Promise<void>;
  onNotifyToast: (msg: string) => void;
}

const DAILY_CATEGORIES = [
  { num: 1, name: 'Administration / HR / Customer Service' },
  { num: 2, name: 'Network Operations / NOC' },
  { num: 3, name: 'Technology / Transmission / Field Support' },
  { num: 4, name: 'Marketing / Sales / Customer Retention' },
  { num: 5, name: 'Vendor / IIG / NTTN Coordination' },
  { num: 6, name: 'Reseller / MAC Partner Operations' },
  { num: 7, name: 'Compliance / Agreement / Renewal' },
];

const MONTHLY_CATEGORIES = [
  { num: 1, name: 'Administration / HR / Customer Service' },
  { num: 2, name: 'Network Operations / NOC' },
  { num: 3, name: 'Technology / Transmission / Field Support' },
  { num: 4, name: 'Marketing / Sales / Customer Retention' },
  { num: 5, name: 'Vendor / IIG / NTTN Coordination' },
  { num: 6, name: 'Reseller / MAC Partner Operations' },
  { num: 7, name: 'Compliance / Agreement / Renewal' },
  { num: 8, name: 'COO Management Reporting' },
];

export const ChecklistView: React.FC<ChecklistViewProps> = ({
  db,
  onAddChecklistItem,
  onUpdateChecklistItem,
  onDeleteChecklistItem,
  onResetChecklist,
  onNavigateToReports,
  onPlanNextDay,
  onNotifyToast,
}) => {
  const [activeCadence, setActiveCadence] = useState<'daily' | 'monthly'>('daily');
  const [statusFilter, setStatusFilter] = useState<'all' | ChecklistStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [remarksDraft, setRemarksDraft] = useState('');
  const [plannerOpen, setPlannerOpen] = useState(false);

  // Add Task Modal / Inline Drawer state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategoryNum, setNewCategoryNum] = useState<number>(1);
  const [newTaskText, setNewTaskText] = useState('');
  const [newRemarks, setNewRemarks] = useState('');

  // Items for the active cadence
  const items = useMemo(() => {
    return (db.checklists || []).filter((item) => item.cadence === activeCadence);
  }, [db.checklists, activeCadence]);

  // Available categories list
  const availableCategories = useMemo(() => {
    return activeCadence === 'daily' ? DAILY_CATEGORIES : MONTHLY_CATEGORIES;
  }, [activeCadence]);

  // Dynamic categories based on items + defaults
  const categories = useMemo(() => {
    const map = new Map<number, string>();
    availableCategories.forEach((c) => map.set(c.num, c.name));
    items.forEach((item) => {
      if (!map.has(item.categoryNumber)) {
        map.set(item.categoryNumber, item.categoryName);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [items, availableCategories]);

  // Filtered items
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && item.categoryNumber !== categoryFilter) return false;
      if (q) {
        const text = `${item.taskText} ${item.remarks} ${item.categoryName}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [items, statusFilter, categoryFilter, searchQuery]);

  const completedCount = useMemo(() => items.filter((i) => i.status === 'Completed').length, [items]);
  const pendingCount = useMemo(() => items.filter((i) => i.status === 'Pending').length, [items]);
  const completionPercentage = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  const handleToggleStatus = async (item: ChecklistItem) => {
    const nextStatus: ChecklistStatus = item.status === 'Completed' ? 'Pending' : 'Completed';
    await onUpdateChecklistItem(item.id, { status: nextStatus });
    if (nextStatus === 'Completed') {
      onNotifyToast(`"সম্পন্ন" মার্ক করা হয়েছে: ${item.taskText.slice(0, 32)}...`);
    } else {
      onNotifyToast(`"পেন্ডিং" মার্ক করা হয়েছে (কারণ/মন্তব্য লিখুন)`);
    }
  };

  const handleStartEdit = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setRemarksDraft(item.remarks || '');
  };

  const handleSaveRemarks = async (id: string) => {
    await onUpdateChecklistItem(id, { remarks: remarksDraft.trim() });
    setEditingItemId(null);
    onNotifyToast('মন্তব্য/কারণ সফলভাবে সংরক্ষিত হয়েছে।');
  };

  const handleCreateNewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const matchedCat = availableCategories.find((c) => c.num === newCategoryNum);
    const categoryName = matchedCat ? matchedCat.name : `Category ${newCategoryNum}`;

    await onAddChecklistItem({
      cadence: activeCadence,
      categoryNumber: newCategoryNum,
      categoryName,
      taskText: newTaskText.trim(),
      status: 'Pending',
      remarks: newRemarks.trim(),
    });

    setNewTaskText('');
    setNewRemarks('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Summary Card with Royal Glossy Styling */}
      <section className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-900 to-indigo-900 text-amber-300 rounded-full text-xs font-semibold mb-2 shadow-xs print:hidden">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>SPEED NET Official COO Operational Hub</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {activeCadence === 'daily'
                ? 'SPEED NET — DAILY COO MONITORING CHECKLIST'
                : 'SPEED NET — MONTHLY COO MONITORING CHECKLIST'}
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              প্রতিদিনের ও মাসিক অপারেশনাল মনিটরিং চেকলিস্ট। যে কাজটি হয়ে যাবে টিক দিলে <strong>Complete</strong> হবে, আর যেটি হবে না সেটি <strong>Pending</strong> থাকবে এবং কেন হলো না তার ব্যাখ্যা বা <strong>Remarks</strong> লিখে সেভ করা যাবে। যেকোনো ক্যাটাগরিতে নতুন দায়িত্ব যোগ করতে পারবেন।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 print:hidden shrink-0">
            {/* New Responsibility Add Button */}
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 rounded-xl shadow-sm transition-all whitespace-nowrap cursor-pointer active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>+ নতুন দায়িত্ব যুক্ত করুন</span>
            </button>

            {/* Next Day Checklist Carryover Planner Button */}
            {activeCadence === 'daily' && onPlanNextDay && (
              <button
                type="button"
                onClick={() => setPlannerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-900 bg-gradient-to-r from-amber-100 to-amber-200 border border-amber-300 rounded-xl hover:from-amber-200 hover:to-amber-300 transition-all whitespace-nowrap cursor-pointer shadow-xs active:scale-95"
                title="আজকের পেন্ডিং কাজগুলো ক্যারি-ওভার করে আগামী দিনের চেকলিস্ট প্রস্তুত করুন"
              >
                <ListPlus className="h-4 w-4 text-amber-800" />
                <span>পরবর্তী দিনের চেকলিস্ট প্ল্যানার</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onResetChecklist(activeCadence)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
              title="নতুন দিনের বা মাসের জন্য চেকলিস্ট রিসেট করুন"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{activeCadence === 'daily' ? 'নতুন দিন রিসেট' : 'নতুন মাস রিসেট'}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onNavigateToReports(
                  activeCadence === 'daily'
                    ? 'daily-ops-report'
                    : 'monthly-consolidated-coo-md-chairman'
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>{activeCadence === 'daily' ? 'ডেইলি রিপোর্ট' : 'MD/Chairman রিপোর্ট'}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-slate-900 to-slate-800 hover:from-black hover:to-slate-900 rounded-xl shadow-sm transition-all whitespace-nowrap cursor-pointer active:scale-95"
            >
              <Printer className="h-4 w-4 text-amber-400" />
              <span>A4 পেজে সরাসরি প্রিন্ট</span>
            </button>
          </div>
        </div>

        {/* Cadence Tabs and Stats Metric Grid with Royal Accents */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
          <div className="p-3.5 bg-gradient-to-br from-slate-50 to-slate-100/60 border border-slate-200/80 rounded-xl shadow-2xs">
            <div className="text-xs text-slate-500 font-medium">মনিটরিং পর্যায়</div>
            <div className="mt-1 flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg print:hidden">
              <button
                type="button"
                onClick={() => {
                  setActiveCadence('daily');
                  setCategoryFilter('all');
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-all ${
                  activeCadence === 'daily'
                    ? 'bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Daily (দৈনিক)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveCadence('monthly');
                  setCategoryFilter('all');
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md cursor-pointer transition-all ${
                  activeCadence === 'monthly'
                    ? 'bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly (মাসিক)
              </button>
            </div>
            <div className="mt-1 hidden print:block font-bold text-slate-900 text-sm">
              {activeCadence === 'daily' ? 'DAILY CHECKLIST' : 'MONTHLY CHECKLIST'}
            </div>
          </div>

          <div className="p-3.5 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border border-emerald-200/80 rounded-xl shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-emerald-900 font-semibold">
              <span>সম্পন্ন কাজ (Completed)</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
                {completedCount}
              </span>
              <span className="text-xs text-slate-500 font-mono">/ {items.length} টি</span>
            </div>
          </div>

          <div className="p-3.5 bg-gradient-to-br from-amber-50/80 to-orange-50/40 border border-amber-200/80 rounded-xl shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-amber-950 font-semibold">
              <span>পেন্ডিং ও ব্যাখ্যা আবশ্যক</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-amber-700 tabular-nums">
                {pendingCount}
              </span>
              <span className="text-xs text-slate-500 font-mono">টি বাকি</span>
            </div>
          </div>

          <div className="p-3.5 bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border border-blue-200/80 rounded-xl shadow-2xs flex flex-col justify-between">
            <div className="text-xs text-blue-950 font-semibold">অগ্রগতি হার (Progress)</div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-2xl font-bold font-mono text-blue-900 tabular-nums">
                {completionPercentage}%
              </span>
              <div className="w-24 bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-emerald-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters (No-Print) */}
        <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="চেকলিস্ট বা রিমার্কস অনুসন্ধান করুন..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs">
              <Filter className="h-3.5 w-3.5 text-slate-500 ml-1.5" />
              {(['all', 'Pending', 'Completed'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 font-medium rounded-lg cursor-pointer transition-colors ${
                    statusFilter === st
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'all' ? 'সকল' : st === 'Pending' ? `পেন্ডিং (${pendingCount})` : `সম্পন্ন (${completedCount})`}
                </button>
              ))}
            </div>

            <select
              aria-label="Filter by department"
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer shadow-2xs"
            >
              <option value="all">সকল ক্যাটাগরি (১–{categories.length})</option>
              {categories.map(([num, name]) => (
                <option key={num} value={num}>
                  {num}. {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Modal / Drawer to Add New Responsibility in Any Category */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 text-blue-800 rounded-lg">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    নতুন দায়িত্ব যুক্ত করুন ({activeCadence === 'daily' ? 'Daily' : 'Monthly'})
                  </h3>
                  <p className="text-xs text-slate-500">যে কোনো ক্যাটাগরি নির্বাচন করে চেকলিস্টে দায়িত্ব যোগ করুন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ক্যাটাগরি নির্বাচন করুন *
                </label>
                <select
                  value={newCategoryNum}
                  onChange={(e) => setNewCategoryNum(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {availableCategories.map((c) => (
                    <option key={c.num} value={c.num}>
                      {c.num}. {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  দায়িত্ব / চেকলিস্টের বিবরণ *
                </label>
                <textarea
                  required
                  rows={2}
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="যেমন: Daulatpur Branch Battery ও UPS ভোল্টেজ অডিট যাচাই..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  প্রাথমিক মন্তব্য / করণীয় নোট (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={newRemarks}
                  onChange={(e) => setNewRemarks(e.target.value)}
                  placeholder="ফলোআপের ব্যক্তি বা সম্ভাব্য ডেডলাইন..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-sm cursor-pointer"
                >
                  চেকলিস্টে সেভ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grouped Checklist Display (7 Categories for Daily, 8 for Monthly) */}
      <div className="space-y-6">
        {categories
          .filter(([num]) => categoryFilter === 'all' || categoryFilter === num)
          .map(([categoryNum, categoryName]) => {
            const sectionItems = filteredItems.filter((i) => i.categoryNumber === categoryNum);
            if (sectionItems.length === 0) return null;

            const secCompleted = sectionItems.filter((i) => i.status === 'Completed').length;
            const secTotal = sectionItems.length;

            return (
              <section
                key={categoryNum}
                className="bg-white/95 border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm print:border print:border-slate-300 print:rounded-none print:shadow-none break-inside-avoid print-avoid-break"
              >
                {/* Category Header with Royal Indigo Gradient */}
                <div className="px-5 py-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-600 text-xs font-bold text-white font-mono shadow-xs">
                      {categoryNum}
                    </span>
                    <h2 className="text-sm font-bold tracking-tight text-slate-50">
                      {categoryNum}. {categoryName}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-mono text-xs text-amber-300 font-semibold tabular-nums">
                      {secCompleted} / {secTotal} সম্পন্ন
                    </div>
                    {/* Add into this specific category shortcut */}
                    <button
                      type="button"
                      onClick={() => {
                        setNewCategoryNum(categoryNum);
                        setShowAddModal(true);
                      }}
                      className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs text-white bg-white/10 hover:bg-white/20 rounded-md transition-colors cursor-pointer print:hidden"
                      title="এই ক্যাটাগরিতে নতুন কাজ যোগ করুন"
                    >
                      <Plus className="h-3 w-3" />
                      <span>+যোগ</span>
                    </button>
                  </div>
                </div>

                {/* Items List */}
                <div className="divide-y divide-slate-200/80">
                  {sectionItems.map((item) => {
                    const isCompleted = item.status === 'Completed';
                    const isEditing = editingItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`p-4 transition-colors ${
                          isCompleted
                            ? 'bg-emerald-50/25 hover:bg-emerald-50/35'
                            : 'bg-amber-50/25 hover:bg-amber-50/35'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Checkbox and Task */}
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(item)}
                              className={`mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                isCompleted
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                  : 'bg-white border-slate-300 hover:border-blue-500 text-transparent'
                              }`}
                              title={isCompleted ? 'ক্লিক করে পেন্ডিং করুন' : 'ক্লিক করে সম্পন্ন মার্ক করুন'}
                            >
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            </button>

                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div
                                onClick={() => handleToggleStatus(item)}
                                className={`text-sm font-medium cursor-pointer select-none leading-relaxed ${
                                  isCompleted ? 'line-through text-slate-400' : 'text-slate-900 font-semibold'
                                }`}
                              >
                                {item.taskText}
                              </div>

                              {/* Remarks / Explanation Section */}
                              {isEditing ? (
                                <div className="mt-2 space-y-2 max-w-2xl bg-white p-3 border border-blue-400 rounded-xl shadow-xs print:hidden">
                                  <label className="block text-xs font-semibold text-slate-700">
                                    {isCompleted
                                      ? 'সম্পন্ন কাজের রেফারেন্স বা নোট লিখুন:'
                                      : 'কেন হলো না? কারণ/ব্যাখ্যা বা সমাধান ডেডলাইন লিখুন (Remarks):'}
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={remarksDraft}
                                    onChange={(e) => setRemarksDraft(e.target.value)}
                                    placeholder="কারণ বা বিস্তারিত নোট লিখুন..."
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                                  />
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingItemId(null)}
                                      className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                                    >
                                      বাতিল
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveRemarks(item.id)}
                                      className="px-3 py-1 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 cursor-pointer"
                                    >
                                      সেভ করুন
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-2 pt-0.5">
                                  <div className="text-xs text-slate-600 flex items-start gap-1.5 leading-relaxed">
                                    <span className="font-semibold text-slate-700 shrink-0">
                                      {isCompleted ? 'নোট / Evidence:' : 'কারণ / Remarks:'}
                                    </span>
                                    <span
                                      className={
                                        item.remarks
                                          ? isCompleted
                                            ? 'text-slate-700'
                                            : 'text-amber-950 font-medium'
                                          : 'italic text-slate-400'
                                      }
                                    >
                                      {item.remarks || 'কোনো কারণ বা মন্তব্য লেখা হয়নি (যুক্ত করতে এডিট বাটনে ক্লিক করুন)'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 print:hidden">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEdit(item)}
                                      className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-medium cursor-pointer"
                                      title="মন্তব্য / কারণ লিখুন"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                      <span>{item.remarks ? 'এডিট' : '+মন্তব্য'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteChecklistItem(item.id)}
                                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                                      title="মুছে ফেলুন"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0 pt-0.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums ${
                                isCompleted
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}
                            >
                              {isCompleted ? (
                                <>
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Complete</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3" />
                                  <span>Pending</span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
      </div>

      {/* A4 Print Signature Footer */}
      <div className="hidden print:block pt-10 break-inside-avoid">
        <div className="grid grid-cols-2 gap-12 text-xs text-slate-800">
          <div className="border-t border-slate-900 pt-2 font-medium">
            Prepared & Monitored By: {db.settings.employeeName} ({db.settings.designation})
          </div>
          <div className="border-t border-slate-900 pt-2 font-medium text-right">
            Acknowledged & Approved By: Managing Director / Chairman (SPEED NET)
          </div>
        </div>
      </div>

      {/* Next Day Checklist Carryover Planner Modal */}
      {onPlanNextDay && (
        <NextDayPlannerModal
          open={plannerOpen}
          onClose={() => setPlannerOpen(false)}
          db={db}
          onPlanNextDay={onPlanNextDay}
          onNotifyToast={onNotifyToast}
        />
      )}
    </div>
  );
};
