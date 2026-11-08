import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  FileText,
  Filter,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import type { AppDatabase, ChecklistItem, ChecklistStatus } from '../types.ts';

interface ChecklistViewProps {
  db: AppDatabase;
  onUpdateChecklistItem: (id: string, patch: Partial<ChecklistItem>) => Promise<void>;
  onResetChecklist: (cadence: 'daily' | 'monthly') => Promise<void>;
  onNavigateToReports: (templateId?: string) => void;
  onNotifyToast: (msg: string) => void;
}

export const ChecklistView: React.FC<ChecklistViewProps> = ({
  db,
  onUpdateChecklistItem,
  onResetChecklist,
  onNavigateToReports,
  onNotifyToast,
}) => {
  const [activeCadence, setActiveCadence] = useState<'daily' | 'monthly'>('daily');
  const [statusFilter, setStatusFilter] = useState<'all' | ChecklistStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [remarksDraft, setRemarksDraft] = useState('');

  // Items for the active cadence
  const items = useMemo(() => {
    return (db.checklists || []).filter((item) => item.cadence === activeCadence);
  }, [db.checklists, activeCadence]);

  // Unique categories for active cadence
  const categories = useMemo(() => {
    const map = new Map<number, string>();
    items.forEach((item) => {
      if (!map.has(item.categoryNumber)) {
        map.set(item.categoryNumber, item.categoryName);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [items]);

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

  return (
    <div className="space-y-6">
      {/* Top Banner and Summary Card */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-semibold mb-2 print:hidden">
              <Sparkles className="h-3.5 w-3.5" />
              <span>SPEED NET Official COO Operations Protocol</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {activeCadence === 'daily'
                ? 'SPEED NET — DAILY COO MONITORING CHECKLIST'
                : 'SPEED NET — MONTHLY COO MONITORING CHECKLIST'}
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              প্রতিদিনের ও মাসিক অপারেশনাল মনিটরিং চেকলিস্ট। যে কাজটি হয়ে যাবে টিক দিলে <strong>Complete</strong> হবে, আর যেটি হবে না সেটি <strong>Pending</strong> থাকবে এবং কেন হলো না তার ব্যাখ্যা বা <strong>Remarks</strong> লিখে সেভ করা যাবে।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden shrink-0">
            <button
              type="button"
              onClick={() => onResetChecklist(activeCadence)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>{activeCadence === 'daily' ? 'ডেইলি রিপোর্ট ফরম্যাটে পাঠান' : 'মাসিক রিপোর্ট ফরম্যাট (MD/Chairman)'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>চেকলিস্ট এক ক্লিকে প্রিন্ট</span>
            </button>
          </div>
        </div>

        {/* Cadence Tabs and Stats Metric Grid */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-xs text-slate-500 font-medium">মনিটরিং পর্যায়</div>
            <div className="mt-1 flex items-center gap-1 p-1 bg-slate-200/70 rounded-md print:hidden">
              <button
                type="button"
                onClick={() => {
                  setActiveCadence('daily');
                  setCategoryFilter('all');
                }}
                className={`flex-1 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                  activeCadence === 'daily'
                    ? 'bg-white text-slate-900 shadow-xs'
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
                className={`flex-1 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                  activeCadence === 'monthly'
                    ? 'bg-white text-slate-900 shadow-xs'
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

          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-emerald-800 font-medium">
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

          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-amber-900 font-medium">
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

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between">
            <div className="text-xs text-slate-500 font-medium">অগ্রগতি হার (Progress)</div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                {completionPercentage}%
              </span>
              <div className="w-20 bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
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
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
              <Filter className="h-3.5 w-3.5 text-slate-500 ml-1.5" />
              {(['all', 'Pending', 'Completed'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 font-medium rounded cursor-pointer transition-colors ${
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
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
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
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs print:border print:border-slate-300 print:rounded-none print:shadow-none break-inside-avoid"
              >
                {/* Category Header */}
                <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-600 text-xs font-bold text-white font-mono">
                      {categoryNum}
                    </span>
                    <h2 className="text-sm font-semibold tracking-tight">
                      {categoryNum}. {categoryName}
                    </h2>
                  </div>
                  <div className="font-mono text-xs text-slate-300 tabular-nums">
                    {secCompleted} / {secTotal} সম্পন্ন
                  </div>
                </div>

                {/* Items List */}
                <div className="divide-y divide-slate-200">
                  {sectionItems.map((item) => {
                    const isCompleted = item.status === 'Completed';
                    const isEditing = editingItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`p-4 transition-colors ${
                          isCompleted
                            ? 'bg-emerald-50/20 hover:bg-emerald-50/30'
                            : 'bg-amber-50/20 hover:bg-amber-50/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Checkbox and Task */}
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(item)}
                              className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
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
                                  isCompleted ? 'line-through text-slate-500' : 'text-slate-900 font-semibold'
                                }`}
                              >
                                {item.taskText}
                              </div>

                              {/* Remarks / Explanation Section */}
                              {isEditing ? (
                                <div className="mt-2 space-y-2 max-w-2xl bg-white p-3 border border-blue-400 rounded-lg shadow-xs">
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
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                                      className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 cursor-pointer"
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
                                            : 'text-amber-900 font-medium'
                                          : 'italic text-slate-400'
                                      }
                                    >
                                      {item.remarks || 'কোনো কারণ বা মন্তব্য লেখা হয়নি (যুক্ত করতে এডিট বাটনে ক্লিক করুন)'}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(item)}
                                    className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-medium cursor-pointer shrink-0 print:hidden"
                                    title="মন্তব্য / কারণ লিখুন"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                    <span>{item.remarks ? 'এডিট' : '+মন্তব্য লিখুন'}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0 pt-0.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold tabular-nums ${
                                isCompleted
                                  ? 'bg-emerald-100 text-emerald-800'
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

      {/* Print Signature Footer */}
      <div className="hidden print:block pt-12">
        <div className="grid grid-cols-2 gap-12 text-xs text-slate-800">
          <div className="border-t border-slate-900 pt-2 font-medium">
            Prepared & Monitored By: {db.settings.employeeName} ({db.settings.designation})
          </div>
          <div className="border-t border-slate-900 pt-2 font-medium text-right">
            Acknowledged & Approved By: Managing Director / Chairman (SPEED NET)
          </div>
        </div>
      </div>
    </div>
  );
};
