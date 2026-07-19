import AsyncStorage from '@react-native-async-storage/async-storage';
import {StructuredReport} from '../types/report';

const REPORTS_KEY = '@siteops/reports/v1';

export async function getReports(): Promise<StructuredReport[]> {
  const value = await AsyncStorage.getItem(REPORTS_KEY);
  if (!value) {
    return [];
  }

  try {
    return JSON.parse(value) as StructuredReport[];
  } catch {
    return [];
  }
}

export async function saveReport(report: StructuredReport): Promise<void> {
  const reports = await getReports();
  const updated = [report, ...reports.filter(item => item.id !== report.id)].slice(
    0,
    100,
  );
  await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(updated));
}

export async function deleteReport(reportId: string): Promise<void> {
  const reports = await getReports();
  await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(reports.filter(report => report.id !== reportId)));
}

export async function clearReports(): Promise<void> {
  await AsyncStorage.removeItem(REPORTS_KEY);
}
