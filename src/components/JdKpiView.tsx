import React, { useMemo, useState } from 'react';
import { Check, FileText, Printer, Search, X } from 'lucide-react';
import type { AppDatabase, AppSettings, JdItem, JdStatus } from '../types.ts';
import type { KpiSummary } from '../utils/kpiAndAlarms.ts';

interface JdKpiViewProps {
  db: AppDatabase;
  kpiSummary: KpiSummary;
  onUpdateJd: (id: string, patch: Partial<JdItem>) => Promise<void>;
  onUpdateSettings: (patch: Partial<AppSettings>) => Promise<void>;
}

export const JdKpiView: React.FC<JdKpiViewProps> = ({
  db,
  kpiSummary,
  onUpdateJd,
  onUpdateSettings,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | JdStatus>('all');
  const [cadenceFilter, setCadenceFilter] = useState<'all' | 'daily' | 'monthly' | 'yearly'>('all');
  const [sortMode, setSortMode] = useState<'kpi-priority' | 'jd-serial'>('kpi-priority');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  const groupMap = useMemo(() => {
    const map = new Map<string, (typeof db.kpiGroups)[number]>();
    db.kpiGroups.forEach((g) => map.set(g.id, g));
    return map;
  }, [db.kpiGroups]);

  const filteredJds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return db.jdItems
      .filter((item) => {
        if (selectedGroupId !== 'all' && item.kpiGroupId !== selectedGroupId) return false;
        if (statusFilter !== 'all' && item.status !== statusFilter) return false;
        if (cadenceFilter !== 'all' && item.cadence !== cadenceFilter) return false;
        if (q) {
          const hay = `${item.jdNo} ${item.titleEn} ${item.descriptionBn} ${item.sourceFunction} ${item.evidenceNote}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortMode === 'kpi-priority') {
          const wB = groupMap.get(b.kpiGroupId)?.weight || 0;
          const wA = groupMap.get(a.kpiGroupId)?.weight || 0;
          if (wB !== wA) return wB - wA;
          // Show Pending / Not Done before Done within same weight
          const rank = (s: JdStatus) => (s === 'Not Done' ? 0 : s === 'Pending' ? 1 : s === 'Done' ? 2 : 3);
          if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
        }
        return Number(a.jdNo) - Number(b.jdNo);
      });
  }, [db.jdItems, selectedGroupId, statusFilter, cadenceFilter, sortMode, searchQuery, groupMap]);

  const startEditNote = (item: JdItem) => {
    setEditingNoteId(item.id);
    setNoteDraft(item.evidenceNote);
  };

  const saveEditNote = async (id: string) => {
    await onUpdateJd(id, { evidenceNote: noteDraft });
    setEditingNoteId(null);
  };

  return (
    <div className="space-y-8">
      {/* Official Monthly KPI Score Table (Matches Page 8 of PDF) */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 print-sheet">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              MONTHLY KPI SCORE TABLE — {db.settings.companyName}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              ফর্মুলা: <span className="font-mono">Score = Done ÷ (Done + Pending + Not Done) × Weight</span> · N/A বাদ যাবে · Pending ও Not Done = 0 · সর্বোচ্চ KPI Weight অনুসারে সাজানো
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print shrink-0">
            <button
              type="button"
              onClick={() => setShowPdfPreview((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>{showPdfPreview ? 'মূল JD PDF বন্ধ করুন' : 'মূল JD PDF দেখুন'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>KPI শিট প্রিন্ট / PDF</span>
            </button>
          </div>
        </div>

        {showPdfPreview && (
          <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden bg-slate-100 no-print">
            <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">
                সংযুক্ত মূল ডকুমেন্ট: SpeedNet COO JD With KPI Table (PDF)
              </span>
              <a
                href="/assets/aistudio/SpeedNet_COO_JD_With_KPI_Table_4d6d2f44.pdf"
                download="SpeedNet_COO_JD_With_KPI_Table.pdf"
                className="text-blue-700 hover:underline font-medium"
              >
                ডাউনলোড করুন
              </a>
            </div>
            <iframe
              src="/assets/aistudio/SpeedNet_COO_JD_With_KPI_Table_4d6d2f44.pdf"
              title="SpeedNet COO Official JD PDF"
              className="w-full h-[540px]"
            />
          </div>
        )}

        {/* Evaluation Metadata Row */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Employee & Designation</label>
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium text-xs">
              {db.settings.employeeName} — {db.settings.designation}
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Evaluation Month</label>
            <input
              type="text"
              value={db.settings.evaluationMonth}
              onChange={(e) => onUpdateSettings({ evaluationMonth: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Evaluated By</label>
            <input
              type="text"
              value={db.settings.evaluatedBy}
              onChange={(e) => onUpdateSettings({ evaluatedBy: e.target.value })}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* High-Density KPI Score Grid */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-900 text-white text-xs">
                <th className="py-2.5 px-3 font-semibold">KPI Group (Priority Sorted)</th>
                <th className="py-2.5 px-3 font-semibold">JD No.</th>
                <th className="py-2.5 px-3 font-semibold text-right">Weight</th>
                <th className="py-2.5 px-3 font-semibold text-right">Done</th>
                <th className="py-2.5 px-3 font-semibold text-right">Pending</th>
                <th className="py-2.5 px-3 font-semibold text-right">Not Done</th>
                <th className="py-2.5 px-3 font-semibold text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {kpiSummary.groupScores.map((row) => {
                const isSelected = selectedGroupId === row.group.id;
                return (
                  <tr
                    key={row.group.id}
                    onClick={() =>
                      setSelectedGroupId((prev) => (prev === row.group.id ? 'all' : row.group.id))
                    }
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900">{row.group.name}</div>
                      <div className="text-xs text-slate-500">{row.group.nameBn}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-600 tabular-nums">
                      {row.group.jdNumbers.join(', ')}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs font-semibold text-slate-900 text-right tabular-nums">
                      {row.group.weight}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-emerald-700 font-medium text-right tabular-nums">
                      {row.doneCount}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-amber-700 font-medium text-right tabular-nums">
                      {row.pendingCount}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-red-700 font-medium text-right tabular-nums">
                      {row.notDoneCount}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs font-bold text-slate-900 text-right tabular-nums">
                      {row.score.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-900 bg-slate-50 font-bold text-slate-900">
                <td className="py-3 px-3 text-xs">TOTAL KPI SCORE</td>
                <td className="py-3 px-3 font-mono text-xs text-slate-500">54 JD Items</td>
                <td className="py-3 px-3 font-mono text-sm text-right tabular-nums">
                  {kpiSummary.totalWeight}
                </td>
                <td className="py-3 px-3 font-mono text-xs text-emerald-700 text-right tabular-nums">
                  {kpiSummary.totalDone}
                </td>
                <td className="py-3 px-3 font-mono text-xs text-amber-700 text-right tabular-nums">
                  {kpiSummary.totalPending}
                </td>
                <td className="py-3 px-3 font-mono text-xs text-red-700 text-right tabular-nums">
                  {kpiSummary.totalNotDone}
                </td>
                <td className="py-3 px-3 font-mono text-sm text-blue-700 text-right tabular-nums">
                  {kpiSummary.totalScore.toFixed(2)} / 100
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Verification Notes & Print Signature Footer */}
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Evidence / Verification Notes
            </label>
            <input
              type="text"
              value={db.settings.verificationNotes}
              onChange={(e) => onUpdateSettings({ verificationNotes: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="hidden print-only pt-10">
            <div className="grid grid-cols-2 gap-12 text-xs text-slate-800">
              <div className="border-t border-slate-400 pt-2">
                Reviewer Signature (Managing Director)
              </div>
              <div className="border-t border-slate-400 pt-2">
                Final Approval (Chairman — SPEED NET)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed 54 JD Responsibility Tracker & Inline Status Editor */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              সকল ৫৪টি JD দায়িত্ব মনিটরিং ও স্ট্যাটাস আপডেট ({filteredJds.length}টি প্রদর্শিত)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              প্রতিটি দায়িত্বের ডানপাশ থেকে Done / Pending / Not Done / N/A পরিবর্তন করলেই উপরের KPI Score তাৎক্ষণিক আপডেট হবে।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setSortMode('kpi-priority')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  sortMode === 'kpi-priority'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                KPI Priority ক্রম
              </button>
              <button
                type="button"
                onClick={() => setSortMode('jd-serial')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  sortMode === 'jd-serial'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                JD ক্রমিক (01–54)
              </button>
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="JD নম্বর বা বিষয় খুঁজুন (যেমন: BTRC, S7, MAC)..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">সকল KPI গ্রুপ (All 13 Groups)</option>
            {[...db.kpiGroups]
              .sort((a, b) => b.weight - a.weight)
              .map((g) => (
                <option key={g.id} value={g.id}>
                  [Weight {g.weight}] {g.name}
                </option>
              ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | JdStatus)}
            className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">সকল স্ট্যাটাস (Done / Pending / Not Done)</option>
            <option value="Pending">শুধুমাত্র Pending</option>
            <option value="Not Done">শুধুমাত্র Not Done</option>
            <option value="Done">শুধুমাত্র Done</option>
            <option value="N/A">N/A (প্রযোজ্য নয়)</option>
          </select>

          <select
            value={cadenceFilter}
            onChange={(e) =>
              setCadenceFilter(e.target.value as 'all' | 'daily' | 'monthly' | 'yearly')
            }
            className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">সকল পর্যায় (Daily / Monthly / Yearly)</option>
            <option value="daily">Daily (দৈনিক)</option>
            <option value="monthly">Monthly (মাসিক)</option>
            <option value="yearly">Yearly (বাৎসরিক)</option>
          </select>
        </div>

        {/* JD Items List */}
        <div className="mt-4 divide-y divide-slate-200">
          {filteredJds.map((item) => {
            const group = groupMap.get(item.kpiGroupId);
            const isEditing = editingNoteId === item.id;
            return (
              <div
                key={item.id}
                className="py-4 flex flex-col lg:flex-row lg:items-start justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      JD #{item.jdNo}
                    </span>
                    <span>·</span>
                    <span className="font-mono font-semibold text-blue-700 tabular-nums">
                      KPI Weight {group?.weight ?? 0}
                    </span>
                    <span>·</span>
                    <span>{group?.name}</span>
                    <span>·</span>
                    <span className="capitalize">{item.cadence}</span>
                    <span>·</span>
                    <span>Reports to: {item.reportsTo}</span>
                    <span>·</span>
                    <span className="text-slate-400">[{item.sourceFunction}]</span>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900">{item.titleEn}</h3>
                  <p className="text-xs text-slate-700 leading-relaxed">{item.descriptionBn}</p>

                  {isEditing ? (
                    <div className="pt-1 flex items-center gap-2 max-w-2xl">
                      <input
                        type="text"
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="কাজের অগ্রগতি বা প্রমাণের রেফারেন্স লিখুন..."
                        className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-blue-400 rounded-md focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => saveEditNote(item.id)}
                        className="p-1.5 text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer"
                        title="সেভ করুন"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingNoteId(null)}
                        className="p-1.5 text-slate-500 bg-slate-100 rounded-md hover:bg-slate-200 cursor-pointer"
                        title="বাতিল"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="pt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      <span>
                        সর্বশেষ আপডেট নোট:{' '}
                        <strong className="font-normal text-slate-700">
                          {item.evidenceNote || 'কোনো নোট যুক্ত করা হয়নি'}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => startEditNote(item)}
                        className="text-blue-700 hover:underline font-medium shrink-0 cursor-pointer"
                      >
                        নোট এডিট
                      </button>
                    </div>
                  )}
                </div>

                {/* Segmented Status Control */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 self-start">
                  {(['Done', 'Pending', 'Not Done', 'N/A'] as JdStatus[]).map((st) => {
                    const active = item.status === st;
                    let activeStyle = 'bg-white text-slate-900 shadow-xs';
                    if (active && st === 'Done') activeStyle = 'bg-emerald-600 text-white shadow-xs';
                    if (active && st === 'Pending') activeStyle = 'bg-amber-500 text-white shadow-xs';
                    if (active && st === 'Not Done') activeStyle = 'bg-red-600 text-white shadow-xs';
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => onUpdateJd(item.id, { status: st })}
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active ? activeStyle : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
