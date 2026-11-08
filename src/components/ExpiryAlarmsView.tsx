import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  Plus,
  RefreshCw,
  Trash2,
  Volume2,
} from 'lucide-react';
import type { AppDatabase, AppSettings, RenewalCategory, RenewalItem } from '../types.ts';
import type { EvaluatedRenewal } from '../utils/kpiAndAlarms.ts';

interface ExpiryAlarmsViewProps {
  db: AppDatabase;
  evaluatedRenewals: EvaluatedRenewal[];
  onAddRenewal: (item: Partial<RenewalItem>) => Promise<void>;
  onUpdateRenewal: (id: string, patch: Partial<RenewalItem>) => Promise<void>;
  onDeleteRenewal: (id: string) => Promise<void>;
  onUpdateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  onTestAlarm: () => void;
  onNotifyToast: (msg: string) => void;
}

const CATEGORIES: RenewalCategory[] = [
  'Regulatory License',
  'Fire Safety',
  'Property Rental',
  'Partner & Vendor Contract',
  'Equipment Warranty',
  'Domain & Digital',
];

export const ExpiryAlarmsView: React.FC<ExpiryAlarmsViewProps> = ({
  db,
  evaluatedRenewals,
  onAddRenewal,
  onUpdateRenewal,
  onDeleteRenewal,
  onUpdateSettings,
  onTestAlarm,
  onNotifyToast,
}) => {
  const [stateFilter, setStateFilter] = useState<'all' | 'urgent' | 'upcoming'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | RenewalCategory>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RenewalCategory>('Regulatory License');
  const [jdNo, setJdNo] = useState('12');
  const [referenceOrLocation, setReferenceOrLocation] = useState('');
  const [authorityOrVendor, setAuthorityOrVendor] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [alertDaysBefore, setAlertDaysBefore] = useState(30);
  const [costEstimateBdt, setCostEstimateBdt] = useState('');
  const [notes, setNotes] = useState('');

  const filtered = useMemo(() => {
    return evaluatedRenewals.filter((ev) => {
      if (stateFilter === 'urgent' && ev.state !== 'overdue' && ev.state !== 'alarm-1m') {
        return false;
      }
      if (stateFilter === 'upcoming' && ev.state !== 'upcoming-60d') {
        return false;
      }
      if (categoryFilter !== 'all' && ev.item.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [evaluatedRenewals, stateFilter, categoryFilter]);

  const urgentCount = evaluatedRenewals.filter(
    (e) => e.state === 'overdue' || e.state === 'alarm-1m'
  ).length;

  const handleEnableBrowserNotification = async () => {
    onTestAlarm();
    if (!('Notification' in window)) {
      onNotifyToast('অডিও অ্যালার্ম সচল হয়েছে (এই ব্রাউজার ফ্রেমে ডেক্সটপ নোটিফিকেশন সীমাবদ্ধ)।');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        new Notification('SpeedNet COO Expiry Alarm', {
          body: `${urgentCount}টি লাইসেন্স/চুক্তির মেয়াদ আগামী ৩০ দিনের মধ্যে শেষ হচ্ছে!`,
        });
        onNotifyToast('ব্রাউজার নোটিফিকেশন ও অডিও অ্যালার্ম সফলভাবে চালু হয়েছে।');
      } else {
        onNotifyToast('অডিও অ্যালার্ম টেস্ট সম্পন্ন হয়েছে।');
      }
    } catch {
      onNotifyToast('ইন-অ্যাপ ও অডিও অ্যালার্ম সক্রিয় রয়েছে।');
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !expiryDate) return;
    await onAddRenewal({
      title: title.trim(),
      category,
      jdNo,
      referenceOrLocation: referenceOrLocation.trim() || 'SpeedNet Khulna',
      authorityOrVendor: authorityOrVendor.trim() || 'Relevant Authority',
      issueOrStartDate: new Date().toISOString().slice(0, 10),
      expiryDate,
      alertDaysBefore: Number(alertDaysBefore) || 30,
      costEstimateBdt: costEstimateBdt.trim(),
      renewalStatus: 'Active',
      notes: notes.trim(),
    });
    setTitle('');
    setReferenceOrLocation('');
    setAuthorityOrVendor('');
    setExpiryDate('');
    setCostEstimateBdt('');
    setNotes('');
    setShowAddForm(false);
    onNotifyToast('নতুন মেয়াদ ও ১ মাসের আগাম অ্যালার্ম যুক্ত হয়েছে।');
  };

  const handleExtendOneYear = async (item: RenewalItem) => {
    const base = new Date(`${item.expiryDate}T12:00:00`);
    const now = new Date();
    const effectiveStart = base > now ? base : now;
    effectiveStart.setFullYear(effectiveStart.getFullYear() + 1);
    const nextExpiry = effectiveStart.toISOString().slice(0, 10);

    await onUpdateRenewal(item.id, {
      expiryDate: nextExpiry,
      renewalStatus: 'Active',
      lastRenewedAt: new Date().toISOString().slice(0, 10),
      notes: `নবায়ন সম্পন্ন (${new Date().toISOString().slice(0, 10)}) — নতুন মেয়াদ: ${nextExpiry}`,
    });
    onNotifyToast(`${item.title} নবায়নকৃত হিসেবে পরবর্তী ১ বছরের জন্য আপডেট হয়েছে।`);
  };

  return (
    <div className="space-y-6">
      {/* Top Alarm Control Panel */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">
              ১ মাস আগের আগাম মেয়াদ অ্যালার্ম ও নবায়ন রেজিস্টার
            </h2>
            <p className="text-xs text-slate-600">
              BTRC/Trade/Fire লাইসেন্স (JD 12–13), অফিস ও POP ভাড়ার চুক্তি (JD 27), ফায়ার এক্সটিংগুইশার রিফিল (JD 19), ওয়ারেন্টি (JD 16) এবং ডোমেইন/হোস্টিং (JD 50) মেয়াদ শেষ হওয়ার <strong>৩০ দিন আগে থেকেই</strong> স্বয়ংক্রিয়ভাবে অ্যালার্ম দিবে।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={db.settings.soundAlarmEnabled}
                onChange={(e) => onUpdateSettings({ soundAlarmEnabled: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              <Volume2 className="h-3.5 w-3.5 text-slate-600" />
              <span>অডিও অ্যালার্ম সচল</span>
            </label>

            <button
              type="button"
              onClick={handleEnableBrowserNotification}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Bell className="h-3.5 w-3.5 text-amber-600" />
              <span>নোটিফিকেশন ও অ্যালার্ম টেস্ট</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>নতুন লাইসেন্স / চুক্তি যুক্ত করুন</span>
            </button>
          </div>
        </div>

        {/* Add New Expiry Item Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddSubmit}
            className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  লাইসেন্স / চুক্তি / ডিভাইসের নাম *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="যেমন: Boyra POP-05 Rental Agreement বা Fire License..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">ক্যাটাগরি</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as RenewalCategory)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  মেয়াদ শেষ হওয়ার তারিখ (Expiry Date) *
                </label>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  কত দিন আগে থেকে অ্যালার্ম দিবে? (ডিফল্ট ৩০ দিন)
                </label>
                <input
                  type="number"
                  min={7}
                  max={120}
                  value={alertDaysBefore}
                  onChange={(e) => setAlertDaysBefore(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  সংশ্লিষ্ট JD নম্বর
                </label>
                <select
                  value={jdNo}
                  onChange={(e) => setJdNo(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="12">JD #12 — BTRC, Fire, Trade, Labour License</option>
                  <option value="16">JD #16 — Office Product Warranty Register</option>
                  <option value="19">JD #19 — Fire Extinguisher Refill/Servicing</option>
                  <option value="26">JD #26 — Partner/Vendor Contract Renewal</option>
                  <option value="27">JD #27 — Property Rental Agreement (HQ/Branch/POP)</option>
                  <option value="28">JD #28 — Maxim Billing Software Agreement</option>
                  <option value="50">JD #50 — Website Domain & Hosting Renewal</option>
                  <option value="52">JD #52 — Social Media Subscription</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  লোকেশন / রেফারেন্স / সিরিয়াল
                </label>
                <input
                  type="text"
                  value={referenceOrLocation}
                  onChange={(e) => setReferenceOrLocation(e.target.value)}
                  placeholder="Head Office / POP-02 / Serial #..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  কর্তৃপক্ষ / ভেন্ডর / বাড়িওয়ালা
                </label>
                <input
                  type="text"
                  value={authorityOrVendor}
                  onChange={(e) => setAuthorityOrVendor(e.target.value)}
                  placeholder="BTRC / KCC / Landlord Name..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  আনুমানিক ফি / ভাড়া (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={costEstimateBdt}
                  onChange={(e) => setCostEstimateBdt(e.target.value)}
                  placeholder="12,000 BDT"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  নথি ও ফলোআপ নোট
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="নবায়নের জন্য প্রয়োজনীয় কাগজপত্র বা নির্দেশনা..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                রেজিস্টারে সংরক্ষণ করুন
              </button>
            </div>
          </form>
        )}

        {/* Filter Bar */}
        <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            <button
              type="button"
              onClick={() => setStateFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                stateFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              সকল আইটেম ({evaluatedRenewals.length})
            </button>
            <button
              type="button"
              onClick={() => setStateFilter('urgent')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                stateFilter === 'urgent'
                  ? 'bg-white text-red-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ১ মাসের অ্যালার্ম / মেয়াদোত্তীর্ণ ({urgentCount})
            </button>
            <button
              type="button"
              onClick={() => setStateFilter('upcoming')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                stateFilter === 'upcoming'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              আসন্ন ৩১–৬০ দিন
            </button>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'all' | RenewalCategory)}
            className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">সকল ক্যাটাগরি</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Renewal Register Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                <th className="py-3 px-4 font-semibold">আইটেম ও লোকেশন</th>
                <th className="py-3 px-4 font-semibold">ক্যাটাগরি · JD</th>
                <th className="py-3 px-4 font-semibold">মেয়াদ ও অ্যালার্ম স্ট্যাটাস</th>
                <th className="py-3 px-4 font-semibold">প্রক্রিয়া স্ট্যাটাস</th>
                <th className="py-3 px-4 font-semibold text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map(({ item, daysRemaining, state, stateLabelBn }) => (
                <tr
                  key={item.id}
                  className={
                    state === 'overdue'
                      ? 'bg-red-50/40'
                      : state === 'alarm-1m'
                      ? 'bg-amber-50/40'
                      : 'hover:bg-slate-50'
                  }
                >
                  <td className="py-3.5 px-4 align-top">
                    <div className="font-semibold text-slate-900">{item.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {item.referenceOrLocation} · {item.authorityOrVendor}
                      {item.costEstimateBdt ? ` · ${item.costEstimateBdt}` : ''}
                    </div>
                    {item.notes && (
                      <div className="text-xs text-slate-600 mt-1">{item.notes}</div>
                    )}
                  </td>

                  <td className="py-3.5 px-4 align-top text-xs text-slate-600 whitespace-nowrap">
                    <div>{item.category}</div>
                    <div className="font-mono text-slate-400 mt-0.5 tabular-nums">
                      JD #{item.jdNo} · Lead {item.alertDaysBefore}d
                    </div>
                  </td>

                  <td className="py-3.5 px-4 align-top whitespace-nowrap">
                    <div className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                      Expiry: {item.expiryDate}
                    </div>
                    <div className="mt-1 text-xs flex items-center gap-1.5">
                      {state === 'overdue' && (
                        <>
                          <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                          <span className="font-semibold text-red-700">{stateLabelBn}</span>
                        </>
                      )}
                      {state === 'alarm-1m' && (
                        <>
                          <CalendarClock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span className="font-semibold text-amber-800">{stateLabelBn}</span>
                        </>
                      )}
                      {state === 'upcoming-60d' && (
                        <span className="text-blue-700 font-medium">{stateLabelBn}</span>
                      )}
                      {state === 'safe' && (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="text-emerald-700 font-mono tabular-nums">
                            {daysRemaining} দিন বাকি
                          </span>
                        </>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 align-top whitespace-nowrap">
                    <select
                      aria-label="Renewal Progress"
                      value={item.renewalStatus}
                      onChange={(e) =>
                        onUpdateRenewal(item.id, {
                          renewalStatus: e.target.value as RenewalItem['renewalStatus'],
                        })
                      }
                      className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Renewal Initiated">Renewal Initiated</option>
                      <option value="Submitted to Authority">Submitted to Authority</option>
                    </select>
                  </td>

                  <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleExtendOneYear(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
                        title="নবায়ন সম্পন্ন হলে ১ বছর মেয়াদ বাড়ান"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>+১ বছর নবায়ন</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteRenewal(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
