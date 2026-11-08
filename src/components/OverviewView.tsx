import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock,
  FilePlus2,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import type { ActionTask, AppDatabase, JdItem, MonitoringCadence } from '../types.ts';
import type { EvaluatedRenewal, KpiSummary } from '../utils/kpiAndAlarms.ts';

interface OverviewViewProps {
  db: AppDatabase;
  kpiSummary: KpiSummary;
  evaluatedRenewals: EvaluatedRenewal[];
  onNavigate: (tab: 'overview' | 'checklists' | 'jd-kpi' | 'alarms' | 'reports', reportTemplateId?: string) => void;
  onToggleDailyJd: (jd: JdItem) => Promise<void>;
  onResetDailyChecks: () => Promise<void>;
  onCreateTask: (task: Partial<ActionTask>) => Promise<void>;
  onUpdateTaskStatus: (id: string, status: ActionTask['status']) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onPlayAlarm: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  db,
  kpiSummary,
  evaluatedRenewals,
  onNavigate,
  onToggleDailyJd,
  onResetDailyChecks,
  onCreateTask,
  onUpdateTaskStatus,
  onDeleteTask,
  onPlayAlarm,
}) => {
  const [activeCadence, setActiveCadence] = useState<MonitoringCadence>('daily');
  const [taskFilter, setTaskFilter] = useState<'active' | 'done' | 'all'>('active');
  const [showAddTask, setShowAddTask] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [newJdNo, setNewJdNo] = useState('07');
  const [newCoord, setNewCoord] = useState('NOC & Admin');
  const [newDueDate, setNewDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newCadence, setNewCadence] = useState<MonitoringCadence>('daily');

  const kpiWeightMap = useMemo(() => {
    const map = new Map<string, number>();
    db.kpiGroups.forEach((g) => map.set(g.id, g.weight));
    return map;
  }, [db.kpiGroups]);

  const urgentAlarms = useMemo(
    () => evaluatedRenewals.filter((r) => r.state === 'overdue' || r.state === 'alarm-1m'),
    [evaluatedRenewals]
  );

  const dailyJds = useMemo(
    () => db.jdItems.filter((j) => j.cadence === 'daily'),
    [db.jdItems]
  );

  const dailyDoneTodayCount = useMemo(
    () => dailyJds.filter((j) => j.dailyCheckedToday).length,
    [dailyJds]
  );

  const cadenceJdItems = useMemo(() => {
    return db.jdItems
      .filter((item) => item.cadence === activeCadence)
      .sort((a, b) => {
        const wB = kpiWeightMap.get(b.kpiGroupId) || 0;
        const wA = kpiWeightMap.get(a.kpiGroupId) || 0;
        if (wB !== wA) return wB - wA;
        return Number(a.jdNo) - Number(b.jdNo);
      });
  }, [db.jdItems, activeCadence, kpiWeightMap]);

  const sortedTasks = useMemo(() => {
    return db.tasks
      .filter((t) => {
        if (taskFilter === 'active') return t.status !== 'Done';
        if (taskFilter === 'done') return t.status === 'Done';
        return true;
      })
      .sort((a, b) => {
        if (a.status === 'Done' && b.status !== 'Done') return 1;
        if (a.status !== 'Done' && b.status === 'Done') return -1;
        if (b.kpiWeight !== a.kpiWeight) return b.kpiWeight - a.kpiWeight;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [db.tasks, taskFilter]);

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const matchedJd = db.jdItems.find((j) => j.jdNo === newJdNo) || db.jdItems[0];
    const weight = kpiWeightMap.get(matchedJd.kpiGroupId) || 10;

    await onCreateTask({
      title: newTitle.trim(),
      details: newDetails.trim(),
      jdNo: matchedJd.jdNo,
      kpiGroupId: matchedJd.kpiGroupId,
      kpiWeight: weight,
      cadence: newCadence,
      assignedCoord: newCoord.trim() || 'Operations',
      dueDate: newDueDate,
      status: 'Pending',
    });

    setNewTitle('');
    setNewDetails('');
    setShowAddTask(false);
  };

  return (
    <div className="space-y-8">
      {/* 1-Month Advance Expiry Alarm Banner */}
      {urgentAlarms.length > 0 && (
        <section className="rounded-xl border border-amber-300 bg-amber-50/70 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-amber-900">
                <BellRing className="h-5 w-5 text-red-600 shrink-0" />
                <h2 className="text-base font-semibold">
                  আগাম ১ মাসের মেয়াদোত্তীর্ণ ও নবায়ন অ্যালার্ম ({urgentAlarms.length}টি জরুরি আইটেম)
                </h2>
              </div>
              <p className="text-sm text-slate-700">
                নিচের লাইসেন্স, ভাড়ার চুক্তি, ফায়ার এক্সটিংগুইশার বা ওয়ারেন্টির মেয়াদ আগামী ৩০ দিনের মধ্যে শেষ হবে অথবা ইতিমধ্যে উত্তীর্ণ হয়েছে।
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onPlayAlarm}
                className="px-3.5 py-2 text-xs font-medium text-amber-950 bg-white border border-amber-300 rounded-lg hover:bg-amber-100/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                অ্যালার্ম সাউন্ড টেস্ট
              </button>
              <button
                type="button"
                onClick={() => onNavigate('alarms')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>সকল নবায়ন পরিচালনা করুন</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-4 divide-y divide-amber-200/80 border-t border-amber-200/80">
            {urgentAlarms.map(({ item, daysRemaining }) => (
              <div
                key={item.id}
                className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-medium text-slate-900">{item.title}</span>
                  <span className="mx-2 text-slate-400">·</span>
                  <span className="text-xs text-slate-600">
                    JD #{item.jdNo} · {item.category} · {item.referenceOrLocation}
                  </span>
                </div>
                <div className="flex items-center gap-4 shrink-0 font-mono text-xs tabular-nums">
                  <span className="text-slate-600">মেয়াদ: {item.expiryDate}</span>
                  {daysRemaining < 0 ? (
                    <span className="font-semibold text-red-700">
                      মেয়াদোত্তীর্ণ ({Math.abs(daysRemaining)} দিন আগে)
                    </span>
                  ) : (
                    <span className="font-semibold text-amber-800">
                      মাত্র {daysRemaining} দিন বাকি
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Executive Summary Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="text-xs text-slate-500">চলতি মাসের লাইভ KPI স্কোর</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
              {kpiSummary.totalScore.toFixed(1)}
            </span>
            <span className="text-sm font-mono tabular-nums text-slate-500">/ {kpiSummary.totalWeight}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
            <span>
              Done: <strong className="font-mono tabular-nums text-emerald-700">{kpiSummary.totalDone}</strong> · Pending:{' '}
              <strong className="font-mono tabular-nums text-amber-700">{kpiSummary.totalPending}</strong>
            </span>
            <button
              type="button"
              onClick={() => onNavigate('jd-kpi')}
              className="text-blue-700 hover:underline font-medium whitespace-nowrap cursor-pointer"
            >
              KPI টেবিল দেখুন
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="text-xs text-slate-500">KPI অগ্রাধিকারভিত্তিক পেন্ডিং কাজ</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
              {db.tasks.filter((t) => t.status !== 'Done').length}
            </span>
            <span className="text-sm text-slate-500">টি চলমান কাজ</span>
          </div>
          <div className="mt-3 text-xs text-slate-600">
            সর্বোচ্চ ওয়েট ১৫ (IIG/NTTN) ও ১০ (Compliance/Growth) আগে সাজানো
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>COO মনিটরিং চেকলিস্ট</span>
            <button
              type="button"
              onClick={() => onNavigate('checklists')}
              className="text-blue-700 hover:underline font-semibold cursor-pointer"
            >
              সম্পূর্ণ চেকলিস্ট খুলুন →
            </button>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
              {(db.checklists || []).filter((c) => c.status === 'Completed').length}
            </span>
            <span className="text-sm font-mono tabular-nums text-slate-500">
              / {(db.checklists || []).length || 52} সম্পন্ন
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
            <span>
              পেন্ডিং: <strong className="font-mono text-amber-700">{(db.checklists || []).filter((c) => c.status === 'Pending').length}</strong> টি (Remarks সহ)
            </span>
            <button
              type="button"
              onClick={() => onNavigate('checklists')}
              className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-medium cursor-pointer whitespace-nowrap"
            >
              <span>Daily/Monthly টিক দিন</span>
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div className="text-xs text-slate-500">অফিসিয়াল রিপোর্ট ফরম্যাট ও সাবমিশন</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono tabular-nums text-slate-900">
              {db.reports.length}
            </span>
            <span className="text-sm text-slate-500">টি সংরক্ষিত রিপোর্ট</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
            <span>MD · Chairman · CFO ফরম্যাট</span>
            <button
              type="button"
              onClick={() => onNavigate('reports', 'daily-ops-report')}
              className="text-blue-700 hover:underline font-medium whitespace-nowrap cursor-pointer"
            >
              আজকের রিপোর্ট দিন
            </button>
          </div>
        </div>
      </section>

      {/* Main Two-Column Operational Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: KPI-Prioritized Pending Action Queue */}
        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                আজকের ও চলমান পেন্ডিং কাজের তালিকা (KPI Priority ক্রমানুসারে)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                বেশি KPI Weight-এর কাজগুলো স্বয়ংক্রিয়ভাবে সবার উপরে দেখানো হচ্ছে যাতে স্কোর দ্রুত বৃদ্ধি পায়।
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setTaskFilter('active')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    taskFilter === 'active'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  পেন্ডিং ({db.tasks.filter((t) => t.status !== 'Done').length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('done')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    taskFilter === 'done'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  সম্পন্ন ({db.tasks.filter((t) => t.status === 'Done').length})
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTask((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>নতুন পেন্ডিং কাজ</span>
              </button>
            </div>
          </div>

          {showAddTask && (
            <form onSubmit={handleTaskSubmit} className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    কাজের শিরোনাম *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="যেমন: NTTN লিংক ডাউনগ্রেড ওয়ার্ক অর্ডার ও MD অনুমোদন..."
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    সংশ্লিষ্ট JD নম্বর (স্বয়ংক্রিয় KPI Weight নির্ধারণ)
                  </label>
                  <select
                    value={newJdNo}
                    onChange={(e) => setNewJdNo(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {db.jdItems.map((jd) => {
                      const w = kpiWeightMap.get(jd.kpiGroupId) || 5;
                      return (
                        <option key={jd.id} value={jd.jdNo}>
                          JD #{jd.jdNo} (Weight {w}) — {jd.titleEn}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">ধরন</label>
                    <select
                      value={newCadence}
                      onChange={(e) => setNewCadence(e.target.value as MonitoringCadence)}
                      className="w-full px-2.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="daily">Daily</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">টার্গেট তারিখ</label>
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full px-2.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    সমন্বয়কারী বিভাগ / ব্যক্তি
                  </label>
                  <input
                    type="text"
                    value={newCoord}
                    onChange={(e) => setNewCoord(e.target.value)}
                    placeholder="NOC / Admin / Finance / Branch Manager"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">সংক্ষিপ্ত নোট</label>
                  <input
                    type="text"
                    value={newDetails}
                    onChange={(e) => setNewDetails(e.target.value)}
                    placeholder="ফলোআপ নির্দেশনা..."
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddTask(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  তালিকায় যুক্ত করুন
                </button>
              </div>
            </form>
          )}

          <div className="mt-2 divide-y divide-slate-200">
            {sortedTasks.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <p className="text-sm font-medium text-slate-700">এই তালিকায় কোনো পেন্ডিং কাজ নেই।</p>
                <p className="text-xs text-slate-500">
                  নতুন কোনো অপারেশনাল ফলোআপ যোগ করতে উপরের &ldquo;নতুন পেন্ডিং কাজ&rdquo; বাটনে ক্লিক করুন।
                </p>
              </div>
            ) : (
              sortedTasks.map((task) => (
                <div key={task.id} className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                      <span className="font-semibold text-blue-700">KPI Weight {task.kpiWeight}</span>
                      <span>·</span>
                      <span>JD #{task.jdNo}</span>
                      <span>·</span>
                      <span className="font-sans">{task.assignedCoord}</span>
                      <span>·</span>
                      <span>Due: {task.dueDate}</span>
                    </div>
                    <h3
                      className={`text-sm font-semibold ${
                        task.status === 'Done' ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {task.title}
                    </h3>
                    {task.details && (
                      <p className="text-xs text-slate-600 leading-relaxed">{task.details}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      aria-label="Task Status"
                      value={task.status}
                      onChange={(e) =>
                        onUpdateTaskStatus(task.id, e.target.value as ActionTask['status'])
                      }
                      className={`px-2.5 py-1.5 text-xs font-medium border rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                        task.status === 'Done'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : task.status === 'In Progress'
                          ? 'bg-blue-50 border-blue-200 text-blue-800'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Done">Done</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right 5 Cols: Daily / Monthly / Yearly Monitoring Guide & Routine Check */}
        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <div className="space-y-3 pb-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Daily · Monthly · Yearly মনিটরিং গাইড ও চেকলিস্ট
            </h2>
            <p className="text-xs text-slate-500">
              আপনার ৫৪টি JD দায়িত্বকে কাজের ধরন অনুযায়ী ৩টি ধাপে ভাগ করা হয়েছে। ট্যাব পরিবর্তন করে প্রতিদিনের, মাসের ও বছরের কাজ তদারকি করুন।
            </p>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveCadence('daily')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  activeCadence === 'daily'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                দৈনিক (Daily · {db.jdItems.filter((i) => i.cadence === 'daily').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCadence('monthly')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  activeCadence === 'monthly'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                মাসিক (Monthly · {db.jdItems.filter((i) => i.cadence === 'monthly').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCadence('yearly')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  activeCadence === 'yearly'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                বাৎসরিক (Yearly · {db.jdItems.filter((i) => i.cadence === 'yearly').length})
              </button>
            </div>
          </div>

          {/* Contextual Workflow Advice */}
          <div className="mt-4 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
            {activeCadence === 'daily' && (
              <span>
                <strong>দৈনিক রুটিন:</strong> প্রতিদিন সকালে IIG/NTTN লিংক, ভেন্ডর ইমেইলে SpeedNet Khulna CC, S7 RADIUS স্ট্যাটাস, অফিস শৃঙ্খলা, উপস্থিতি ও ব্রাঞ্চ পেন্ডিং ইস্যু চেক করে টিক দিন এবং দিনশেষে Daily Report সংরক্ষণ করুন।
              </span>
            )}
            {activeCadence === 'monthly' && (
              <span>
                <strong>মাসিক রুটিন:</strong> মাসের ১–৫ তারিখের মধ্যে Upstream/NTTN Capacity Report (MD), BTRC Non-Billing Report (MD), SSL SMS Report (CFO) প্রস্তুত করুন এবং ফিজিক্যাল অ্যাসেট ও ফায়ার এক্সটিংগুইশার যাচাই করুন।
              </span>
            )}
            {activeCadence === 'yearly' && (
              <span>
                <strong>বাৎসরিক রুটিন:</strong> BTRC, Trade, Fire ও Labour লাইসেন্স, অফিস/POP ভাড়ার চুক্তি, ডোমেইন/হোস্টিং এবং বার্ষিক কর্মী মূল্যায়ন মেয়াদের কমপক্ষে ৩০ দিন আগে নবায়ন প্রক্রিয়া শুরু করুন।
              </span>
            )}
          </div>

          <div className="mt-3 max-h-[500px] overflow-y-auto divide-y divide-slate-200 pr-1">
            {cadenceJdItems.map((jd) => {
              const weight = kpiWeightMap.get(jd.kpiGroupId) || 5;
              return (
                <div key={jd.id} className="py-3 flex items-start gap-3">
                  {activeCadence === 'daily' ? (
                    <button
                      type="button"
                      onClick={() => onToggleDailyJd(jd)}
                      className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                        jd.dailyCheckedToday
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white border-slate-300 text-transparent hover:border-blue-500'
                      }`}
                      title="আজকের চেক সম্পন্ন মার্ক করুন"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <span className="mt-0.5 font-mono text-xs font-semibold text-slate-400 tabular-nums shrink-0">
                      #{jd.jdNo}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 font-mono tabular-nums">
                      <span>
                        JD #{jd.jdNo} · Weight {weight}
                      </span>
                      <span
                        className={
                          jd.status === 'Done'
                            ? 'text-emerald-700 font-medium font-sans'
                            : jd.status === 'Pending'
                            ? 'text-amber-700 font-medium font-sans'
                            : 'text-red-700 font-medium font-sans'
                        }
                      >
                        {jd.status === 'Done' ? (
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Done
                          </span>
                        ) : jd.status === 'Pending' ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> {jd.status}
                          </span>
                        )}
                      </span>
                    </div>
                    <div
                      className={`text-sm font-medium mt-0.5 ${
                        activeCadence === 'daily' && jd.dailyCheckedToday
                          ? 'line-through text-slate-400'
                          : 'text-slate-900'
                      }`}
                    >
                      {jd.titleEn}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{jd.descriptionBn}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate('jd-kpi')}
              className="text-xs font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              সম্পূর্ণ ৫৪টি JD স্ট্যাটাস আপডেট করুন →
            </button>
            <button
              type="button"
              onClick={() =>
                onNavigate(
                  'reports',
                  activeCadence === 'daily'
                    ? 'daily-ops-report'
                    : activeCadence === 'monthly'
                    ? 'monthly-kpi-ops-md'
                    : 'yearly-compliance-annual-review'
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              <span>
                {activeCadence === 'daily'
                  ? 'Daily Report তৈরি করুন'
                  : activeCadence === 'monthly'
                  ? 'Monthly Report তৈরি করুন'
                  : 'Yearly Report তৈরি করুন'}
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
