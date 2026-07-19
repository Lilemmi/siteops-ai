import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import {API_BASE_URL} from '../config';
import i18n from '../i18n';
import {FinanceState, getFinanceState} from './financeService';
import {getReports, saveReport} from './reportStorage';
import {StructuredReport} from '../types/report';

const SYNC_QUEUE_KEY = '@siteops/sync-queue/v1';

export interface QueuedSyncItem {
  id: string;
  reportId: string;
  type: 'report';
  payload: StructuredReport;
  attempts: number;
  createdAt: string;
  lastError?: string;
}

export async function getSyncQueue(): Promise<QueuedSyncItem[]> {
  const value = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  if (!value) {
    return [];
  }
  try {
    return JSON.parse(value) as QueuedSyncItem[];
  } catch {
    return [];
  }
}

async function saveSyncQueue(queue: QueuedSyncItem[]) {
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueueReportSync(report: StructuredReport): Promise<void> {
  const queue = await getSyncQueue();
  const queuedReport: StructuredReport = {...report, syncStatus: 'queued'};
  await saveReport(queuedReport);
  await saveSyncQueue([
    {
      id: `sync-${report.id}`,
      reportId: report.id,
      type: 'report',
      payload: queuedReport,
      attempts: 0,
      createdAt: new Date().toISOString(),
    },
    ...queue.filter(item => item.reportId !== report.id),
  ]);
}

export async function syncPendingReports(): Promise<{synced: number; failed: number; remaining: number}> {
  const queue = await getSyncQueue();
  const remaining: QueuedSyncItem[] = [];
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/sync`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(item.payload),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const syncedReport = {...item.payload, syncStatus: 'synced' as const, syncedAt: new Date().toISOString()};
      await saveReport(syncedReport);
      synced += 1;
    } catch (error) {
      failed += 1;
      remaining.push({
        ...item,
        attempts: item.attempts + 1,
        lastError: error instanceof Error ? error.message : 'Sync failed',
      });
      await saveReport({...item.payload, syncStatus: 'failed'});
    }
  }

  await saveSyncQueue(remaining);
  return {synced, failed, remaining: remaining.length};
}

export async function shareBackupJson(currentUser: unknown): Promise<string> {
  const [reports, finance, syncQueue] = await Promise.all([
    getReports(),
    getFinanceState(),
    getSyncQueue(),
  ]);
  const backup: {
    app: string;
    version: number;
    createdAt: string;
    currentUser: unknown;
    reports: StructuredReport[];
    finance: FinanceState;
    syncQueue: QueuedSyncItem[];
  } = {
    app: 'SiteOps AI',
    version: 1,
    createdAt: new Date().toISOString(),
    currentUser,
    reports,
    finance,
    syncQueue,
  };
  const fileName = `siteops-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const path = `${RNFS.CachesDirectoryPath}/${fileName}`;
  await RNFS.writeFile(path, JSON.stringify(backup, null, 2), 'utf8');
  await Share.open({
    title: i18n.t('more.backupData'),
    url: `file://${path}`,
    type: 'application/json',
    filename: fileName,
    failOnCancel: false,
  });
  return path;
}
