import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useTranslation} from 'react-i18next';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Cloud,
  CreditCard,
  Download,
  FileText,
  Globe2,
  PackageX,
  Search,
  Settings,
  Trash2,
  UserCircle,
  X,
} from 'lucide-react-native';
import {AppCard} from '../components/AppCard';
import {CountUpString, FocusFadeView} from '../components/AnimatedUI';
import {clearReports, deleteReport, getReports} from '../services/reportStorage';
import {
  expenseTotals,
  getFinanceState,
  paymentTotal,
  shareFinanceCsv,
  FinanceState,
} from '../services/financeService';
import {shareReportPdf} from '../services/reportExport';
import {buildTasks, getTaskStats, SiteTask} from '../services/taskService';
import {getLocalizedReport} from '../services/contentLocalization';
import {API_BASE_URL} from '../config';
import {colors, radii} from '../theme';
import {StructuredReport} from '../types/report';
import {AppLanguage, changeAppLanguage, localizedSiteName} from '../i18n';
import {AppUser, can, roleLabelKey} from '../services/authService';
import {getSyncQueue, shareBackupJson, syncPendingReports} from '../services/syncService';

type NotificationType = 'Alerts' | 'Finance' | 'System';
type NotificationTab = 'All' | NotificationType;

interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  time: string;
  icon: typeof CheckCircle2;
  tone: string;
  type: NotificationType;
  read: boolean;
}

function money(value: number, language: string) {
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string, language: string) {
  return new Intl.DateTimeFormat(language, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}

function sourceTitle(source: StructuredReport['source']) {
  return source.toUpperCase();
}

export function MoreScreen({currentUser, onLogout}: {currentUser?: AppUser; onLogout?: () => void}) {
  const {t, i18n} = useTranslation();
  const [reports, setReports] = useState<StructuredReport[]>([]);
  const [tasks, setTasks] = useState<SiteTask[]>([]);
  const [finance, setFinance] = useState<FinanceState | null>(null);
  const [tab, setTab] = useState<NotificationTab>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<StructuredReport | null>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [apiChecking, setApiChecking] = useState(false);
  const [apiStatus, setApiStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [syncing, setSyncing] = useState(false);
  const [queuedSyncCount, setQueuedSyncCount] = useState(0);

  const load = useCallback(async () => {
    const [nextReports, nextFinance, queue] = await Promise.all([getReports(), getFinanceState(), getSyncQueue()]);
    setReports(nextReports);
    setTasks(await buildTasks(nextReports, i18n.language));
    setFinance(nextFinance);
    setQueuedSyncCount(queue.length);
  }, [i18n.language]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const taskStats = useMemo(() => getTaskStats(tasks), [tasks]);

  const financeSummary = useMemo(() => {
    if (!finance) {
      return null;
    }
    const selectedSite = finance.sites.find(site => site.id === finance.selectedSiteId) ?? finance.sites[0];
    const sitePayments = finance.payments.filter(payment => payment.siteId === selectedSite.id);
    const siteExpenses = finance.expenses.filter(expense => expense.siteId === selectedSite.id);
    const paid = paymentTotal(sitePayments, 'paid');
    const pending = paymentTotal(sitePayments, 'pending');
    const expenses = expenseTotals(siteExpenses);
    const spent = Object.values(expenses).reduce((sum, value) => sum + value, 0);
    const remaining = Math.max(selectedSite.contractValue - spent, 0);
    return {selectedSite, sitePayments, siteExpenses, paid, pending, expenses, spent, remaining};
  }, [finance]);

  const notifications = useMemo<NotificationItem[]>(() => {
    const latest = reports[0];
    const localizedLatest = latest ? getLocalizedReport(latest, i18n.language) : null;
    const dynamic: NotificationItem[] = latest
      ? [
          {
            id: `report-${latest.id}`,
            title: t('more.reportAnalyzed'),
            detail: localizedLatest?.summary ?? latest.summary,
            time: t('more.now'),
            icon: CheckCircle2,
            tone: colors.success,
            type: 'System',
            read: false,
          },
          ...(localizedLatest?.missingMaterials ?? latest.missingMaterials).slice(0, 4).map((item, index) => ({
            id: `material-${latest.id}-${index}`,
            title: t('more.materialDelay'),
            detail: `${item.name} ${item.quantity}`.trim(),
            time: t('more.oneHour'),
            icon: PackageX,
            tone: colors.warning,
            type: 'Alerts' as const,
            read: false,
          })),
          ...(localizedLatest?.delays ?? latest.delays).slice(0, 4).map((item, index) => ({
            id: `delay-${latest.id}-${index}`,
            title: t('more.delayReported'),
            detail: item.reason,
            time: t('more.twoHours'),
            icon: AlertCircle,
            tone: colors.danger,
            type: 'Alerts' as const,
            read: false,
          })),
        ]
      : [];

    const financeItem: NotificationItem = {
      id: 'finance-pending',
      title: financeSummary?.pending ? t('more.pendingPayment') : t('more.paymentApproved'),
      detail: financeSummary?.pending
        ? t('more.pendingPaymentDetail', {amount: money(financeSummary.pending, i18n.language)})
        : t('more.paymentDetail'),
      time: t('more.tenMinutes'),
      icon: CreditCard,
      tone: financeSummary?.pending ? colors.warning : colors.success,
      type: 'Finance',
      read: Boolean(!financeSummary?.pending),
    };

    return [...dynamic, financeItem];
  }, [financeSummary, i18n.language, reports, t]);

  const visibleNotifications = tab === 'All'
    ? notifications
    : notifications.filter(item => item.type === tab);

  const filteredReports = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return reports;
    }
    return reports.filter(report =>
      {
        const localized = getLocalizedReport(report, i18n.language);
        return [
          localized.site,
          report.reportDate,
          localized.summary,
          report.originalText,
          localized.financialImpact,
          ...localized.missingMaterials.map(item => `${item.name} ${item.quantity}`),
          ...localized.delays.map(item => item.reason),
        ].join(' ').toLowerCase().includes(query);
      }
    );
  }, [i18n.language, reports, searchQuery]);

  const historyInsights = useMemo(() => {
    const materialCounts = new Map<string, number>();
    const delayCounts = new Map<string, number>();
    reports.slice(0, 14).forEach(report => {
      const localized = getLocalizedReport(report, i18n.language);
      localized.missingMaterials.forEach(item => {
        const key = item.name.trim().toLowerCase();
        if (key) {
          materialCounts.set(key, (materialCounts.get(key) ?? 0) + 1);
        }
      });
      localized.delays.forEach(item => {
        const key = item.reason.trim().toLowerCase();
        if (key) {
          delayCounts.set(key, (delayCounts.get(key) ?? 0) + 1);
        }
      });
    });
    const repeatedMaterials = [...materialCounts.entries()].filter(([, count]) => count > 1).slice(0, 3);
    const repeatedDelays = [...delayCounts.entries()].filter(([, count]) => count > 1).slice(0, 3);
    const openIssues = reports.reduce((sum, report) => sum + report.delays.length + report.missingMaterials.length, 0);
    return {repeatedMaterials, repeatedDelays, openIssues};
  }, [i18n.language, reports]);

  async function checkApi() {
    setApiChecking(true);
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      setApiStatus(response.ok ? 'online' : 'offline');
    } catch {
      setApiStatus('offline');
    } finally {
      setApiChecking(false);
    }
  }

  async function exportSelectedReport(report: StructuredReport) {
    try {
      await shareReportPdf(report);
    } catch {
      Alert.alert(t('report.exportFailed'), t('report.exportFailedMessage'));
    }
  }

  async function exportFinance() {
    if (!financeSummary) {
      return;
    }
    try {
      await shareFinanceCsv(financeSummary.selectedSite, financeSummary.sitePayments, financeSummary.siteExpenses);
    } catch {
      Alert.alert(t('finance.exportFailed'), t('finance.exportFailedMessage'));
    }
  }

  async function syncNow() {
    setSyncing(true);
    try {
      const result = await syncPendingReports();
      await load();
      Alert.alert(t('more.syncComplete'), t('more.syncCompleteMessage', result));
    } catch {
      Alert.alert(t('more.syncFailed'), t('more.syncFailedMessage'));
    } finally {
      setSyncing(false);
    }
  }

  async function backupData() {
    if (!can(currentUser, 'data.backup')) {
      Alert.alert(t('auth.noPermissionTitle'), t('auth.noPermission'));
      return;
    }
    try {
      await shareBackupJson(currentUser ?? null);
    } catch {
      Alert.alert(t('more.backupFailed'), t('more.backupFailedMessage'));
    }
  }

  function confirmDeleteReport(report: StructuredReport) {
    Alert.alert(t('more.deleteReport'), t('more.deleteReportConfirm'), [
      {text: t('common.close'), style: 'cancel'},
      {
        text: t('more.deleteReport'),
        style: 'destructive',
        onPress: async () => {
          await deleteReport(report.id);
          setSelectedReport(null);
          await load();
        },
      },
    ]);
  }

  function confirmClearHistory() {
    Alert.alert(t('more.clearHistory'), t('more.clearHistoryConfirm'), [
      {text: t('common.close'), style: 'cancel'},
      {
        text: t('more.clearHistory'),
        style: 'destructive',
        onPress: async () => {
          await clearReports();
          setSelectedReport(null);
          await load();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FocusFadeView style={styles.focusRoot}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('more.title')}</Text>
            <Text style={styles.subtitle}>{t('more.subtitle')}</Text>
          </View>
          <Pressable style={styles.iconButton} onPress={() => setSettingsVisible(true)}>
            <Settings size={20} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryTile label={t('more.reports')} value={String(reports.length)} tone={colors.primary} />
          <SummaryTile label={t('more.openTasks')} value={String(taskStats.open + taskStats.inProgress + taskStats.pending)} tone={colors.warning} />
          <SummaryTile label={t('more.doneTasks')} value={String(taskStats.done)} tone={colors.success} />
          <SummaryTile label={t('more.api')} value={t(`more.apiStatus.${apiStatus}`)} tone={apiStatus === 'offline' ? colors.danger : apiStatus === 'online' ? colors.success : colors.faint} />
        </View>

        <AppCard title={t('more.notifications')} right={<Text style={styles.badge}>{notifications.filter(item => !item.read).length}</Text>}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabs}
            contentContainerStyle={styles.tabsContent}>
            {(['All', 'Alerts', 'Finance', 'System'] as const).map(item => (
              <Pressable
                key={item}
                onPress={() => setTab(item)}
                style={[styles.tab, tab === item && styles.tabActive]}>
                <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.tabText, tab === item && styles.tabTextActive]}>
                  {t(`common.${item.toLowerCase()}`)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {visibleNotifications.map(item => {
            const Icon = item.icon;
            return (
              <View key={item.id} style={styles.notification}>
                <View style={[styles.notificationIcon, {backgroundColor: `${item.tone}22`}]}>
                  <Icon size={18} color={item.tone} />
                </View>
                <View style={styles.notificationCopy}>
                  <Text style={styles.notificationTitle}>{item.title}</Text>
                  <Text style={styles.notificationDetail}>{item.detail}</Text>
                </View>
                {!item.read ? <View style={styles.unreadDot} /> : null}
                <Text style={styles.time}>{item.time}</Text>
              </View>
            );
          })}
        </AppCard>

        <AppCard
          title={t('more.history')}
          right={reports.length ? (
            <Pressable onPress={confirmClearHistory}>
              <Text style={styles.dangerLink}>{t('more.clearHistory')}</Text>
            </Pressable>
          ) : <FileText size={18} color={colors.primary} />}>
          <View style={styles.searchWrap}>
            <Search size={16} color={colors.muted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('more.searchReports')}
              placeholderTextColor={colors.faint}
              style={styles.searchInput}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')}>
                <X size={15} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
          {filteredReports.length ? (
            filteredReports.slice(0, 12).map(report => {
              const localized = getLocalizedReport(report, i18n.language);
              return (
                <Pressable key={report.id} onPress={() => setSelectedReport(report)} style={styles.reportRow}>
                  <View style={styles.reportMark}>
                    <FileText size={17} color={colors.text} />
                  </View>
                  <View style={styles.reportCopy}>
                    <Text style={styles.reportTitle}>
                      {localizedSiteName(report.site === 'Не указан' ? 'Tower A' : report.site, t)} • {formatDate(report.reportDate, i18n.language)}
                    </Text>
                    <Text numberOfLines={2} style={styles.reportSummary}>{localized.summary}</Text>
                  </View>
                  <Text style={styles.source}>{sourceTitle(report.source)}</Text>
                  <ChevronRight size={16} color={colors.faint} />
                </Pressable>
              );
            })
          ) : (
            <Text style={styles.empty}>{reports.length ? t('more.noSearchResults') : t('more.emptyHistory')}</Text>
          )}
        </AppCard>

        <AppCard title={t('more.historyAnalytics')} right={<Text style={styles.badge}>{historyInsights.openIssues}</Text>}>
          {historyInsights.repeatedDelays.length || historyInsights.repeatedMaterials.length ? (
            <>
              {historyInsights.repeatedDelays.map(([label, count]) => (
                <View key={`delay-${label}`} style={styles.insightRow}>
                  <AlertCircle size={17} color={colors.danger} />
                  <Text style={styles.insightText}>{t('more.repeatedDelay', {label, count})}</Text>
                </View>
              ))}
              {historyInsights.repeatedMaterials.map(([label, count]) => (
                <View key={`material-${label}`} style={styles.insightRow}>
                  <PackageX size={17} color={colors.warning} />
                  <Text style={styles.insightText}>{t('more.repeatedMaterial', {label, count})}</Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.empty}>{reports.length ? t('more.noRepeatedIssues') : t('more.emptyAnalytics')}</Text>
          )}
        </AppCard>

        <AppCard
          title={t('more.financeSummary')}
          right={<Pressable onPress={exportFinance}><Download size={18} color={colors.primary} /></Pressable>}>
          {financeSummary ? (
            <>
              <View style={styles.financeRow}>
                <View style={styles.financeCopy}>
                  <Text style={styles.budget}>{money(financeSummary.selectedSite.contractValue, i18n.language)}</Text>
                  <Text style={styles.muted}>{localizedSiteName(financeSummary.selectedSite.name, t)}</Text>
                </View>
                <LinearGradient colors={[colors.primary, colors.primary2]} style={styles.ring}>
                  <View style={styles.ringInner}>
                    <Text style={styles.ringValue}>{financeSummary.selectedSite.progress}%</Text>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={styles.ringLabel}>{t('more.financeUsed')}</Text>
                  </View>
                </LinearGradient>
              </View>
              {[
                ['more.spent', money(financeSummary.spent, i18n.language), colors.primary],
                ['more.paidToDate', money(financeSummary.paid, i18n.language), colors.success],
                ['more.committed', money(financeSummary.pending, i18n.language), colors.primary2],
                ['more.remaining', money(financeSummary.remaining, i18n.language), colors.faint],
              ].map(([label, value, color]) => (
                <View key={label} style={styles.legendRow}>
                  <View style={[styles.dot, {backgroundColor: color}]} />
                  <Text style={styles.legendLabel}>{t(label)}</Text>
                  <Text style={styles.legendValue}>{value}</Text>
                </View>
              ))}
            </>
          ) : null}
        </AppCard>

      </ScrollView>
      </FocusFadeView>

      <ReportModal
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
        onExport={exportSelectedReport}
        onDelete={confirmDeleteReport}
      />

      <SettingsModal
        visible={settingsVisible}
        currentUser={currentUser}
        currentLanguage={i18n.language as AppLanguage}
        apiChecking={apiChecking}
        apiStatus={apiStatus}
        syncing={syncing}
        queuedSyncCount={queuedSyncCount}
        onClose={() => setSettingsVisible(false)}
        onLanguageChange={changeAppLanguage}
        onCheckApi={checkApi}
        onSyncNow={syncNow}
        onBackupData={backupData}
        onLogout={onLogout}
      />
    </SafeAreaView>
  );
}

function SummaryTile({label, value, tone}: {label: string; value: string; tone: string}) {
  return (
    <View style={styles.summaryTile}>
      <CountUpString value={value} style={[styles.summaryValue, {color: tone}]} />
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function ActionRow({
  title,
  detail,
  right,
  onPress,
}: {
  title: string;
  detail: string;
  right: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.actionRow} onPress={onPress}>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDetail}>{detail}</Text>
      </View>
      {right}
    </Pressable>
  );
}

function ReportModal({
  report,
  onClose,
  onExport,
  onDelete,
}: {
  report: StructuredReport | null;
  onClose: () => void;
  onExport: (report: StructuredReport) => void;
  onDelete: (report: StructuredReport) => void;
}) {
  const {t, i18n} = useTranslation();
  if (!report) {
    return null;
  }
  const localized = getLocalizedReport(report, i18n.language);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalShade}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{t('more.reportDetails')}</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <X size={18} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.reportDetailContent}>
            <Text style={styles.detailTitle}>
              {localizedSiteName(report.site === 'Не указан' ? 'Tower A' : report.site, t)}
            </Text>
            <Text style={styles.detailMeta}>{formatDate(report.reportDate, i18n.language)} • {sourceTitle(report.source)}</Text>
            <Text style={styles.detailSummary}>{localized.summary}</Text>
            <DetailBlock title={t('report.workers')} value={report.workersCount?.toString() ?? t('common.notSpecified')} />
            <DetailBlock title={t('report.location')} value={report.floors.join(', ') || t('common.notSpecified')} />
            <DetailBlock title={t('report.materialsMissing')} value={localized.missingMaterials.map(item => `${item.name} ${item.quantity}`.trim()).join('\n') || t('common.none')} />
            <DetailBlock title={t('report.delays')} value={localized.delays.map(item => `${item.reason}: ${item.impact}`).join('\n') || t('common.none')} />
            <DetailBlock title={t('report.nextSteps')} value={localized.nextDayTasks.join('\n') || t('common.none')} />
            <DetailBlock title={t('report.managerMessage')} value={localized.managerMessage || t('common.none')} />
          </ScrollView>
          <View style={styles.sheetActions}>
            <Pressable style={styles.exportButton} onPress={() => onExport(report)}>
              <Download size={17} color={colors.text} />
              <Text style={styles.exportButtonText}>{t('more.exportReport')}</Text>
            </Pressable>
            <Pressable style={styles.deleteButton} onPress={() => onDelete(report)}>
              <Trash2 size={17} color={colors.danger} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailBlock({title, value}: {title: string; value: string}) {
  return (
    <View style={styles.detailBlock}>
      <Text style={styles.detailBlockTitle}>{title}</Text>
      <Text style={styles.detailBlockValue}>{value}</Text>
    </View>
  );
}

function SettingsModal({
  visible,
  currentUser,
  currentLanguage,
  apiChecking,
  apiStatus,
  syncing,
  queuedSyncCount,
  onClose,
  onLanguageChange,
  onCheckApi,
  onSyncNow,
  onBackupData,
  onLogout,
}: {
  visible: boolean;
  currentUser?: AppUser;
  currentLanguage: AppLanguage;
  apiChecking: boolean;
  apiStatus: 'unknown' | 'online' | 'offline';
  syncing: boolean;
  queuedSyncCount: number;
  onClose: () => void;
  onLanguageChange: (language: AppLanguage) => void;
  onCheckApi: () => void;
  onSyncNow: () => void;
  onBackupData: () => void;
  onLogout?: () => void;
}) {
  const {t} = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.settingsShade}>
        <View style={styles.settingsCard}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{t('more.settings')}</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <X size={18} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.settingsContent}>
            {currentUser ? (
              <View style={styles.settingsSection}>
                <View style={styles.settingsSectionHeader}>
                  <UserCircle size={18} color={colors.primary} />
                  <Text style={styles.settingsSectionTitle}>{t('more.account')}</Text>
                </View>
                <View style={styles.accountBox}>
                  <View style={styles.accountRow}>
                    <View style={styles.accountCopy}>
                      <Text style={styles.accountName}>{currentUser.name}</Text>
                      <Text style={styles.accountMeta}>{currentUser.email} • {t(roleLabelKey(currentUser.role))}</Text>
                      <Text style={styles.actionDetail}>{currentUser.companyName}</Text>
                    </View>
                    <Pressable onPress={onLogout} style={styles.logoutButton}>
                      <Text style={styles.logoutText}>{t('auth.logout')}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : null}

            <View style={styles.settingsSection}>
              <View style={styles.settingsSectionHeader}>
                <Globe2 size={18} color={colors.primary} />
                <Text style={styles.settingsSectionTitle}>{t('language.title')}</Text>
              </View>
              <Text style={styles.actionDetail}>{t('language.subtitle')}</Text>
              <View style={styles.languageButtons}>
                {(['en', 'ru', 'he'] as AppLanguage[]).map(language => (
                  <Pressable
                    key={language}
                    onPress={() => onLanguageChange(language)}
                    style={[styles.languageButton, currentLanguage === language && styles.languageButtonActive]}>
                    <Text style={[styles.languageButtonText, currentLanguage === language && styles.languageButtonTextActive]}>
                      {t(language === 'en' ? 'common.english' : language === 'ru' ? 'common.russian' : 'common.hebrew')}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.restartHint}>{t('language.restart')}</Text>
            </View>

            <View style={styles.settingsSection}>
              <View style={styles.settingsSectionHeader}>
                <Cloud size={18} color={colors.primary} />
                <Text style={styles.settingsSectionTitle}>{t('more.system')}</Text>
              </View>
              <ActionRow
                title={t('more.checkApi')}
                detail={t('more.apiConnectionHint')}
                right={apiChecking ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.actionStatus}>{t(`more.apiStatus.${apiStatus}`)}</Text>}
                onPress={onCheckApi}
              />
              <ActionRow
                title={t('more.syncReports')}
                detail={t('more.syncQueue', {count: queuedSyncCount})}
                right={syncing ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.actionStatus}>{queuedSyncCount}</Text>}
                onPress={onSyncNow}
              />
              <ActionRow
                title={t('more.backupData')}
                detail={t('more.backupHint')}
                right={<Download size={18} color={colors.primary} />}
                onPress={onBackupData}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  focusRoot: {flex: 1},
  content: {padding: 20, paddingBottom: 112, gap: 15},
  header: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 6},
  title: {color: colors.text, fontSize: 25, fontWeight: '900'},
  subtitle: {color: colors.muted, fontSize: 13, fontWeight: '700', marginTop: 4},
  iconButton: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, height: 42, justifyContent: 'center', width: 42},
  summaryGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  summaryTile: {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, flexBasis: '47%', flexGrow: 1, padding: 14},
  summaryValue: {fontSize: 23, fontWeight: '900'},
  summaryLabel: {color: colors.muted, fontSize: 12, fontWeight: '800', marginTop: 4},
  badge: {backgroundColor: colors.primarySoft, borderRadius: 9, color: colors.primary, fontSize: 12, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 4},
  tabs: {backgroundColor: colors.surface3, borderRadius: 14, marginBottom: 8},
  tabsContent: {gap: 6, padding: 4},
  tab: {alignItems: 'center', borderRadius: 11, minWidth: 92, paddingHorizontal: 14, paddingVertical: 9},
  tabActive: {backgroundColor: colors.primarySoft},
  tabText: {color: colors.muted, fontSize: 11, fontWeight: '800', textAlign: 'center'},
  tabTextActive: {color: colors.text},
  notification: {alignItems: 'flex-start', flexDirection: 'row', gap: 11, paddingVertical: 10},
  notificationIcon: {alignItems: 'center', borderRadius: 11, height: 40, justifyContent: 'center', width: 40},
  notificationCopy: {flex: 1},
  notificationTitle: {color: colors.text, fontSize: 13, fontWeight: '900'},
  notificationDetail: {color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2},
  unreadDot: {backgroundColor: colors.primary, borderRadius: 4, height: 8, marginTop: 5, width: 8},
  time: {color: colors.faint, fontSize: 10, fontWeight: '800'},
  dangerLink: {color: colors.danger, fontSize: 11, fontWeight: '900'},
  searchWrap: {alignItems: 'center', backgroundColor: colors.surface3, borderColor: colors.border, borderRadius: 13, borderWidth: 1, flexDirection: 'row', gap: 9, marginBottom: 8, paddingHorizontal: 11},
  searchInput: {color: colors.text, flex: 1, fontSize: 13, minHeight: 42},
  reportRow: {alignItems: 'center', flexDirection: 'row', gap: 10, paddingVertical: 10},
  reportMark: {alignItems: 'center', backgroundColor: colors.surface3, borderRadius: 10, height: 38, justifyContent: 'center', width: 38},
  reportCopy: {flex: 1},
  reportTitle: {color: colors.text, fontSize: 13, fontWeight: '900'},
  reportSummary: {color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2},
  source: {backgroundColor: colors.primarySoft, borderRadius: 7, color: colors.primary, fontSize: 9, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 5},
  empty: {color: colors.muted, fontSize: 13, lineHeight: 19},
  financeRow: {alignItems: 'center', flexDirection: 'row', gap: 14, justifyContent: 'space-between', marginBottom: 14},
  financeCopy: {flex: 1, minWidth: 0, paddingRight: 4},
  budget: {color: colors.text, fontSize: 22, fontWeight: '900', lineHeight: 28},
  muted: {color: colors.muted, fontSize: 11, marginTop: 2},
  ring: {alignItems: 'center', borderRadius: 43, flexShrink: 0, height: 86, justifyContent: 'center', width: 86},
  ringInner: {alignItems: 'center', backgroundColor: colors.surface, borderRadius: 31, height: 62, justifyContent: 'center', paddingHorizontal: 5, width: 62},
  ringValue: {color: colors.text, fontSize: 16, fontWeight: '900', lineHeight: 20},
  ringLabel: {color: colors.muted, fontSize: 9, fontWeight: '800', lineHeight: 12, marginTop: 1, maxWidth: 54, textAlign: 'center'},
  legendRow: {alignItems: 'center', flexDirection: 'row', gap: 8, paddingVertical: 6},
  dot: {borderRadius: 4, height: 8, width: 8},
  legendLabel: {color: colors.muted, flex: 1, fontSize: 12},
  legendValue: {color: colors.text, fontSize: 12, fontWeight: '900'},
  insightRow: {alignItems: 'center', flexDirection: 'row', gap: 9, paddingVertical: 7},
  insightText: {color: colors.text, flex: 1, fontSize: 13, fontWeight: '800', lineHeight: 19},
  accountRow: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 12},
  accountCopy: {flex: 1},
  accountName: {color: colors.text, fontSize: 16, fontWeight: '900'},
  accountMeta: {color: colors.muted, fontSize: 12, marginTop: 4},
  logoutButton: {backgroundColor: colors.surface3, borderColor: colors.border, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9},
  logoutText: {color: colors.text, fontSize: 12, fontWeight: '900'},
  actionRow: {alignItems: 'center', flexDirection: 'row', gap: 10, paddingVertical: 8},
  actionCopy: {flex: 1},
  actionTitle: {color: colors.text, fontSize: 13, fontWeight: '900'},
  actionDetail: {color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2},
  actionStatus: {color: colors.primary, fontSize: 12, fontWeight: '900'},
  modalShade: {backgroundColor: 'rgba(0,0,0,0.68)', flex: 1, justifyContent: 'flex-end'},
  sheet: {backgroundColor: colors.background, borderColor: colors.border, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, maxHeight: '88%', padding: 18},
  sheetHeader: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
  sheetTitle: {color: colors.text, fontSize: 20, fontWeight: '900'},
  closeButton: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, height: 38, justifyContent: 'center', width: 38},
  reportDetailContent: {gap: 12, paddingVertical: 16},
  detailTitle: {color: colors.text, fontSize: 24, fontWeight: '900'},
  detailMeta: {color: colors.muted, fontSize: 12, fontWeight: '800'},
  detailSummary: {color: colors.text, fontSize: 14, lineHeight: 21},
  detailBlock: {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, padding: 13},
  detailBlockTitle: {color: colors.primary, fontSize: 12, fontWeight: '900'},
  detailBlockValue: {color: colors.text, fontSize: 13, lineHeight: 20, marginTop: 5},
  sheetActions: {flexDirection: 'row', gap: 10},
  exportButton: {alignItems: 'center', backgroundColor: colors.primary, borderRadius: 15, flex: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 13},
  exportButtonText: {color: colors.text, fontSize: 13, fontWeight: '900'},
  deleteButton: {alignItems: 'center', backgroundColor: colors.dangerSoft, borderColor: `${colors.danger}55`, borderRadius: 15, borderWidth: 1, justifyContent: 'center', width: 52},
  settingsShade: {alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.68)', flex: 1, justifyContent: 'center', padding: 20},
  settingsCard: {backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1, gap: 14, maxHeight: '86%', padding: 18, width: '100%'},
  settingsContent: {gap: 14, paddingBottom: 4},
  settingsSection: {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: 10, padding: 14},
  settingsSectionHeader: {alignItems: 'center', flexDirection: 'row', gap: 9},
  settingsSectionTitle: {color: colors.text, fontSize: 15, fontWeight: '900'},
  accountBox: {backgroundColor: colors.surface3, borderColor: colors.border, borderRadius: 14, borderWidth: 1, padding: 12},
  languagePanel: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 11, padding: 13},
  languageCopy: {flex: 1},
  languageButtons: {flexDirection: 'row', gap: 8},
  languageButton: {alignItems: 'center', backgroundColor: colors.surface3, borderColor: colors.border, borderRadius: 11, borderWidth: 1, flex: 1, paddingVertical: 10},
  languageButtonActive: {backgroundColor: colors.primarySoft, borderColor: colors.primary},
  languageButtonText: {color: colors.muted, fontSize: 11, fontWeight: '800'},
  languageButtonTextActive: {color: colors.text},
  restartHint: {color: colors.faint, fontSize: 11, lineHeight: 16},
});
