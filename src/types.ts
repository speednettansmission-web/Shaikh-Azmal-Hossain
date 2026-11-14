export type JdStatus = 'Done' | 'Pending' | 'Not Done' | 'N/A';

export type MonitoringCadence = 'daily' | 'monthly' | 'yearly';

export type RenewalCategory =
  | 'Regulatory License'
  | 'Fire Safety'
  | 'Property Rental'
  | 'Partner & Vendor Contract'
  | 'Equipment Warranty'
  | 'Domain & Digital';

export type ChecklistStatus = 'Completed' | 'Pending';

export interface ChecklistItem {
  id: string;
  cadence: 'daily' | 'monthly';
  categoryNumber: number;
  categoryName: string;
  taskText: string;
  status: ChecklistStatus;
  remarks: string;
  updatedAt?: string;
}

export interface KpiGroup {
  id: string;
  code: string;
  name: string;
  nameBn: string;
  weight: number;
  jdNumbers: string[];
  priorityTier: 'P1-Critical' | 'P2-High' | 'P3-Standard';
  departmentCoord: string;
}

export interface JdItem {
  id: string; // "01" .. "54"
  jdNo: string; // "01" .. "54"
  kpiGroupId: string;
  titleEn: string;
  descriptionBn: string;
  sourceFunction: string;
  cadence: MonitoringCadence;
  reportsTo: string;
  status: JdStatus;
  evidenceNote: string;
  lastCheckedDate: string;
  dailyCheckedToday?: boolean;
}

export interface ActionTask {
  id: string;
  title: string;
  details: string;
  jdNo: string;
  kpiGroupId: string;
  kpiWeight: number;
  cadence: MonitoringCadence;
  assignedCoord: string;
  dueDate: string;
  status: 'Pending' | 'In Progress' | 'Done';
  createdAt: string;
  completedAt?: string;
}

export interface RenewalItem {
  id: string;
  title: string;
  category: RenewalCategory;
  jdNo: string;
  referenceOrLocation: string;
  authorityOrVendor: string;
  issueOrStartDate: string;
  expiryDate: string;
  alertDaysBefore: number; // default 30 (1 month prior)
  costEstimateBdt?: string;
  renewalStatus: 'Active' | 'Renewal Initiated' | 'Submitted to Authority';
  notes: string;
  lastRenewedAt?: string;
}

export interface CapacityRow {
  providerName: string;
  linkType: 'IIG' | 'GGC' | 'FNA' | 'CDN' | 'NTTN';
  changeType: 'Upgrade' | 'Downgrade' | 'Activation' | 'Disconnection' | 'No Change';
  changeMbps: number;
  effectiveDate: string;
  currentCapacityMbps: number;
  workOrderRef: string;
}

export interface SubmittedReport {
  id: string;
  templateId: string;
  templateTitle: string;
  cadence: MonitoringCadence;
  submittedTo: string;
  periodLabel: string;
  createdAt: string;
  preparedBy: string;
  ccSpeedNetKhulnaConfirmed: boolean;
  summaryText: string;
  structuredFields: Record<string, string>;
  capacityRows?: CapacityRow[];
  critiqueCommentary?: string;
}

export interface AppSettings {
  employeeName: string;
  designation: string;
  department: string;
  companyName: string;
  branchOfficialCcEmail: string;
  evaluationMonth: string;
  evaluatedBy: string;
  verificationNotes: string;
  defaultAlertLeadDays: number;
  soundAlarmEnabled: boolean;
}

export interface AppDatabase {
  kpiGroups: KpiGroup[];
  jdItems: JdItem[];
  tasks: ActionTask[];
  renewals: RenewalItem[];
  reports: SubmittedReport[];
  checklists: ChecklistItem[];
  settings: AppSettings;
  updatedAt: string;
  activeDate?: string;
  revision?: number;
  userModified?: boolean;
}

export interface ServerInfo {
  hostname: string;
  port: number;
  lanUrls: string[];
  dbFilePath: string;
  updatedAt: string;
  serverTime: string;
}
