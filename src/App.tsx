import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CheckSquare,
  ClipboardCheck,
  FileSpreadsheet,
  LayoutDashboard,
  Menu,
  Server,
  X,
} from 'lucide-react';
import type {
  ActionTask,
  AppDatabase,
  AppSettings,
  ChecklistItem,
  JdItem,
  RenewalItem,
  ServerInfo,
  SubmittedReport,
} from './types.ts';
import { createInitialDb } from './data/seedData.ts';
import {
  calculateKpiSummary,
  evaluateRenewals,
  playExecutiveAlarmChime,
} from './utils/kpiAndAlarms.ts';
import { OverviewView } from './components/OverviewView.tsx';
import { ChecklistView } from './components/ChecklistView.tsx';
import { JdKpiView } from './components/JdKpiView.tsx';
import { ExpiryAlarmsView } from './components/ExpiryAlarmsView.tsx';
import { ReportsCenterView } from './components/ReportsCenterView.tsx';
import { ServerGuideModal } from './components/ServerGuideModal.tsx';

type NavTab = 'overview' | 'checklists' | 'jd-kpi' | 'alarms' | 'reports';

export default function App() {
  const [db, setDb] = useState<AppDatabase | null>(null);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [reportTemplateId, setReportTemplateId] = useState<string | undefined>(undefined);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [serverModalOpen, setServerModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [stateRes, infoRes] = await Promise.all([
        fetch('/api/state'),
        fetch('/api/server-info'),
      ]);
      if (stateRes.ok) {
        const data = (await stateRes.json()) as AppDatabase;
        setDb(data);
      } else {
        setDb(createInitialDb());
      }
      if (infoRes.ok) {
        const info = (await infoRes.json()) as ServerInfo;
        setServerInfo(info);
      }
    } catch {
      setDb(createInitialDb());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const effectiveDb = useMemo(() => db || createInitialDb(), [db]);

  const kpiSummary = useMemo(
    () => calculateKpiSummary(effectiveDb.kpiGroups, effectiveDb.jdItems),
    [effectiveDb.kpiGroups, effectiveDb.jdItems]
  );

  const evaluatedRenewals = useMemo(
    () =>
      evaluateRenewals(
        effectiveDb.renewals,
        effectiveDb.settings.defaultAlertLeadDays || 30
      ),
    [effectiveDb.renewals, effectiveDb.settings.defaultAlertLeadDays]
  );

  const urgentAlarmCount = useMemo(
    () =>
      evaluatedRenewals.filter((r) => r.state === 'overdue' || r.state === 'alarm-1m')
        .length,
    [evaluatedRenewals]
  );

  const apiMutate = async (url: string, method: string, body?: unknown) => {
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.ok) {
        const updated = (await res.json()) as AppDatabase;
        setDb(updated);
      }
    } catch {
      showToast('সার্ভার সংযোগ বিচ্ছিন্ন, অনুগ্রহ করে পেজটি রিফ্রেশ করুন।');
    }
  };

  const handleNavigate = (tab: NavTab, tplId?: string) => {
    setActiveTab(tab);
    if (tplId) setReportTemplateId(tplId);
    setMobileMenuOpen(false);
  };

  const handleToggleDailyJd = async (jd: JdItem) => {
    await apiMutate(`/api/jd/${jd.id}`, 'PATCH', {
      dailyCheckedToday: !jd.dailyCheckedToday,
    });
  };

  const handleResetDailyChecks = async () => {
    await apiMutate('/api/jd/reset-daily-checks', 'POST');
    showToast('নতুন দিনের জন্য দৈনিক চেকলিস্ট রিসেট করা হয়েছে।');
  };

  const handleUpdateJd = async (id: string, patch: Partial<JdItem>) => {
    await apiMutate(`/api/jd/${id}`, 'PATCH', patch);
    if (patch.status) {
      showToast(`JD #${id} স্ট্যাটাস "${patch.status}" হিসেবে সেভ হয়েছে।`);
    } else {
      showToast(`JD #${id} নোট আপডেট হয়েছে।`);
    }
  };

  const handleUpdateSettings = async (patch: Partial<AppSettings>) => {
    await apiMutate('/api/settings', 'PUT', patch);
  };

  const handleCreateTask = async (task: Partial<ActionTask>) => {
    await apiMutate('/api/tasks', 'POST', task);
    showToast('নতুন পেন্ডিং কাজ KPI অগ্রাধিকার অনুযায়ী যুক্ত হয়েছে।');
  };

  const handleUpdateTaskStatus = async (id: string, status: ActionTask['status']) => {
    await apiMutate(`/api/tasks/${id}`, 'PATCH', { status });
    showToast(`কাজের স্ট্যাটাস "${status}" হিসেবে আপডেট হয়েছে।`);
  };

  const handleDeleteTask = async (id: string) => {
    await apiMutate(`/api/tasks/${id}`, 'DELETE');
    showToast('কাজটি তালিকা থেকে মুছে ফেলা হয়েছে।');
  };

  const handleAddRenewal = async (item: Partial<RenewalItem>) => {
    await apiMutate('/api/renewals', 'POST', item);
  };

  const handleUpdateRenewal = async (id: string, patch: Partial<RenewalItem>) => {
    await apiMutate(`/api/renewals/${id}`, 'PATCH', patch);
  };

  const handleDeleteRenewal = async (id: string) => {
    await apiMutate(`/api/renewals/${id}`, 'DELETE');
    showToast('মেয়াদ আইটেমটি মুছে ফেলা হয়েছে।');
  };

  const handleSubmitReport = async (report: Partial<SubmittedReport>) => {
    await apiMutate('/api/reports', 'POST', report);
  };

  const handleDeleteReport = async (id: string) => {
    await apiMutate(`/api/reports/${id}`, 'DELETE');
    showToast('সংরক্ষিত রিপোর্ট মুছে ফেলা হয়েছে।');
  };

  const handleImportBackup = async (incoming: AppDatabase) => {
    await apiMutate('/api/backup/import', 'POST', incoming);
  };

  const handleAddChecklistItem = async (item: Partial<ChecklistItem>) => {
    await apiMutate('/api/checklist', 'POST', item);
    showToast('নতুন রেসপনসিবিলিটি চেকলিস্টে যুক্ত হয়েছে।');
  };

  const handleUpdateChecklistItem = async (id: string, patch: Partial<ChecklistItem>) => {
    await apiMutate(`/api/checklist/${id}`, 'PATCH', patch);
  };

  const handleDeleteChecklistItem = async (id: string) => {
    await apiMutate(`/api/checklist/${id}`, 'DELETE');
    showToast('চেকলিস্ট আইটেমটি মুছে ফেলা হয়েছে।');
  };

  const handleResetChecklist = async (cadence: 'daily' | 'monthly') => {
    await apiMutate('/api/checklist/reset', 'POST', { cadence });
    showToast(
      cadence === 'daily'
        ? 'নতুন দিনের জন্য ডেইলি চেকলিস্ট পেন্ডিং রিসেট করা হয়েছে।'
        : 'নতুন মাসের জন্য মাসিক চেকলিস্ট পেন্ডিং রিসেট করা হয়েছে।'
    );
  };

  const pendingChecklistCount = useMemo(() => {
    return (effectiveDb.checklists || []).filter((c) => c.status === 'Pending').length;
  }, [effectiveDb.checklists]);

  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    {
      id: 'overview',
      label: 'দৈনিক মনিটরিং ও কাজ',
      icon: LayoutDashboard,
    },
    {
      id: 'checklists',
      label: 'Daily / Monthly চেকলিস্ট',
      icon: CheckSquare,
      count: pendingChecklistCount,
    },
    {
      id: 'jd-kpi',
      label: '৫৪টি JD ও KPI স্কোর',
      icon: ClipboardCheck,
    },
    {
      id: 'alarms',
      label: '১ মাস আগাম অ্যালার্ম',
      icon: BellRing,
      count: urgentAlarmCount,
    },
    {
      id: 'reports',
      label: 'রিপোর্ট ফরম্যাট ও সাবমিশন',
      icon: FileSpreadsheet,
    },
  ];

  const activeBreadcrumb = navItems.find((n) => n.id === activeTab)?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/30 text-slate-900 flex flex-col lg:flex-row">
      {/* Desktop Sidebar (264px width) with Royal Glossy Gradient */}
      <aside className="hidden lg:flex lg:w-[264px] lg:flex-col lg:fixed lg:inset-y-0 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-slate-100 border-r border-indigo-900/40 z-30 no-print shadow-xl">
        <div className="h-16 px-6 flex items-center justify-between border-b border-indigo-900/50 bg-black/20 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => handleNavigate('overview')}
            className="flex items-center gap-2 text-base font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400 ring-4 ring-amber-400/20" />
            <span className="bg-gradient-to-r from-white via-slate-100 to-amber-200 bg-clip-text text-transparent">
              SPEED NET · COO Hub
            </span>
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-md shadow-blue-900/30 ring-1 ring-white/20'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="inline-flex items-center gap-2.5 whitespace-nowrap">
                  <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-amber-300' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </span>
                {typeof item.count === 'number' && item.count > 0 && (
                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full tabular-nums ${
                      active ? 'bg-amber-400 text-slate-950' : 'bg-red-600/90 text-white'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-indigo-900/50 bg-black/25 backdrop-blur-sm space-y-3">
          <button
            type="button"
            onClick={() => setServerModalOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-200 bg-white/10 border border-white/15 rounded-xl hover:bg-white/15 transition-all cursor-pointer shadow-xs"
          >
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <Server className="h-3.5 w-3.5 text-blue-400" />
              <span>Local IP / Server Access</span>
            </span>
            <span className="font-mono text-amber-300 tabular-nums">:3000</span>
          </button>

          <div className="px-1 text-xs">
            <div className="font-bold text-white truncate">
              {effectiveDb.settings.employeeName}
            </div>
            <div className="text-slate-300 truncate">{effectiveDb.settings.designation}</div>
            <div className="text-amber-300/80 font-mono text-[11px] truncate mt-0.5">
              CC: {effectiveDb.settings.branchOfficialCcEmail}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col z-50 p-4 justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <span className="font-bold text-slate-900">SPEED NET · COO Hub</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="mt-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg ${
                        active
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </span>
                      {typeof item.count === 'number' && item.count > 0 && (
                        <span className="font-mono text-xs font-bold text-red-600 tabular-nums">
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setServerModalOpen(true);
              }}
              className="w-full py-2.5 px-3 text-xs font-medium bg-slate-100 text-slate-800 rounded-lg flex items-center justify-center gap-2"
            >
              <Server className="h-4 w-4 text-blue-600" />
              <span>Local IP ও ডাটা ব্যাকআপ</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-[264px] flex flex-col min-w-0">
        {/* Clean 3-Zone Top Bar Contract with Royal Glossy Appearance */}
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-8 flex items-center justify-between gap-8 sticky top-0 z-20 no-print shadow-xs">
          {/* Zone 1: Mobile Menu Trigger + Contextual Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-sm text-slate-500 truncate">
              <span className="hidden sm:inline font-medium text-slate-400">SpeedNet Operations / </span>
              <strong className="font-bold text-slate-900">{activeBreadcrumb}</strong>
            </div>
          </div>

          {/* Zone 2: Quick Horizontal Links on Desktop */}
          <nav className="hidden xl:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => handleNavigate('checklists')}
              className="hover:text-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Daily/Monthly চেকলিস্ট: <span className="font-mono font-bold text-amber-600 tabular-nums">{pendingChecklistCount} পেন্ডিং</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('jd-kpi')}
              className="hover:text-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              KPI Score: <span className="font-mono font-bold text-slate-900 tabular-nums">{kpiSummary.totalScore.toFixed(1)}/100</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('alarms')}
              className="hover:text-red-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              ১ মাসের অ্যালার্ম: <span className="font-mono font-bold text-red-600 tabular-nums">{urgentAlarmCount}</span>
            </button>
            <button
              type="button"
              onClick={() => setServerModalOpen(true)}
              className="hover:text-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              LAN Server IP
            </button>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => handleNavigate('reports', 'daily-ops-report')}
              className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 rounded-xl shadow-sm transition-all whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
            >
              রিপোর্ট প্রস্তুত করুন
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1440px] w-full mx-auto">
          {loading ? (
            <div className="space-y-4">
              <div className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
                <div className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
                <div className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
                <div className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
              </div>
              <div className="h-96 bg-white border border-slate-200 rounded-xl animate-pulse" />
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewView
                  db={effectiveDb}
                  kpiSummary={kpiSummary}
                  evaluatedRenewals={evaluatedRenewals}
                  onNavigate={handleNavigate}
                  onToggleDailyJd={handleToggleDailyJd}
                  onResetDailyChecks={handleResetDailyChecks}
                  onCreateTask={handleCreateTask}
                  onUpdateTaskStatus={handleUpdateTaskStatus}
                  onDeleteTask={handleDeleteTask}
                  onPlayAlarm={() => {
                    playExecutiveAlarmChime();
                    showToast(
                      `সতর্কতা: ${urgentAlarmCount}টি লাইসেন্স/চুক্তির মেয়াদ আগামী ৩০ দিনের মধ্যে শেষ হচ্ছে!`
                    );
                  }}
                />
              )}

              {activeTab === 'checklists' && (
                <ChecklistView
                  db={effectiveDb}
                  onAddChecklistItem={handleAddChecklistItem}
                  onUpdateChecklistItem={handleUpdateChecklistItem}
                  onDeleteChecklistItem={handleDeleteChecklistItem}
                  onResetChecklist={handleResetChecklist}
                  onNavigateToReports={(tplId) => handleNavigate('reports', tplId)}
                  onNotifyToast={showToast}
                />
              )}

              {activeTab === 'jd-kpi' && (
                <JdKpiView
                  db={effectiveDb}
                  kpiSummary={kpiSummary}
                  onUpdateJd={handleUpdateJd}
                  onUpdateSettings={handleUpdateSettings}
                />
              )}

              {activeTab === 'alarms' && (
                <ExpiryAlarmsView
                  db={effectiveDb}
                  evaluatedRenewals={evaluatedRenewals}
                  onAddRenewal={handleAddRenewal}
                  onUpdateRenewal={handleUpdateRenewal}
                  onDeleteRenewal={handleDeleteRenewal}
                  onUpdateSettings={handleUpdateSettings}
                  onTestAlarm={playExecutiveAlarmChime}
                  onNotifyToast={showToast}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsCenterView
                  db={effectiveDb}
                  kpiSummary={kpiSummary}
                  evaluatedRenewals={evaluatedRenewals}
                  initialTemplateId={reportTemplateId}
                  onSubmitReport={handleSubmitReport}
                  onDeleteReport={handleDeleteReport}
                  onNotifyToast={showToast}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Local Server & LAN IP Modal */}
      <ServerGuideModal
        open={serverModalOpen}
        onClose={() => setServerModalOpen(false)}
        serverInfo={serverInfo}
        db={effectiveDb}
        onImportBackup={handleImportBackup}
        onNotifyToast={showToast}
      />

      {/* Clean In-App Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-lg shadow-lg max-w-sm no-print">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
