export type InputLanguage = 'auto' | 'ru' | 'he' | 'en';
export type AnalysisSource = 'gpt' | 'demo';
export type ReportSyncStatus = 'queued' | 'synced' | 'failed';

export interface WorkItem {
  description: string;
  workers: number | null;
  floors: string[];
}

export interface MaterialItem {
  name: string;
  quantity: string;
}

export interface DelayItem {
  reason: string;
  impact: string;
}

export interface ReportPhoto {
  id: string;
  uri: string;
  fileName: string;
  addedAt: string;
}

export interface StructuredReport {
  id: string;
  createdAt: string;
  source: AnalysisSource;
  originalText: string;
  inputLanguage: 'ru' | 'he' | 'en' | 'unknown';
  site: string;
  reportDate: string;
  workersCount: number | null;
  workHours: string;
  paymentType: string;
  completedWork: WorkItem[];
  floors: string[];
  usedMaterials: MaterialItem[];
  missingMaterials: MaterialItem[];
  delays: DelayItem[];
  responsiblePeople: string[];
  financialImpact: string;
  nextDayTasks: string[];
  contradictions: string[];
  managerMessageHebrew: string;
  summary: string;
  siteId?: string;
  photos?: ReportPhoto[];
  syncStatus?: ReportSyncStatus;
  syncedAt?: string;
}
