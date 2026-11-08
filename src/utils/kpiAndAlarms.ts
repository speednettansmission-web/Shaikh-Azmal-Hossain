import type { JdItem, KpiGroup, MonitoringCadence, RenewalItem } from '../types.ts';

export interface KpiGroupScore {
  group: KpiGroup;
  doneCount: number;
  pendingCount: number;
  notDoneCount: number;
  naCount: number;
  applicableCount: number;
  score: number;
}

export interface KpiSummary {
  groupScores: KpiGroupScore[];
  totalWeight: number;
  totalScore: number;
  totalDone: number;
  totalPending: number;
  totalNotDone: number;
  totalNa: number;
}

export function calculateKpiSummary(kpiGroups: KpiGroup[], jdItems: JdItem[]): KpiSummary {
  let totalWeight = 0;
  let totalScore = 0;
  let totalDone = 0;
  let totalPending = 0;
  let totalNotDone = 0;
  let totalNa = 0;

  const sortedGroups = [...kpiGroups].sort((a, b) => b.weight - a.weight);

  const groupScores: KpiGroupScore[] = sortedGroups.map((group) => {
    const items = jdItems.filter((item) => item.kpiGroupId === group.id);
    const doneCount = items.filter((i) => i.status === 'Done').length;
    const pendingCount = items.filter((i) => i.status === 'Pending').length;
    const notDoneCount = items.filter((i) => i.status === 'Not Done').length;
    const naCount = items.filter((i) => i.status === 'N/A').length;

    const applicableCount = doneCount + pendingCount + notDoneCount;
    const rawScore = applicableCount > 0 ? (doneCount / applicableCount) * group.weight : 0;
    const score = Math.round(rawScore * 100) / 100;

    totalWeight += group.weight;
    totalScore += score;
    totalDone += doneCount;
    totalPending += pendingCount;
    totalNotDone += notDoneCount;
    totalNa += naCount;

    return {
      group,
      doneCount,
      pendingCount,
      notDoneCount,
      naCount,
      applicableCount,
      score,
    };
  });

  return {
    groupScores,
    totalWeight,
    totalScore: Math.round(totalScore * 100) / 100,
    totalDone,
    totalPending,
    totalNotDone,
    totalNa,
  };
}

export interface EvaluatedRenewal {
  item: RenewalItem;
  daysRemaining: number;
  state: 'overdue' | 'alarm-1m' | 'upcoming-60d' | 'safe';
  stateLabelBn: string;
}

export function evaluateRenewals(renewals: RenewalItem[], globalLeadDays = 30): EvaluatedRenewal[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return renewals
    .map((item) => {
      const exp = new Date(`${item.expiryDate}T00:00:00`);
      const diffMs = exp.getTime() - now.getTime();
      const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const threshold = Math.max(item.alertDaysBefore || 30, globalLeadDays);

      let state: EvaluatedRenewal['state'] = 'safe';
      let stateLabelBn = 'সচল (নিরাপদ মেয়াদ)';

      if (daysRemaining < 0) {
        state = 'overdue';
        stateLabelBn = `মেয়াদোত্তীর্ণ (${Math.abs(daysRemaining)} দিন অতিবাহিত)`;
      } else if (daysRemaining <= threshold) {
        state = 'alarm-1m';
        stateLabelBn = `১ মাসের আগাম অ্যালার্ম (${daysRemaining} দিন বাকি)`;
      } else if (daysRemaining <= 60) {
        state = 'upcoming-60d';
        stateLabelBn = `আসন্ন নবায়ন (${daysRemaining} দিন বাকি)`;
      }

      return {
        item,
        daysRemaining,
        state,
        stateLabelBn,
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export function playExecutiveAlarmChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [587.33, 880, 1174.66]; // D5, A5, D6 crisp chime
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + index * 0.14;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.45);
    });
  } catch {
    // Ignore audio context restriction errors
  }
}

export interface ReportFieldDef {
  key: string;
  labelBn: string;
  placeholder: string;
  multiline?: boolean;
}

export interface ReportTemplateDef {
  id: string;
  title: string;
  titleBn: string;
  cadence: MonitoringCadence;
  submittedTo: string;
  jdRef: string;
  kpiWeight: number;
  hasCapacityTable?: boolean;
  fields: ReportFieldDef[];
}

export const REPORT_TEMPLATES: ReportTemplateDef[] = [
  {
    id: 'daily-ops-report',
    title: 'Daily Operations, Pending Tasks & Departmental Status Report',
    titleBn: 'দৈনিক অপারেশনস, পেন্ডিং কাজ ও বিভাগীয় আপডেট রিপোর্ট',
    cadence: 'daily',
    submittedTo: 'MD / Chairman',
    jdRef: 'JD #01, 03, 04, 06, 08, 09, 30, 40',
    kpiWeight: 15,
    fields: [
      {
        key: 'officeDisciplineAndAttendance',
        labelBn: 'Corporate ও Branch Office শৃঙ্খলা, উপস্থিতি ও ফ্যাসিলিটিজ (JD 03, 40)',
        placeholder: 'আজকের উপস্থিতি, অফিস শৃঙ্খলা, জেনারেটর/CCTV স্ট্যাটাস লিখুন...',
        multiline: true,
      },
      {
        key: 'upstreamAndNocStatus',
        labelBn: 'IIG, NTTN লিংক স্ট্যাটাস ও ভেন্ডর ইমেইল CC কমপ্লায়েন্স (JD 06, 08, 09)',
        placeholder: 'সকল লিংক সচল আছে কি না এবং ভেন্ডর ইমেইলে SpeedNet Khulna CC রাখা হয়েছে কি না...',
        multiline: true,
      },
      {
        key: 's7RadiusAndMaximStatus',
        labelBn: 'Maxim বিলিং ও S7 RADIUS কানেক্টিভিটি ইস্যু মনিটরিং (JD 29, 30)',
        placeholder: 'কোনো ইউজার অথেন্টিকেশন বা বিলিং টিকেট চলমান থাকলে তার অগ্রগতি...',
        multiline: true,
      },
      {
        key: 'pendingBranchAndPartnerIssues',
        labelBn: 'আজকের সম্পন্ন কাজ ও আগামীকালের পেন্ডিং ফলোআপ (JD 04, 23)',
        placeholder: 'ব্রাঞ্চ ম্যানেজার বা পার্টনার সংক্রান্ত পেন্ডিং ইস্যু ও সমাধানের সময়সীমা...',
        multiline: true,
      },
      {
        key: 'urgentExpiryAlerts',
        labelBn: 'মেয়াদোত্তীর্ণ / আগামী ৩০ দিনের জরুরি লাইসেন্স ও চুক্তি নবায়ন সতর্কতা',
        placeholder: 'আগামী ১ মাসের মধ্যে মেয়াদ শেষ হবে এমন আইটেমসমূহ...',
        multiline: true,
      },
    ],
  },
  {
    id: 'upstream-nttn-capacity',
    title: 'Upstream & NTTN Monthly Capacity Report',
    titleBn: 'Upstream (IIG, GGC, FNA, CDN) ও NTTN মাসিক ক্যাপাসিটি রিপোর্ট',
    cadence: 'monthly',
    submittedTo: 'Managing Director (MD)',
    jdRef: 'JD #07, 10, 11 (Matrix #1)',
    kpiWeight: 15,
    hasCapacityTable: true,
    fields: [
      {
        key: 'mdPreApprovalRef',
        labelBn: 'MD পূর্বানুমোদন ও NOC যাচাই রেফারেন্স (JD 11)',
        placeholder: 'সকল আপগ্রেড/ডাউনগ্রেড পরিবর্তনে MD স্যারের পূর্বানুমোদনের তারিখ ও নোট...',
        multiline: true,
      },
      {
        key: 'serviceQualityAndDowntime',
        labelBn: 'ভেন্ডর সার্ভিস স্ট্যাটাস, ডাউনটাইম ও বিলিং সমন্বয় নোট (JD 06, 08)',
        placeholder: 'মাসজুড়ে লিংক স্ট্যাবিলিটি, SLA বা বিলিং ডিসকাউন্ট নোট...',
        multiline: true,
      },
    ],
  },
  {
    id: 'btrc-monthly-admin',
    title: 'BTRC Monthly Administrative Report (Non-Billing)',
    titleBn: 'BTRC মাসিক অ্যাডমিনিস্ট্রেটিভ রিপোর্ট (বিলিং তথ্য ব্যতীত)',
    cadence: 'monthly',
    submittedTo: 'Managing Director (MD)',
    jdRef: 'JD #14 (Matrix #2)',
    kpiWeight: 10,
    fields: [
      {
        key: 'popAndNetworkAdminSummary',
        labelBn: 'সচল POP সংখ্যা, কভারেজ জোন ও প্রশাসনিক পরিবর্তন বিবরণ',
        placeholder: 'বর্তমান POP তালিকা, নতুন সংযোজন বা রিলোকেশন তথ্য...',
        multiline: true,
      },
      {
        key: 'manpowerAndComplianceData',
        labelBn: 'মোট জনবল, টেকনিক্যাল/নন-টেকনিক্যাল স্টাফ ও রেগুলেটরি তথ্য',
        placeholder: 'বিভাগওয়ারী জনবল সংখ্যা ও কমপ্লায়েন্স নথি যাচাই...',
        multiline: true,
      },
      {
        key: 'regulatoryCorrespondence',
        labelBn: 'BTRC চিঠিপত্র, নির্দেশনা ও ডেডলাইন ফলোআপ নোট (JD 13)',
        placeholder: 'চলতি মাসে প্রাপ্ত BTRC নোটিশ বা সাবমিশন তারিখ...',
        multiline: true,
      },
    ],
  },
  {
    id: 'ssl-monthly-sms',
    title: 'SSL Monthly Bulk SMS Usage, Purchase & Balance Report',
    titleBn: 'SSL মাসিক SMS ব্যবহার, ক্রয় ও ব্যালেন্স যাচাই রিপোর্ট',
    cadence: 'monthly',
    submittedTo: 'CFO / Accounts Department',
    jdRef: 'JD #18 (Matrix #3)',
    kpiWeight: 8,
    fields: [
      {
        key: 'openingAndPurchasedSms',
        labelBn: 'প্রারম্ভিক ব্যালেন্স ও চলতি মাসে ক্রয়কৃত SMS সংখ্যা ও ইনভয়েস',
        placeholder: 'উদাহরণ: প্রারম্ভিক ১২,৪০০ + নতুন ক্রয় ৫০,০০০ (Invoice #SSL-902)...',
      },
      {
        key: 'totalSentAndSuccessRate',
        labelBn: 'মোট প্রেরিত বাল্ক ও বিলিং SMS, ডেলিভারি সাকসেস ও ফেইল্ড ফলোআপ',
        placeholder: 'উদাহরণ: মোট প্রেরিত ১৩,৯০০; সফল ৯৮.৭%; ফেইল্ড ১৮০টি যাচাইকৃত...',
        multiline: true,
      },
      {
        key: 'closingSmsBalance',
        labelBn: 'মাস শেষে অবশিষ্ট পোর্টাল ব্যালেন্স ও পরবর্তী রিচার্জ প্রস্তাবনা',
        placeholder: 'উদাহরণ: সমাপনী ব্যালেন্স ৪৮,৫০০ SMS (আগামী মাসের জন্য পর্যাপ্ত)...',
      },
    ],
  },
  {
    id: 'manpower-recruitment-chairman',
    title: 'Manpower Requirement, Shortage & Recruitment Approval Report',
    titleBn: 'বিভাগভিত্তিক জনবল চাহিদা, ঘাটতি ও নিয়োগ অনুমোদন রিপোর্ট',
    cadence: 'monthly',
    submittedTo: 'Chairman',
    jdRef: 'JD #02, 35, 36, 37, 38 (Matrix #4)',
    kpiWeight: 10,
    fields: [
      {
        key: 'deptShortageSummary',
        labelBn: 'বিভাগভিত্তিক বর্তমান জনবল ও শূন্য পদের চাহিদা (JD 02)',
        placeholder: 'NOC, Support, Fiber Maintenance, Admin বা Marketing-এ ঘাটতি বিবরণ...',
        multiline: true,
      },
      {
        key: 'interviewAndSelectedCandidates',
        labelBn: 'লিখিত/ব্যবহারিক পরীক্ষা, নির্বাচিত প্রার্থী ও প্রস্তাবিত বেতন কাঠামো (JD 36)',
        placeholder: 'সংক্ষিপ্ত তালিকাভুক্ত প্রার্থীদের নাম, পদবি ও প্রস্তাবিত যোগদানের তারিখ...',
        multiline: true,
      },
      {
        key: 'transferPromotionDisciplinary',
        labelBn: 'বদলি, পদোন্নতি, ইনক্রিমেন্ট বা শৃঙ্খলাজনিত প্রস্তাবনা (JD 38)',
        placeholder: 'প্রযোজ্য ক্ষেত্রে কর্মীর পারফরম্যান্স তথ্যসহ অনুমোদনের প্রস্তাব...',
        multiline: true,
      },
    ],
  },
  {
    id: 'partner-commercial-approval',
    title: 'Strategic Partner (MAC, CP & DP) Commercial Terms & Approval',
    titleBn: 'নতুন ও বিদ্যমান পার্টনার (MAC, CP & DP) কমার্শিয়াল টার্মস ও অনুমোদন পত্র',
    cadence: 'monthly',
    submittedTo: 'Management',
    jdRef: 'JD #20, 21, 22, 23, 24, 25 (Matrix #5)',
    kpiWeight: 10,
    fields: [
      {
        key: 'partnerProfileAndFeasibility',
        labelBn: 'পার্টনারের নাম, জোন (MAC/CP/DP) ও ফিজিবিলিটি রিপোর্ট সারসংক্ষেপ (JD 20)',
        placeholder: 'পার্টনার প্রতিষ্ঠানের নাম, কভারেজ এলাকা, POP দূরত্ব ও সম্ভাব্য গ্রাহক সংখ্যা...',
        multiline: true,
      },
      {
        key: 'commercialRateAndRevenueShare',
        labelBn: 'প্রস্তাবিত ব্যান্ডউইথ রেট / রেভিনিউ শেয়ারিং (%) ও চুক্তির মেয়াদ (JD 22, 25)',
        placeholder: 'রেভিনিউ শেয়ার অনুপাত, মিনিমাম গ্যারান্টি, এক্সিট ক্লজ...',
        multiline: true,
      },
      {
        key: 'kycDepositChequeEquipment',
        labelBn: 'KYC, সিকিউরিটি ডিপোজিট, চেক ও ইকুইপমেন্ট স্টক বরাদ্দ (JD 21, 23)',
        placeholder: 'জামানতের পরিমাণ, MICR চেক নম্বর, ৩০০ টাকার ডিড ও প্রদানকৃত OLT/ONU তথ্য...',
        multiline: true,
      },
    ],
  },
  {
    id: 'monthly-kpi-ops-md',
    title: 'Monthly Operational Issues, Pending Tasks & KPI Performance Report',
    titleBn: 'মাসিক অপারেশনাল সমস্যা, পেন্ডিং কাজ ও বিভাগীয় KPI পারফরম্যান্স রিপোর্ট',
    cadence: 'monthly',
    submittedTo: 'MD / Chairman',
    jdRef: 'Section M (Matrix #6) + Monthly KPI Score',
    kpiWeight: 10,
    fields: [
      {
        key: 'kpiScoreHighlight',
        labelBn: 'মাসিক সামগ্রিক KPI স্কোর (/১০০) ও প্রধান অর্জনসমূহ',
        placeholder: 'স্বয়ংক্রিয়ভাবে KPI স্কোর যুক্ত হবে, প্রয়োজনে বিশেষ অর্জন যোগ করুন...',
        multiline: true,
      },
      {
        key: 'departmentalPerformanceAndTraining',
        labelBn: 'বিভাগীয় কর্মদক্ষতা, কর্মী প্রশিক্ষণ (TNA) ও ইন্টারনাল পোর্টাল আপডেট (JD 33, 48)',
        placeholder: 'কোন বিভাগে কী প্রশিক্ষণ ও প্রক্রিয়াগত উন্নয়ন সম্পন্ন হয়েছে...',
        multiline: true,
      },
      {
        key: 'unresolvedIssuesEscalation',
        labelBn: 'অমীমাংসিত অপারেশনাল চ্যালেঞ্জ ও MD/Chairman সিদ্ধান্তের প্রয়োজনীয়তা',
        placeholder: 'বাজেট, ভেন্ডর বা নীতিগত কোনো বিষয়ে শীর্ষ ব্যবস্থাপনার দিকনির্দেশনা...',
        multiline: true,
      },
    ],
  },
  {
    id: 'warranty-asset-register-coo',
    title: 'Office Product Warranty, Physical Asset & ID Card Audit Report',
    titleBn: 'অফিস ইকুইপমেন্ট ওয়ারেন্টি স্ট্যাটাস, ফিজিক্যাল অ্যাসেট ও আইডি কার্ড রেকর্ড',
    cadence: 'monthly',
    submittedTo: 'COO Self-Record / Internal Audit',
    jdRef: 'JD #16, 41, 42, 44, 46 (Matrix #7)',
    kpiWeight: 8,
    fields: [
      {
        key: 'warrantyClaimsAndExpiringGear',
        labelBn: 'ওয়ারেন্টি ক্লেইম স্ট্যাটাস, রিপ্লেসমেন্ট ও আসন্ন ওয়ারেন্টি শেষ হওয়া ডিভাইস (JD 16, 44)',
        placeholder: 'রাউটার, সুইচ, UPS, ল্যাপটপ বা জেনারেটর ওয়ারেন্টি ফলোআপ বিবরণ...',
        multiline: true,
      },
      {
        key: 'physicalAssetVerification',
        labelBn: 'অফিস ও POP ফিজিক্যাল অ্যাসেট ভেরিফিকেশন এবং মিসিং/ড্যামেজড রিপোর্ট (JD 41, 42)',
        placeholder: 'অ্যাসেট ট্যাগিং যাচাই ও স্টক সমন্বয় নোট...',
        multiline: true,
      },
      {
        key: 'idCardRegisterSummary',
        labelBn: 'নতুন ইস্যুকৃত, আপডেটকৃত ও চাকরি সমাপ্তিতে ফেরতকৃত Employee ID Card হিসাব (JD 46, 47)',
        placeholder: 'মোট নতুন কার্ড প্রিন্ট ও এক্সিট ক্লিয়ারেন্সে ফেরত কার্ডের সংখ্যা...',
      },
    ],
  },
  {
    id: 'monthly-consolidated-coo-md-chairman',
    title: 'Monthly Consolidated COO Operational & Performance Report',
    titleBn: 'মাসিক সমন্বিত COO অপারেশনাল ও পারফরম্যান্স রিপোর্ট (MD/Chairman)',
    cadence: 'monthly',
    submittedTo: 'Managing Director / Chairman',
    jdRef: 'Monthly Monitoring Checklist Section 8 & JD Summary Matrix',
    kpiWeight: 15,
    fields: [
      {
        key: 'executiveSummaryAndKeyAchievements',
        labelBn: '১. সামগ্রিক অপারেশনাল সারসংক্ষেপ ও প্রধান অর্জনসমূহ (Executive Summary)',
        placeholder: 'কোর নেটওয়ার্ক, সেলস বৃদ্ধি, পার্টনার সম্প্রসারণ ও প্রধান মাইলফলক...',
        multiline: true,
      },
      {
        key: 'departmentalSupervisionAndManpower',
        labelBn: '২. প্রশাসন, জনবল, উপস্থিতি ও কাস্টমার সার্ভিস পারফরম্যান্স (JD #01-05, Checklist 1)',
        placeholder: 'বায়োমেট্রিক উপস্থিতি, কাস্টমার কল সাকসেস রেট, রিক্রুটমেন্ট ও ব্রাঞ্চ ফলোআপ...',
        multiline: true,
      },
      {
        key: 'networkUptimeAndTransmission',
        labelBn: '৩. নেটওয়ার্ক আপটাইম, অপটিক্যাল ফাইবার ও ট্রান্সমিশন স্ট্যাটাস (NOC / Tech, Checklist 2-3)',
        placeholder: 'আপটাইম %, ফাইবার কাট প্রতিরোধ, পিওপি জেনারেটর/ইউপিএস ব্যাকআপ স্ট্যাটাস...',
        multiline: true,
      },
      {
        key: 'upstreamAndNttnCapacityMonthly',
        labelBn: '৪. Upstream (IIG, CDN, GGC, FNA) ও NTTN ক্যাপাসিটি আপডেট (JD #06-11, Checklist 5)',
        placeholder: 'ব্যান্ডউইথ ইউটিলাইজেশন, আপগ্রেড/ডাউনগ্রেড ওয়ার্ক অর্ডার ও কার্যকর তারিখ...',
        multiline: true,
      },
      {
        key: 'salesGrowthAndPartnerOperations',
        labelBn: '৫. সেলস গ্রোথ, কাস্টমার রিটেনশন ও MAC পার্টনার অপারেশনস (Marketing / SP, Checklist 4, 6)',
        placeholder: 'নেট একটিভেশন, লেফট ইউজার রিটেনশন %, পার্টনার অনবোর্ডিং ও সিকিউরিটি চেক কালেকশন...',
        multiline: true,
      },
      {
        key: 'complianceAndRenewalRisks',
        labelBn: '৬. রেগুলেটরি লাইসেন্স, POP ভাড়ার চুক্তি ও ১ মাসের আগাম অ্যালার্ম (Compliance, Checklist 7)',
        placeholder: 'BTRC নন-বিলিং রিপোর্ট পেশ, ট্রেড/ফায়ার লাইসেন্স ও পিওপি চুক্তির বর্তমান মেয়াদ...',
        multiline: true,
      },
      {
        key: 'monthlyKpiScoreAndCorrectiveAction',
        labelBn: '৭. মাসিক KPI স্কোর বিবরণী ও পেন্ডিং কাজের সংশোধনমূলক অ্যাকশন প্ল্যান (Checklist 8)',
        placeholder: 'বিভাগভিত্তিক স্কোর /১০০ এবং আগামী মাসের প্রধান টার্গেট ও সমাধান প্রস্তাবনা...',
        multiline: true,
      },
    ],
  },
  {
    id: 'yearly-compliance-annual-review',
    title: 'Yearly License, Rental Deed, Fire Safety & Annual Operations Report',
    titleBn: 'বাৎসরিক লাইসেন্স নবায়ন, ভাড়ার চুক্তি, অ্যাসেট অডিট ও বার্ষিক অপারেশনস সামারি',
    cadence: 'yearly',
    submittedTo: 'Managing Director / Chairman',
    jdRef: 'JD #12, 13, 19, 27, 28, 38, 50',
    kpiWeight: 10,
    fields: [
      {
        key: 'annualRegulatoryLicenses',
        labelBn: 'বাৎসরিক লাইসেন্স নবায়ন স্ট্যাটাস (BTRC, Trade, Fire, Labour Registration)',
        placeholder: 'সকল লাইসেন্সের বর্তমান মেয়াদ, পরিশোধিত ফি ও কমপ্লায়েন্স সনদ সংরক্ষণ...',
        multiline: true,
      },
      {
        key: 'annualRentalAndVendorContracts',
        labelBn: 'Head Office, Branch, POP ও Data Center ভাড়ার চুক্তি এবং Maxim/Vendor চুক্তি পর্যালোচনা',
        placeholder: 'বার্ষিক ভাড়া বৃদ্ধি/নবায়ন এবং ভেন্ডর SLA মূল্যায়ন...',
        multiline: true,
      },
      {
        key: 'annualHrAppraisalAndAssetAudit',
        labelBn: 'বার্ষিক কর্মী পারফরম্যান্স/ইনক্রিমেন্ট প্রস্তাবনা ও পূর্ণাঙ্গ ফিজিক্যাল অ্যাসেট অডিট',
        placeholder: 'বার্ষিক ইনক্রিমেন্ট তালিকা, ফায়ার সেফটি ড্রিল ও ডোমেইন/হোস্টিং নবায়ন সারসংক্ষেপ...',
        multiline: true,
      },
    ],
  },
];
