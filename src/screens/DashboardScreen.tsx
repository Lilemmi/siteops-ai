import React, {useCallback, useMemo, useState} from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import {launchImageLibrary} from 'react-native-image-picker';
import {useTranslation} from 'react-i18next';
import {
  Bell,
  Camera,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock3,
  HardHat,
  ImagePlus,
  MessageCircle,
  PackageX,
  Plus,
  Send,
  ShieldCheck,
  AlertTriangle,
  Users,
  X,
  LucideIcon,
} from 'lucide-react-native';
import {AppCard} from '../components/AppCard';
import {CountUpText, FocusFadeView} from '../components/AnimatedUI';
import {MetricCard} from '../components/MetricCard';
import {ProgressLine} from '../components/ProgressLine';
import {
  ChatMessage,
  DashboardState,
  getDashboardState,
  saveDashboardState,
} from '../services/dashboardService';
import {FinanceSite, getFinanceState} from '../services/financeService';
import {getReports} from '../services/reportStorage';
import {buildTasks, SiteTask} from '../services/taskService';
import {getLocalizedReport} from '../services/contentLocalization';
import {colors, radii} from '../theme';
import {StructuredReport} from '../types/report';
import {localizedSiteName} from '../i18n';

type Panel =
  | 'sites'
  | 'notifications'
  | 'workers'
  | 'progress'
  | 'activity'
  | 'report'
  | 'checklist'
  | 'chat'
  | 'photos'
  | null;

const siteProgress: Record<string, number> = {
  'All Sites': 76,
  'Tower A': 76,
  'Skyline Tower': 68,
  'Harbor Point': 54,
};
const progressPoints: Record<string, number[]> = {
  'All Sites': [25, 28, 43, 39, 47, 46, 61, 66, 59, 64, 79, 77, 83, 82],
  'Tower A': [20, 26, 31, 34, 41, 44, 49, 58, 56, 62, 67, 70, 74, 76],
  'Skyline Tower': [18, 22, 29, 31, 35, 38, 42, 47, 49, 53, 58, 62, 65, 68],
  'Harbor Point': [12, 16, 21, 25, 29, 32, 35, 39, 43, 46, 48, 50, 52, 54],
};

const quickActions: {labelKey: string; icon: LucideIcon; action: 'report' | 'photo' | 'checklist' | 'chat'}[] = [
  {labelKey: 'dashboard.quickReport', icon: ClipboardList, action: 'report'},
  {labelKey: 'dashboard.addPhoto', icon: Camera, action: 'photo'},
  {labelKey: 'dashboard.checklists', icon: CheckSquare, action: 'checklist'},
  {labelKey: 'dashboard.teamChat', icon: MessageCircle, action: 'chat'},
];

const defaultDashboard: DashboardState = {
  selectedSite: 'All Sites',
  notificationsRead: false,
  checklistSubmittedAt: null,
  checklistLastNotifiedAt: null,
  photos: [],
  checklist: [],
  chat: [],
};

function reportSite(report: StructuredReport) {
  return report.site === 'Не указан' ? 'Tower A' : report.site;
}

function PanelHeader({title, onClose}: {title: string; onClose: () => void}) {
  return (
    <View style={styles.panelHeader}>
      <Text style={styles.panelTitle}>{title}</Text>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.closeButton}>
        <X size={20} color={colors.text} />
      </Pressable>
    </View>
  );
}

export function DashboardScreen({navigation}: {navigation: any}) {
  const {t, i18n} = useTranslation();
  const [reports, setReports] = useState<StructuredReport[]>([]);
  const [tasks, setTasks] = useState<SiteTask[]>([]);
  const [financeSites, setFinanceSites] = useState<FinanceSite[]>([]);
  const [dashboard, setDashboard] = useState<DashboardState>(defaultDashboard);
  const [panel, setPanel] = useState<Panel>(null);
  const [selectedReport, setSelectedReport] = useState<StructuredReport | null>(null);
  const [chatText, setChatText] = useState('');
  const [toast, setToast] = useState('');

  const refresh = useCallback(async () => {
    const [nextReports, nextDashboard, financeState] = await Promise.all([
      getReports(),
      getDashboardState(),
      getFinanceState(),
    ]);
    setReports(nextReports);
    setFinanceSites(financeState.sites);
    setDashboard(nextDashboard);
    setTasks(await buildTasks(nextReports, i18n.language));
  }, [i18n.language]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const updateDashboard = useCallback(
    async (next: DashboardState, message?: string) => {
      setDashboard(next);
      await saveDashboardState(next);
      if (message) {
        setToast(message);
        setTimeout(() => setToast(''), 2400);
      }
    },
    [],
  );

  const selectedSite = dashboard.selectedSite || 'All Sites';
  const sites = useMemo(() => ['All Sites', ...financeSites.map(site => site.name)], [financeSites]);
  const selectedFinanceSite = financeSites.find(site => site.name === selectedSite);
  const selectedSiteProgress = selectedSite === 'All Sites'
    ? Math.round(financeSites.reduce((sum, item) => sum + item.progress, 0) / Math.max(financeSites.length, 1))
    : selectedFinanceSite?.progress ?? siteProgress[selectedSite] ?? 0;
  const visibleReports = useMemo(
    () =>
      selectedSite === 'All Sites'
        ? reports
        : reports.filter(report => reportSite(report) === selectedSite),
    [reports, selectedSite],
  );
  const visibleTasks = useMemo(
    () =>
      selectedSite === 'All Sites'
        ? tasks
        : tasks.filter(task => task.site === selectedSite),
    [selectedSite, tasks],
  );

  const stats = useMemo(() => {
    const latest = visibleReports[0];
    const workers = latest?.workersCount ?? (selectedSite === 'All Sites' ? 12 : 0);
    const missing = visibleTasks.filter(task => task.category === 'Material Missing' && task.status !== 'Done').length;
    const open = visibleTasks.filter(task => task.status !== 'Done').length;
    const progress = latest
      ? Math.max(0, Math.min(100, selectedSiteProgress + visibleReports.length * 2 - latest.delays.length * 3))
      : selectedSiteProgress;
    return {workers, missing, open, progress};
  }, [selectedSite, selectedSiteProgress, visibleReports, visibleTasks]);

  const checklistStats = useMemo(() => {
    const total = dashboard.checklist.length;
    const done = dashboard.checklist.filter(item => item.done).length;
    const complete = total > 0 && done === total;
    return {total, done, missing: Math.max(total - done, 0), complete};
  }, [dashboard.checklist]);

  const notifications = useMemo(() => {
    const latest = visibleReports[0];
    return [
      {
        title: checklistStats.complete ? t('dashboard.checklistNotificationCompleteTitle') : t('dashboard.checklistNotificationDueTitle'),
        detail: checklistStats.complete
          ? t('dashboard.checklistNotificationCompleteDetail', {
              time: dashboard.checklistSubmittedAt
                ? new Intl.DateTimeFormat(i18n.language, {hour: '2-digit', minute: '2-digit'}).format(new Date(dashboard.checklistSubmittedAt))
                : t('common.today'),
            })
          : t('dashboard.checklistNotificationDueDetail', {count: checklistStats.missing}),
        tone: checklistStats.complete ? colors.success : colors.warning,
        icon: checklistStats.complete ? CheckCircle2 : AlertTriangle,
      },
      ...(latest?.missingMaterials ?? []).map(item => ({
        title: t('dashboard.materialRequired'),
        detail: `${item.name} ${item.quantity}`.trim(),
        tone: colors.warning,
        icon: PackageX,
      })),
      ...(latest?.delays ?? []).map(item => ({
        title: t('dashboard.delayReported'),
        detail: item.reason,
        tone: colors.danger,
        icon: Clock3,
      })),
      {
        title: latest ? t('dashboard.reportAnalyzed') : t('dashboard.welcome'),
        detail: latest?.summary ?? t('dashboard.welcomeDetail'),
        tone: colors.success,
        icon: CheckCircle2,
      },
    ];
  }, [checklistStats.complete, checklistStats.missing, dashboard.checklistSubmittedAt, i18n.language, t, visibleReports]);

  const selectSite = async (site: string) => {
    await updateDashboard({...dashboard, selectedSite: site}, t('dashboard.siteSelected', {site: localizedSiteName(site, t)}));
    setPanel(null);
  };

  const openNotifications = async () => {
    setPanel('notifications');
    if (!dashboard.notificationsRead) {
      await updateDashboard({...dashboard, notificationsRead: true});
    }
  };

  const choosePhoto = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', selectionLimit: 1, quality: 0.8});
    if (result.didCancel) {
      return;
    }
    if (result.errorCode) {
      Alert.alert(t('dashboard.photoErrorTitle'), result.errorMessage ?? t('dashboard.tryAgain'));
      return;
    }
    const asset = result.assets?.[0];
    if (!asset?.uri) {
      return;
    }
    const photo = {
      id: `${Date.now()}`,
      uri: asset.uri,
      fileName: asset.fileName ?? 'Site photo',
      addedAt: new Date().toISOString(),
    };
    await updateDashboard(
      {...dashboard, photos: [photo, ...dashboard.photos].slice(0, 12)},
      t('dashboard.photoAdded'),
    );
    setPanel('photos');
  };

  const toggleChecklist = async (id: string) => {
    const wasComplete = dashboard.checklist.length > 0 && dashboard.checklist.every(item => item.done);
    const nextChecklist = dashboard.checklist.map(item =>
        item.id === id ? {...item, done: !item.done} : item,
      );
    const isComplete = nextChecklist.length > 0 && nextChecklist.every(item => item.done);
    const now = new Date().toISOString();
    await updateDashboard({
      ...dashboard,
      checklist: nextChecklist,
      checklistSubmittedAt: isComplete ? dashboard.checklistSubmittedAt ?? now : null,
      checklistLastNotifiedAt: isComplete && !wasComplete ? now : dashboard.checklistLastNotifiedAt,
      notificationsRead: isComplete && !wasComplete ? false : dashboard.notificationsRead,
    }, isComplete && !wasComplete ? t('dashboard.checklistCompletedToast') : !isComplete && wasComplete ? t('dashboard.checklistIncompleteToast') : undefined);
  };

  const sendMessage = async () => {
    const body = chatText.trim();
    if (!body) {
      return;
    }
    const message: ChatMessage = {
      id: `${Date.now()}`,
      body,
      author: 'Alex',
      sentAt: new Date().toISOString(),
    };
    setChatText('');
    await updateDashboard({...dashboard, chat: [...dashboard.chat, message]}, t('dashboard.messageSent'));
  };

  const openReport = (report: StructuredReport) => {
    setSelectedReport(report);
    setPanel('report');
  };

  const handleQuickAction = (action: 'report' | 'photo' | 'checklist' | 'chat') => {
    if (action === 'report') {
      navigation.navigate('Report');
    } else if (action === 'photo') {
      choosePhoto();
    } else {
      setPanel(action);
    }
  };

  const recent = visibleReports[0];
  const recentLocalized = recent ? getLocalizedReport(recent, i18n.language) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FocusFadeView style={styles.focusRoot}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Pressable accessibilityRole="button" onPress={() => setPanel('sites')} style={styles.brandRow}>
              <Text style={styles.brand}>SiteOps <Text style={styles.ai}>AI</Text></Text>
              <ChevronDown size={18} color={colors.muted} />
            </Pressable>
            <Text style={styles.siteContext}>{localizedSiteName(selectedSite, t)}</Text>
            <Text style={styles.greeting}>{t('dashboard.greeting')}</Text>
            <Text style={styles.subtle}>{t('dashboard.subtitle')}</Text>
          </View>
          <Pressable accessibilityLabel="Notifications" onPress={openNotifications} style={styles.iconButton}>
            <Bell size={21} color={colors.text} />
            {!dashboard.notificationsRead ? <View style={styles.notificationDot} /> : null}
          </Pressable>
        </View>

        <View style={styles.metricGrid}>
          <View style={styles.metricRow}>
            <MetricCard label={t('dashboard.activeSites')} value={selectedSite === 'All Sites' ? `${financeSites.length}` : '1'} delta={t('dashboard.twoThisWeek')} icon={ShieldCheck} onPress={() => setPanel('sites')} />
            <MetricCard label={t('dashboard.workersOnSite')} value={`${stats.workers}`} delta={t('dashboard.workersToday', {count: stats.workers})} icon={Users} tone="green" onPress={() => setPanel('workers')} />
          </View>
          <View style={styles.metricRow}>
            <MetricCard label={t('dashboard.openIssues')} value={`${stats.open}`} delta={t('dashboard.materialCount', {count: stats.missing})} icon={ClipboardList} tone="red" onPress={() => navigation.navigate('Tasks')} />
            <MetricCard label={t('dashboard.overallProgress')} value={`${stats.progress}%`} delta={t('dashboard.vsLastWeek')} icon={HardHat} tone="purple" onPress={() => setPanel('progress')} />
          </View>
        </View>

        <AppCard
          title={t('dashboard.progressOverview')}
          right={<Pressable onPress={() => setPanel('sites')}><Text style={styles.link}>{localizedSiteName(selectedSite, t)}⌄</Text></Pressable>}
          accent>
          <Pressable accessibilityRole="button" onPress={() => setPanel('progress')}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartLabel}>0%</Text>
              <Text style={styles.chartBadge}>{stats.progress}%</Text>
            </View>
            <ProgressLine points={progressPoints[selectedSite] ?? progressPoints['All Sites']} />
            <View style={styles.chartDates}>
              {[8, 15, 22].map(day => <Text key={day} style={styles.date}>{new Intl.DateTimeFormat(i18n.language, {month: 'short', day: 'numeric'}).format(new Date(2025, 4, day))}</Text>)}
              <Text style={styles.date}>{new Intl.DateTimeFormat(i18n.language, {month: 'short', day: 'numeric'}).format(new Date(2025, 5, 5))}</Text>
            </View>
          </Pressable>
        </AppCard>

        <AppCard
          title={t('dashboard.checklistStatusTitle')}
          right={
            <View style={[styles.checklistBadge, checklistStats.complete ? styles.checklistBadgeDone : styles.checklistBadgeOpen]}>
              <Text style={[styles.checklistBadgeText, {color: checklistStats.complete ? colors.success : colors.warning}]}>
                {checklistStats.complete ? t('dashboard.checklistCompleteBadge') : t('dashboard.checklistIncompleteBadge')}
              </Text>
            </View>
          }>
          <Pressable accessibilityRole="button" onPress={() => setPanel('checklist')} style={styles.checklistSummary}>
            <View style={[styles.checklistRing, {borderColor: checklistStats.complete ? colors.success : colors.warning}]}>
              <CountUpText value={checklistStats.done} style={styles.checklistDone} />
              <Text style={styles.checklistTotal}>/{checklistStats.total}</Text>
            </View>
            <View style={styles.checklistCopy}>
              <Text style={styles.checklistTitleText}>
                {checklistStats.complete ? t('dashboard.checklistComplete') : t('dashboard.checklistIncomplete')}
              </Text>
              <Text style={styles.checklistMeta}>
                {checklistStats.complete
                  ? t('dashboard.checklistSubmittedAt', {
                      time: dashboard.checklistSubmittedAt
                        ? new Intl.DateTimeFormat(i18n.language, {hour: '2-digit', minute: '2-digit'}).format(new Date(dashboard.checklistSubmittedAt))
                        : t('common.today'),
                    })
                  : t('dashboard.checklistMissingCount', {count: checklistStats.missing})}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.faint} />
          </Pressable>
          <View style={styles.checklistProgressTrack}>
            <View
              style={[
                styles.checklistProgressFill,
                {
                  width: `${checklistStats.total ? (checklistStats.done / checklistStats.total) * 100 : 0}%`,
                  backgroundColor: checklistStats.complete ? colors.success : colors.warning,
                },
              ]}
            />
          </View>
        </AppCard>

        <AppCard title={t('dashboard.recentActivity')} right={<Pressable onPress={() => setPanel('activity')}><Text style={styles.link}>{t('common.viewAll')}</Text></Pressable>}>
          <Pressable onPress={() => recent ? openReport(recent) : navigation.navigate('Report')} style={styles.activityRow}>
            <View style={styles.activityIcon}><ClipboardList size={18} color={colors.warning} /></View>
            <View style={styles.activityText}>
              <Text style={styles.activityTitle}>{recent ? `${localizedSiteName(reportSite(recent), t)} • ${t('dashboard.dailyReport')}` : t('dashboard.noDailyReport')}</Text>
              <Text style={styles.activityMeta}>{recentLocalized?.summary ?? t('dashboard.createFirstHint')}</Text>
            </View>
            {recent ? <View style={styles.statusPill}><Text style={styles.statusPillText}>{recent.source === 'gpt' ? t('common.analyzed') : t('common.demo')}</Text></View> : <ChevronRight size={18} color={colors.faint} />}
          </Pressable>
        </AppCard>

        <View style={styles.quick}>
          {quickActions.map(({labelKey, icon: Icon, action}) => (
            <Pressable key={labelKey} accessibilityRole="button" onPress={() => handleQuickAction(action)} style={({pressed}) => [styles.quickButton, pressed && styles.quickPressed]}>
              <Icon size={21} color={colors.primary} />
              <Text style={styles.quickLabel}>{t(labelKey)}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => navigation.navigate('Report')} style={styles.createWrap}>
          <LinearGradient colors={[colors.primary, colors.primary2]} style={styles.createButton}>
            <Plus size={20} color={colors.text} />
            <Text style={styles.createText}>{t('dashboard.createReport')}</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
      </FocusFadeView>

      {toast ? <View style={styles.toast}><Check size={16} color={colors.success} /><Text style={styles.toastText}>{toast}</Text></View> : null}

      <Modal visible={panel !== null} animationType="slide" transparent onRequestClose={() => setPanel(null)}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.backdrop} onPress={() => setPanel(null)} />
          <SafeAreaView style={styles.sheet} edges={['bottom']}>
            {panel === 'sites' ? (
              <><PanelHeader title={t('dashboard.selectSite')} onClose={() => setPanel(null)} />
                <Text style={styles.panelLead}>{t('dashboard.selectSiteHint')}</Text>
                {sites.map(site => (
                  <Pressable key={site} onPress={() => selectSite(site)} style={[styles.siteRow, selectedSite === site && styles.siteRowActive]}>
                    <View style={styles.siteIcon}><HardHat size={19} color={selectedSite === site ? colors.primary : colors.muted} /></View>
                    <View style={styles.siteRowCopy}><Text style={styles.siteRowTitle}>{localizedSiteName(site, t)}</Text><Text style={styles.siteRowMeta}>{site === 'All Sites' ? t('dashboard.combinedOverview') : t('dashboard.completeActive', {progress: financeSites.find(item => item.name === site)?.progress ?? siteProgress[site] ?? 0})}</Text></View>
                    {selectedSite === site ? <CheckCircle2 size={21} color={colors.primary} /> : <ChevronRight size={19} color={colors.faint} />}
                  </Pressable>
                ))}
              </>
            ) : null}

            {panel === 'notifications' ? (
              <><PanelHeader title={t('dashboard.notifications')} onClose={() => setPanel(null)} />
                <ScrollView showsVerticalScrollIndicator={false}>
                  {notifications.map((item, index) => { const Icon = item.icon; return (
                    <View key={`${item.title}-${index}`} style={styles.noticeRow}>
                      <View style={[styles.noticeIcon, {backgroundColor: `${item.tone}1F`}]}><Icon size={19} color={item.tone} /></View>
                      <View style={styles.noticeCopy}><Text style={styles.noticeTitle}>{item.title}</Text><Text style={styles.noticeDetail}>{item.detail}</Text><Text style={styles.noticeTime}>{index === 0 ? t('common.now') : t('common.today')}</Text></View>
                    </View>
                  );})}
                </ScrollView>
              </>
            ) : null}

            {panel === 'workers' ? (
              <><PanelHeader title={t('dashboard.workersTitle')} onClose={() => setPanel(null)} />
                <View style={styles.workerHero}><Users size={28} color={colors.success} /><CountUpText value={stats.workers} style={styles.workerCount} /><Text style={styles.workerLabel}>{t('dashboard.peopleReported')}</Text></View>
                {(visibleReports.length ? visibleReports.slice(0, 5) : [null]).map(report => (
                  <View key={report?.id ?? 'empty'} style={styles.detailRow}><View><Text style={styles.detailTitle}>{localizedSiteName(report ? reportSite(report) : selectedSite, t)}</Text><Text style={styles.detailMeta}>{report ? `${report.reportDate} • ${report.workHours || t('dashboard.hoursMissing')}` : t('dashboard.noWorkforce')}</Text></View><Text style={styles.detailValue}>{report?.workersCount ?? 0}</Text></View>
                ))}
                <Pressable onPress={() => {setPanel(null); navigation.navigate('Report');}} style={styles.panelPrimary}><Plus size={18} color={colors.text} /><Text style={styles.panelPrimaryText}>{t('dashboard.addWorkforce')}</Text></Pressable>
              </>
            ) : null}

            {panel === 'progress' ? (
              <><PanelHeader title={t('dashboard.progressTitle', {site: localizedSiteName(selectedSite, t)})} onClose={() => setPanel(null)} />
                <View style={styles.progressHero}><CountUpText value={stats.progress} formatter={value => `${value}%`} style={styles.progressValue} /><Text style={styles.progressCaption}>{t('dashboard.completion')}</Text></View>
                <View style={styles.largeChart}><ProgressLine points={progressPoints[selectedSite] ?? progressPoints['All Sites']} /></View>
                <View style={styles.progressLegend}><Text style={styles.progressGain}>{t('dashboard.ahead')}</Text><Text style={styles.progressRange}>08.05 — 05.06</Text></View>
                <Text style={styles.panelLead}>{t('dashboard.progressHint')}</Text>
              </>
            ) : null}

            {panel === 'activity' ? (
              <><PanelHeader title={t('dashboard.recentActivity')} onClose={() => setPanel(null)} />
                <ScrollView showsVerticalScrollIndicator={false}>
                  {visibleReports.length ? visibleReports.map(report => (
                    <Pressable key={report.id} onPress={() => openReport(report)} style={styles.reportRow}>
                      <View style={styles.activityIcon}><ClipboardList size={18} color={colors.warning} /></View>
                      <View style={styles.activityText}><Text style={styles.activityTitle}>{localizedSiteName(reportSite(report), t)} • {report.reportDate}</Text><Text numberOfLines={2} style={styles.activityMeta}>{getLocalizedReport(report, i18n.language).summary}</Text></View>
                      <ChevronRight size={18} color={colors.faint} />
                    </Pressable>
                  )) : <View style={styles.emptyState}><ClipboardList size={34} color={colors.faint} /><Text style={styles.emptyTitle}>{t('dashboard.noReports')}</Text><Text style={styles.emptyCopy}>{t('dashboard.noReportsHint')}</Text></View>}
                </ScrollView>
              </>
            ) : null}

            {panel === 'report' ? (
              <><PanelHeader title={t('dashboard.reportDetails')} onClose={() => setPanel(null)} />
                <ScrollView showsVerticalScrollIndicator={false}>
                  {selectedReport ? <>
                    <Text style={styles.reportDetailTitle}>{localizedSiteName(reportSite(selectedReport), t)} • {selectedReport.reportDate}</Text>
                    <Text style={styles.reportDetailSummary}>{getLocalizedReport(selectedReport, i18n.language).summary}</Text>
                    {[
                      [t('dashboard.workers'), selectedReport.workersCount?.toString() ?? t('common.notSpecified')],
                      [t('dashboard.location'), selectedReport.floors.join(', ') || t('common.notSpecified')],
                      [t('dashboard.workHours'), getLocalizedReport(selectedReport, i18n.language).workHours || t('common.notSpecified')],
                      [t('dashboard.missingMaterials'), getLocalizedReport(selectedReport, i18n.language).missingMaterials.map(item => `${item.name} ${item.quantity}`).join(', ') || t('common.none')],
                      [t('dashboard.delays'), getLocalizedReport(selectedReport, i18n.language).delays.map(item => item.reason).join(', ') || t('common.none')],
                      [t('dashboard.nextSteps'), getLocalizedReport(selectedReport, i18n.language).nextDayTasks.join(', ') || t('common.none')],
                    ].map(([label, value]) => <View key={label} style={styles.reportFact}><Text style={styles.reportFactLabel}>{label}</Text><Text style={styles.reportFactValue}>{value}</Text></View>)}
                  </> : null}
                </ScrollView>
              </>
            ) : null}

            {panel === 'checklist' ? (
              <><PanelHeader title={t('dashboard.checklistTitle')} onClose={() => setPanel(null)} />
                <View style={[styles.checklistPanelStatus, checklistStats.complete ? styles.checklistPanelStatusDone : styles.checklistPanelStatusOpen]}>
                  <View style={styles.checklistPanelStatusTop}>
                    {checklistStats.complete ? <CheckCircle2 size={20} color={colors.success} /> : <AlertTriangle size={20} color={colors.warning} />}
                    <Text style={styles.checklistPanelStatusTitle}>
                      {checklistStats.complete ? t('dashboard.checklistComplete') : t('dashboard.checklistIncomplete')}
                    </Text>
                  </View>
                  <Text style={styles.checklistPanelStatusText}>
                    {checklistStats.complete
                      ? t('dashboard.checklistNotificationCompleteDetail', {
                          time: dashboard.checklistSubmittedAt
                            ? new Intl.DateTimeFormat(i18n.language, {hour: '2-digit', minute: '2-digit'}).format(new Date(dashboard.checklistSubmittedAt))
                            : t('common.today'),
                        })
                      : t('dashboard.checklistNotificationDueDetail', {count: checklistStats.missing})}
                  </Text>
                </View>
                <Text style={styles.panelLead}>{t('dashboard.completedCount', {done: checklistStats.done, total: checklistStats.total})}</Text>
                {dashboard.checklist.map(item => (
                  <Pressable key={item.id} onPress={() => toggleChecklist(item.id)} style={styles.checkRow}>
                    <View style={[styles.checkbox, item.done && styles.checkboxDone]}>{item.done ? <Check size={16} color={colors.text} /> : null}</View>
                    <Text style={[styles.checkText, item.done && styles.checkTextDone]}>{t(`dashboard.checklist.${item.id}`, {defaultValue: item.label})}</Text>
                  </Pressable>
                ))}
              </>
            ) : null}

            {panel === 'chat' ? (
              <><PanelHeader title={t('dashboard.chatTitle')} onClose={() => setPanel(null)} />
                <ScrollView style={styles.chatList} contentContainerStyle={styles.chatContent} showsVerticalScrollIndicator={false}>
                  {dashboard.chat.map(message => (
                    <View key={message.id} style={[styles.message, message.author === 'Alex' ? styles.myMessage : styles.theirMessage]}><Text style={styles.messageAuthor}>{message.author === 'Alex' ? t('common.alex') : t('common.siteManager')}</Text><Text style={styles.messageBody}>{message.id === 'welcome' ? t('dashboard.welcomeMessage') : message.body}</Text></View>
                  ))}
                </ScrollView>
                <View style={styles.composer}><TextInput value={chatText} onChangeText={setChatText} onSubmitEditing={sendMessage} returnKeyType="send" placeholder={t('dashboard.chatPlaceholder')} placeholderTextColor={colors.faint} style={styles.chatInput} /><Pressable onPress={sendMessage} style={styles.sendButton}><Send size={18} color={colors.text} /></Pressable></View>
              </>
            ) : null}

            {panel === 'photos' ? (
              <><PanelHeader title={t('dashboard.photosTitle')} onClose={() => setPanel(null)} />
                <Pressable onPress={choosePhoto} style={styles.addPhoto}><ImagePlus size={21} color={colors.primary} /><Text style={styles.addPhotoText}>{t('dashboard.addAnotherPhoto')}</Text></Pressable>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.photoGrid}>{dashboard.photos.map(photo => <View key={photo.id} style={styles.photoCard}><Image source={{uri: photo.uri}} style={styles.photo} /><Text numberOfLines={1} style={styles.photoName}>{photo.fileName}</Text></View>)}</View>
                  {!dashboard.photos.length ? <View style={styles.emptyState}><Camera size={34} color={colors.faint} /><Text style={styles.emptyTitle}>{t('dashboard.noPhotos')}</Text></View> : null}
                </ScrollView>
              </>
            ) : null}
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  focusRoot: {flex: 1},
  content: {padding: 20, paddingBottom: 112, gap: 14},
  header: {alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginTop: 4},
  headerCopy: {flex: 1},
  brandRow: {alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 5, minHeight: 32},
  brand: {color: colors.text, fontSize: 21, fontWeight: '900'},
  ai: {color: colors.primary2},
  siteContext: {color: colors.primary, fontSize: 10, fontWeight: '800', marginTop: 1},
  greeting: {color: colors.text, fontSize: 17, fontWeight: '800', marginTop: 21},
  subtle: {color: colors.muted, fontSize: 12, marginTop: 3},
  iconButton: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, height: 42, justifyContent: 'center', width: 42},
  notificationDot: {backgroundColor: colors.danger, borderRadius: 5, height: 9, position: 'absolute', right: 9, top: 7, width: 9},
  metricGrid: {gap: 12},
  metricRow: {flexDirection: 'row', gap: 12},
  chartHeader: {flexDirection: 'row', justifyContent: 'space-between'},
  chartLabel: {color: colors.faint, fontSize: 10},
  chartBadge: {backgroundColor: colors.primary2, borderRadius: 8, color: colors.text, fontSize: 11, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 4},
  chartDates: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 8},
  date: {color: colors.faint, fontSize: 10},
  link: {color: '#8EA8FF', fontSize: 12, fontWeight: '800'},
  activityRow: {alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 58},
  activityIcon: {alignItems: 'center', backgroundColor: colors.warningSoft, borderRadius: 10, height: 38, justifyContent: 'center', width: 38},
  activityText: {flex: 1},
  activityTitle: {color: colors.text, fontSize: 13, fontWeight: '900'},
  activityMeta: {color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 2},
  statusPill: {backgroundColor: '#241E55', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6},
  statusPillText: {color: '#BCA8FF', fontSize: 10, fontWeight: '900'},
  checklistBadge: {borderRadius: 10, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5},
  checklistBadgeDone: {backgroundColor: colors.successSoft, borderColor: colors.success},
  checklistBadgeOpen: {backgroundColor: colors.warningSoft, borderColor: colors.warning},
  checklistBadgeText: {fontSize: 10, fontWeight: '900'},
  checklistSummary: {alignItems: 'center', flexDirection: 'row', gap: 12},
  checklistRing: {alignItems: 'baseline', backgroundColor: colors.surface2, borderRadius: 18, borderWidth: 2, flexDirection: 'row', height: 58, justifyContent: 'center', width: 58},
  checklistDone: {color: colors.text, fontSize: 24, fontWeight: '900'},
  checklistTotal: {color: colors.muted, fontSize: 12, fontWeight: '900'},
  checklistCopy: {flex: 1},
  checklistTitleText: {color: colors.text, fontSize: 15, fontWeight: '900'},
  checklistMeta: {color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4},
  checklistProgressTrack: {backgroundColor: colors.surface3, borderRadius: 999, height: 7, marginTop: 14, overflow: 'hidden'},
  checklistProgressFill: {borderRadius: 999, height: '100%'},
  quick: {flexDirection: 'row', gap: 10},
  quickButton: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, flex: 1, paddingVertical: 12},
  quickPressed: {backgroundColor: colors.primarySoft, transform: [{scale: 0.97}]},
  quickLabel: {color: colors.muted, fontSize: 9, fontWeight: '800', marginTop: 7, textAlign: 'center'},
  createWrap: {marginTop: 1},
  createButton: {alignItems: 'center', borderRadius: 18, flexDirection: 'row', gap: 8, height: 58, justifyContent: 'center'},
  createText: {color: colors.text, fontSize: 15, fontWeight: '900'},
  toast: {alignItems: 'center', alignSelf: 'center', backgroundColor: '#15243A', borderColor: colors.success, borderRadius: 22, borderWidth: 1, bottom: 92, flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 11, position: 'absolute'},
  toastText: {color: colors.text, fontSize: 12, fontWeight: '800'},
  modalRoot: {flex: 1, justifyContent: 'flex-end'},
  backdrop: {backgroundColor: 'rgba(0,0,0,0.58)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0},
  sheet: {backgroundColor: '#0B1220', borderColor: colors.border, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, maxHeight: '83%', minHeight: 300, padding: 20},
  panelHeader: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16},
  panelTitle: {color: colors.text, fontSize: 21, fontWeight: '900'},
  closeButton: {alignItems: 'center', backgroundColor: colors.surface3, borderRadius: 18, height: 36, justifyContent: 'center', width: 36},
  panelLead: {color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 15},
  checklistPanelStatus: {borderRadius: 16, borderWidth: 1, marginBottom: 14, padding: 14},
  checklistPanelStatusDone: {backgroundColor: colors.successSoft, borderColor: colors.success},
  checklistPanelStatusOpen: {backgroundColor: colors.warningSoft, borderColor: colors.warning},
  checklistPanelStatusTop: {alignItems: 'center', flexDirection: 'row', gap: 9},
  checklistPanelStatusTitle: {color: colors.text, fontSize: 14, fontWeight: '900'},
  checklistPanelStatusText: {color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 7},
  siteRow: {alignItems: 'center', borderColor: colors.border, borderRadius: 15, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 10, padding: 13},
  siteRowActive: {backgroundColor: colors.primarySoft, borderColor: colors.primary},
  siteIcon: {alignItems: 'center', backgroundColor: colors.surface3, borderRadius: 10, height: 40, justifyContent: 'center', width: 40},
  siteRowCopy: {flex: 1},
  siteRowTitle: {color: colors.text, fontSize: 14, fontWeight: '900'},
  siteRowMeta: {color: colors.muted, fontSize: 11, marginTop: 3},
  noticeRow: {alignItems: 'flex-start', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: 12, paddingVertical: 13},
  noticeIcon: {alignItems: 'center', borderRadius: 11, height: 42, justifyContent: 'center', width: 42},
  noticeCopy: {flex: 1},
  noticeTitle: {color: colors.text, fontSize: 13, fontWeight: '900'},
  noticeDetail: {color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3},
  noticeTime: {color: colors.faint, fontSize: 10, marginTop: 6},
  workerHero: {alignItems: 'center', backgroundColor: colors.successSoft, borderRadius: 18, marginBottom: 14, padding: 20},
  workerCount: {color: colors.text, fontSize: 42, fontWeight: '900', marginTop: 5},
  workerLabel: {color: colors.muted, fontSize: 12},
  detailRow: {alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 13},
  detailTitle: {color: colors.text, fontSize: 13, fontWeight: '900'},
  detailMeta: {color: colors.muted, fontSize: 11, marginTop: 3},
  detailValue: {color: colors.success, fontSize: 24, fontWeight: '900'},
  panelPrimary: {alignItems: 'center', backgroundColor: colors.primary, borderRadius: 15, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 18, paddingVertical: 14},
  panelPrimaryText: {color: colors.text, fontSize: 13, fontWeight: '900'},
  progressHero: {alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 18, padding: 18},
  progressValue: {color: colors.text, fontSize: 45, fontWeight: '900'},
  progressCaption: {color: colors.muted, fontSize: 12},
  largeChart: {marginTop: 18},
  progressLegend: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginVertical: 15},
  progressGain: {color: colors.success, fontSize: 12, fontWeight: '900'},
  progressRange: {color: colors.faint, fontSize: 11},
  reportRow: {alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: 12, paddingVertical: 13},
  emptyState: {alignItems: 'center', paddingVertical: 36},
  emptyTitle: {color: colors.text, fontSize: 15, fontWeight: '900', marginTop: 12},
  emptyCopy: {color: colors.muted, fontSize: 12, marginTop: 4},
  reportDetailTitle: {color: colors.text, fontSize: 18, fontWeight: '900'},
  reportDetailSummary: {color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 15, marginTop: 7},
  reportFact: {borderBottomColor: colors.border, borderBottomWidth: 1, paddingVertical: 12},
  reportFactLabel: {color: colors.primary, fontSize: 10, fontWeight: '900', textTransform: 'uppercase'},
  reportFactValue: {color: colors.text, fontSize: 13, lineHeight: 19, marginTop: 4},
  checkRow: {alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: 12, paddingVertical: 15},
  checkbox: {alignItems: 'center', borderColor: colors.faint, borderRadius: 8, borderWidth: 1, height: 28, justifyContent: 'center', width: 28},
  checkboxDone: {backgroundColor: colors.success, borderColor: colors.success},
  checkText: {color: colors.text, flex: 1, fontSize: 13, lineHeight: 18},
  checkTextDone: {color: colors.muted, textDecorationLine: 'line-through'},
  chatList: {minHeight: 220},
  chatContent: {gap: 10, paddingBottom: 12},
  message: {borderRadius: 15, maxWidth: '85%', paddingHorizontal: 13, paddingVertical: 10},
  myMessage: {alignSelf: 'flex-end', backgroundColor: colors.primary},
  theirMessage: {alignSelf: 'flex-start', backgroundColor: colors.surface3},
  messageAuthor: {color: '#C9D5F1', fontSize: 9, fontWeight: '900', marginBottom: 3},
  messageBody: {color: colors.text, fontSize: 13, lineHeight: 18},
  composer: {alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 9, paddingTop: 12},
  chatInput: {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 15, borderWidth: 1, color: colors.text, flex: 1, minHeight: 46, paddingHorizontal: 14},
  sendButton: {alignItems: 'center', backgroundColor: colors.primary, borderRadius: 15, height: 46, justifyContent: 'center', width: 46},
  addPhoto: {alignItems: 'center', borderColor: colors.primary, borderRadius: 14, borderStyle: 'dashed', borderWidth: 1, flexDirection: 'row', gap: 9, justifyContent: 'center', marginBottom: 15, paddingVertical: 13},
  addPhotoText: {color: colors.primary, fontSize: 13, fontWeight: '900'},
  photoGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  photoCard: {backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden', width: '48%'},
  photo: {aspectRatio: 1.25, width: '100%'},
  photoName: {color: colors.muted, fontSize: 10, padding: 8},
});
