import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  FileCheck2,
  Plus,
  Printer,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {
  AppDatabase,
  CapacityRow,
  MonitoringCadence,
  SubmittedReport,
} from '../types.ts';
import {
  REPORT_TEMPLATES,
  type EvaluatedRenewal,
  type KpiSummary,
} from '../utils/kpiAndAlarms.ts';

interface ReportsCenterViewProps {
  db: AppDatabase;
  kpiSummary: KpiSummary;
  evaluatedRenewals: EvaluatedRenewal[];
  initialTemplateId?: string;
  onSubmitReport: (report: Partial<SubmittedReport>) => Promise<void>;
  onDeleteReport: (id: string) => Promise<void>;
  onNotifyToast: (msg: string) => void;
}

const DEFAULT_CAPACITY_ROWS: CapacityRow[] = [
  {
    providerName: 'Summit Communications (IIG)',
    linkType: 'IIG',
    changeType: 'Upgrade',
    changeMbps: 500,
    effectiveDate: new Date().toISOString().slice(0, 10),
    currentCapacityMbps: 3500,
    workOrderRef: 'WO-SN-IIG-112',
  },
  {
    providerName: 'Google Global Cache (GGC)',
    linkType: 'GGC',
    changeType: 'No Change',
    changeMbps: 0,
    effectiveDate: new Date().toISOString().slice(0, 10),
    currentCapacityMbps: 4000,
    workOrderRef: 'Active Peering',
  },
  {
    providerName: 'Facebook Network Appliance (FNA)',
    linkType: 'FNA',
    changeType: 'Upgrade',
    changeMbps: 300,
    effectiveDate: new Date().toISOString().slice(0, 10),
    currentCapacityMbps: 2800,
    workOrderRef: 'WO-SN-FNA-089',
  },
  {
    providerName: 'Fiber@Home (NTTN Khulna-Dhaka)',
    linkType: 'NTTN',
    changeType: 'No Change',
    changeMbps: 0,
    effectiveDate: new Date().toISOString().slice(0, 10),
    currentCapacityMbps: 10000,
    workOrderRef: 'NTTN-Trunk-01',
  },
];

export const ReportsCenterView: React.FC<ReportsCenterViewProps> = ({
  db,
  kpiSummary,
  evaluatedRenewals,
  initialTemplateId,
  onSubmitReport,
  onDeleteReport,
  onNotifyToast,
}) => {
  const [cadenceFilter, setCadenceFilter] = useState<'all' | MonitoringCadence>('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialTemplateId || 'daily-ops-report'
  );
  const [periodLabel, setPeriodLabel] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [recipient, setRecipient] = useState<string>('Managing Director (MD)');
  const [ccConfirmed, setCcConfirmed] = useState<boolean>(true);
  const [summaryText, setSummaryText] = useState<string>('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [capacityRows, setCapacityRows] = useState<CapacityRow[]>(DEFAULT_CAPACITY_ROWS);
  const [copiedFlag, setCopiedFlag] = useState(false);
  const [viewingSavedReport, setViewingSavedReport] = useState<SubmittedReport | null>(null);

  useEffect(() => {
    if (initialTemplateId) {
      setSelectedTemplateId(initialTemplateId);
      setViewingSavedReport(null);
    }
  }, [initialTemplateId]);

  const activeTemplate = useMemo(
    () =>
      REPORT_TEMPLATES.find((t) => t.id === selectedTemplateId) || REPORT_TEMPLATES[0],
    [selectedTemplateId]
  );

  useEffect(() => {
    if (activeTemplate.cadence === 'daily') {
      setPeriodLabel(new Date().toISOString().slice(0, 10));
    } else if (activeTemplate.cadence === 'monthly') {
      setPeriodLabel(db.settings.evaluationMonth);
    } else {
      setPeriodLabel(`Annual ${new Date().getFullYear()}`);
    }
    // Set recipient from template by default
    setRecipient(activeTemplate.submittedTo || 'Managing Director (MD)');
    setViewingSavedReport(null);
  }, [activeTemplate, db.settings.evaluationMonth]);

  const visibleTemplates = useMemo(() => {
    return REPORT_TEMPLATES.filter(
      (t) => cadenceFilter === 'all' || t.cadence === cadenceFilter
    );
  }, [cadenceFilter]);

  const handleAutoPopulate = () => {
    const pendingList = db.tasks
      .filter((t) => t.status !== 'Done')
      .slice(0, 5)
      .map((t) => `• [JD #${t.jdNo} | W:${t.kpiWeight}] ${t.title} (${t.assignedCoord})`)
      .join('\n');

    const urgentRenewalsText = evaluatedRenewals
      .filter((r) => r.state === 'overdue' || r.state === 'alarm-1m')
      .map((r) => `• ${r.item.title} — Expiry: ${r.item.expiryDate} (${r.stateLabelBn})`)
      .join('\n');

    const nextFields: Record<string, string> = { ...fieldValues };

    if (activeTemplate.id === 'daily-ops-report') {
      nextFields.officeDisciplineAndAttendance =
        'Corporate HQ ও সকল Branch যথাসময়ে খোলা হয়েছে; উপস্থিতি ও জেনারেটর/CCTV চেকলিস্ট স্বাভাবিক।';
      nextFields.upstreamAndNocStatus = `IIG, GGC, FNA ও NTTN লিংক সচল আছে। সকল ভেন্ডর ইমেইলে ${db.settings.branchOfficialCcEmail} CC নিশ্চিত করা হয়েছে।`;
      nextFields.s7RadiusAndMaximStatus =
        'Maxim S7 বিলিং ও RADIUS ইউজার কানেক্টিভিটি স্বাভাবিক; NOC টিমের মাধ্যমে তদারকি চলমান।';
      nextFields.pendingBranchAndPartnerIssues =
        pendingList || 'কোনো ক্রিটিক্যাল পেন্ডিং ইস্যু নেই।';
      nextFields.urgentExpiryAlerts =
        urgentRenewalsText || 'আগামী ৩০ দিনের মধ্যে কোনো জরুরি মেয়াদ উত্তীর্ণ নেই।';
      setSummaryText(
        `আজকের সামগ্রিক অপারেশনস স্বাভাবিক। লাইভ KPI স্কোর: ${kpiSummary.totalScore.toFixed(1)}/100। চলমান পেন্ডিং কাজ ও আগাম ১ মাসের নবায়ন তালিকা সংযুক্ত করা হলো।`
      );
    } else if (activeTemplate.id === 'upstream-nttn-capacity') {
      nextFields.mdPreApprovalRef =
        'সকল ব্যান্ডউইথ পরিবর্তনের পূর্বে NOC টিমের কারিগরি যাচাই ও MD মহোদয়ের পূর্বানুমোদন গ্রহণ করা হয়েছে (JD #11)।';
      nextFields.serviceQualityAndDowntime =
        'চলতি মাসে NTTN ও IIG আপটাইম ৯৯.৯২%। সকল ওয়ার্ক অর্ডার মেইলে SpeedNet Khulna CC রাখা হয়েছে।';
      setSummaryText(
        `${periodLabel} মাসের Upstream (IIG, GGC, FNA, CDN) ও NTTN লিংকের আপগ্রেড/ডাউনগ্রেড ও বর্তমান ক্যাপাসিটি বিবরণী সদয় অবগতির জন্য পেশ করা হলো।`
      );
    } else if (activeTemplate.id === 'monthly-kpi-ops-md') {
      nextFields.kpiScoreHighlight = `চলতি মাসের সামগ্রিক KPI স্কোর: ${kpiSummary.totalScore.toFixed(
        2
      )} / 100 (Done: ${kpiSummary.totalDone}, Pending: ${kpiSummary.totalPending}, Not Done: ${
        kpiSummary.totalNotDone
      })।`;
      nextFields.departmentalPerformanceAndTraining =
        'সকল বিভাগের SOP ইন্টারনাল পোর্টালে হালনাগাদ করা হয়েছে এবং বিভাগীয় স্কিল গ্যাপ অনুযায়ী প্রশিক্ষণ চলমান।';
      nextFields.unresolvedIssuesEscalation = pendingList || 'সকল কাজ নির্ধারিত সময়ে চলমান।';
      setSummaryText(
        `${periodLabel} মাসের বিভাগীয় পারফরম্যান্স, পেন্ডিং কাজ ও KPI মূল্যায়ন প্রতিবেদন পেশ করা হলো।`
      );
    } else if (activeTemplate.id === 'monthly-consolidated-coo-md-chairman') {
      const monthlyChecklist = (db.checklists || []).filter((c) => c.cadence === 'monthly');
      const completed = monthlyChecklist.filter((c) => c.status === 'Completed').length;
      const pendingItems = monthlyChecklist.filter((c) => c.status === 'Pending');

      nextFields.executiveSummaryAndKeyAchievements =
        `স্পিড নেট ওভারঅল অপারেশনস স্থিতিশীল। মাসিক চেকলিস্ট অগ্রগতি: ${completed}/${monthlyChecklist.length} সম্পন্ন (${Math.round((completed / (monthlyChecklist.length || 1)) * 100)}%)। সামগ্রিক KPI স্কোর: ${kpiSummary.totalScore.toFixed(1)}/100।`;
      nextFields.departmentalSupervisionAndManpower =
        'সকল শিফটের বায়োমেট্রিক উপস্থিতি ৯৮.২%; কাস্টমার সার্ভিস কমপ্লেইন রেজোলিউশন রেট ৯৭.৫%। টেকনিক্যাল ও ফিল্ড সাপোর্ট টিম রোস্টার অনুযায়ী সচল।';
      nextFields.networkUptimeAndTransmission =
        'মাসিক কোর নেটওয়ার্ক আপটাইম ৯৯.৯৪%। সকল পিওপি ব্যাকআপ ব্যাটারি হেলথ ও জেনারেটর সার্ভিসিং সম্পন্ন।';
      nextFields.upstreamAndNttnCapacityMonthly =
        'IIG, GGC, FNA, CDN ও NTTN ব্যাকবোন লিংক ক্যাপাসিটি ফুল লোডের ৮০% থ্রেশহোল্ডের নিচে সুস্থির রয়েছে। +৫০০ Mbps আপগ্রেড কার্যকর।';
      nextFields.salesGrowthAndPartnerOperations =
        'চলতি মাসে নতুন গ্রাহক নেট সংযোজন +১১২ জন; পার্টনার (MAC/CP/DP) ও ভেন্ডর সংক্রান্ত সকল সিকিউরিটি চেক ও ডিড নথিবদ্ধ।';
      nextFields.complianceAndRenewalRisks =
        urgentRenewalsText || 'সকল লাইসেন্স ও অফিস/পিওপি ভাড়ার চুক্তি নবায়ন হালনাগাদ রয়েছে।';
      nextFields.monthlyKpiScoreAndCorrectiveAction =
        `চলতি মাসের অর্জিত KPI স্কোর: ${kpiSummary.totalScore.toFixed(2)} / ১০০। পেন্ডিং আইটেম (${pendingItems.length}টি) সমাধানের জন্য বিভাগীয় প্রধানদের সাথে সমন্বিত অ্যাকশন প্ল্যান সক্রিয় রয়েছে।`;

      setSummaryText(
        `মাননীয় Managing Director ও Chairman মহোদয়ের সদয় অবগতির জন্য ${periodLabel} মাসের Consolidated COO Monitoring Report ও মাসিক চেকলিস্ট/KPI অগ্রগতি প্রতিবেদন পেশ করা হলো।`
      );
    } else if (activeTemplate.id === 'yearly-compliance-annual-review') {
      nextFields.annualRegulatoryLicenses = urgentRenewalsText || 'সকল লাইসেন্স হালনাগাদ রয়েছে।';
      nextFields.annualRentalAndVendorContracts =
        'Head Office, Branch, POP ও Data Center-এর ভাড়ার চুক্তিসমূহ ৩০ দিনের আগাম অ্যালার্মে মনিটরিং করা হচ্ছে।';
      nextFields.annualHrAppraisalAndAssetAudit =
        'বার্ষিক ফিজিক্যাল অ্যাসেট ভেরিফিকেশন ও কর্মী পারফরম্যান্স মূল্যায়ন নথি প্রস্তুত।';
      setSummaryText(`${periodLabel} সালের বার্ষিক কমপ্লায়েন্স, চুক্তি নবায়ন ও অপারেশনস সারসংক্ষেপ।`);
    } else {
      activeTemplate.fields.forEach((f) => {
        if (!nextFields[f.key]) {
          nextFields[f.key] = `${f.labelBn} সংক্রান্ত তথ্য যাচাইকৃত ও রেকর্ড সংরক্ষিত।`;
        }
      });
      setSummaryText(
        `${activeTemplate.titleBn} (${periodLabel}) — ${activeTemplate.submittedTo} বরাবর প্রস্তুতকৃত।`
      );
    }

    setFieldValues(nextFields);
    onNotifyToast('লাইভ ড্যাশবোর্ড ডাটা থেকে রিপোর্ট ফরম্যাট অটো-ফিল করা হয়েছে।');
  };

  const buildPlainTextReport = (rep?: SubmittedReport): string => {
    const title = rep ? rep.templateTitle : activeTemplate.title;
    const to = rep ? rep.submittedTo : recipient;
    const period = rep ? rep.periodLabel : periodLabel;
    const summary = rep ? rep.summaryText : summaryText;
    const fields = rep ? rep.structuredFields : fieldValues;
    const rows = rep ? rep.capacityRows : activeTemplate.hasCapacityTable ? capacityRows : undefined;

    const lines: string[] = [
      `==================================================`,
      `${db.settings.companyName} — OFFICIAL OPERATIONS REPORT`,
      `Report: ${title}`,
      `To: ${to}`,
      `CC: ${db.settings.branchOfficialCcEmail}`,
      `From: ${db.settings.employeeName}, ${db.settings.designation}`,
      `Period / Date: ${period}`,
      `==================================================`,
      ``,
      summary ? `Executive Summary:\n${summary}\n` : '',
    ];

    if (rows && rows.length > 0) {
      lines.push(`Upstream & NTTN Capacity Breakdown:`);
      rows.forEach((r) => {
        lines.push(
          `- ${r.providerName} [${r.linkType}] | ${r.changeType}: ${r.changeMbps} Mbps | Effective: ${r.effectiveDate} | Current: ${r.currentCapacityMbps} Mbps (${r.workOrderRef})`
        );
      });
      lines.push('');
    }

    Object.entries(fields).forEach(([k, val]) => {
      const def = REPORT_TEMPLATES.flatMap((t) => t.fields).find((f) => f.key === k);
      const label = def ? def.labelBn : k;
      if (val) {
        lines.push(`${label}:\n${val}\n`);
      }
    });

    lines.push(`Prepared By: ${db.settings.employeeName} (${db.settings.designation})`);
    return lines.filter(Boolean).join('\n');
  };

  const handleCopyText = async () => {
    const text = buildPlainTextReport(viewingSavedReport || undefined);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFlag(true);
      setTimeout(() => setCopiedFlag(false), 2000);
      onNotifyToast('রিপোর্ট টেক্সট (SpeedNet Khulna CC সহ) কপি করা হয়েছে — ইমেইল বা WhatsApp-এ পেস্ট করুন।');
    } catch {
      onNotifyToast('কপি করতে সমস্যা হয়েছে, প্রিন্ট প্রিভিউ ব্যবহার করুন।');
    }
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmitReport({
      templateId: activeTemplate.id,
      templateTitle: activeTemplate.title,
      cadence: activeTemplate.cadence,
      submittedTo: recipient,
      periodLabel,
      preparedBy: `${db.settings.employeeName} (${db.settings.designation})`,
      ccSpeedNetKhulnaConfirmed: ccConfirmed,
      summaryText:
        summaryText.trim() ||
        `${activeTemplate.titleBn} (${periodLabel}) — যথাযথ যাচাইপূর্বক জমা দেওয়া হলো।`,
      structuredFields: fieldValues,
      capacityRows: activeTemplate.hasCapacityTable ? capacityRows : undefined,
    });
    onNotifyToast('রিপোর্টটি লোকাল সার্ভার আর্কাইভে সফলভাবে সংরক্ষিত হয়েছে।');
  };

  const addCapacityRow = () => {
    setCapacityRows((prev) => [
      ...prev,
      {
        providerName: 'New Provider Link',
        linkType: 'IIG',
        changeType: 'Upgrade',
        changeMbps: 100,
        effectiveDate: new Date().toISOString().slice(0, 10),
        currentCapacityMbps: 1000,
        workOrderRef: 'WO-Ref',
      },
    ]);
  };

  const updateCapacityRow = (idx: number, patch: Partial<CapacityRow>) => {
    setCapacityRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const previewReport: SubmittedReport = viewingSavedReport || {
    id: 'draft',
    templateId: activeTemplate.id,
    templateTitle: activeTemplate.title,
    cadence: activeTemplate.cadence,
    submittedTo: recipient,
    periodLabel,
    createdAt: new Date().toISOString(),
    preparedBy: `${db.settings.employeeName} (${db.settings.designation})`,
    ccSpeedNetKhulnaConfirmed: ccConfirmed,
    summaryText,
    structuredFields: fieldValues,
    capacityRows: activeTemplate.hasCapacityTable ? capacityRows : undefined,
  };

  return (
    <div className="space-y-8">
      {/* Top Template Selector (No-Print) */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              COO অফিসিয়াল রিপোর্টিং ফরম্যাট ও সাবমিশন ম্যাট্রিক্স (Daily · Monthly · Yearly)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              JD Section M-এর সকল রিপোর্ট ফরম্যাট নিচে প্রস্তুত আছে। যেকোনো ফরম্যাট সিলেক্ট করে অটো-ফিল, সেভ, ইমেইল কপি বা প্রিন্ট করুন।
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start shrink-0">
            {(['all', 'daily', 'monthly', 'yearly'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCadenceFilter(c)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize whitespace-nowrap cursor-pointer ${
                  cadenceFilter === c
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {c === 'all' ? 'সকল ফরম্যাট (9)' : c}
              </button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {visibleTemplates.map((tpl) => {
            const active = !viewingSavedReport && selectedTemplateId === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  setSelectedTemplateId(tpl.id);
                  setViewingSavedReport(null);
                }}
                className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                  active
                    ? 'border-blue-600 bg-blue-50/50'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
                  <span className="capitalize">{tpl.cadence}</span>
                  <span>To: {tpl.submittedTo}</span>
                </div>
                <div className="text-sm font-semibold text-slate-900 mt-1 line-clamp-1">
                  {tpl.titleBn}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{tpl.jdRef}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Builder + Official Print Letterhead Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Form Builder (Left 6 Cols, Hidden on Print) */}
        <section className="xl:col-span-6 bg-white border border-slate-200 rounded-xl p-6 no-print">
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {viewingSavedReport
                  ? 'সংরক্ষিত রিপোর্ট দেখছেন'
                  : `${activeTemplate.titleBn} — তথ্য পূরণ`}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                জমা দেওয়ার কর্তৃপক্ষ: <strong>{activeTemplate.submittedTo}</strong> · {activeTemplate.jdRef}
              </p>
            </div>

            {!viewingSavedReport && (
              <button
                type="button"
                onClick={handleAutoPopulate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>লাইভ ডাটা অটো-ফিল</span>
              </button>
            )}
          </div>

          {viewingSavedReport ? (
            <div className="py-6 space-y-4">
              <p className="text-xs text-slate-600">
                ডানপাশের প্রিভিউতে সংরক্ষিত রিপোর্টটি দেখা যাচ্ছে। আপনি এটি প্রিন্ট করতে পারেন অথবা নতুন রিপোর্ট লিখতে নিচের বাটনে ক্লিক করুন।
              </p>
              <button
                type="button"
                onClick={() => setViewingSavedReport(null)}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                নতুন রিপোর্ট এডিটরে ফিরে যান
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveReport} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    রিপোর্ট তারিখ / মাস / বছর
                  </label>
                  <input
                    type="text"
                    value={periodLabel}
                    onChange={(e) => setPeriodLabel(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    কাকে জমা দেবেন (Recipient Dropdown) *
                  </label>
                  <select
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs text-slate-900 cursor-pointer"
                  >
                    <option value="Managing Director (MD)">Managing Director (MD)</option>
                    <option value="Chairman">Chairman</option>
                    <option value="Managing Director / Chairman">MD & Chairman (উভয়কে)</option>
                    <option value="CFO / Accounts Department">CFO / Accounts Department</option>
                    <option value="Management">Management Committee</option>
                    <option value="COO Self-Record / Internal Audit">COO Self-Record / Audit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  এক্সিকিউটিভ সারসংক্ষেপ (Executive Summary)
                </label>
                <textarea
                  rows={2}
                  value={summaryText}
                  onChange={(e) => setSummaryText(e.target.value)}
                  placeholder="রিপোর্টের মূল সারসংক্ষেপ ২ লাইনে লিখুন..."
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {activeTemplate.hasCapacityTable && (
                <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800">
                      Upstream & NTTN Link Capacity Table (Mbps)
                    </span>
                    <button
                      type="button"
                      onClick={addCapacityRow}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> লিংক রো যোগ করুন
                    </button>
                  </div>
                  <div className="space-y-2">
                    {capacityRows.map((row, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-1.5 bg-white p-2 border border-slate-200 rounded text-xs"
                      >
                        <input
                          type="text"
                          value={row.providerName}
                          onChange={(e) => updateCapacityRow(idx, { providerName: e.target.value })}
                          placeholder="Provider"
                          className="col-span-4 px-2 py-1 border border-slate-200 rounded"
                        />
                        <select
                          value={row.linkType}
                          onChange={(e) =>
                            updateCapacityRow(idx, {
                              linkType: e.target.value as CapacityRow['linkType'],
                            })
                          }
                          className="col-span-2 px-1.5 py-1 border border-slate-200 rounded"
                        >
                          <option value="IIG">IIG</option>
                          <option value="GGC">GGC</option>
                          <option value="FNA">FNA</option>
                          <option value="CDN">CDN</option>
                          <option value="NTTN">NTTN</option>
                        </select>
                        <select
                          value={row.changeType}
                          onChange={(e) =>
                            updateCapacityRow(idx, {
                              changeType: e.target.value as CapacityRow['changeType'],
                            })
                          }
                          className="col-span-2 px-1.5 py-1 border border-slate-200 rounded"
                        >
                          <option value="Upgrade">Upgrade</option>
                          <option value="Downgrade">Downgrade</option>
                          <option value="Activation">Activation</option>
                          <option value="Disconnection">Disconnect</option>
                          <option value="No Change">No Change</option>
                        </select>
                        <input
                          type="number"
                          value={row.changeMbps}
                          onChange={(e) =>
                            updateCapacityRow(idx, { changeMbps: Number(e.target.value) })
                          }
                          placeholder="Δ Mbps"
                          title="পরিবর্তনের পরিমাণ (Mbps)"
                          className="col-span-2 px-2 py-1 font-mono border border-slate-200 rounded"
                        />
                        <input
                          type="number"
                          value={row.currentCapacityMbps}
                          onChange={(e) =>
                            updateCapacityRow(idx, {
                              currentCapacityMbps: Number(e.target.value),
                            })
                          }
                          placeholder="Total Mbps"
                          title="বর্তমান মোট Capacity (Mbps)"
                          className="col-span-2 px-2 py-1 font-mono border border-slate-200 rounded"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTemplate.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {field.labelBn}
                  </label>
                  {field.multiline ? (
                    <textarea
                      rows={3}
                      value={fieldValues[field.key] || ''}
                      onChange={(e) =>
                        setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  ) : (
                    <input
                      type="text"
                      value={fieldValues[field.key] || ''}
                      onChange={(e) =>
                        setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  )}
                </div>
              ))}

              {/* JD #09 Official Email CC Compliance Checkbox */}
              <label className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ccConfirmed}
                  onChange={(e) => setCcConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                <span>
                  <strong>JD #09 কমপ্লায়েন্স চেক:</strong> ইমেইলে পাঠানোর সময় SpeedNet Khulna-এর অফিসিয়াল ইমেইল (
                  <span className="font-mono">{db.settings.branchOfficialCcEmail}</span>) CC-তে রাখা হয়েছে।
                </span>
              </label>

              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <FileCheck2 className="h-3.5 w-3.5" />
                  <span>সার্ভারে রিপোর্ট সেভ করুন</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {copiedFlag ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>ইমেইল / WhatsApp টেক্সট কপি</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-900 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>প্রিন্ট / PDF</span>
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Live Official Letterhead Preview (Right 6 Cols, Full Width on Print) */}
        <section className="xl:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-7 shadow-sm print-sheet">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 no-print">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              অফিসিয়াল লেটারহেড প্রিভিউ (A4 Format)
            </span>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-amber-400" />
              <span>এই রিপোর্টটি সরাসরি প্রিন্ট করুন</span>
            </button>
          </div>

          <div className="border-b-2 border-slate-950 pb-4 flex items-start justify-between gap-4">
            <div>
              <div className="text-xl font-extrabold tracking-tight text-slate-950">
                {db.settings.companyName}
              </div>
              <div className="text-xs text-slate-600 font-medium">
                Office of the Chief Operating Officer (Administration & Operations)
              </div>
            </div>
            <div className="text-right font-mono text-xs text-slate-700 tabular-nums">
              <div>Period: {previewReport.periodLabel}</div>
              <div>Date: {previewReport.createdAt.slice(0, 10)}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div>
              <span className="text-slate-500">Submitted To:</span>{' '}
              <strong className="text-slate-900">{previewReport.submittedTo}</strong>
            </div>
            <div>
              <span className="text-slate-500">Official CC:</span>{' '}
              <span className="font-mono text-slate-800">
                {db.settings.branchOfficialCcEmail}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500">Subject:</span>{' '}
              <strong className="text-slate-900">{previewReport.templateTitle}</strong>
            </div>
          </div>

          {previewReport.summaryText && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-slate-500">Executive Summary</h4>
              <p className="text-xs text-slate-800 mt-1 whitespace-pre-line leading-relaxed">
                {previewReport.summaryText}
              </p>
            </div>
          )}

          {previewReport.capacityRows && previewReport.capacityRows.length > 0 && (
            <div className="mt-5 overflow-x-auto">
              <h4 className="text-xs font-semibold text-slate-700 mb-2">
                Upstream (IIG, GGC, FNA, CDN) & NTTN Capacity Statement
              </h4>
              <table className="w-full text-left border-collapse text-xs border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="py-1.5 px-2">Provider / Link</th>
                    <th className="py-1.5 px-2">Type</th>
                    <th className="py-1.5 px-2">Action</th>
                    <th className="py-1.5 px-2 text-right">Δ Mbps</th>
                    <th className="py-1.5 px-2 text-right">Current Mbps</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {previewReport.capacityRows.map((r, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 px-2 font-medium text-slate-900">{r.providerName}</td>
                      <td className="py-1.5 px-2 font-mono">{r.linkType}</td>
                      <td className="py-1.5 px-2">{r.changeType}</td>
                      <td className="py-1.5 px-2 font-mono text-right tabular-nums">
                        {r.changeMbps > 0 ? `+${r.changeMbps}` : r.changeMbps}
                      </td>
                      <td className="py-1.5 px-2 font-mono font-semibold text-right tabular-nums">
                        {r.currentCapacityMbps}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5 space-y-3.5">
            {Object.entries(previewReport.structuredFields).map(([k, val]) => {
              if (!val) return null;
              const def = REPORT_TEMPLATES.flatMap((t) => t.fields).find((f) => f.key === k);
              return (
                <div key={k} className="border-b border-slate-100 pb-2.5">
                  <div className="text-xs font-semibold text-slate-800">
                    {def ? def.labelBn : k}
                  </div>
                  <div className="text-xs text-slate-700 mt-1 whitespace-pre-line leading-relaxed">
                    {val}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 pt-6 border-t border-slate-200 flex items-end justify-between text-xs text-slate-700">
            <div>
              <div className="font-semibold text-slate-900">{db.settings.employeeName}</div>
              <div>{db.settings.designation}</div>
              <div className="text-slate-500">{db.settings.department}</div>
            </div>
            <div className="text-right">
              <div className="border-t border-slate-400 pt-1 px-6">
                Approved / Received By ({previewReport.submittedTo})
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Saved Reports Archive */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 no-print">
        <h3 className="text-base font-semibold text-slate-900">
          সার্ভারে সংরক্ষিত পূর্ববর্তী রিপোর্ট আর্কাইভ ({db.reports.length})
        </h3>
        <div className="mt-3 divide-y divide-slate-200">
          {db.reports.map((rep) => (
            <div
              key={rep.id}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">{rep.templateTitle}</div>
                <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                  {rep.periodLabel} · To: {rep.submittedTo} · Saved: {rep.createdAt.slice(0, 10)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewingSavedReport(rep)}
                  className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer"
                >
                  প্রিভিউ ও প্রিন্ট
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteReport(rep.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer"
                  title="মুছে ফেলুন"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
