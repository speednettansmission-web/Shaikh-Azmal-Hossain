import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  BellRing,
  Calendar,
  CheckCircle2,
  CheckSquare2,
  Clock,
  Compass,
  Edit2,
  FilePlus2,
  FileSpreadsheet,
  ListFilter,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  Volume2,
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

  // New task form state
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

  const activeTaskCount = useMemo(() => db.tasks.filter((t) => t.status !== 'Done').length, [db.tasks]);
  const p1CriticalCount = useMemo(() => db.tasks.filter((t) => t.status !== 'Done' && t.kpiWeight >= 15).length, [db.tasks]);
  const p2HighCount = useMemo(() => db.tasks.filter((t) => t.status !== 'Done' && t.kpiWeight >= 10 && t.kpiWeight < 15).length, [db.tasks]);

  const checklistTotal = db.checklists?.length || 52;
  const checklistCompleted = (db.checklists || []).filter((c) => c.status === 'Completed').length;
  const checklistPending = (db.checklists || []).filter((c) => c.status === 'Pending').length;
  const checklistPercent = Math.round((checklistCompleted / (checklistTotal || 1)) * 100);

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

  const todayFormatted = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('bn-BD', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  return (
    <div className="space-y-8">
      {/* Executive Welcome & Operations Header */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-indigo-900/60">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/15 rounded-full text-xs font-semibold text-amber-300">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>SPEED NET Official COO Executive Console</span>
              <span className="text-white/40">·</span>
              <span className="font-mono text-slate-200">{todayFormatted}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              দৈনিক মনিটরিং ও কার্যক্রম ড্যাশবোর্ড
            </h1>

            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              চিফ অপারেটিং অফিসার (COO) হিসেবে প্রতিদিনের ৭টি ক্যাটাগরির অপারেশনাল চেকলিস্ট তদারকি, KPI অগ্রাধিকারের ভিত্তিতে পেন্ডিং কাজ ফলোআপ, এবং মেয়াদোত্তীর্ণের ১ মাস পূর্বে স্বয়ংক্রিয় অ্যালার্ম মনিটরিং।
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-300 font-mono">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30" />
                <span>দায়িত্বপ্রাপ্ত: {db.settings.employeeName} ({db.settings.designation})</span>
              </span>
              <span>·</span>
              <span className="text-amber-300">
                অফিসিয়াল CC ইমেইল: {db.settings.branchOfficialCcEmail}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('checklists')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md shadow-blue-900/30 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <CheckSquare2 className="h-4 w-4 text-amber-300" />
              <span>দৈনিক চেকলিস্টে টিক দিন</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('reports', 'daily-ops-report')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-900 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-500 hover:to-amber-400 rounded-xl shadow-md shadow-amber-950/20 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>MD/Chairman রিপোর্ট ফরম্যাট</span>
            </button>
          </div>
        </div>
      </section>

      {/* 1-Month Advance Expiry Alarm Banner (Royal Amber/Gold Glossy) */}
      {urgentAlarms.length > 0 && (
        <section className="relative overflow-hidden rounded-2xl border-2 border-amber-400/80 bg-gradient-to-r from-amber-50 via-amber-50/90 to-amber-100/70 p-6 shadow-md shadow-amber-900/10">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex rounded-full h-3 w-3 bg-red-600 ring-4 ring-red-200" />
                <span className="p-1.5 rounded-lg bg-red-600 text-white shadow-xs">
                  <BellRing className="h-4 w-4" />
                </span>
                <h2 className="text-base sm:text-lg font-bold text-amber-950 tracking-tight">
                  ১ মাস আগাম মেয়াদোত্তীর্ণ ও নবায়ন অ্যালার্ম ({urgentAlarms.length}টি লাইসেন্স/চুক্তি জরুরি)
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed max-w-3xl">
                আপনার ৫৪টি JD তালিকার BTRC লাইসেন্স, POP/অফিস ভাড়ার চুক্তি, ফায়ার এক্সটিংগুইশার ও ওয়্যারেন্টির মেয়াদ আগামী ৩০ দিনের মধ্যে শেষ হতে যাচ্ছে। অবিলম্বে রিনিউয়াল ফাইল প্রস্তুত করুন।
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onPlayAlarm}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-950 bg-white border border-amber-300 rounded-xl hover:bg-amber-100/80 transition-all shadow-xs cursor-pointer active:scale-95"
                title="অ্যালার্ম সাউন্ড পরীক্ষা করুন"
              >
                <Volume2 className="h-4 w-4 text-amber-700" />
                <span>সাউন্ড টেস্ট</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('alarms')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-slate-900 to-indigo-950 hover:from-black hover:to-indigo-900 rounded-xl shadow-md transition-all cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <span>সকল নবায়ন ম্যানেজ করুন</span>
                <ArrowRight className="h-3.5 w-3.5 text-amber-400" />
              </button>
            </div>
          </div>

          <div className="mt-4 divide-y divide-amber-200/90 border-t border-amber-300/80">
            {urgentAlarms.map(({ item, daysRemaining }) => (
              <div
                key={item.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-bold text-slate-950">{item.title}</span>
                  <span className="mx-2 text-amber-400 font-bold">·</span>
                  <span className="text-xs text-slate-700 font-medium">
                    JD #{item.jdNo} · {item.category} · {item.referenceOrLocation}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 font-mono text-xs tabular-nums">
                  <span className="text-slate-700 font-medium">মেয়াদ: {item.expiryDate}</span>
                  {daysRemaining < 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-600 text-white font-bold rounded-lg shadow-2xs">
                      <AlertCircle className="h-3.5 w-3.5" />
                      মেয়াদোত্তীর্ণ ({Math.abs(daysRemaining)} দিন আগে)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg shadow-2xs">
                      <Clock className="h-3.5 w-3.5" />
                      মাত্র {daysRemaining} দিন বাকি
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onNavigate('alarms')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors shadow-2xs cursor-pointer"
                    title="আইটেম, লোকেশন বা মেয়াদের তারিখ সংশোধন করুন"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>সংশোধন</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Executive 4-Metric Royal Glossy Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Metric 1: Monthly Live KPI Score */}
        <div className="royal-glass-card rounded-2xl p-5 flex flex-col justify-between border-t-4 border-t-indigo-600 relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                চলতি মাসের লাইভ KPI স্কোর
              </div>
              <div className="text-xs text-slate-500 mt-0.5">SpeedNet COO মূল্যায়ণ পাতা ৮</div>
            </div>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-900/20">
              <Award className="h-5 w-5 text-amber-300" />
            </div>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-slate-950 tracking-tight">
                {kpiSummary.totalScore.toFixed(1)}
              </span>
              <span className="text-sm font-bold font-mono tabular-nums text-slate-500">
                / {kpiSummary.totalWeight}
              </span>
            </div>

            {/* Glowing Score Progress Bar */}
            <div className="mt-2 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, (kpiSummary.totalScore / (kpiSummary.totalWeight || 100)) * 100))}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600">
              সম্পন্ন: <strong className="font-mono tabular-nums text-emerald-700">{kpiSummary.totalDone}</strong> · পেন্ডিং:{' '}
              <strong className="font-mono tabular-nums text-amber-700">{kpiSummary.totalPending}</strong>
            </span>
            <button
              type="button"
              onClick={() => onNavigate('jd-kpi')}
              className="text-blue-700 hover:text-blue-900 font-bold hover:underline whitespace-nowrap cursor-pointer inline-flex items-center gap-1"
            >
              <span>KPI টেবিল</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Metric 2: KPI-Prioritized Pending Queue */}
        <div className="royal-glass-card rounded-2xl p-5 flex flex-col justify-between border-t-4 border-t-amber-500 relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-950">
                KPI অগ্রাধিকারভিত্তিক পেন্ডিং কাজ
              </div>
              <div className="text-xs text-slate-500 mt-0.5">হাই-ওয়েট কাজ দ্রুত নিষ্পন্ন</div>
            </div>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-900/20">
              <Target className="h-5 w-5 text-yellow-200" />
            </div>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-slate-950 tracking-tight">
                {activeTaskCount}
              </span>
              <span className="text-sm font-semibold text-slate-600">টি চলমান কাজ</span>
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs font-mono">
              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                P1 (Weight 15): {p1CriticalCount}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                P2 (Weight 10): {p2HighCount}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">স্বয়ংক্রিয় স্কোর বৃদ্ধির ফিল্টার</span>
            <button
              type="button"
              onClick={() => setShowAddTask(true)}
              className="text-amber-800 hover:text-amber-950 font-bold hover:underline whitespace-nowrap cursor-pointer inline-flex items-center gap-1"
            >
              <span>+ নতুন কাজ</span>
            </button>
          </div>
        </div>

        {/* Metric 3: COO Routine Checklist */}
        <div className="royal-glass-card rounded-2xl p-5 flex flex-col justify-between border-t-4 border-t-emerald-600 relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                COO মনিটরিং চেকলিস্ট
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Daily (৭টি) ও Monthly (৮টি)</div>
            </div>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-900/20">
              <CheckSquare2 className="h-5 w-5 text-emerald-200" />
            </div>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-emerald-800 tracking-tight">
                {checklistCompleted}
              </span>
              <span className="text-sm font-bold font-mono tabular-nums text-slate-500">
                / {checklistTotal} সম্পন্ন ({checklistPercent}%)
              </span>
            </div>

            {/* Glowing Checklist Progress Bar */}
            <div className="mt-2 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-600 transition-all duration-500"
                style={{ width: `${checklistPercent}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600">
              পেন্ডিং: <strong className="font-mono text-amber-700 font-bold">{checklistPending}</strong> টি
            </span>
            <button
              type="button"
              onClick={() => onNavigate('checklists')}
              className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline whitespace-nowrap cursor-pointer inline-flex items-center gap-1"
            >
              <span>চেকলিস্ট খুলুন</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Metric 4: Official Report Center */}
        <div className="royal-glass-card rounded-2xl p-5 flex flex-col justify-between border-t-4 border-t-purple-600 relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-purple-950">
                অফিসিয়াল রিপোর্ট ও সাবমিশন
              </div>
              <div className="text-xs text-slate-500 mt-0.5">MD, Chairman ও CFO ফরম্যাট</div>
            </div>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-800 text-white shadow-md shadow-purple-900/20">
              <FileSpreadsheet className="h-5 w-5 text-purple-200" />
            </div>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-slate-950 tracking-tight">
                {db.reports.length}
              </span>
              <span className="text-sm font-semibold text-slate-600">টি সংরক্ষিত রিপোর্ট</span>
            </div>

            <div className="mt-2 text-xs text-slate-600">
              Section M অনুযায়ী লাইভ ডাটা অটো-ফিল ও A4 প্রিন্ট
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">স্বয়ংক্রিয় সামারি</span>
            <button
              type="button"
              onClick={() => onNavigate('reports', 'daily-ops-report')}
              className="text-purple-700 hover:text-purple-900 font-bold hover:underline whitespace-nowrap cursor-pointer inline-flex items-center gap-1"
            >
              <span>আজকের রিপোর্ট দিন</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </section>

      {/* Main Two-Column Operational Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left 7 Columns: KPI-Prioritized Pending Action Queue */}
        <section className="xl:col-span-7 royal-glass-card rounded-2xl p-6 sm:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/90">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600 ring-4 ring-blue-600/20" />
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  চলমান পেন্ডিং কাজের তালিকা (KPI Priority ক্রমানুসারে)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                বেশি KPI Weight-এর কাজগুলো (Weight 15 ও 10) সবার উপরে সাজানো থাকে যাতে পয়েন্ট দ্রুত বাড়ে।
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Segmented Filter Control */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setTaskFilter('active')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    taskFilter === 'active'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  পেন্ডিং ({activeTaskCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('done')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    taskFilter === 'done'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  সম্পন্ন ({db.tasks.filter((t) => t.status === 'Done').length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowAddTask((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 rounded-xl shadow-sm transition-all whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
              >
                <Plus className="h-4 w-4 text-amber-300" />
                <span>নতুন পেন্ডিং কাজ</span>
              </button>
            </div>
          </div>

          {/* Add Task Modal / Inline Drawer */}
          {showAddTask && (
            <form onSubmit={handleTaskSubmit} className="p-5 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 border border-indigo-200/80 rounded-2xl space-y-4 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  + নতুন অপারেশনাল পেন্ডিং কাজ যুক্ত করুন
                </span>
                <span className="text-xs text-slate-500">স্বয়ংক্রিয় KPI ওয়েট অ্যাসাইনমেন্ট</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    কাজের শিরোনাম / বিষয়ের সারসংক্ষেপ *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="যেমন: NTTN লিংক ডাউনগ্রেড ওয়ার্ক অর্ডার ও MD অনুমোদন..."
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    সংশ্লিষ্ট JD নম্বর (স্বয়ংক্রিয় KPI Weight নির্ধারণ)
                  </label>
                  <select
                    value={newJdNo}
                    onChange={(e) => setNewJdNo(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs cursor-pointer font-medium"
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
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ধরন (Cadence)</label>
                    <select
                      value={newCadence}
                      onChange={(e) => setNewCadence(e.target.value as MonitoringCadence)}
                      className="w-full px-2.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs cursor-pointer font-medium"
                    >
                      <option value="daily">Daily (দৈনিক)</option>
                      <option value="monthly">Monthly (মাসিক)</option>
                      <option value="yearly">Yearly (বাৎসরিক)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">টার্গেট ডেডলাইন</label>
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full px-2.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    সমন্বয়কারী বিভাগ / ব্যক্তি
                  </label>
                  <input
                    type="text"
                    value={newCoord}
                    onChange={(e) => setNewCoord(e.target.value)}
                    placeholder="NOC / Transmission / Branch Manager / Admin"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ফলোআপ নোট / মন্তব্য</label>
                  <input
                    type="text"
                    value={newDetails}
                    onChange={(e) => setNewDetails(e.target.value)}
                    placeholder="কী কাজ করতে হবে বা কী আটকে আছে..."
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTask(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-black transition-all shadow-sm cursor-pointer"
                >
                  তালিকায় যোগ করুন
                </button>
              </div>
            </form>
          )}

          {/* Sorted Task Items List */}
          <div className="space-y-3 pt-1">
            {sortedTasks.length === 0 ? (
              <div className="py-14 text-center space-y-2 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-800">
                  {taskFilter === 'active' ? 'কোনো পেন্ডিং কাজ বাকি নেই! সব সম্পন্ন।' : 'তালিকায় কোনো কাজ নেই।'}
                </p>
                <p className="text-xs text-slate-500">
                  নতুন ফলোআপ যোগ করতে উপরের &ldquo;+ নতুন পেন্ডিং কাজ&rdquo; বাটনে ক্লিক করুন।
                </p>
              </div>
            ) : (
              sortedTasks.map((task) => {
                const isP1 = task.kpiWeight >= 15;
                const isP2 = task.kpiWeight >= 10 && task.kpiWeight < 15;
                const isDone = task.status === 'Done';

                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isDone
                        ? 'bg-slate-50/70 border-slate-200 opacity-70'
                        : isP1
                        ? 'bg-rose-50/30 border-rose-200/90 hover:border-rose-300 shadow-2xs'
                        : isP2
                        ? 'bg-amber-50/30 border-amber-200/90 hover:border-amber-300 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
                          {isP1 ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-extrabold shadow-2xs">
                              P1 · Weight {task.kpiWeight} (Critical)
                            </span>
                          ) : isP2 ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-bold shadow-2xs">
                              P2 · Weight {task.kpiWeight} (High)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold">
                              Weight {task.kpiWeight}
                            </span>
                          )}

                          <span className="text-slate-400">·</span>
                          <span className="font-semibold text-slate-700">JD #{task.jdNo}</span>
                          <span className="text-slate-400">·</span>
                          <span className="font-sans text-slate-600">{task.assignedCoord}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-600">Due: {task.dueDate}</span>
                        </div>

                        <h3
                          className={`text-sm sm:text-base font-bold ${
                            isDone ? 'line-through text-slate-400' : 'text-slate-950'
                          }`}
                        >
                          {task.title}
                        </h3>

                        {task.details && (
                          <p className="text-xs text-slate-600 leading-relaxed font-normal">
                            {task.details}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                        <select
                          aria-label="Task Status"
                          value={task.status}
                          onChange={(e) =>
                            onUpdateTaskStatus(task.id, e.target.value as ActionTask['status'])
                          }
                          className={`px-3 py-1.5 text-xs font-bold border rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors shadow-2xs ${
                            task.status === 'Done'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : task.status === 'In Progress'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-amber-100 text-amber-950 border-amber-300'
                          }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Done">Done</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => onDeleteTask(task.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right 5 Columns: Daily · Monthly · Yearly Monitoring Guide & Checklist */}
        <section className="xl:col-span-5 royal-glass-card rounded-2xl p-6 sm:p-7 space-y-5">
          <div className="space-y-3 pb-4 border-b border-slate-200/90">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 ring-4 ring-emerald-600/20" />
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Daily · Monthly · Yearly রুটিন গাইড
                </h2>
              </div>
              {activeCadence === 'daily' && (
                <button
                  type="button"
                  onClick={onResetDailyChecks}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  title="নতুন দিনের জন্য চেকলিস্ট রিসেট"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>রিসেট</span>
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500">
              আপনার ৫৪টি JD দায়িত্বকে ৩টি ধাপে ভাগ করা হয়েছে। প্রতিদিনের রুটিন সম্পন্ন করে টিক দিন।
            </p>

            {/* Cadence Switcher Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setActiveCadence('daily')}
                className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeCadence === 'daily'
                    ? 'bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                দৈনিক (Daily · {db.jdItems.filter((i) => i.cadence === 'daily').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCadence('monthly')}
                className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeCadence === 'monthly'
                    ? 'bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                মাসিক (Monthly · {db.jdItems.filter((i) => i.cadence === 'monthly').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveCadence('yearly')}
                className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeCadence === 'yearly'
                    ? 'bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                বাৎসরিক (Yearly · {db.jdItems.filter((i) => i.cadence === 'yearly').length})
              </button>
            </div>
          </div>

          {/* Contextual Executive Advice Box with Royal Gloss */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 border border-blue-200/80 text-xs text-slate-800 leading-relaxed shadow-2xs">
            {activeCadence === 'daily' && (
              <div className="flex items-start gap-2.5">
                <Compass className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-blue-950 font-bold">দৈনিক COO মনিটরিং পরামর্শ:</strong> প্রতিদিন সকালে IIG/NTTN কোর লিংক, ব্যান্ডউইথ কনজেশন, ভেন্ডর ইমেইল CC (dipu@speednetkhulna), শিফট হ্যান্ডওভার ও কল রিপোর্ট যাচাই করে টিক দিন এবং দিনশেষে Daily Ops Report সাবমিট করুন।
                </div>
              </div>
            )}
            {activeCadence === 'monthly' && (
              <div className="flex items-start gap-2.5">
                <Compass className="h-4 w-4 text-indigo-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-indigo-950 font-bold">মাসিক COO মনিটরিং পরামর্শ:</strong> প্রতি মাসের ১–৫ তারিখের মধ্যে Upstream/NTTN Capacity Report (MD), BTRC Non-Billing Report (MD), SSL SMS Report (CFO) প্রস্তুত করুন এবং রিসেলার মার্জিন ও পার্টনার সেটেলমেন্ট যাচাই করুন।
                </div>
              </div>
            )}
            {activeCadence === 'yearly' && (
              <div className="flex items-start gap-2.5">
                <Compass className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-950 font-bold">বাৎসরিক COO মনিটরিং পরামর্শ:</strong> BTRC, Trade, Fire ও Labour লাইসেন্স, অফিস ও POP ভাড়ার চুক্তি, এবং ডোমেইন মেয়াদের কমপক্ষে ৩০ দিন পূর্বে নবায়নের চিঠি ও বাজেট অনুমোদন সম্পন্ন করুন।
                </div>
              </div>
            )}
          </div>

          {/* Interactive JD Check List */}
          <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
            {cadenceJdItems.map((jd) => {
              const weight = kpiWeightMap.get(jd.kpiGroupId) || 5;
              const isChecked = activeCadence === 'daily' && jd.dailyCheckedToday;

              return (
                <div
                  key={jd.id}
                  className={`pt-3 first:pt-0 flex items-start gap-3 transition-colors ${
                    isChecked ? 'opacity-60' : ''
                  }`}
                >
                  {activeCadence === 'daily' ? (
                    <button
                      type="button"
                      onClick={() => onToggleDailyJd(jd)}
                      className={`mt-0.5 h-5 w-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                        jd.dailyCheckedToday
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                          : 'bg-white border-slate-300 text-transparent hover:border-blue-600'
                      }`}
                      title="আজকের চেক সম্পন্ন মার্ক করুন"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <span className="mt-0.5 font-mono text-xs font-bold text-slate-400 tabular-nums shrink-0">
                      #{jd.jdNo}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-xs font-mono tabular-nums">
                      <span className="text-slate-500 font-semibold">
                        JD #{jd.jdNo} · Weight {weight}
                      </span>
                      <span
                        className={
                          jd.status === 'Done'
                            ? 'text-emerald-700 font-bold font-sans'
                            : jd.status === 'Pending'
                            ? 'text-amber-700 font-bold font-sans'
                            : 'text-red-700 font-bold font-sans'
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
                      className={`text-sm font-bold mt-0.5 leading-snug ${
                        isChecked ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {jd.titleEn}
                    </div>

                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                      {jd.descriptionBn}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Action Footer */}
          <div className="pt-4 border-t border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onNavigate('jd-kpi')}
              className="text-xs font-bold text-slate-700 hover:text-slate-950 cursor-pointer inline-flex items-center gap-1"
            >
              <span>সম্পূর্ণ ৫৪টি JD স্ট্যাটাস পরিচালনা →</span>
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
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              <FilePlus2 className="h-3.5 w-3.5 text-amber-300" />
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
