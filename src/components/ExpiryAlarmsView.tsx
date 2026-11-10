import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  MapPin,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Volume2,
  X,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Add form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RenewalCategory>('Regulatory License');
  const [jdNo, setJdNo] = useState('12');
  const [referenceOrLocation, setReferenceOrLocation] = useState('');
  const [authorityOrVendor, setAuthorityOrVendor] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [alertDaysBefore, setAlertDaysBefore] = useState(30);
  const [costEstimateBdt, setCostEstimateBdt] = useState('');
  const [notes, setNotes] = useState('');

  // Edit / Correction Modal state
  const [editingItem, setEditingItem] = useState<RenewalItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<RenewalCategory>('Regulatory License');
  const [editJdNo, setEditJdNo] = useState('12');
  const [editLocation, setEditLocation] = useState('');
  const [editAuthority, setEditAuthority] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editAlertDaysBefore, setEditAlertDaysBefore] = useState(30);
  const [editCost, setEditCost] = useState('');
  const [editStatus, setEditStatus] = useState<RenewalItem['renewalStatus']>('Active');
  const [editNotes, setEditNotes] = useState('');

  // Date manipulation helpers for adding/subtracting days or months
  const adjustDateDays = (currentDateStr: string, days: number): string => {
    const base = currentDateStr ? new Date(`${currentDateStr}T12:00:00`) : new Date();
    base.setDate(base.getDate() + days);
    return base.toISOString().slice(0, 10);
  };

  const adjustDateMonths = (currentDateStr: string, months: number): string => {
    const base = currentDateStr ? new Date(`${currentDateStr}T12:00:00`) : new Date();
    base.setMonth(base.getMonth() + months);
    return base.toISOString().slice(0, 10);
  };

  const openEditModal = (item: RenewalItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditCategory(item.category);
    setEditJdNo(item.jdNo || '12');
    setEditLocation(item.referenceOrLocation || '');
    setEditAuthority(item.authorityOrVendor || '');
    setEditExpiryDate(item.expiryDate || '');
    setEditAlertDaysBefore(item.alertDaysBefore || 30);
    setEditCost(item.costEstimateBdt || '');
    setEditStatus(item.renewalStatus || 'Active');
    setEditNotes(item.notes || '');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editTitle.trim() || !editExpiryDate) return;

    await onUpdateRenewal(editingItem.id, {
      title: editTitle.trim(),
      category: editCategory,
      jdNo: editJdNo,
      referenceOrLocation: editLocation.trim() || 'SpeedNet Khulna',
      authorityOrVendor: editAuthority.trim(),
      expiryDate: editExpiryDate,
      alertDaysBefore: Number(editAlertDaysBefore) || 30,
      costEstimateBdt: editCost.trim(),
      renewalStatus: editStatus,
      notes: editNotes.trim(),
    });

    onNotifyToast(`"${editTitle.trim()}" আইটেম ও লোকেশন সফলভাবে সংশোধন করা হয়েছে।`);
    setEditingItem(null);
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
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
      if (q) {
        const text = `${ev.item.title} ${ev.item.referenceOrLocation} ${ev.item.authorityOrVendor} ${ev.item.notes} ${ev.item.category}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [evaluatedRenewals, stateFilter, categoryFilter, searchQuery]);

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
    onNotifyToast('নতুন আইটেম ও ১ মাসের আগাম অ্যালার্ম সফলভাবে যুক্ত হয়েছে।');
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
      {/* Top Alarm Control Panel with Royal Gloss Styling */}
      <section className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 pb-5 border-b border-slate-200">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-amber-500/10 via-amber-100/50 to-amber-50 border border-amber-300 rounded-full text-xs font-bold text-amber-950">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>SpeedNet ৩০ দিন পূর্বে স্বয়ংক্রিয় আগাম অ্যালার্ম ও লাইসেন্স রেজিস্টার</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              ১ মাস আগাম মেয়াদোত্তীর্ণ অ্যালার্ম, আইটেম ও লোকেশন ম্যানেজমেন্ট
            </h2>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              BTRC লাইসেন্স, POP/অফিস ভাড়ার চুক্তি, ফায়ার এক্সটিংগুইশার ও ওয়্যারেন্টির মেয়াদ শেষ হওয়ার <strong>৩০ দিন আগে থেকেই</strong> এখানে লাল/হলুদ অ্যালার্ম বাজবে। যেকোনো আইটেমের নাম, লোকেশন সংশোধন করতে পারবেন এবং মেয়াদের তারিখ প্রয়োজন অনুযায়ী আগে বা পরে পরিবর্তন করতে পারবেন।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors shadow-2xs">
              <input
                type="checkbox"
                checked={db.settings.soundAlarmEnabled}
                onChange={(e) => onUpdateSettings({ soundAlarmEnabled: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              <Volume2 className="h-4 w-4 text-amber-600" />
              <span>সাউন্ড অ্যালার্ম সচল</span>
            </label>

            <button
              type="button"
              onClick={handleEnableBrowserNotification}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
            >
              <Bell className="h-4 w-4 text-amber-600" />
              <span>অ্যালার্ম সাউন্ড টেস্ট</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 rounded-xl shadow-sm transition-all whitespace-nowrap cursor-pointer active:scale-95"
            >
              <Plus className="h-4 w-4 text-amber-300" />
              <span>+ নতুন লাইসেন্স / চুক্তি যুক্ত করুন</span>
            </button>
          </div>
        </div>

        {/* Add New Expiry Item Form with Freedom of Past or Future Dates */}
        {showAddForm && (
          <form
            onSubmit={handleAddSubmit}
            className="mt-5 p-5 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 border border-indigo-200/90 rounded-2xl space-y-4 shadow-sm animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
              <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                + নতুন লাইসেন্স, চুক্তি বা ডিভাইসের মেয়াদ যুক্ত করুন
              </span>
              <span className="text-xs text-slate-500">মেয়াদের ৩০ দিন আগে থেকে অ্যালার্ম ট্রিগার হবে</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  আইটেমের নাম (লাইসেন্স / চুক্তি / ডিভাইস) *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="যেমন: BTRC ISP License Renewal বা Boyra POP-05 Rental Agreement..."
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ক্যাটাগরি</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as RenewalCategory)}
                  className="w-full px-3 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium cursor-pointer shadow-2xs"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expiry Date with past/future date adjust buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  মেয়াদ শেষ হওয়ার তারিখ (Expiry Date) *
                </label>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs"
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px] font-mono">
                  <span className="text-slate-500 font-sans">কুইক ডেট:</span>
                  <button
                    type="button"
                    onClick={() => setExpiryDate(new Date().toISOString().slice(0, 10))}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded cursor-pointer"
                  >
                    আজকে
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpiryDate((d) => adjustDateDays(d, -30))}
                    className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded cursor-pointer"
                    title="৩০ দিন আগের তারিখ (মেয়াদোত্তীর্ণ টেস্ট)"
                  >
                    -৩০ দিন (আগে)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpiryDate((d) => adjustDateDays(d, 30))}
                    className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded cursor-pointer"
                    title="৩০ দিন পরের তারিখ (১ মাসের অ্যালার্ম)"
                  >
                    +৩০ দিন (পরে)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpiryDate((d) => adjustDateMonths(d, 6))}
                    className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded cursor-pointer"
                  >
                    +৬ মাস
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpiryDate((d) => adjustDateMonths(d, 12))}
                    className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded cursor-pointer"
                  >
                    +১ বছর
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  লোকেশন / রেফারেন্স / পিওপি / সিরিয়াল *
                </label>
                <input
                  type="text"
                  value={referenceOrLocation}
                  onChange={(e) => setReferenceOrLocation(e.target.value)}
                  placeholder="যেমন: Head Office, Khulna / Boyra POP / Racks 04..."
                  className="w-full px-3 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  কত দিন আগে অ্যালার্ম দিবে? (Lead Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={alertDaysBefore}
                  onChange={(e) => setAlertDaysBefore(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  সংশ্লিষ্ট JD নম্বর
                </label>
                <select
                  value={jdNo}
                  onChange={(e) => setJdNo(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium cursor-pointer shadow-2xs"
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  কর্তৃপক্ষ / ভেন্ডর / বাড়িওয়ালা
                </label>
                <input
                  type="text"
                  value={authorityOrVendor}
                  onChange={(e) => setAuthorityOrVendor(e.target.value)}
                  placeholder="BTRC / KCC / Landlord / Vendor Name..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  আনুমানিক ফি / ভাড়া (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={costEstimateBdt}
                  onChange={(e) => setCostEstimateBdt(e.target.value)}
                  placeholder="যেমন: 25,000 BDT..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  নথি ও ফলোআপ নোট
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="নবায়নের জন্য প্রয়োজনীয় ফাইল, চালান বা করণীয় নির্দেশনা..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-xl transition-all shadow-sm cursor-pointer"
              >
                রেজিস্টারে সেভ করুন
              </button>
            </div>
          </form>
        )}

        {/* Filter and Search Bar */}
        <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setStateFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
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
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                stateFilter === 'urgent'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              ১ মাসের অ্যালার্ম / মেয়াদোত্তীর্ণ ({urgentCount})
            </button>
            <button
              type="button"
              onClick={() => setStateFilter('upcoming')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                stateFilter === 'upcoming'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              আসন্ন ৩১–৬০ দিন
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="আইটেম বা লোকেশন খুঁজুন..."
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 w-44 sm:w-56"
            />

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'all' | RenewalCategory)}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="all">সকল ক্যাটাগরি</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Renewal Register Table with Direct Edit / Correction */}
      <section className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600 uppercase font-bold tracking-wider">
                <th className="py-3.5 px-4">আইটেম ও লোকেশন</th>
                <th className="py-3.5 px-4">ক্যাটাগরি · JD</th>
                <th className="py-3.5 px-4">মেয়াদ ও ১ মাসের অ্যালার্ম</th>
                <th className="py-3.5 px-4">নবায়ন অগ্রগতি</th>
                <th className="py-3.5 px-4 text-right">অ্যাকশন / সংশোধন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(({ item, daysRemaining, state, stateLabelBn }) => (
                <tr
                  key={item.id}
                  className={`transition-colors ${
                    state === 'overdue'
                      ? 'bg-rose-50/50 hover:bg-rose-50/80'
                      : state === 'alarm-1m'
                      ? 'bg-amber-50/50 hover:bg-amber-50/80'
                      : 'hover:bg-slate-50/70'
                  }`}
                >
                  <td className="py-3.5 px-4 align-top">
                    <div className="font-bold text-slate-950 flex items-center gap-1.5">
                      <span>{item.title}</span>
                    </div>

                    <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-1.5 font-medium">
                      <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md font-mono text-[11px]">
                        <MapPin className="h-3 w-3 text-blue-600" />
                        <span>লোকেশন: {item.referenceOrLocation}</span>
                      </span>
                      {item.authorityOrVendor && (
                        <span>· {item.authorityOrVendor}</span>
                      )}
                      {item.costEstimateBdt && (
                        <span className="font-mono font-bold text-indigo-700">· {item.costEstimateBdt}</span>
                      )}
                    </div>

                    {item.notes && (
                      <div className="text-xs text-slate-600 mt-1.5 leading-relaxed bg-white/70 p-1.5 rounded-lg border border-slate-200/60">
                        {item.notes}
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-4 align-top text-xs text-slate-600 whitespace-nowrap">
                    <div className="font-semibold text-slate-800">{item.category}</div>
                    <div className="font-mono text-slate-500 mt-0.5 tabular-nums">
                      JD #{item.jdNo} · অ্যালার্ম {item.alertDaysBefore} দিন আগে
                    </div>
                  </td>

                  <td className="py-3.5 px-4 align-top whitespace-nowrap">
                    <div className="font-mono text-xs font-extrabold text-slate-900 tabular-nums">
                      মেয়াদ: {item.expiryDate}
                    </div>

                    <div className="mt-1 text-xs flex items-center gap-1.5">
                      {state === 'overdue' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-600 text-white font-bold rounded-lg text-xs shadow-2xs">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {stateLabelBn}
                        </span>
                      )}
                      {state === 'alarm-1m' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs shadow-2xs">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {stateLabelBn}
                        </span>
                      )}
                      {state === 'upcoming-60d' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-800 font-semibold rounded-lg text-xs">
                          <Clock className="h-3 w-3" />
                          {stateLabelBn}
                        </span>
                      )}
                      {state === 'safe' && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-mono font-bold text-xs tabular-nums">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          {daysRemaining} দিন বাকি
                        </span>
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
                      className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer shadow-2xs"
                    >
                      <option value="Active">Active</option>
                      <option value="Renewal Initiated">Renewal Initiated</option>
                      <option value="Submitted to Authority">Submitted to Authority</option>
                    </select>
                  </td>

                  <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      {/* Direct Edit / Correction Button */}
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all cursor-pointer shadow-2xs active:scale-95"
                        title="আইটেম, লোকেশন বা মেয়াদের তারিখ সংশোধন করুন"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>সংশোধন</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExtendOneYear(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
                        title="নবায়ন সম্পন্ন হলে ১ বছর মেয়াদ বাড়ান"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>+১ বছর</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteRenewal(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
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

      {/* Correction / Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-indigo-900/60">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-600 text-white">
                  <Edit2 className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">
                    আইটেম, লোকেশন ও মেয়াদের তারিখ সংশোধন
                  </h3>
                  <p className="text-xs text-slate-300">
                    মেয়াদ শেষ হওয়ার তারিখ আগে বা পরে যেকোনো তারিখে সেট করা যাবে
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  আইটেমের নাম (লাইসেন্স / চুক্তি / ডিভাইস) *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    লোকেশন / রেফারেন্স / পিওপি / ব্রাঞ্চ *
                  </label>
                  <input
                    type="text"
                    required
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="Head Office / Boyra POP-05 / Server Room..."
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ক্যাটাগরি</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as RenewalCategory)}
                    className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Expiry Date Section with explicit Earlier / Later Buttons */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-900">
                    মেয়াদ শেষ হওয়ার তারিখ (Expiry Date) — যেকোনো তারিখ নির্বাচন করুন *
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">YYYY-MM-DD</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    required
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 text-sm font-mono font-bold bg-white border border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs"
                  />
                </div>

                {/* Earlier and Later Date Quick Buttons */}
                <div className="pt-1 flex flex-wrap items-center gap-1.5 text-xs font-mono">
                  <span className="text-slate-500 font-sans text-xs">তারিখ অ্যাডজাস্ট:</span>
                  <button
                    type="button"
                    onClick={() => setEditExpiryDate((d) => adjustDateDays(d, -30))}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg cursor-pointer font-bold"
                    title="মেয়াদ ৩০ দিন পিছিয়ে দিন (মেয়াদোত্তীর্ণ অবস্থা)"
                  >
                    -৩০ দিন (আগে)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditExpiryDate((d) => adjustDateDays(d, -7))}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg cursor-pointer"
                  >
                    -৭ দিন
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditExpiryDate(new Date().toISOString().slice(0, 10))}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg cursor-pointer font-bold"
                  >
                    আজকের তারিখ
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditExpiryDate((d) => adjustDateDays(d, 7))}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg cursor-pointer"
                  >
                    +৭ দিন
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditExpiryDate((d) => adjustDateDays(d, 30))}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg cursor-pointer font-bold"
                    title="মেয়াদ ৩০ দিন বাড়িয়ে দিন (১ মাসের অ্যালার্ম অবস্থা)"
                  >
                    +৩০ দিন (পরে)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditExpiryDate((d) => adjustDateMonths(d, 6))}
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg cursor-pointer font-bold"
                  >
                    +৬ মাস (পরে)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditExpiryDate((d) => adjustDateMonths(d, 12))}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg cursor-pointer font-bold"
                  >
                    +১ বছর (পরে)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    অ্যালার্ম লিড দিন (Lead Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={editAlertDaysBefore}
                    onChange={(e) => setEditAlertDaysBefore(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    নবায়ন অগ্রগতি স্ট্যাটাস
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(e.target.value as RenewalItem['renewalStatus'])
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Renewal Initiated">Renewal Initiated</option>
                    <option value="Submitted to Authority">Submitted to Authority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    আনুমানিক ফি / ভাড়া
                  </label>
                  <input
                    type="text"
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    placeholder="25,000 BDT"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    কর্তৃপক্ষ / ভেন্ডর / বাড়িওয়ালা
                  </label>
                  <input
                    type="text"
                    value={editAuthority}
                    onChange={(e) => setEditAuthority(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    সংশ্লিষ্ট JD নম্বর
                  </label>
                  <select
                    value={editJdNo}
                    onChange={(e) => setEditJdNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="12">JD #12 — BTRC, Fire, Trade, Labour License</option>
                    <option value="16">JD #16 — Office Product Warranty Register</option>
                    <option value="19">JD #19 — Fire Extinguisher Refill/Servicing</option>
                    <option value="26">JD #26 — Partner/Vendor Contract Renewal</option>
                    <option value="27">JD #27 — Property Rental Agreement</option>
                    <option value="28">JD #28 — Maxim Billing Software Agreement</option>
                    <option value="50">JD #50 — Website Domain & Hosting Renewal</option>
                    <option value="52">JD #52 — Social Media Subscription</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  নথি, ফাইল বা ফলোআপ নোট
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="নবায়ন সংক্রান্ত মন্তব্য..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <Check className="h-4 w-4" />
                  <span>সংশোধন সংরক্ষণ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
