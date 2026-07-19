import React, {useCallback, useMemo, useState} from 'react';
import {
  Alert,
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
import {useTranslation} from 'react-i18next';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Download,
  HardHat,
  Pencil,
  Plus,
  ReceiptText,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import {AppCard} from '../components/AppCard';
import {
  CostCategory,
  expenseTotals,
  FinanceState,
  getFinanceState,
  paymentTotal,
  saveFinanceState,
  shareFinanceCsv,
  SiteExpense,
  SitePayment,
} from '../services/financeService';
import {getReports} from '../services/reportStorage';
import {colors, radii} from '../theme';
import {StructuredReport} from '../types/report';
import {localizedSiteName} from '../i18n';
import {AppUser, can} from '../services/authService';

type Panel = 'sites' | 'addSite' | 'payments' | 'payment' | 'addPayment' | 'costs' | 'addExpense' | 'project' | null;

const categoryColors: Record<CostCategory, string> = {
  labor: colors.primary2,
  materials: colors.primary,
  equipment: colors.warning,
  other: colors.success,
};

const emptyState: FinanceState = {selectedSiteId: 'tower-a', sites: [], payments: [], expenses: []};

function SheetHeader({title, onClose}: {title: string; onClose: () => void}) {
  return (
    <View style={styles.sheetHeader}>
      <Text style={styles.sheetTitle}>{title}</Text>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.closeButton}><X size={20} color={colors.text} /></Pressable>
    </View>
  );
}

export function FinanceScreen({navigation, currentUser}: {navigation: any; currentUser?: AppUser}) {
  const {t, i18n} = useTranslation();
  const [state, setState] = useState<FinanceState>(emptyState);
  const [reports, setReports] = useState<StructuredReport[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [selectedPayment, setSelectedPayment] = useState<SitePayment | null>(null);
  const [vendor, setVendor] = useState('');
  const [invoice, setInvoice] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('pending');
  const [expenseCategory, setExpenseCategory] = useState<CostCategory>('materials');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [contractInput, setContractInput] = useState('');
  const [progressInput, setProgressInput] = useState('');
  const [siteNameInput, setSiteNameInput] = useState('');
  const [siteContractInput, setSiteContractInput] = useState('');
  const [siteProgressInput, setSiteProgressInput] = useState('');
  const [siteScheduleStatus, setSiteScheduleStatus] = useState<'onSchedule' | 'atRisk'>('onSchedule');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    const [financeState, savedReports] = await Promise.all([getFinanceState(), getReports()]);
    setState(financeState);
    setReports(savedReports);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const site = state.sites.find(item => item.id === state.selectedSiteId) ?? state.sites[0];
  const payments = useMemo(() => state.payments.filter(item => item.siteId === site?.id).sort((a, b) => b.date.localeCompare(a.date)), [site?.id, state.payments]);
  const expenses = useMemo(() => state.expenses.filter(item => item.siteId === site?.id), [site?.id, state.expenses]);
  const paid = paymentTotal(payments, 'paid');
  const pending = paymentTotal(payments, 'pending');
  const totals = expenseTotals(expenses);
  const expenseTotal = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const paidPercent = site?.contractValue ? Math.min(100, Math.round((paid / site.contractValue) * 100)) : 0;
  const canViewFinance = can(currentUser, 'finance.view');
  const canEditFinance = can(currentUser, 'finance.edit');
  const canCreateSite = can(currentUser, 'site.create');
  const canDeleteSite = can(currentUser, 'site.delete');

  const financialFlags = useMemo(
    () => reports.flatMap(report => report.financialImpact ? [report.financialImpact] : []).slice(0, 4),
    [reports],
  );

  const money = useCallback((value: number) => new Intl.NumberFormat(i18n.language, {style: 'currency', currency: 'USD', maximumFractionDigits: 0}).format(value), [i18n.language]);
  const date = useCallback((value: string) => new Intl.DateTimeFormat(i18n.language, {year: 'numeric', month: 'short', day: 'numeric'}).format(new Date(`${value}T12:00:00`)), [i18n.language]);
  const vendorName = useCallback((value: string) => {
    const keys: Record<string, string> = {
      'General Construction': 'finance.generalConstruction', 'Steel Works': 'finance.steelWorks', 'MEP Rough-In': 'finance.mep',
      'Concrete Package': 'finance.concretePackage', 'Facade Systems': 'finance.facadeSystems', 'Site Operations': 'finance.siteOperations',
      'Main Contractor': 'finance.mainContractor', 'Glass Systems': 'finance.glassSystems', 'Marine Concrete': 'finance.marineConcrete',
    };
    return keys[value] ? t(keys[value]) : value;
  }, [t]);

  const persist = async (next: FinanceState, message?: string) => {
    setState(next);
    await saveFinanceState(next);
    if (message) {
      setToast(message);
      setTimeout(() => setToast(''), 2200);
    }
  };

  const selectSite = async (siteId: string) => {
    await persist({...state, selectedSiteId: siteId}, t('finance.siteChanged'));
    setPanel(null);
  };

  const openPayment = (payment: SitePayment) => {
    setSelectedPayment(payment);
    setPanel('payment');
  };

  const resetPaymentForm = () => {
    setVendor(''); setInvoice(''); setAmount(''); setNote(''); setPaymentStatus('pending');
  };

  const addPayment = async () => {
    if (!canEditFinance) return;
    const numericAmount = Number(amount.replace(/[^0-9.]/g, ''));
    if (!site || !vendor.trim() || !invoice.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert(t('finance.formError'), t('finance.paymentFormError'));
      return;
    }
    const payment: SitePayment = {
      id: `${Date.now()}`,
      siteId: site.id,
      vendor: vendor.trim(),
      invoice: invoice.trim(),
      amount: numericAmount,
      status: paymentStatus,
      date: new Date().toISOString().slice(0, 10),
      note: note.trim(),
    };
    await persist({...state, payments: [payment, ...state.payments]}, t('finance.paymentSaved'));
    resetPaymentForm();
    setPanel('payments');
  };

  const markPaymentPaid = async () => {
    if (!canEditFinance) return;
    if (!selectedPayment) return;
    const updated = {...selectedPayment, status: 'paid' as const, date: new Date().toISOString().slice(0, 10)};
    await persist({...state, payments: state.payments.map(item => item.id === updated.id ? updated : item)}, t('finance.paymentUpdated'));
    setSelectedPayment(updated);
  };

  const addExpense = async () => {
    if (!canEditFinance) return;
    const numericAmount = Number(expenseAmount.replace(/[^0-9.]/g, ''));
    if (!site || !expenseDescription.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert(t('finance.formError'), t('finance.expenseFormError'));
      return;
    }
    const expense: SiteExpense = {
      id: `${Date.now()}`,
      siteId: site.id,
      category: expenseCategory,
      amount: numericAmount,
      description: expenseDescription.trim(),
      date: new Date().toISOString().slice(0, 10),
    };
    await persist({...state, expenses: [expense, ...state.expenses]}, t('finance.expenseSaved'));
    setExpenseAmount(''); setExpenseDescription('');
    setPanel('costs');
  };

  const openProject = () => {
    if (!site) return;
    setContractInput(String(site.contractValue));
    setProgressInput(String(site.progress));
    setPanel('project');
  };

  const openAddSite = () => {
    setSiteNameInput('');
    setSiteContractInput('');
    setSiteProgressInput('0');
    setSiteScheduleStatus('onSchedule');
    setPanel('addSite');
  };

  const addSite = async () => {
    if (!canCreateSite) return;
    const name = siteNameInput.trim();
    const contractValue = Number(siteContractInput.replace(/[^0-9.]/g, ''));
    const progress = Number(siteProgressInput.replace(/[^0-9.]/g, ''));
    if (!name || !Number.isFinite(contractValue) || contractValue <= 0 || !Number.isFinite(progress) || progress < 0 || progress > 100) {
      Alert.alert(t('finance.formError'), t('finance.siteFormError'));
      return;
    }
    const idBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'site';
    const existingIds = new Set(state.sites.map(item => item.id));
    let id = idBase;
    let suffix = 2;
    while (existingIds.has(id)) {
      id = `${idBase}-${suffix}`;
      suffix += 1;
    }
    await persist({
      ...state,
      selectedSiteId: id,
      sites: [{id, name, contractValue, progress, scheduleStatus: siteScheduleStatus}, ...state.sites],
    }, t('finance.siteCreated'));
    setPanel(null);
  };

  const deleteCurrentSite = async () => {
    if (!canDeleteSite) return;
    if (!site || state.sites.length <= 1) {
      Alert.alert(t('finance.formError'), t('finance.lastSiteError'));
      return;
    }
    Alert.alert(t('finance.deleteSite'), t('finance.deleteSiteConfirm', {site: localizedSiteName(site.name, t)}), [
      {text: t('common.close'), style: 'cancel'},
      {
        text: t('finance.deleteSite'),
        style: 'destructive',
        onPress: async () => {
          const remainingSites = state.sites.filter(item => item.id !== site.id);
          const selectedSiteId = remainingSites[0].id;
          await persist({
            selectedSiteId,
            sites: remainingSites,
            payments: state.payments.filter(item => item.siteId !== site.id),
            expenses: state.expenses.filter(item => item.siteId !== site.id),
          }, t('finance.siteDeleted'));
          setPanel(null);
        },
      },
    ]);
  };

  const saveProject = async () => {
    if (!canEditFinance) return;
    if (!site) return;
    const contractValue = Number(contractInput.replace(/[^0-9.]/g, ''));
    const progress = Number(progressInput.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(contractValue) || contractValue <= 0 || !Number.isFinite(progress) || progress < 0 || progress > 100) {
      Alert.alert(t('finance.formError'), t('finance.projectFormError'));
      return;
    }
    const sites = state.sites.map(item => item.id === site.id ? {...item, contractValue, progress} : item);
    await persist({...state, sites}, t('finance.projectUpdated'));
    setPanel(null);
  };

  const exportReport = async () => {
    if (!site) return;
    try {
      await shareFinanceCsv(site, payments, expenses);
    } catch {
      Alert.alert(t('finance.exportFailed'), t('finance.exportFailedMessage'));
    }
  };

  if (!canViewFinance) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.locked}>
          <ShieldCheck size={36} color={colors.primary} />
          <Text style={styles.lockedTitle}>{t('auth.noPermissionTitle')}</Text>
          <Text style={styles.lockedText}>{t('auth.financePermissionHint')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!site) {
    return <SafeAreaView style={styles.safe} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => setPanel('sites')} style={styles.siteHero}>
          <View style={styles.heroCopy}>
            <View style={styles.siteTitleRow}><Text style={styles.siteTitle}>{localizedSiteName(site.name, t)}</Text><ChevronDown size={20} color={colors.muted} /></View>
            <View style={styles.pills}>
              <Text style={[styles.pill, site.scheduleStatus === 'onSchedule' ? styles.greenPill : styles.orangePill]}>{t(site.scheduleStatus === 'onSchedule' ? 'finance.onSchedule' : 'finance.atRisk')}</Text>
              <Text style={[styles.pill, styles.purplePill]}>{t('finance.percentComplete', {progress: site.progress})}</Text>
              <Text style={[styles.pill, styles.bluePill]}>{t('common.active')}</Text>
            </View>
          </View>
          <HardHat size={54} color={colors.primary2} />
          {canEditFinance ? <Pressable onPress={event => {event.stopPropagation(); openProject();}} style={styles.editProject}><Pencil size={15} color={colors.text} /></Pressable> : null}
        </Pressable>

        <AppCard title={t('finance.paymentsOverview')} right={<Pressable onPress={() => setPanel('payments')}><Text style={styles.link}>{t('common.viewAll')}</Text></Pressable>}>
          <Pressable onPress={() => setPanel('payments')}>
            <View style={styles.paymentTop}>
              <View><Text style={styles.bigMoney}>{money(paid)}</Text><Text style={styles.muted}>{t('finance.paidToDate')}</Text></View>
              <View style={styles.rightMoney}><Text style={styles.moneySmall}>{money(site.contractValue)}</Text><Text style={styles.muted}>{t('finance.contractValue')}</Text></View>
            </View>
            {pending > 0 ? <Text style={styles.pendingSummary}>{t('finance.pendingAmount', {amount: money(pending)})}</Text> : null}
            <View style={styles.progressTrack}><LinearGradient colors={[colors.primary, colors.primary2]} style={[styles.progressFill, {width: `${paidPercent}%`}]} /></View>
            <Text style={styles.percent}>{paidPercent}%</Text>
          </Pressable>
        </AppCard>

        <AppCard title={t('finance.recentPayments')} right={canEditFinance ? <Pressable onPress={() => {resetPaymentForm(); setPanel('addPayment');}}><Plus size={19} color={colors.primary} /></Pressable> : null}>
          {payments.slice(0, 3).map(payment => (
            <Pressable key={payment.id} onPress={() => openPayment(payment)} style={styles.paymentRow}>
              <View style={styles.paymentIcon}><CircleDollarSign size={18} color={colors.text} /></View>
              <View style={styles.paymentCopy}><Text numberOfLines={1} style={styles.paymentName}>{vendorName(payment.vendor)}</Text><Text style={styles.muted}>{payment.invoice}</Text></View>
              <View style={styles.paymentRight}><Text style={styles.paymentAmount}>{money(payment.amount)}</Text><Text style={[styles.paymentStatus, payment.status === 'paid' ? styles.paid : styles.pending]}>{t(`finance.${payment.status}`)}</Text><Text style={styles.muted}>{date(payment.date)}</Text></View>
            </Pressable>
          ))}
          {!payments.length ? <Text style={styles.empty}>{t('finance.noPayments')}</Text> : null}
        </AppCard>

        <AppCard title={t('finance.costBreakdown')} right={<Pressable onPress={() => setPanel('costs')}><Text style={styles.link}>{t('common.viewReport')}</Text></Pressable>}>
          <Pressable onPress={() => setPanel('costs')} style={styles.breakdown}>
            <LinearGradient colors={[colors.success, colors.primary, colors.primary2, colors.warning]} style={styles.donut}><View style={styles.donutInner}><Text style={styles.donutMoney}>{money(expenseTotal)}</Text><Text style={styles.muted}>{t('common.total')}</Text></View></LinearGradient>
            <View style={styles.legend}>
              {(Object.keys(categoryColors) as CostCategory[]).map(category => {
                const percent = expenseTotal ? Math.round((totals[category] / expenseTotal) * 100) : 0;
                return <View key={category} style={styles.legendRow}><View style={[styles.dot, {backgroundColor: categoryColors[category]}]} /><Text style={styles.legendLabel}>{t(`finance.${category}`)}</Text><Text style={styles.legendValue}>{percent}%</Text></View>;
              })}
            </View>
          </Pressable>
        </AppCard>

        <AppCard title={t('finance.aiFlags')} right={<ShieldCheck size={17} color={colors.success} />}>
          {(financialFlags.length ? financialFlags : [t('finance.noRisk')]).map((item, index) => <Pressable key={`${item}-${index}`} onPress={() => financialFlags.length && navigation.navigate('Tasks')} style={styles.flagRow}><AlertTriangle size={15} color={financialFlags.length ? colors.warning : colors.success} /><Text style={styles.flag}>{item}</Text>{financialFlags.length ? <ChevronRight size={16} color={colors.faint} /> : null}</Pressable>)}
        </AppCard>

        <Pressable onPress={exportReport} style={styles.exportButton}><Download size={18} color={colors.text} /><Text style={styles.exportText}>{t('finance.exportReport')}</Text></Pressable>
      </ScrollView>

      {toast ? <View style={styles.toast}><Check size={16} color={colors.success} /><Text style={styles.toastText}>{toast}</Text></View> : null}

      <Modal visible={panel !== null} animationType="slide" transparent onRequestClose={() => setPanel(null)}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.backdrop} onPress={() => setPanel(null)} />
          <SafeAreaView style={styles.sheet} edges={['bottom']}>
            {panel === 'sites' ? <><SheetHeader title={t('finance.selectSite')} onClose={() => setPanel(null)} />{canCreateSite ? <Pressable onPress={openAddSite} style={styles.primaryButton}><Plus size={18} color={colors.text} /><Text style={styles.primaryButtonText}>{t('finance.addSite')}</Text></Pressable> : null}{state.sites.map(item => <Pressable key={item.id} onPress={() => selectSite(item.id)} style={[styles.siteOption, item.id === site.id && styles.siteOptionActive]}><View style={styles.siteOptionIcon}><HardHat size={20} color={item.id === site.id ? colors.primary : colors.muted} /></View><View style={styles.siteOptionCopy}><Text style={styles.siteOptionTitle}>{localizedSiteName(item.name, t)}</Text><Text style={styles.siteOptionMeta}>{t('finance.siteOptionMeta', {progress: item.progress, value: money(item.contractValue)})}</Text></View>{item.id === site.id ? <Check size={20} color={colors.primary} /> : <ChevronRight size={18} color={colors.faint} />}</Pressable>)}</> : null}

            {panel === 'addSite' ? <><SheetHeader title={t('finance.addSite')} onClose={() => setPanel(null)} /><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}><Text style={styles.inputLabel}>{t('finance.siteName')}</Text><TextInput value={siteNameInput} onChangeText={setSiteNameInput} placeholder={t('finance.siteNamePlaceholder')} placeholderTextColor={colors.faint} style={styles.input} /><Text style={styles.inputLabel}>{t('finance.contractValue')}</Text><TextInput value={siteContractInput} onChangeText={setSiteContractInput} placeholder="3850000" placeholderTextColor={colors.faint} keyboardType="decimal-pad" style={styles.input} /><Text style={styles.inputLabel}>{t('finance.progressPercent')}</Text><TextInput value={siteProgressInput} onChangeText={setSiteProgressInput} placeholder="0" placeholderTextColor={colors.faint} keyboardType="number-pad" style={styles.input} /><Text style={styles.inputLabel}>{t('finance.scheduleStatus')}</Text><View style={styles.choiceRow}>{(['onSchedule', 'atRisk'] as const).map(status => <Pressable key={status} onPress={() => setSiteScheduleStatus(status)} style={[styles.choice, siteScheduleStatus === status && styles.choiceActive]}><Text style={[styles.choiceText, siteScheduleStatus === status && styles.choiceTextActive]}>{t(`finance.${status}`)}</Text></Pressable>)}</View><Pressable onPress={addSite} style={styles.primaryButton}><Check size={18} color={colors.text} /><Text style={styles.primaryButtonText}>{t('finance.saveSite')}</Text></Pressable></ScrollView></> : null}

            {panel === 'payments' ? <><SheetHeader title={t('finance.allPayments')} onClose={() => setPanel(null)} /><View style={styles.summaryStrip}><View><Text style={styles.summaryLabel}>{t('finance.paid')}</Text><Text style={styles.summaryValue}>{money(paid)}</Text></View><View><Text style={styles.summaryLabel}>{t('finance.pending')}</Text><Text style={styles.summaryValue}>{money(pending)}</Text></View></View>{canEditFinance ? <Pressable onPress={() => {resetPaymentForm(); setPanel('addPayment');}} style={styles.primaryButton}><Plus size={18} color={colors.text} /><Text style={styles.primaryButtonText}>{t('finance.addPayment')}</Text></Pressable> : null}<ScrollView showsVerticalScrollIndicator={false}>{payments.map(payment => <Pressable key={payment.id} onPress={() => openPayment(payment)} style={styles.listRow}><View style={styles.paymentIcon}><CircleDollarSign size={18} color={colors.text} /></View><View style={styles.listCopy}><Text style={styles.listTitle}>{vendorName(payment.vendor)}</Text><Text style={styles.listMeta}>{payment.invoice} • {date(payment.date)}</Text></View><View style={styles.listRight}><Text style={styles.listAmount}>{money(payment.amount)}</Text><Text style={payment.status === 'paid' ? styles.paid : styles.pending}>{t(`finance.${payment.status}`)}</Text></View></Pressable>)}</ScrollView></> : null}

            {panel === 'payment' && selectedPayment ? <><SheetHeader title={t('finance.paymentDetails')} onClose={() => setPanel(null)} /><View style={styles.receiptHero}><ReceiptText size={28} color={colors.primary} /><Text style={styles.receiptAmount}>{money(selectedPayment.amount)}</Text><Text style={[styles.receiptStatus, selectedPayment.status === 'paid' ? styles.paid : styles.pending]}>{t(`finance.${selectedPayment.status}`)}</Text></View>{[[t('finance.vendor'), vendorName(selectedPayment.vendor)], [t('finance.invoice'), selectedPayment.invoice], [t('finance.paymentDate'), date(selectedPayment.date)], [t('finance.note'), selectedPayment.note || t('common.notSpecified')]].map(([label, value]) => <View key={label} style={styles.factRow}><Text style={styles.factLabel}>{label}</Text><Text style={styles.factValue}>{value}</Text></View>)}{canEditFinance && selectedPayment.status === 'pending' ? <Pressable onPress={markPaymentPaid} style={styles.primaryButton}><Check size={18} color={colors.text} /><Text style={styles.primaryButtonText}>{t('finance.markPaid')}</Text></Pressable> : null}</> : null}

            {panel === 'addPayment' ? <><SheetHeader title={t('finance.addPayment')} onClose={() => setPanel(null)} /><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}><Text style={styles.inputLabel}>{t('finance.vendor')}</Text><TextInput value={vendor} onChangeText={setVendor} placeholder={t('finance.vendorPlaceholder')} placeholderTextColor={colors.faint} style={styles.input} /><Text style={styles.inputLabel}>{t('finance.invoice')}</Text><TextInput value={invoice} onChangeText={setInvoice} placeholder="INV-0013" placeholderTextColor={colors.faint} autoCapitalize="characters" style={styles.input} /><Text style={styles.inputLabel}>{t('finance.amount')}</Text><TextInput value={amount} onChangeText={setAmount} placeholder="125000" placeholderTextColor={colors.faint} keyboardType="decimal-pad" style={styles.input} /><Text style={styles.inputLabel}>{t('finance.status')}</Text><View style={styles.choiceRow}>{(['paid', 'pending'] as const).map(status => <Pressable key={status} onPress={() => setPaymentStatus(status)} style={[styles.choice, paymentStatus === status && styles.choiceActive]}><Text style={[styles.choiceText, paymentStatus === status && styles.choiceTextActive]}>{t(`finance.${status}`)}</Text></Pressable>)}</View><Text style={styles.inputLabel}>{t('finance.note')}</Text><TextInput value={note} onChangeText={setNote} placeholder={t('finance.notePlaceholder')} placeholderTextColor={colors.faint} multiline style={[styles.input, styles.multiline]} /><Pressable onPress={addPayment} style={styles.primaryButton}><Check size={18} color={colors.text} /><Text style={styles.primaryButtonText}>{t('finance.savePayment')}</Text></Pressable></ScrollView></> : null}

            {panel === 'costs' ? <><SheetHeader title={t('finance.costReport')} onClose={() => setPanel(null)} /><View style={styles.costTotal}><Text style={styles.costTotalLabel}>{t('finance.totalRecordedCosts')}</Text><Text style={styles.costTotalValue}>{money(expenseTotal)}</Text></View>{canEditFinance ? <Pressable onPress={() => setPanel('addExpense')} style={styles.primaryButton}><Plus size={18} color={colors.text} /><Text style={styles.primaryButtonText}>{t('finance.addExpense')}</Text></Pressable> : null}<ScrollView showsVerticalScrollIndicator={false}>{(Object.keys(categoryColors) as CostCategory[]).map(category => <View key={category} style={styles.costGroup}><View style={[styles.costIcon, {backgroundColor: `${categoryColors[category]}22`}]}><View style={[styles.dot, {backgroundColor: categoryColors[category]}]} /></View><View style={styles.listCopy}><Text style={styles.listTitle}>{t(`finance.${category}`)}</Text><Text style={styles.listMeta}>{expenses.filter(expense => expense.category === category).length} {t('finance.entries')}</Text></View><Text style={styles.listAmount}>{money(totals[category])}</Text></View>)}</ScrollView></> : null}

            {panel === 'addExpense' ? <><SheetHeader title={t('finance.addExpense')} onClose={() => setPanel(null)} /><Text style={styles.inputLabel}>{t('finance.category')}</Text><View style={styles.categoryGrid}>{(Object.keys(categoryColors) as CostCategory[]).map(category => <Pressable key={category} onPress={() => setExpenseCategory(category)} style={[styles.categoryChoice, expenseCategory === category && {borderColor: categoryColors[category], backgroundColor: `${categoryColors[category]}22`}]}><View style={[styles.dot, {backgroundColor: categoryColors[category]}]} /><Text style={styles.choiceText}>{t(`finance.${category}`)}</Text></Pressable>)}</View><Text style={styles.inputLabel}>{t('finance.description')}</Text><TextInput value={expenseDescription} onChangeText={setExpenseDescription} placeholder={t('finance.descriptionPlaceholder')} placeholderTextColor={colors.faint} style={styles.input} /><Text style={styles.inputLabel}>{t('finance.amount')}</Text><TextInput value={expenseAmount} onChangeText={setExpenseAmount} placeholder="25000" placeholderTextColor={colors.faint} keyboardType="decimal-pad" style={styles.input} /><Pressable onPress={addExpense} style={styles.primaryButton}><Check size={18} color={colors.text} /><Text style={styles.primaryButtonText}>{t('finance.saveExpense')}</Text></Pressable></> : null}

            {panel === 'project' ? <><SheetHeader title={t('finance.projectSettings')} onClose={() => setPanel(null)} /><Text style={styles.inputLabel}>{t('finance.contractValue')}</Text><TextInput value={contractInput} onChangeText={setContractInput} keyboardType="decimal-pad" style={styles.input} /><Text style={styles.inputLabel}>{t('finance.progressPercent')}</Text><TextInput value={progressInput} onChangeText={setProgressInput} keyboardType="number-pad" style={styles.input} /><Text style={styles.inputLabel}>{t('finance.scheduleStatus')}</Text><View style={styles.choiceRow}>{(['onSchedule', 'atRisk'] as const).map(status => <Pressable key={status} onPress={async () => {const sites = state.sites.map(item => item.id === site.id ? {...item, scheduleStatus: status} : item); await persist({...state, sites});}} style={[styles.choice, site.scheduleStatus === status && styles.choiceActive]}><Text style={[styles.choiceText, site.scheduleStatus === status && styles.choiceTextActive]}>{t(`finance.${status}`)}</Text></Pressable>)}</View><Pressable onPress={saveProject} style={styles.primaryButton}><Check size={18} color={colors.text} /><Text style={styles.primaryButtonText}>{t('finance.saveChanges')}</Text></Pressable><Pressable onPress={deleteCurrentSite} style={styles.deleteSiteButton}><X size={18} color={colors.danger} /><Text style={styles.deleteSiteText}>{t('finance.deleteSite')}</Text></Pressable></> : null}
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  locked: {alignItems: 'center', flex: 1, justifyContent: 'center', padding: 28},
  lockedTitle: {color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 14, textAlign: 'center'},
  lockedText: {color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center'},
  content: {padding: 20, paddingBottom: 112, gap: 14},
  siteHero: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', overflow: 'hidden', padding: 18},
  heroCopy: {flex: 1}, siteTitleRow: {alignItems: 'center', flexDirection: 'row', gap: 6}, siteTitle: {color: colors.text, fontSize: 29, fontWeight: '900'},
  pills: {flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 16}, pill: {borderRadius: 8, fontSize: 10, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 5},
  greenPill: {backgroundColor: colors.successSoft, color: colors.success}, orangePill: {backgroundColor: colors.warningSoft, color: colors.warning}, purplePill: {backgroundColor: '#241E55', color: '#BCA8FF'}, bluePill: {backgroundColor: colors.primarySoft, color: colors.primary},
  editProject: {alignItems: 'center', backgroundColor: colors.surface3, borderRadius: 14, height: 34, justifyContent: 'center', position: 'absolute', right: 12, top: 12, width: 34},
  link: {color: '#8EA8FF', fontSize: 12, fontWeight: '800'}, paymentTop: {flexDirection: 'row', justifyContent: 'space-between'}, bigMoney: {color: colors.text, fontSize: 28, fontWeight: '900'}, muted: {color: colors.muted, fontSize: 11, marginTop: 2}, rightMoney: {alignItems: 'flex-end'}, moneySmall: {color: colors.text, fontSize: 15, fontWeight: '900'},
  pendingSummary: {color: colors.warning, fontSize: 11, fontWeight: '800', marginTop: 10}, progressTrack: {backgroundColor: colors.surface3, borderRadius: 8, height: 8, marginTop: 16, overflow: 'hidden'}, progressFill: {height: 8}, percent: {alignSelf: 'flex-end', color: colors.muted, fontSize: 11, marginTop: 6},
  paymentRow: {alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 9}, paymentIcon: {alignItems: 'center', backgroundColor: colors.surface3, borderRadius: 9, height: 38, justifyContent: 'center', width: 38}, paymentCopy: {flex: 1}, paymentName: {color: colors.text, fontSize: 13, fontWeight: '900'}, paymentRight: {alignItems: 'flex-end'}, paymentAmount: {color: colors.text, fontSize: 12, fontWeight: '900'}, paymentStatus: {fontSize: 11, fontWeight: '900', marginTop: 3}, paid: {color: colors.success, fontSize: 11, fontWeight: '900'}, pending: {color: colors.warning, fontSize: 11, fontWeight: '900'}, empty: {color: colors.muted, fontSize: 12, paddingVertical: 12},
  breakdown: {alignItems: 'center', flexDirection: 'row', gap: 20}, donut: {alignItems: 'center', borderRadius: 58, height: 116, justifyContent: 'center', width: 116}, donutInner: {alignItems: 'center', backgroundColor: colors.surface, borderRadius: 43, height: 86, justifyContent: 'center', width: 86}, donutMoney: {color: colors.text, fontSize: 13, fontWeight: '900'}, legend: {flex: 1, gap: 9}, legendRow: {alignItems: 'center', flexDirection: 'row', gap: 8}, dot: {borderRadius: 4, height: 8, width: 8}, legendLabel: {color: colors.muted, flex: 1, fontSize: 12}, legendValue: {color: colors.text, fontSize: 12, fontWeight: '900'},
  flagRow: {alignItems: 'center', flexDirection: 'row', gap: 8, paddingVertical: 6}, flag: {color: colors.text, flex: 1, fontSize: 13, lineHeight: 19}, exportButton: {alignItems: 'center', backgroundColor: colors.primarySoft, borderColor: colors.primary, borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 14}, exportText: {color: colors.text, fontSize: 13, fontWeight: '900'},
  toast: {alignItems: 'center', alignSelf: 'center', backgroundColor: '#15243A', borderColor: colors.success, borderRadius: 22, borderWidth: 1, bottom: 92, flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 11, position: 'absolute'}, toastText: {color: colors.text, fontSize: 12, fontWeight: '800'},
  modalRoot: {flex: 1, justifyContent: 'flex-end'}, backdrop: {backgroundColor: 'rgba(0,0,0,0.6)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0}, sheet: {backgroundColor: '#0B1220', borderColor: colors.border, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, maxHeight: '88%', minHeight: 340, padding: 20}, sheetHeader: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16}, sheetTitle: {color: colors.text, fontSize: 21, fontWeight: '900'}, closeButton: {alignItems: 'center', backgroundColor: colors.surface3, borderRadius: 18, height: 36, justifyContent: 'center', width: 36},
  siteOption: {alignItems: 'center', borderColor: colors.border, borderRadius: 15, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 10, padding: 13}, siteOptionActive: {backgroundColor: colors.primarySoft, borderColor: colors.primary}, siteOptionIcon: {alignItems: 'center', backgroundColor: colors.surface3, borderRadius: 10, height: 40, justifyContent: 'center', width: 40}, siteOptionCopy: {flex: 1}, siteOptionTitle: {color: colors.text, fontSize: 14, fontWeight: '900'}, siteOptionMeta: {color: colors.muted, fontSize: 11, marginTop: 3},
  summaryStrip: {backgroundColor: colors.surface, borderRadius: 15, flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12, padding: 14}, summaryLabel: {color: colors.muted, fontSize: 10, fontWeight: '800'}, summaryValue: {color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 4}, primaryButton: {alignItems: 'center', backgroundColor: colors.primary, borderRadius: 14, flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 12, marginTop: 12, minHeight: 48, paddingHorizontal: 14}, primaryButtonText: {color: colors.text, fontSize: 13, fontWeight: '900'},
  listRow: {alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: 11, paddingVertical: 12}, listCopy: {flex: 1}, listTitle: {color: colors.text, fontSize: 13, fontWeight: '900'}, listMeta: {color: colors.muted, fontSize: 11, marginTop: 3}, listRight: {alignItems: 'flex-end'}, listAmount: {color: colors.text, fontSize: 12, fontWeight: '900'},
  receiptHero: {alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 18, marginBottom: 12, padding: 18}, receiptAmount: {color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 8}, receiptStatus: {marginTop: 5}, factRow: {borderBottomColor: colors.border, borderBottomWidth: 1, paddingVertical: 12}, factLabel: {color: colors.muted, fontSize: 10, fontWeight: '800'}, factValue: {color: colors.text, fontSize: 13, fontWeight: '800', marginTop: 4},
  inputLabel: {color: colors.muted, fontSize: 11, fontWeight: '900', marginBottom: 6, marginTop: 10}, input: {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 13, borderWidth: 1, color: colors.text, minHeight: 48, paddingHorizontal: 14}, multiline: {minHeight: 84, paddingTop: 12, textAlignVertical: 'top'}, choiceRow: {flexDirection: 'row', gap: 9}, choice: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flex: 1, paddingVertical: 11}, choiceActive: {backgroundColor: colors.primarySoft, borderColor: colors.primary}, choiceText: {color: colors.muted, fontSize: 12, fontWeight: '800'}, choiceTextActive: {color: colors.text},
  costTotal: {alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, padding: 15}, costTotalLabel: {color: colors.muted, fontSize: 11}, costTotalValue: {color: colors.text, fontSize: 25, fontWeight: '900', marginTop: 5}, costGroup: {alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: 11, paddingVertical: 13}, costIcon: {alignItems: 'center', borderRadius: 10, height: 38, justifyContent: 'center', width: 38}, categoryGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8}, categoryChoice: {alignItems: 'center', borderColor: colors.border, borderRadius: 11, borderWidth: 1, flexDirection: 'row', gap: 7, paddingHorizontal: 11, paddingVertical: 10, width: '48%'},
  deleteSiteButton: {alignItems: 'center', backgroundColor: colors.dangerSoft, borderColor: `${colors.danger}55`, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 4, minHeight: 48},
  deleteSiteText: {color: colors.danger, fontSize: 13, fontWeight: '900'},
});
