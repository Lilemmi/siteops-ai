import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import i18n from '../i18n';

const FINANCE_KEY = '@siteops/finance/v1';

export type PaymentStatus = 'paid' | 'pending';
export type CostCategory = 'labor' | 'materials' | 'equipment' | 'other';

export interface SitePayment {
  id: string;
  siteId: string;
  vendor: string;
  invoice: string;
  amount: number;
  status: PaymentStatus;
  date: string;
  note: string;
}

export interface SiteExpense {
  id: string;
  siteId: string;
  category: CostCategory;
  amount: number;
  description: string;
  date: string;
}

export interface FinanceSite {
  id: string;
  name: string;
  contractValue: number;
  progress: number;
  scheduleStatus: 'onSchedule' | 'atRisk';
}

export interface FinanceState {
  selectedSiteId: string;
  sites: FinanceSite[];
  payments: SitePayment[];
  expenses: SiteExpense[];
}

const initialState: FinanceState = {
  selectedSiteId: 'tower-a',
  sites: [
    {id: 'tower-a', name: 'Tower A', contractValue: 3_850_000, progress: 63, scheduleStatus: 'onSchedule'},
    {id: 'skyline', name: 'Skyline Tower', contractValue: 5_200_000, progress: 68, scheduleStatus: 'onSchedule'},
    {id: 'harbor', name: 'Harbor Point', contractValue: 2_900_000, progress: 54, scheduleStatus: 'atRisk'},
  ],
  payments: [
    {id: 'p1', siteId: 'tower-a', vendor: 'General Construction', invoice: 'INV-0012', amount: 125_000, status: 'paid', date: '2025-06-03', note: 'Monthly progress payment'},
    {id: 'p2', siteId: 'tower-a', vendor: 'Steel Works', invoice: 'INV-0008', amount: 275_000, status: 'paid', date: '2025-05-28', note: 'Structural steel package'},
    {id: 'p3', siteId: 'tower-a', vendor: 'MEP Rough-In', invoice: 'INV-0006', amount: 180_000, status: 'paid', date: '2025-05-22', note: 'MEP rough-in works'},
    {id: 'p4', siteId: 'tower-a', vendor: 'Concrete Package', invoice: 'INV-0005', amount: 750_000, status: 'paid', date: '2025-05-10', note: 'Concrete structure'},
    {id: 'p5', siteId: 'tower-a', vendor: 'Facade Systems', invoice: 'INV-0004', amount: 620_000, status: 'paid', date: '2025-04-29', note: 'Facade advance payment'},
    {id: 'p6', siteId: 'tower-a', vendor: 'Site Operations', invoice: 'INV-0003', amount: 500_800, status: 'paid', date: '2025-04-15', note: 'Site operations and equipment'},
    {id: 'p7', siteId: 'skyline', vendor: 'Main Contractor', invoice: 'SKY-0021', amount: 1_450_000, status: 'paid', date: '2025-06-08', note: 'Progress payment'},
    {id: 'p8', siteId: 'skyline', vendor: 'Glass Systems', invoice: 'SKY-0022', amount: 320_000, status: 'pending', date: '2025-06-15', note: 'Awaiting approval'},
    {id: 'p9', siteId: 'harbor', vendor: 'Marine Concrete', invoice: 'HBR-0009', amount: 690_000, status: 'paid', date: '2025-06-01', note: 'Foundation package'},
  ],
  expenses: [
    {id: 'e1', siteId: 'tower-a', category: 'labor', amount: 1_540_000, description: 'Labor and subcontractors', date: '2025-06-01'},
    {id: 'e2', siteId: 'tower-a', category: 'materials', amount: 1_347_500, description: 'Construction materials', date: '2025-06-01'},
    {id: 'e3', siteId: 'tower-a', category: 'equipment', amount: 577_500, description: 'Equipment and lifting', date: '2025-06-01'},
    {id: 'e4', siteId: 'tower-a', category: 'other', amount: 385_000, description: 'Permits, insurance and other', date: '2025-06-01'},
    {id: 'e5', siteId: 'skyline', category: 'labor', amount: 1_200_000, description: 'Labor', date: '2025-06-01'},
    {id: 'e6', siteId: 'skyline', category: 'materials', amount: 980_000, description: 'Materials', date: '2025-06-01'},
    {id: 'e7', siteId: 'harbor', category: 'labor', amount: 620_000, description: 'Labor', date: '2025-06-01'},
    {id: 'e8', siteId: 'harbor', category: 'equipment', amount: 340_000, description: 'Marine equipment', date: '2025-06-01'},
  ],
};

export async function getFinanceState(): Promise<FinanceState> {
  const value = await AsyncStorage.getItem(FINANCE_KEY);
  if (!value) {
    return initialState;
  }
  try {
    const saved = JSON.parse(value) as FinanceState;
    const merged = {...initialState, ...saved};
    const sites = merged.sites.length ? merged.sites : initialState.sites;
    const selectedSiteId = sites.some(site => site.id === merged.selectedSiteId)
      ? merged.selectedSiteId
      : sites[0].id;
    return {...merged, sites, selectedSiteId};
  } catch {
    return initialState;
  }
}

export async function saveFinanceState(state: FinanceState): Promise<void> {
  await AsyncStorage.setItem(FINANCE_KEY, JSON.stringify(state));
}

export function paymentTotal(payments: SitePayment[], status?: PaymentStatus): number {
  return payments
    .filter(payment => !status || payment.status === status)
    .reduce((sum, payment) => sum + payment.amount, 0);
}

export function expenseTotals(expenses: SiteExpense[]): Record<CostCategory, number> {
  return expenses.reduce<Record<CostCategory, number>>(
    (totals, expense) => ({...totals, [expense.category]: totals[expense.category] + expense.amount}),
    {labor: 0, materials: 0, equipment: 0, other: 0},
  );
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export async function shareFinanceCsv(site: FinanceSite, payments: SitePayment[], expenses: SiteExpense[]) {
  const rows = [
    [i18n.t('finance.export.site'), site.name],
    [i18n.t('finance.export.contract'), site.contractValue],
    [i18n.t('finance.export.progress'), `${site.progress}%`],
    [],
    [i18n.t('finance.export.payments')],
    [i18n.t('finance.export.date'), i18n.t('finance.export.vendor'), i18n.t('finance.export.invoice'), i18n.t('finance.export.amount'), i18n.t('finance.export.status')],
    ...payments.map(payment => [payment.date, payment.vendor, payment.invoice, payment.amount, i18n.t(`finance.${payment.status}`)]),
    [],
    [i18n.t('finance.export.expenses')],
    [i18n.t('finance.export.date'), i18n.t('finance.export.category'), i18n.t('finance.export.description'), i18n.t('finance.export.amount')],
    ...expenses.map(expense => [expense.date, i18n.t(`finance.${expense.category}`), expense.description, expense.amount]),
  ];
  const content = rows.map(row => row.map(csvCell).join(',')).join('\n');
  const fileName = `siteops-finance-${site.id}-${new Date().toISOString().slice(0, 10)}.csv`;
  const path = `${RNFS.CachesDirectoryPath}/${fileName}`;
  await RNFS.writeFile(path, content, 'utf8');
  await Share.open({title: i18n.t('finance.export.title'), url: `file://${path}`, type: 'text/csv', filename: fileName, failOnCancel: false});
  return path;
}
