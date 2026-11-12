import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Award,
  BarChart3,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  CornerDownRight,
  ExternalLink,
  FileCheck2,
  FileSpreadsheet,
  Filter,
  Mail,
  MessageSquareQuote,
  PieChart as PieIcon,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Target,
  Trash2,
  X,
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
import { NextDayPlannerModal } from './NextDayPlannerModal.tsx';

interface ReportsCenterViewProps {
  db: AppDatabase;
  kpiSummary: KpiSummary;
  evaluatedRenewals: EvaluatedRenewal[];
  initialTemplateId?: string;
  onSubmitReport: (report: Partial<SubmittedReport>) => Promise<void>;
  onDeleteReport: (id: string) => Promise<void>;
  onPlanNextDay?: (payload: {
    carryoverItems: { id: string; taskText: string; remarks: string; priority: boolean }[];
    standardRoutineItemIds: string[];
  }) => Promise<void>;
  onNavigateToChecklist?: () => void;
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
  onPlanNextDay,
  onNavigateToChecklist,
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
  const [critiqueCommentary, setCritiqueCommentary] = useState<string>('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [capacityRows, setCapacityRows] = useState<CapacityRow[]>(DEFAULT_CAPACITY_ROWS);
  const [copiedFlag, setCopiedFlag] = useState(false);
  const [viewingSavedReport, setViewingSavedReport] = useState<SubmittedReport | null>(null);

  // Next Day Planner modal state
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [showPostSaveCarryoverPrompt, setShowPostSaveCarryoverPrompt] = useState(false);

  // Archive Filter & Search state
  const [archiveDateFilter, setArchiveDateFilter] = useState<string>('');
  const [archiveMonthFilter, setArchiveMonthFilter] = useState<string>('');
  const [archiveCadenceFilter, setArchiveCadenceFilter] = useState<'all' | MonitoringCadence>('all');
  const [archiveRecipientFilter, setArchiveRecipientFilter] = useState<string>('all');
  const [archiveSearchQuery, setArchiveSearchQuery] = useState<string>('');

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

  // Determine whether current preview report is monthly or daily
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
    critiqueCommentary,
  };

  const isMonthlyReport =
    previewReport.cadence === 'monthly' || previewReport.templateId.includes('monthly');
  const checklistCadence: 'daily' | 'monthly' = isMonthlyReport ? 'monthly' : 'daily';

  const relevantChecklists = useMemo(() => {
    return (db.checklists || []).filter((c) => c.cadence === checklistCadence);
  }, [db.checklists, checklistCadence]);

  const totalChecklists = relevantChecklists.length || (isMonthlyReport ? 26 : 26);
  const completedChecklists = relevantChecklists.filter((c) => c.status === 'Completed').length;
  const pendingChecklists = relevantChecklists.filter((c) => c.status === 'Pending').length;
  const checklistPercent = totalChecklists > 0 ? Math.round((completedChecklists / totalChecklists) * 100) : 0;
  const pendingPercent = 100 - checklistPercent;

  // Category statistics breakdown
  const categoryStats = useMemo(() => {
    const catList = isMonthlyReport ? MONTHLY_CATEGORIES : DAILY_CATEGORIES;
    return catList.map((cat) => {
      const items = relevantChecklists.filter((c) => c.categoryNumber === cat.num);
      const completed = items.filter((c) => c.status === 'Completed').length;
      const total = items.length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        num: cat.num,
        name: cat.name,
        total,
        completed,
        pending: total - completed,
        percent,
      };
    });
  }, [relevantChecklists, isMonthlyReport]);

  const urgentRenewals = useMemo(() => {
    return evaluatedRenewals.filter((r) => r.state === 'overdue' || r.state === 'alarm-1m');
  }, [evaluatedRenewals]);

  const criticalTasks = useMemo(() => {
    return db.tasks.filter((t) => t.status !== 'Done' && t.kpiWeight >= 10);
  }, [db.tasks]);

  // Filter archived reports based on user date, month, cadence, recipient and search
  const filteredArchiveReports = useMemo(() => {
    return db.reports.filter((rep) => {
      // Date filter (e.g. 2026-11-10)
      if (archiveDateFilter) {
        const repCreatedDate = rep.createdAt ? rep.createdAt.slice(0, 10) : '';
        const repPeriod = rep.periodLabel || '';
        if (repCreatedDate !== archiveDateFilter && !repPeriod.includes(archiveDateFilter)) {
          return false;
        }
      }

      // Month filter (e.g. 2026-11)
      if (archiveMonthFilter) {
        const repCreatedMonth = rep.createdAt ? rep.createdAt.slice(0, 7) : '';
        const repPeriod = rep.periodLabel || '';
        if (repCreatedMonth !== archiveMonthFilter && !repPeriod.includes(archiveMonthFilter)) {
          return false;
        }
      }

      // Cadence filter
      if (archiveCadenceFilter !== 'all' && rep.cadence !== archiveCadenceFilter) {
        return false;
      }

      // Recipient filter
      if (archiveRecipientFilter !== 'all' && rep.submittedTo !== archiveRecipientFilter) {
        return false;
      }

      // Search keyword filter
      if (archiveSearchQuery.trim()) {
        const q = archiveSearchQuery.toLowerCase();
        const textToSearch = [
          rep.templateTitle,
          rep.periodLabel,
          rep.submittedTo,
          rep.summaryText,
          rep.critiqueCommentary,
          rep.preparedBy,
          ...Object.values(rep.structuredFields || {}),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!textToSearch.includes(q)) return false;
      }

      return true;
    });
  }, [
    db.reports,
    archiveDateFilter,
    archiveMonthFilter,
    archiveCadenceFilter,
    archiveRecipientFilter,
    archiveSearchQuery,
  ]);

  // Intelligent auto-generation of Operational Critique, Commentary & Recommendations
  const buildSmartCritique = () => {
    const strengths: string[] = [];
    const gapsAndCritique: string[] = [];
    const recommendations: string[] = [];

    // Analyze completed checklist
    if (checklistPercent >= 80) {
      strengths.push(
        `• রুটিন অপারেশনাল অগ্রগতি সন্তোষজনক: মোট দায়িত্বের ${checklistPercent}% (${completedChecklists}/${totalChecklists}) ইতিমধ্যে সফলভাবে সম্পন্ন হয়েছে।`
      );
    } else {
      gapsAndCritique.push(
        `• সামগ্রিক চেকলিস্ট বাস্তবায়ন ধীরগতির: বর্তমান অগ্রগতি মাত্র ${checklistPercent}% (${pendingChecklists}টি কাজ এখনো পেন্ডিং রয়েছে)।`
      );
    }

    // Category-specific bottleneck critique
    const laggingCats = categoryStats.filter((c) => c.percent < 100);
    if (laggingCats.length > 0) {
      const catNames = laggingCats.map((c) => `${c.name} (${c.percent}%)`).join(', ');
      gapsAndCritique.push(
        `• বিভাগভিত্তিক দুর্বলতা ও মনিটরিং ঘাটতি: [${catNames}] বিভাগে একাধিক কাজ নির্ধারিত সময়ে সম্পন্ন হয়নি। ফিল্ড ও অপারেশনাল সমন্বয়ের ঘাটতি পরিলক্ষিত হয়েছে।`
      );
      recommendations.push(
        `• আগামী ২৪-৪৮ ঘণ্টার মধ্যে সংশ্লিষ্ট ডিপার্টমেন্টাল হেড ও সুপারভাইজারদের জবাবদিহিতা নিশ্চিত করে পেন্ডিং টাস্ক ক্লোজ করার নির্দেশ দেওয়া হোক।`
      );
    } else {
      strengths.push(
        `• শতভাগ বিভাগীয় কমপ্লায়েন্স: সকল ক্যাটাগরির রুটিন মনিটরিং আইটেম শতভাগ সম্পন্ন ও নথিবদ্ধ করা হয়েছে।`
      );
    }

    // KPI Score critique
    if (kpiSummary.totalScore >= 85) {
      strengths.push(
        `• KPI স্কোর উচ্চ অবস্থানে: চলতি মাসের অর্জিত স্কোর ${kpiSummary.totalScore.toFixed(1)}/১০০, যা কোম্পানির অপারেশনাল লক্ষ্যমাত্রার সাথে সঙ্গতিপূর্ণ।`
      );
    } else {
      gapsAndCritique.push(
        `• KPI স্কোর লক্ষ্যমাত্রার নিচে: অর্জিত স্কোর ${kpiSummary.totalScore.toFixed(1)}/১০০। বিশেষ করে উচ্চ ওয়েটের (IIG/NTTN ও ভেন্ডর সংক্রান্ত) পেন্ডিং কাজের কারণে স্কোরের ক্ষতি হচ্ছে।`
      );
      recommendations.push(
        `• বেশি ওয়েটের (Weight 15 ও 10) কাজগুলোতে অগ্রাধিকার প্রদান করে দ্রুত KPI স্কোর ৮৫+ এ উন্নীত করার ব্যবস্থা নেওয়া হবে।`
      );
    }

    // 1-Month advance expiry alarm critique
    if (urgentRenewals.length > 0) {
      const alarmTitles = urgentRenewals.map((r) => r.item.title).slice(0, 3).join(', ');
      gapsAndCritique.push(
        `• লাইসেন্স, চুক্তি ও নবায়ন ঝুঁকি: আগামী ৩০ দিনের মধ্যে ${urgentRenewals.length}টি চুক্তি/লাইসেন্স মেয়াদোত্তীর্ণ হতে যাচ্ছে (${alarmTitles})। সময়মতো নবায়ন না হলে প্রশাসনিক ও আর্থিক জরিমানার ঝুঁকি তৈরি হতে পারে।`
      );
      recommendations.push(
        `• জরুরি ভিত্তিতে BTRC, POP ভাড়ার চুক্তি ও ফায়ার সেফটি নবায়নের ফাইল প্রসেসিং এবং সংশ্লিষ্ট বাজেট ছাড়ের জন্য মাননীয় ${recipient} মহোদয়ের সদয় পূর্বানুমোদন প্রার্থনা করছি।`
      );
    } else {
      strengths.push(
        `• শূন্য কমপ্লায়েন্স ঝুঁকি: আগামী ৩০ দিনের মধ্যে কোনো জরুরি লাইসেন্স বা চুক্তি মেয়াদোত্তীর্ণ হওয়ার ঝুঁকি নেই।`
      );
    }

    return [
      `[১. অপারেশনাল সাফল্য ও স্থিতিশীল দিকসমূহ]:\n${strengths.join('\n') || '• অপারেশনস স্থিতিশীল।'}\n`,
      `[২. ঘাটতি, দুর্বলতা ও গঠনমূলক সমালোচনা]:\n${gapsAndCritique.join('\n') || '• কোনো উল্লেখযোগ্য কাঠামোগত দুর্বলতা পাওয়া যায়নি।'}\n`,
      `[৩. সংশোধনমূলক কর্মপরিকল্পনা ও এমডি/চেয়ারম্যান মহোদয়ের নিকট সুপারিশ]:\n${recommendations.join('\n') || `• বর্তমান মনিটরিং ব্যবস্থা অক্ষুণ্ণ রাখার জন্য মাননীয় ${recipient} মহোদয়ের সদয় দিকনির্দেশনা কামনা করছি।`}`,
    ].join('\n');
  };

  const handleAutoPopulate = () => {
    const pendingList = db.tasks
      .filter((t) => t.status !== 'Done')
      .slice(0, 5)
      .map((t) => `• [JD #${t.jdNo} | Weight:${t.kpiWeight}] ${t.title} (${t.assignedCoord})`)
      .join('\n');

    const urgentRenewalsText = urgentRenewals
      .map((r) => `• ${r.item.title} — লোকেশন: ${r.item.referenceOrLocation} (মেয়াদ: ${r.item.expiryDate}, ${r.stateLabelBn})`)
      .join('\n');

    const nextFields: Record<string, string> = { ...fieldValues };

    if (activeTemplate.id === 'daily-ops-report') {
      nextFields.officeDisciplineAndAttendance =
        'Corporate HQ ও সকল Branch যথাসময়ে খোলা হয়েছে; বায়োমেট্রিক উপস্থিতি, পাওয়ার/জেনারেটর ও সিসিটিভি স্বাভাবিক।';
      nextFields.upstreamAndNocStatus = `IIG (Summit), GGC, FNA ও NTTN লিংক শতভাগ আপটাইমে সচল রয়েছে। সকল ভেন্ডর ইমেইলে ${db.settings.branchOfficialCcEmail} CC নিশ্চিত করা হয়েছে।`;
      nextFields.s7RadiusAndMaximStatus =
        'Maxim S7 বিলিং পোর্টাল ও RADIUS ইউজার কানেক্টিভিটি স্বাভাবিক; কোনো সার্ভিস ইন্টারাপশন নেই।';
      nextFields.pendingBranchAndPartnerIssues =
        pendingList || 'সকল ব্রাঞ্চ ও পার্টনার সাপোর্ট রুটিন অনুযায়ী চলমান রয়েছে।';
      nextFields.urgentExpiryAlerts =
        urgentRenewalsText || 'আগামী ৩০ দিনের মধ্যে কোনো জরুরি মেয়াদোত্তীর্ণ বা রিনিউয়াল ঝুঁকি নেই।';
      setSummaryText(
        `আজকের সামগ্রিক অপারেশনস অগ্রগতি ${checklistPercent}% (${completedChecklists}/${totalChecklists} কাজ সম্পন্ন)। লাইভ KPI স্কোর: ${kpiSummary.totalScore.toFixed(1)}/100। পাই চার্ট ও অপারেশনাল পর্যালোচনা সংযুক্ত করা হলো।`
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
      nextFields.executiveSummaryAndKeyAchievements =
        `স্পিড নেট ওভারঅল অপারেশনস স্থিতিশীল। মাসিক চেকলিস্ট বাস্তবায়ন হার: ${checklistPercent}% (${completedChecklists}/${totalChecklists} সম্পন্ন)। সামগ্রিক KPI স্কোর: ${kpiSummary.totalScore.toFixed(1)}/100।`;
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
        `চলতি মাসের অর্জিত KPI স্কোর: ${kpiSummary.totalScore.toFixed(2)} / ১০০। পেন্ডিং আইটেম (${pendingChecklists}টি) সমাধানের জন্য বিভাগীয় প্রধানদের সাথে সমন্বিত অ্যাকশন প্ল্যান সক্রিয় রয়েছে।`;

      setSummaryText(
        `মাননীয় ${recipient} মহোদয়ের সদয় অবগতির জন্য ${periodLabel} মাসের Consolidated COO Monitoring Report, বাস্তবায়ন পাই চার্ট ও অপারেশনাল পর্যালোচনা প্রতিবেদন পেশ করা হলো।`
      );
    } else {
      activeTemplate.fields.forEach((f) => {
        if (!nextFields[f.key]) {
          nextFields[f.key] = `${f.labelBn} সংক্রান্ত তথ্য যাচাইকৃত ও রেকর্ড সংরক্ষিত।`;
        }
      });
      setSummaryText(
        `${activeTemplate.titleBn} (${periodLabel}) — ${recipient} বরাবর প্রস্তুতকৃত।`
      );
    }

    setFieldValues(nextFields);
    setCritiqueCommentary(buildSmartCritique());
    onNotifyToast('লাইভ ডাটা, পাই চার্ট ও স্মার্ট সমালোচনা অটো-ফিল করা হয়েছে।');
  };

  const buildPlainTextReport = (rep?: SubmittedReport): string => {
    const title = rep ? rep.templateTitle : activeTemplate.title;
    const to = rep ? rep.submittedTo : recipient;
    const period = rep ? rep.periodLabel : periodLabel;
    const summary = rep ? rep.summaryText : summaryText;
    const critique = rep ? rep.critiqueCommentary : critiqueCommentary;
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
      `Implementation (Pie Chart): ${checklistPercent}% Completed (${completedChecklists}/${totalChecklists}) | Pending: ${pendingPercent}% (${pendingChecklists})`,
      `Live KPI Score: ${kpiSummary.totalScore.toFixed(1)} / 100`,
      `==================================================`,
      ``,
      summary ? `Executive Summary:\n${summary}\n` : '',
    ];

    if (critique) {
      lines.push(`Operational Review, Critique & Recommendations:\n${critique}\n`);
    }

    lines.push(`Departmental Implementation Breakdown:`);
    categoryStats.forEach((cat) => {
      lines.push(`- ${cat.num}. ${cat.name}: ${cat.completed}/${cat.total} Completed (${cat.percent}%)`);
    });
    lines.push('');

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

  const handleCopyText = async (rep?: SubmittedReport) => {
    const text = buildPlainTextReport(rep || viewingSavedReport || undefined);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFlag(true);
      setTimeout(() => setCopiedFlag(false), 2000);
      onNotifyToast('রিপোর্ট টেক্সট (SpeedNet Khulna CC ও সমালোচনা সহ) কপি করা হয়েছে।');
    } catch {
      onNotifyToast('কপি করতে সমস্যা হয়েছে, প্রিন্ট প্রিভিউ ব্যবহার করুন।');
    }
  };

  const handleMailto = (rep: SubmittedReport) => {
    const to = rep.submittedTo.includes('MD')
      ? 'md@speednetkhulna.com'
      : rep.submittedTo.includes('Chairman')
      ? 'chairman@speednetkhulna.com'
      : 'management@speednetkhulna.com';
    const cc = db.settings.branchOfficialCcEmail;
    const subject = encodeURIComponent(`${db.settings.companyName} — ${rep.templateTitle} (${rep.periodLabel})`);
    const body = encodeURIComponent(buildPlainTextReport(rep));
    window.open(`mailto:${to}?cc=${cc}&subject=${subject}&body=${body}`, '_blank');
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
      critiqueCommentary: critiqueCommentary.trim(),
    });

    onNotifyToast('রিপোর্টটি পাই চার্ট ও সমালোচনাসহ সার্ভার আর্কাইভে সংরক্ষিত হয়েছে।');

    // If it's a daily report and there are pending items, show the carryover prompt!
    if (activeTemplate.cadence === 'daily' && pendingChecklists > 0) {
      setShowPostSaveCarryoverPrompt(true);
    }
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

  // SVG Donut circumference: 2 * Math.PI * 52 ≈ 326.726
  const circleCircumference = 326.726;
  const completedStrokeLength = (checklistPercent / 100) * circleCircumference;

  // Preset filter helpers
  const handleFilterToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    setArchiveDateFilter(today);
    setArchiveMonthFilter('');
    onNotifyToast(`আজকের (${today}) সংরক্ষিত রিপোর্ট ফিল্টার করা হয়েছে।`);
  };

  const handleFilterYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    setArchiveDateFilter(yStr);
    setArchiveMonthFilter('');
    onNotifyToast(`গতকালকের (${yStr}) সংরক্ষিত রিপোর্ট ফিল্টার করা হয়েছে।`);
  };

  const handleFilterThisMonth = () => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    setArchiveMonthFilter(thisMonth);
    setArchiveDateFilter('');
    onNotifyToast(`চলতি মাসের (${thisMonth}) সকল রিপোর্ট ফিল্টার করা হয়েছে।`);
  };

  const handleFilterLastMonth = () => {
    const lastM = new Date();
    lastM.setMonth(lastM.getMonth() - 1);
    const lmStr = lastM.toISOString().slice(0, 7);
    setArchiveMonthFilter(lmStr);
    setArchiveDateFilter('');
    onNotifyToast(`গত মাসের (${lmStr}) সকল রিপোর্ট ফিল্টার করা হয়েছে।`);
  };

  const handleClearArchiveFilters = () => {
    setArchiveDateFilter('');
    setArchiveMonthFilter('');
    setArchiveCadenceFilter('all');
    setArchiveRecipientFilter('all');
    setArchiveSearchQuery('');
    onNotifyToast('আর্কাইভ ফিল্টার রিসেট করা হয়েছে — সকল রিপোর্ট দৃশ্যমান।');
  };

  return (
    <div className="space-y-8">
      {/* Post-Save Carryover Prompt Banner (Appears after daily report save when pending items exist) */}
      {showPostSaveCarryoverPrompt && (
        <section className="p-5 bg-gradient-to-r from-amber-500/15 via-amber-50/95 to-amber-100/70 border-2 border-amber-400 rounded-2xl shadow-md animate-in fade-in duration-200 no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-amber-600 text-white">
                <Clock className="h-4 w-4" />
              </span>
              <h3 className="text-sm sm:text-base font-extrabold text-amber-950">
                আজকের রিপোর্ট সংরক্ষিত হয়েছে! কিন্তু {pendingChecklists}টি দায়িত্ব পেন্ডিং রয়েছে
              </h3>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed max-w-2xl">
              অসমাপ্ত কাজগুলো কি আগামী দিনের নতুন চেকলিস্টে <strong>[Carryover - জরুরী]</strong> হিসেবে নিয়ে যেতে চান? প্ল্যানার খুলে বাছাই করে নিন।
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowPostSaveCarryoverPrompt(false)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              পরে করবো
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPostSaveCarryoverPrompt(false);
                setPlannerOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 rounded-xl shadow-md transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Calendar className="h-4 w-4 text-amber-300" />
              <span>পরবর্তী দিনের চেকলিস্ট প্ল্যানার সাজান</span>
            </button>
          </div>
        </section>
      )}

      {/* Top Template Selector (No-Print) */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm no-print">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                COO অফিসিয়াল রিপোর্টিং ফরম্যাট ও সাবমিশন ম্যাট্রিক্স (Daily · Monthly · Yearly)
              </h2>
            </div>
            <p className="text-xs text-slate-600">
              JD Section M অনুযায়ী সকল রিপোর্ট ফরম্যাট নিচে প্রস্তুত আছে। লাইভ অগ্রগতি চার্ট, পাই চার্ট ও যৌক্তিক মূল্যায়নসহ রিপোর্ট প্রিন্ট বা আর্কাইভ করুন।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Quick Carryover Planner Button */}
            <button
              type="button"
              onClick={() => setPlannerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-900 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300 rounded-xl shadow-2xs transition-all cursor-pointer"
              title="আজকের পেন্ডিং কাজ দিয়ে আগামী দিনের চেকলিস্ট সাজান"
            >
              <Calendar className="h-3.5 w-3.5 text-amber-700" />
              <span>পরবর্তী দিনের চেকলিস্ট সাজান</span>
            </button>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              {(['all', 'daily', 'monthly', 'yearly'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCadenceFilter(c)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize whitespace-nowrap cursor-pointer ${
                    cadenceFilter === c
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {c === 'all' ? 'সকল ফরম্যাট' : c}
                </button>
              ))}
            </div>
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
                className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                  active
                    ? 'border-blue-600 bg-blue-50/60 shadow-xs ring-1 ring-blue-600/30'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
                  <span className="capitalize font-bold text-blue-700">{tpl.cadence}</span>
                  <span className="text-[11px] text-slate-600">To: {tpl.submittedTo}</span>
                </div>
                <div className="text-sm font-bold text-slate-950 mt-1 line-clamp-1">
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
        {/* Form Builder (Left 5 Cols, Hidden on Print) */}
        <section className="xl:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm no-print space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {viewingSavedReport
                  ? 'সংরক্ষিত রিপোর্ট প্রিভিউ দেখছেন'
                  : `${activeTemplate.titleBn} — এডিটর`}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                জমা দেওয়ার কর্তৃপক্ষ: <strong>{recipient}</strong>
              </p>
            </div>

            {!viewingSavedReport && (
              <button
                type="button"
                onClick={handleAutoPopulate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
                title="লাইভ ডাটা, পাই চার্ট ও স্মার্ট সমালোচনা পূরণ করুন"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>লাইভ ডাটা অটো-ফিল</span>
              </button>
            )}
          </div>

          {viewingSavedReport ? (
            <div className="py-5 space-y-4">
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                  <Archive className="h-4 w-4 text-blue-600" />
                  <span>আর্কাইভ থেকে লোডকৃত রিপোর্ট</span>
                </div>
                <div className="text-xs text-slate-700 leading-relaxed font-mono">
                  <div>শিরোনাম: <strong>{viewingSavedReport.templateTitle}</strong></div>
                  <div>তারিখ / পর্যায়: <strong>{viewingSavedReport.periodLabel}</strong></div>
                  <div>প্রাপক: <strong>{viewingSavedReport.submittedTo}</strong></div>
                  <div>সংরক্ষণের সময়: <strong>{viewingSavedReport.createdAt.slice(0, 10)}</strong></div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-amber-400" />
                  <span>এই সংরক্ষিত রিপোর্টটি A4 প্রিন্ট / PDF করুন</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyText(viewingSavedReport)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                >
                  <Copy className="h-4 w-4 text-blue-600" />
                  <span>ইমেইল / WhatsApp টেক্সট কপি করুন</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleMailto(viewingSavedReport)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl transition-all cursor-pointer"
                >
                  <Mail className="h-4 w-4 text-blue-700" />
                  <span>ইমেইল ড্রাফট পাঠান (Mailto)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewingSavedReport(null)}
                  className="w-full px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 text-center cursor-pointer pt-2"
                >
                  ← নতুন রিপোর্ট এডিটরে ফিরে যান
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveReport} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    রিপোর্ট তারিখ / মাস / বছর *
                  </label>
                  <input
                    type="text"
                    value={periodLabel}
                    onChange={(e) => setPeriodLabel(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    কাকে জমা দেবেন (Recipient Dropdown) *
                  </label>
                  <select
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs text-slate-900 cursor-pointer"
                  >
                    <option value="Managing Director (MD)">Managing Director (MD)</option>
                    <option value="Chairman">Chairman</option>
                    <option value="Managing Director / Chairman">MD & Chairman (উভয়কে)</option>
                    <option value="CFO / Accounts Department">CFO / Accounts Department</option>
                    <option value="Management Committee">Management Committee</option>
                    <option value="COO Self-Record / Internal Audit">COO Self-Record / Audit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  এক্সিকিউটিভ সারসংক্ষেপ (Executive Summary)
                </label>
                <textarea
                  rows={2}
                  value={summaryText}
                  onChange={(e) => setSummaryText(e.target.value)}
                  placeholder="রিপোর্টের মূল সারসংক্ষেপ ২-৩ লাইনে লিখুন..."
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 leading-relaxed font-medium"
                />
              </div>

              {/* Operational Critique & Commentary Field */}
              <div className="p-3.5 bg-gradient-to-br from-amber-50/50 via-white to-slate-50 border border-amber-300/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <MessageSquareQuote className="h-4 w-4 text-amber-700" />
                    <span>রিপোর্ট সংক্রান্ত সমালোচনা, পর্যালোচনা ও এক্সিকিউটিভ মন্তব্য</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCritiqueCommentary(buildSmartCritique());
                      onNotifyToast('স্মার্ট সমালোচনা ও এক্সিকিউটিভ মন্তব্য জেনারেট করা হয়েছে।');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100/80 hover:bg-amber-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3 text-amber-700" />
                    <span>স্মার্ট সমালোচনা জেনারেট</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-600">
                  অপারেশনের দুর্বলতা, যে কাজগুলো বাকি রয়েছে তার গঠনমূলক সমালোচনা এবং এমডি/চেয়ারম্যান মহোদয়ের নিকট করণীয় সুপারিশ এখানে লিখুন।
                </p>
                <textarea
                  rows={4}
                  value={critiqueCommentary}
                  onChange={(e) => setCritiqueCommentary(e.target.value)}
                  placeholder="১. অর্জিত সাফল্য...&#10;২. দুর্বলতা ও ঘাটতির সমালোচনা...&#10;৩. সুপারিশ ও করণীয়..."
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-[11px] leading-relaxed"
                />
              </div>

              {activeTemplate.hasCapacityTable && (
                <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Upstream & NTTN Link Capacity Table (Mbps)
                    </span>
                    <button
                      type="button"
                      onClick={addCapacityRow}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> লিংক রো যোগ
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {capacityRows.map((row, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-1.5 bg-white p-2 border border-slate-200 rounded-lg text-xs"
                      >
                        <input
                          type="text"
                          value={row.providerName}
                          onChange={(e) => updateCapacityRow(idx, { providerName: e.target.value })}
                          placeholder="Provider"
                          className="col-span-5 px-2 py-1 border border-slate-200 rounded text-xs"
                        />
                        <select
                          value={row.linkType}
                          onChange={(e) =>
                            updateCapacityRow(idx, {
                              linkType: e.target.value as CapacityRow['linkType'],
                            })
                          }
                          className="col-span-3 px-1 py-1 border border-slate-200 rounded text-xs"
                        >
                          <option value="IIG">IIG</option>
                          <option value="GGC">GGC</option>
                          <option value="FNA">FNA</option>
                          <option value="CDN">CDN</option>
                          <option value="NTTN">NTTN</option>
                        </select>
                        <input
                          type="number"
                          value={row.currentCapacityMbps}
                          onChange={(e) =>
                            updateCapacityRow(idx, { currentCapacityMbps: Number(e.target.value) })
                          }
                          placeholder="Mbps"
                          className="col-span-4 px-1.5 py-1 border border-slate-200 rounded font-mono text-right text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Form Fields */}
              <div className="space-y-3 pt-1">
                {activeTemplate.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {field.labelBn}
                    </label>
                    {field.multiline ? (
                      <textarea
                        rows={2}
                        value={fieldValues[field.key] || ''}
                        onChange={(e) =>
                          setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    ) : (
                      <input
                        type="text"
                        value={fieldValues[field.key] || ''}
                        onChange={(e) =>
                          setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* JD #09 Official Email CC Compliance Checkbox */}
              <label className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ccConfirmed}
                  onChange={(e) => setCcConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                <span>
                  <strong>JD #09 কমপ্লায়েন্স চেক:</strong> SpeedNet Khulna-এর অফিসিয়াল ইমেইল (
                  <span className="font-mono text-blue-700 font-bold">{db.settings.branchOfficialCcEmail}</span>) CC নিশ্চিত করা হয়েছে।
                </span>
              </label>

              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <FileCheck2 className="h-4 w-4" />
                  <span>সার্ভারে সেভ করুন</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyText()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {copiedFlag ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span>টেক্সট কপি</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <Printer className="h-4 w-4 text-amber-400" />
                  <span>A4 প্রিন্ট / PDF</span>
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Live Official Letterhead Preview (Right 7 Cols, Full Width on Print) */}
        <section className="xl:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-7 sm:p-9 shadow-sm print-sheet">
          {/* Web-only action bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-5 border-b border-slate-200 no-print">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              <span>
                {viewingSavedReport
                  ? `সংরক্ষিত রিপোর্ট প্রিভিউ: ${viewingSavedReport.periodLabel}`
                  : 'অফিসিয়াল লেটারহেড প্রিন্ট প্রিভিউ (A4 Format)'}
              </span>
            </span>

            <div className="flex flex-wrap items-center gap-2">
              {viewingSavedReport && (
                <button
                  type="button"
                  onClick={() => handleMailto(viewingSavedReport)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-xl transition-all cursor-pointer"
                  title="ইমেইল ক্লায়েন্টে পাঠান"
                >
                  <Mail className="h-3.5 w-3.5 text-blue-600" />
                  <span>ইমেইল ড্রাফট</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleCopyText(viewingSavedReport || undefined)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5 text-slate-600" />
                <span>টেক্সট কপি</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Printer className="h-4 w-4 text-amber-400" />
                <span>A4 সরাসরি প্রিন্ট</span>
              </button>
            </div>
          </div>

          {/* Official Letterhead Header */}
          <div className="border-b-2 border-slate-950 pb-4 flex items-start justify-between gap-4">
            <div>
              <div className="text-2xl font-black tracking-tight text-slate-950 uppercase">
                {db.settings.companyName}
              </div>
              <div className="text-xs font-bold text-slate-700 tracking-wide mt-0.5">
                OFFICE OF THE CHIEF OPERATING OFFICER (OPERATIONS & ADMINISTRATION)
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Corporate HQ: Khulna, Bangladesh · Official CC: {db.settings.branchOfficialCcEmail}
              </div>
            </div>
            <div className="text-right font-mono text-xs text-slate-800 tabular-nums shrink-0">
              <div className="font-bold text-slate-950">
                REF: SN-COO-{isMonthlyReport ? 'M' : 'D'}-{previewReport.periodLabel.replace(/[^a-zA-Z0-9]/g, '')}
              </div>
              <div>তারিখ: {previewReport.createdAt.slice(0, 10)}</div>
              <div>পর্যায়: {previewReport.periodLabel}</div>
            </div>
          </div>

          {/* Submission Metadata Block */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs bg-slate-50 border border-slate-300 rounded-xl p-3.5 print:bg-slate-50">
            <div>
              <span className="text-slate-500 font-semibold">Submitted To:</span>{' '}
              <strong className="text-slate-950 font-bold">{previewReport.submittedTo}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-semibold">Official CC:</span>{' '}
              <span className="font-mono font-bold text-slate-900">
                {db.settings.branchOfficialCcEmail}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 font-semibold">Subject:</span>{' '}
              <strong className="text-slate-950 font-bold text-sm">
                {previewReport.templateTitle} ({previewReport.periodLabel})
              </strong>
            </div>
            <div className="col-span-2 text-slate-600 text-[11px]">
              <span>Prepared By: </span>
              <strong>{db.settings.employeeName}</strong>, {db.settings.designation} ({db.settings.department})
            </div>
          </div>

          {/* Executive Summary */}
          {previewReport.summaryText && (
            <div className="mt-4 p-3.5 bg-blue-50/40 border border-blue-200/80 rounded-xl">
              <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                <span>Executive Summary & Overview</span>
              </h4>
              <p className="text-xs text-slate-800 mt-1 whitespace-pre-line leading-relaxed font-medium">
                {previewReport.summaryText}
              </p>
            </div>
          )}

          {/* SECTION 1: VISUAL PIE CHART & OPERATIONAL IMPLEMENTATION BREAKDOWN */}
          <div className="mt-5 border border-slate-300 rounded-xl p-4.5 bg-white break-inside-avoid print:break-inside-avoid print:border-slate-400">
            <div className="flex items-center justify-between pb-2.5 mb-3.5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-blue-700" />
                <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wider">
                  ১. অপারেশনাল বাস্তবায়ন পাই চার্ট ও ক্যাটাগরি প্রগ্রেস ({isMonthlyReport ? 'Monthly Report' : 'Daily Report'})
                </h4>
              </div>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
                {checklistPercent}% অর্জিত
              </span>
            </div>

            {/* Split Grid: Left Side Vector Pie/Donut Chart + Right Side Metric Legend */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center mb-4 pb-4 border-b border-slate-200">
              {/* Left Column (5 Cols): Vector SVG Pie/Donut Chart */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg
                    className="w-36 h-36 -rotate-90 transform"
                    viewBox="0 0 130 130"
                  >
                    {/* Background Ring */}
                    <circle
                      cx="65"
                      cy="65"
                      r="52"
                      fill="transparent"
                      stroke="#f1f5f9"
                      strokeWidth="20"
                    />
                    {/* Pending Slice (Amber Gold) */}
                    <circle
                      cx="65"
                      cy="65"
                      r="52"
                      fill="transparent"
                      stroke="#d97706"
                      strokeWidth="20"
                      strokeDasharray={`${circleCircumference} ${circleCircumference}`}
                      strokeDashoffset={0}
                    />
                    {/* Completed Slice (Emerald Green) */}
                    <circle
                      cx="65"
                      cy="65"
                      r="52"
                      fill="transparent"
                      stroke="#059669"
                      strokeWidth="20"
                      strokeDasharray={`${completedStrokeLength} ${circleCircumference}`}
                      strokeDashoffset={0}
                      className="transition-all duration-500"
                    />
                  </svg>

                  {/* Center Text in Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-2xl font-black font-mono text-slate-950 tabular-nums leading-none">
                      {checklistPercent}%
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 uppercase mt-0.5">
                      অর্জিত
                    </span>
                  </div>
                </div>

                <div className="text-[11px] font-bold text-slate-600 mt-2 font-mono">
                  পাই চার্ট: বাস্তবায়ন বণ্টন
                </div>
              </div>

              {/* Right Column (7 Cols): Slices Breakdown & KPI Metric Strip */}
              <div className="sm:col-span-7 space-y-2.5">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  বাস্তবায়ন ও দায়িত্ব বিশ্লেষণ (Task Distribution):
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Completed Slice Card */}
                  <div className="p-2.5 bg-emerald-50/80 border border-emerald-300 rounded-xl">
                    <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                      <span>সম্পন্ন কাজ</span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5 font-mono">
                      <span className="text-lg font-black text-emerald-950 tabular-nums">
                        {completedChecklists}
                      </span>
                      <span className="text-xs font-bold text-emerald-800">
                        ({checklistPercent}%)
                      </span>
                    </div>
                  </div>

                  {/* Pending Slice Card */}
                  <div className="p-2.5 bg-amber-50/80 border border-amber-300 rounded-xl">
                    <div className="flex items-center gap-1.5 text-amber-950 font-bold text-xs">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <span>পেন্ডিং কাজ</span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5 font-mono">
                      <span className="text-lg font-black text-amber-950 tabular-nums">
                        {pendingChecklists}
                      </span>
                      <span className="text-xs font-bold text-amber-800">
                        ({pendingPercent}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* KPI Points & Safety Status Bar */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px] font-semibold">লাইভ KPI স্কোর:</span>{' '}
                    <strong className="font-mono text-slate-950 font-bold">
                      {kpiSummary.totalScore.toFixed(1)} / 100
                    </strong>
                  </div>
                  <div className="font-mono text-xs">
                    <span className="text-slate-500 text-[11px]">ঝুঁকি অ্যালার্ম:</span>{' '}
                    <strong className="text-red-700 font-bold">{urgentRenewals.length}টি ফাইল</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Department / Category-wise Horizontal Completion Breakdown Chart */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                বিভাগ ও ক্যাটাগরিভিত্তিক বাস্তবায়ন অগ্রগতি:
              </div>

              <div className="space-y-2">
                {categoryStats.map((cat) => {
                  const isFull = cat.percent === 100;
                  const isZero = cat.percent === 0;

                  return (
                    <div key={cat.num} className="space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900 truncate max-w-[260px] sm:max-w-md">
                          {cat.num}. {cat.name}
                        </span>
                        <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums shrink-0">
                          <span className="font-bold text-slate-800">
                            {cat.completed}/{cat.total}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              isFull
                                ? 'bg-emerald-100 text-emerald-800'
                                : isZero
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {cat.percent}%
                          </span>
                        </div>
                      </div>

                      {/* Visual Bar */}
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-300">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isFull
                              ? 'bg-emerald-600'
                              : isZero
                              ? 'bg-slate-300'
                              : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.max(3, cat.percent)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 2: OPERATIONAL CRITIQUE, REVIEW & REMARKS (COO Evaluation & Critique) */}
          {previewReport.critiqueCommentary && (
            <div className="mt-5 border border-amber-300 bg-amber-50/30 rounded-xl p-4.5 break-inside-avoid print:break-inside-avoid">
              <div className="flex items-center gap-2 pb-2.5 mb-2.5 border-b border-amber-200">
                <MessageSquareQuote className="h-4 w-4 text-amber-800 shrink-0" />
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  ২. অপারেশনাল পর্যালোচনা, যৌক্তিক সমালোচনা ও এক্সিকিউটিভ মন্তব্য (COO Evaluation & Critique)
                </h4>
              </div>

              <div className="text-xs text-slate-900 whitespace-pre-line leading-relaxed font-mono text-[11px] bg-white/80 p-3 rounded-lg border border-amber-200/80">
                {previewReport.critiqueCommentary}
              </div>
            </div>
          )}

          {/* Upstream & NTTN Capacity Statement Table (if applicable) */}
          {previewReport.capacityRows && previewReport.capacityRows.length > 0 && (
            <div className="mt-5 break-inside-avoid print:break-inside-avoid">
              <h4 className="text-xs font-bold text-slate-950 mb-2 uppercase tracking-wider">
                Upstream (IIG, GGC, FNA, CDN) & NTTN Capacity Statement
              </h4>
              <table className="w-full text-left border-collapse text-xs border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                    <th className="py-2 px-2.5">Provider / Link</th>
                    <th className="py-2 px-2">Type</th>
                    <th className="py-2 px-2">Action</th>
                    <th className="py-2 px-2 text-right">Δ Mbps</th>
                    <th className="py-2 px-2 text-right">Current Capacity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {previewReport.capacityRows.map((r, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 px-2.5 font-semibold text-slate-950">{r.providerName}</td>
                      <td className="py-1.5 px-2 font-mono">{r.linkType}</td>
                      <td className="py-1.5 px-2">{r.changeType}</td>
                      <td className="py-1.5 px-2 font-mono text-right tabular-nums">
                        {r.changeMbps > 0 ? `+${r.changeMbps}` : r.changeMbps}
                      </td>
                      <td className="py-1.5 px-2 font-mono font-bold text-right tabular-nums">
                        {r.currentCapacityMbps} Mbps
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Structured Questionnaire Fields */}
          <div className="mt-5 space-y-3.5 break-inside-avoid print:break-inside-avoid">
            {Object.entries(previewReport.structuredFields).map(([k, val]) => {
              if (!val) return null;
              const def = REPORT_TEMPLATES.flatMap((t) => t.fields).find((f) => f.key === k);
              return (
                <div key={k} className="border-b border-slate-200 pb-2.5">
                  <div className="text-xs font-bold text-slate-900">
                    {def ? def.labelBn : k}
                  </div>
                  <div className="text-xs text-slate-800 mt-1 whitespace-pre-line leading-relaxed font-normal">
                    {val}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Official Signatures & Endorsements Block */}
          <div className="mt-12 pt-6 border-t-2 border-slate-950 flex items-end justify-between text-xs text-slate-900 break-inside-avoid print:break-inside-avoid">
            <div>
              <div className="font-bold text-slate-950 text-sm">{db.settings.employeeName}</div>
              <div className="font-semibold text-slate-700">{db.settings.designation}</div>
              <div className="text-slate-500 text-[11px]">{db.settings.companyName}</div>
              <div className="text-slate-400 font-mono text-[10px] mt-1">
                Signed electronically on {previewReport.createdAt.slice(0, 10)}
              </div>
            </div>

            <div className="text-right">
              <div className="border-t border-slate-600 pt-1.5 px-8 font-bold text-slate-950">
                Approved & Received By
              </div>
              <div className="text-slate-700 text-[11px] mt-0.5">
                {previewReport.submittedTo}
              </div>
              <div className="text-slate-400 text-[10px] font-mono">Date: ____________________</div>
            </div>
          </div>
        </section>
      </div>

      {/* COMPREHENSIVE ARCHIVE FILTER & SEARCH CONSOLE (REQUIRED BY USER: Date & Month Filter) */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm no-print space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-900">
                <Archive className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900">
                সংরক্ষিত পূর্ববর্তী রিপোর্ট আর্কাইভ ও ফিল্টার কনসোল ({db.reports.length}টি সংরক্ষিত)
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              নির্দিষ্ট দিন বা মাসের রিপোর্ট ফিল্টার করে দেখুন, সরাসরি A4 প্রিন্ট করুন অথবা WhatsApp/ইমেইলে পাঠানোর জন্য কপি করুন।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={handleFilterToday}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-800 font-semibold cursor-pointer"
            >
              আজকের রিপোর্ট
            </button>
            <button
              type="button"
              onClick={handleFilterYesterday}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-800 font-semibold cursor-pointer"
            >
              গতকালকের
            </button>
            <button
              type="button"
              onClick={handleFilterThisMonth}
              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-800 font-semibold cursor-pointer"
            >
              চলতি মাস
            </button>
            <button
              type="button"
              onClick={handleFilterLastMonth}
              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-800 font-semibold cursor-pointer"
            >
              গত মাস
            </button>
            <button
              type="button"
              onClick={handleClearArchiveFilters}
              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-800 font-bold cursor-pointer"
            >
              সব রিপোর্ট ({db.reports.length})
            </button>
          </div>
        </div>

        {/* Detailed Filter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {/* Specific Date Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-blue-600" />
              <span>নির্দিষ্ট দিন (Date Filter)</span>
            </label>
            <input
              type="date"
              value={archiveDateFilter}
              onChange={(e) => {
                setArchiveDateFilter(e.target.value);
                if (e.target.value) setArchiveMonthFilter('');
              }}
              className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs"
            />
          </div>

          {/* Specific Month Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
              <CalendarDays className="h-3 w-3 text-indigo-600" />
              <span>নির্দিষ্ট মাস (Month Filter)</span>
            </label>
            <input
              type="month"
              value={archiveMonthFilter}
              onChange={(e) => {
                setArchiveMonthFilter(e.target.value);
                if (e.target.value) setArchiveDateFilter('');
              }}
              className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs"
            />
          </div>

          {/* Cadence Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">রিপোর্টের ধরন</label>
            <select
              value={archiveCadenceFilter}
              onChange={(e) => setArchiveCadenceFilter(e.target.value as 'all' | MonitoringCadence)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer shadow-2xs"
            >
              <option value="all">সকল ক্যাডেন্স</option>
              <option value="daily">Daily (দৈনিক)</option>
              <option value="monthly">Monthly (মাসিক)</option>
              <option value="yearly">Yearly (বাৎসরিক)</option>
            </select>
          </div>

          {/* Recipient Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">জমা দেওয়ার প্রাপক</label>
            <select
              value={archiveRecipientFilter}
              onChange={(e) => setArchiveRecipientFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer shadow-2xs"
            >
              <option value="all">সকল প্রাপক</option>
              <option value="Managing Director (MD)">Managing Director (MD)</option>
              <option value="Chairman">Chairman</option>
              <option value="Managing Director / Chairman">MD & Chairman (উভয়কে)</option>
              <option value="CFO / Accounts Department">CFO</option>
              <option value="Management Committee">Management</option>
            </select>
          </div>

          {/* Search Query */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Search className="h-3 w-3 text-slate-500" />
              <span>সার্চ কি-ওয়ার্ড</span>
            </label>
            <input
              type="text"
              value={archiveSearchQuery}
              onChange={(e) => setArchiveSearchQuery(e.target.value)}
              placeholder="শিরোনাম বা মন্তব্য..."
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs"
            />
          </div>
        </div>

        {/* Filter Results & List */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-2">
            <span>
              ফিল্টার অনুযায়ী মোট <strong>{filteredArchiveReports.length}টি</strong> রিপোর্ট পাওয়া গেছে
            </span>
            {(archiveDateFilter || archiveMonthFilter || archiveCadenceFilter !== 'all' || archiveRecipientFilter !== 'all' || archiveSearchQuery) && (
              <button
                type="button"
                onClick={handleClearArchiveFilters}
                className="text-blue-700 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>ফিল্টার মুছুন</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {filteredArchiveReports.length === 0 ? (
              <div className="py-12 text-center space-y-2 bg-slate-50/50">
                <Search className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">
                  এই তারিখ বা ফিল্টারে কোনো রিপোর্ট পাওয়া যায়নি।
                </p>
                <button
                  type="button"
                  onClick={handleClearArchiveFilters}
                  className="px-3 py-1 text-xs font-bold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer"
                >
                  সকল রিপোর্ট দেখুন
                </button>
              </div>
            ) : (
              filteredArchiveReports.map((rep) => (
                <div
                  key={rep.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    viewingSavedReport?.id === rep.id
                      ? 'bg-blue-50/70 border-l-4 border-l-blue-600'
                      : 'hover:bg-slate-50/80 bg-white'
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold uppercase text-[10px]">
                        {rep.cadence}
                      </span>
                      <span className="font-semibold text-slate-900">{rep.periodLabel}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600">তারিখ: {rep.createdAt.slice(0, 10)}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-700 font-sans">প্রাপক: <strong>{rep.submittedTo}</strong></span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-950 truncate">
                      {rep.templateTitle}
                    </h4>

                    {rep.summaryText && (
                      <p className="text-xs text-slate-600 line-clamp-1 leading-relaxed">
                        {rep.summaryText}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        setViewingSavedReport(rep);
                        window.scrollTo({ top: 380, behavior: 'smooth' });
                      }}
                      className="px-3.5 py-1.5 text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors cursor-pointer shadow-2xs"
                      title="লেটারহেডে প্রিভিউ ও সরাসরি প্রিন্ট করুন"
                    >
                      প্রিভিউ ও প্রিন্ট
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyText(rep)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      title="টেক্সট কপি"
                    >
                      <Copy className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMailto(rep)}
                      className="p-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                      title="ইমেইল ড্রাফট"
                    >
                      <Mail className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteReport(rep.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="আর্কাইভ থেকে মুছুন"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Next Day Checklist Planner Modal */}
      {onPlanNextDay && (
        <NextDayPlannerModal
          open={plannerOpen}
          onClose={() => setPlannerOpen(false)}
          db={db}
          onPlanNextDay={onPlanNextDay}
          onNotifyToast={onNotifyToast}
          onNavigateToChecklist={onNavigateToChecklist}
        />
      )}
    </div>
  );
};
