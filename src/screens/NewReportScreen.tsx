import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {
  ChevronDown,
  CheckCircle2,
  Globe2,
  ImagePlus,
  Mic,
  MessageCircle,
  Search,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {ReportResult} from '../components/ReportResult';
import {transcribeAudio} from '../services/audioTranscriptionService';
import {
  cleanupVoiceRecorder,
  setupVoiceRecorder,
  startVoiceRecording,
  stopVoiceRecording,
} from '../services/voiceRecorderService';
import {analyzeReport} from '../services/reportService';
import {getReports, saveReport} from '../services/reportStorage';
import {buildReportReview} from '../services/reportReview';
import {enqueueReportSync} from '../services/syncService';
import {can, AppUser} from '../services/authService';
import {FinanceSite, getFinanceState} from '../services/financeService';
import {colors, radii} from '../theme';
import {InputLanguage, ReportPhoto, StructuredReport} from '../types/report';

const samples: Record<string, string> = {
  ru: 'Сегодня на объекте работали 12 рабочих. Устанавливали металлические профили на стенах и потолке в секции B. Задержка по лифту — поставка перенесена на 2 дня. Не хватает крепежа: дюбель-гвоздей 6×40 и саморезов для ГКЛ.',
  he: 'היום עבדו באתר 12 עובדים. הצוות התקין פרופילי מתכת בקירות ובתקרה באזור B. אספקת המעלית נדחתה ביומיים. חסרים דיבלים 6×40 וברגים ללוחות גבס.',
  en: 'Twelve workers were on site today. The team installed metal profiles on the walls and ceiling in section B. Elevator delivery was delayed by two days. We are missing 6×40 dowel nails and drywall screws.',
};

const waveHeights = [
  {height: 14},
  {height: 21},
  {height: 28},
  {height: 35},
  {height: 42},
  {height: 31},
  {height: 19},
];

function formatRecordTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function NewReportScreen({currentUser}: {currentUser?: AppUser}) {
  const {t, i18n} = useTranslation();
  const navigation = useNavigation<any>();
  const [text, setText] = useState(samples[i18n.language] ?? samples.en);
  const [language, setLanguage] = useState<InputLanguage>('auto');
  const [mode, setMode] = useState<'Text' | 'Voice'>('Text');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedReports, setSavedReports] = useState<StructuredReport[]>([]);
  const [report, setReport] = useState<StructuredReport | null>(null);
  const [pendingReport, setPendingReport] = useState<StructuredReport | null>(null);
  const [sites, setSites] = useState<FinanceSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [voiceAvailable, setVoiceAvailable] = useState(true);

  useEffect(() => {
    setVoiceAvailable(setupVoiceRecorder(setRecordMs));

    return () => {
      cleanupVoiceRecorder();
    };
  }, []);

  useEffect(() => {
    getFinanceState().then(state => {
      setSites(state.sites);
      setSelectedSiteId(state.selectedSiteId);
    }).catch(() => undefined);
  }, []);

  const selectedSite = useMemo(
    () => sites.find(site => site.id === selectedSiteId) ?? sites[0],
    [selectedSiteId, sites],
  );

  const filteredReports = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return savedReports;
    }
    return savedReports.filter(item => (
      item.summary.toLowerCase().includes(query) ||
      item.originalText.toLowerCase().includes(query) ||
      item.site.toLowerCase().includes(query) ||
      item.missingMaterials.some(material => material.name.toLowerCase().includes(query))
    ));
  }, [savedReports, searchQuery]);

  async function analyzeText(value = text) {
    const cleanText = value.trim();
    if (cleanText.length < 10) {
      Alert.alert(t('report.shortTitle'), t('report.shortMessage'));
      return;
    }

    setLoading(true);
    try {
      const result = await analyzeReport(cleanText, language);
      setPendingReport({
        ...result,
        siteId: selectedSite?.id,
        site: selectedSite?.name ?? result.site,
        photos,
        syncStatus: 'queued',
      });
    } catch {
      Alert.alert(t('report.failedTitle'), t('report.failedMessage'));
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze() {
    await analyzeText();
  }

  async function requestMicPermission() {
    if (Platform.OS !== 'android') {
      return true;
    }
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  async function handleVoicePress() {
    if (mode === 'Text') {
      await handleAnalyze();
      return;
    }

    if (listening) {
      try {
        const audioUri = await stopVoiceRecording();
        setListening(false);
        setLoading(true);
        const transcription = await transcribeAudio(audioUri, language);
        setText(transcription.text);
        setLoading(false);
        await analyzeText(transcription.text);
      } catch {
        setLoading(false);
        setListening(false);
        Alert.alert(t('report.voiceFailedTitle'), t('report.voiceFailedMessage'));
      }
      return;
    }

    const allowed = await requestMicPermission();
    if (!allowed) {
      Alert.alert(t('report.permissionTitle'), t('report.permissionMessage'));
      return;
    }

    setReport(null);
    setText('');
    setRecordMs(0);
    setListening(true);
    try {
      if (!voiceAvailable) {
        throw new Error('Voice recorder unavailable.');
      }
      await startVoiceRecording();
    } catch {
      setListening(false);
      Alert.alert(t('report.voiceFailedTitle'), t('report.voiceFailedMessage'));
    }
  }

  async function openSearch() {
    const reports = await getReports();
    setSavedReports(reports);
    setSearchVisible(true);
  }

  function openReport(item: StructuredReport) {
    setReport(item);
    setText(item.originalText);
    setLanguage(item.inputLanguage === 'unknown' ? 'auto' : item.inputLanguage);
    setPhotos(item.photos ?? []);
    const siteFromReport = sites.find(site => site.id === item.siteId || site.name === item.site);
    if (siteFromReport) {
      setSelectedSiteId(siteFromReport.id);
    }
    setSearchVisible(false);
  }

  function resetScreen() {
    setReport(null);
    setPendingReport(null);
    setText(samples[i18n.language] ?? samples.en);
    setPhotos([]);
  }

  function cycleLanguage() {
    const options: InputLanguage[] = ['auto', 'ru', 'he', 'en'];
    setLanguage(current => options[(options.indexOf(current) + 1) % options.length]);
  }

  function handleEdit() {
    setReport(null);
  }

  function cycleSite() {
    if (!sites.length) {
      return;
    }
    const currentIndex = Math.max(0, sites.findIndex(site => site.id === selectedSiteId));
    setSelectedSiteId(sites[(currentIndex + 1) % sites.length].id);
  }

  async function addPhoto() {
    const result = await launchImageLibrary({mediaType: 'photo', selectionLimit: 6, quality: 0.8});
    if (result.didCancel) {
      return;
    }
    if (result.errorCode) {
      Alert.alert(t('dashboard.photoErrorTitle'), result.errorMessage ?? t('dashboard.tryAgain'));
      return;
    }
    const nextPhotos = (result.assets ?? [])
      .filter(asset => asset.uri)
      .map(asset => ({
        id: `${Date.now()}-${asset.fileName ?? Math.random()}`,
        uri: asset.uri!,
        fileName: asset.fileName ?? 'site-photo.jpg',
        addedAt: new Date().toISOString(),
      }));
    setPhotos(current => [...current, ...nextPhotos].slice(0, 10));
  }

  function removePhoto(photoId: string) {
    setPhotos(current => current.filter(photo => photo.id !== photoId));
  }

  async function confirmReportSave() {
    if (!pendingReport) {
      return;
    }
    await saveReport(pendingReport);
    await enqueueReportSync(pendingReport);
    setReport({...pendingReport, syncStatus: 'queued'});
    setPendingReport(null);
  }

  function handleCreateTasks() {
    Alert.alert(t('report.tasksSavedTitle'), t('report.tasksSavedMessage'), [
      {text: t('common.close')},
      {text: t('tabs.tasks'), onPress: () => navigation.navigate('Tasks')},
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <Pressable style={styles.clearIcon} onPress={resetScreen}>
              <X size={20} color={colors.text} />
            </Pressable>
            <View style={styles.modeSwitch}>
              {(['Text', 'Voice'] as const).map(item => (
                <Pressable
                  key={item}
                  onPress={() => setMode(item)}
                  style={[styles.modeChip, mode === item && styles.modeChipActive]}>
                  <Text style={[styles.modeText, mode === item && styles.modeTextActive]}>
                    {item === 'Text' ? t('report.text') : t('report.voice')}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={openSearch} style={styles.clearIcon}>
              <Search size={20} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.hero}>
            <Text style={styles.title}>{t('report.title')}</Text>
            <Text style={styles.subtitle}>{t('report.subtitle')}</Text>
          </View>

          <View style={styles.reportMetaRow}>
            <Pressable onPress={cycleSite} style={styles.siteSelector}>
              <Text style={styles.metaLabel}>{t('report.linkedSite')}</Text>
              <Text style={styles.siteText}>{selectedSite?.name ?? t('common.notSpecified')}</Text>
              <ChevronDown size={14} color={colors.muted} />
            </Pressable>
            <Pressable onPress={addPhoto} style={styles.photoButton}>
              <ImagePlus size={17} color={colors.text} />
              <Text style={styles.photoButtonText}>{t('report.addPhotos')}</Text>
            </Pressable>
          </View>

          {photos.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
              {photos.map(photo => (
                <View key={photo.id} style={styles.photoThumbWrap}>
                  <Image source={{uri: photo.uri}} style={styles.photoThumb} />
                  <Pressable onPress={() => removePhoto(photo.id)} style={styles.removePhoto}>
                    <X size={12} color={colors.text} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.inputCard}>
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              textAlignVertical="top"
              placeholder={t('report.placeholder')}
              placeholderTextColor={colors.faint}
              style={[styles.input, language === 'he' && styles.inputRtl]}
            />
            <Text style={styles.counter}>{text.length}/20000</Text>
          </View>

          <View style={styles.voiceBlock}>
            <Text style={styles.listening}>
              {loading && mode === 'Voice'
                ? t('report.transcribing')
                : mode === 'Voice'
                  ? (listening ? `${t('report.listening')} ${formatRecordTime(recordMs)}` : t('report.voiceReady'))
                  : t('report.ready')}
            </Text>
            <View style={styles.wave}>
              {Array.from({length: 28}).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.waveBar,
                    waveHeights[index % waveHeights.length],
                    mode !== 'Voice' && styles.waveIdle,
                  ]}
                />
              ))}
            </View>
            <Pressable onPress={handleVoicePress} disabled={loading || !can(currentUser, 'report.create')}>
              <LinearGradient colors={[colors.primary2, colors.primary]} style={styles.micButton}>
                {loading ? <ActivityIndicator color={colors.text} /> : <Mic size={34} color={colors.text} />}
              </LinearGradient>
            </Pressable>
            <Text style={styles.tapText}>
              {!can(currentUser, 'report.create') ? t('auth.noPermission') : mode === 'Voice' ? (listening ? t('report.tapStop') : t('report.tapSpeak')) : t('report.tapAnalyze')}
            </Text>
          </View>

          <View style={styles.controls}>
            <Pressable onPress={cycleLanguage} style={styles.languageSelector}>
              <Globe2 size={16} color={colors.muted} />
              <Text style={styles.languageText}>
                {t(`report.inputLanguages.${language}`)}
              </Text>
              <ChevronDown size={14} color={colors.muted} />
            </Pressable>
            <Pressable onPress={() => {setText(''); setReport(null);}} style={styles.clearTextButton}>
              <Text style={styles.clearText}>{t('common.clear')}</Text>
            </Pressable>
          </View>

          <View style={styles.languageRow}>
            {(['auto', 'ru', 'he', 'en'] as InputLanguage[]).map(item => (
              <Pressable
                key={item}
                onPress={() => setLanguage(item)}
                style={[styles.langChip, language === item && styles.langChipActive]}>
                <Text style={[styles.langText, language === item && styles.langTextActive]}>
                  {t(`report.inputLanguages.${item}`)}
                </Text>
              </Pressable>
            ))}
          </View>

          {report ? (
            <ReportResult report={report} onEdit={handleEdit} onCreateTasks={handleCreateTasks} />
          ) : (
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Sparkles size={18} color={colors.primary} />
              </View>
              <View style={styles.featureCopy}>
                <Text style={styles.featureTitle}>{t('report.naturalTitle')}</Text>
                <Text style={styles.featureText}>{t('report.naturalText')}</Text>
              </View>
              <MessageCircle size={18} color={colors.faint} />
            </View>
          )}
        </ScrollView>

        <Modal visible={searchVisible} transparent animationType="slide" onRequestClose={() => setSearchVisible(false)}>
          <View style={styles.modalShade}>
            <View style={styles.searchSheet}>
              <View style={styles.searchHeader}>
                <Text style={styles.searchTitle}>{t('report.searchTitle')}</Text>
                <Pressable onPress={() => setSearchVisible(false)} style={styles.sheetClose}>
                  <X size={18} color={colors.text} />
                </Pressable>
              </View>
              <View style={styles.searchInputWrap}>
                <Search size={17} color={colors.muted} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={t('report.searchPlaceholder')}
                  placeholderTextColor={colors.faint}
                  style={styles.searchInput}
                />
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {filteredReports.length ? filteredReports.map(item => (
                  <Pressable key={item.id} onPress={() => openReport(item)} style={styles.savedReportRow}>
                    <Text style={styles.savedReportTitle}>{item.site} • {item.reportDate}</Text>
                    <Text numberOfLines={2} style={styles.savedReportSummary}>{item.summary}</Text>
                  </Pressable>
                )) : (
                  <View style={styles.emptySearch}>
                    <Text style={styles.emptySearchTitle}>{t('report.noSavedReports')}</Text>
                    <Text style={styles.emptySearchText}>{t('report.noSavedReportsHint')}</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal visible={Boolean(pendingReport)} transparent animationType="slide" onRequestClose={() => setPendingReport(null)}>
          <View style={styles.modalShade}>
            <View style={styles.reviewSheet}>
              <View style={styles.searchHeader}>
                <Text style={styles.searchTitle}>{t('report.reviewTitle')}</Text>
                <Pressable onPress={() => setPendingReport(null)} style={styles.sheetClose}>
                  <X size={18} color={colors.text} />
                </Pressable>
              </View>
              <Text style={styles.reviewLead}>{t('report.reviewSubtitle')}</Text>
              {pendingReport?.source === 'demo' ? (
                <View style={styles.demoWarning}>
                  <TriangleAlert size={18} color={colors.warning} />
                  <Text style={styles.demoWarningText}>{t('report.demoWarning')}</Text>
                </View>
              ) : null}
              <ScrollView showsVerticalScrollIndicator={false} style={styles.reviewList}>
                {pendingReport ? buildReportReview(pendingReport).map(item => {
                  const isWarning = item.severity === 'warning';
                  return (
                    <View key={item.key} style={styles.reviewRow}>
                      <View style={[styles.reviewIcon, isWarning ? styles.reviewIconWarning : styles.reviewIconOk]}>
                        {isWarning ? <TriangleAlert size={16} color={colors.warning} /> : <CheckCircle2 size={16} color={colors.success} />}
                      </View>
                      <View style={styles.reviewCopy}>
                        <Text style={styles.reviewLabel}>{item.label}</Text>
                        <Text style={styles.reviewValue}>{item.value}</Text>
                      </View>
                    </View>
                  );
                }) : null}
              </ScrollView>
              <View style={styles.reviewActions}>
                <Pressable onPress={() => setPendingReport(null)} style={styles.reviewSecondary}>
                  <Text style={styles.reviewSecondaryText}>{t('common.edit')}</Text>
                </Pressable>
                <Pressable onPress={confirmReportSave} style={styles.reviewPrimary}>
                  <Text style={styles.reviewPrimaryText}>{t('report.confirmSave')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {padding: 20, paddingBottom: 112, gap: 18},
  topBar: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
  clearIcon: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, height: 42, justifyContent: 'center', width: 42},
  modeSwitch: {backgroundColor: colors.surface, borderRadius: 12, flexDirection: 'row', padding: 4},
  modeChip: {borderRadius: 9, paddingHorizontal: 13, paddingVertical: 8},
  modeChipActive: {backgroundColor: colors.surface3},
  modeText: {color: colors.faint, fontSize: 12, fontWeight: '900'},
  modeTextActive: {color: colors.text},
  hero: {paddingTop: 24},
  title: {color: colors.text, fontSize: 28, fontWeight: '900'},
  subtitle: {color: colors.muted, fontSize: 15, marginTop: 6},
  inputCard: {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1, minHeight: 252, padding: 16},
  input: {color: colors.text, fontSize: 16, lineHeight: 25, minHeight: 205, padding: 0},
  inputRtl: {textAlign: 'right', writingDirection: 'rtl'},
  counter: {alignSelf: 'flex-end', color: colors.faint, fontSize: 11},
  voiceBlock: {alignItems: 'center', gap: 12},
  listening: {color: colors.text, fontSize: 12, fontWeight: '800'},
  wave: {alignItems: 'center', flexDirection: 'row', gap: 3, height: 55},
  waveBar: {backgroundColor: colors.primary2, borderRadius: 3, width: 3},
  waveIdle: {opacity: 0.45},
  micButton: {alignItems: 'center', borderRadius: 37, height: 74, justifyContent: 'center', width: 74},
  tapText: {color: colors.muted, fontSize: 11},
  controls: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
  languageSelector: {alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 11},
  languageText: {color: colors.text, fontSize: 12, fontWeight: '800'},
  clearTextButton: {padding: 10},
  clearText: {color: colors.faint, fontSize: 12, fontWeight: '800'},
  languageRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  reportMetaRow: {flexDirection: 'row', gap: 10},
  siteSelector: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 13, paddingVertical: 10},
  metaLabel: {color: colors.faint, fontSize: 10, fontWeight: '900'},
  siteText: {color: colors.text, flex: 1, fontSize: 12, fontWeight: '900'},
  photoButton: {alignItems: 'center', backgroundColor: colors.primarySoft, borderColor: colors.primary, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 7, paddingHorizontal: 13, paddingVertical: 10},
  photoButtonText: {color: colors.text, fontSize: 12, fontWeight: '900'},
  photoStrip: {gap: 10, paddingVertical: 1},
  photoThumbWrap: {position: 'relative'},
  photoThumb: {backgroundColor: colors.surface, borderRadius: 14, height: 76, width: 76},
  removePhoto: {alignItems: 'center', backgroundColor: colors.danger, borderRadius: 10, height: 20, justifyContent: 'center', position: 'absolute', right: -5, top: -5, width: 20},
  langChip: {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8},
  langChipActive: {backgroundColor: colors.primarySoft, borderColor: colors.primary},
  langText: {color: colors.muted, fontSize: 12, fontWeight: '800'},
  langTextActive: {color: colors.text},
  featureRow: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 16},
  featureIcon: {alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 12, height: 42, justifyContent: 'center', width: 42},
  featureCopy: {flex: 1},
  featureTitle: {color: colors.text, fontSize: 14, fontWeight: '900'},
  featureText: {color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3},
  modalShade: {backgroundColor: 'rgba(0,0,0,0.62)', flex: 1, justifyContent: 'flex-end'},
  searchSheet: {backgroundColor: colors.background, borderColor: colors.border, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, maxHeight: '72%', padding: 18},
  reviewSheet: {backgroundColor: colors.background, borderColor: colors.border, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, maxHeight: '82%', padding: 18},
  searchHeader: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
  searchTitle: {color: colors.text, fontSize: 20, fontWeight: '900'},
  sheetClose: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, height: 38, justifyContent: 'center', width: 38},
  searchInputWrap: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, marginVertical: 14, paddingHorizontal: 12},
  searchInput: {color: colors.text, flex: 1, fontSize: 14, minHeight: 46},
  savedReportRow: {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, marginBottom: 10, padding: 13},
  savedReportTitle: {color: colors.text, fontSize: 14, fontWeight: '900'},
  savedReportSummary: {color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5},
  emptySearch: {alignItems: 'center', padding: 24},
  emptySearchTitle: {color: colors.text, fontSize: 16, fontWeight: '900'},
  emptySearchText: {color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6, textAlign: 'center'},
  reviewLead: {color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 8},
  demoWarning: {alignItems: 'flex-start', backgroundColor: colors.warningSoft, borderColor: `${colors.warning}66`, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 9, marginTop: 12, padding: 12},
  demoWarningText: {color: colors.text, flex: 1, fontSize: 12, fontWeight: '800', lineHeight: 18},
  reviewList: {marginTop: 12},
  reviewRow: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 11, marginBottom: 9, padding: 12},
  reviewIcon: {alignItems: 'center', borderRadius: 10, height: 34, justifyContent: 'center', width: 34},
  reviewIconOk: {backgroundColor: colors.successSoft},
  reviewIconWarning: {backgroundColor: colors.warningSoft},
  reviewCopy: {flex: 1},
  reviewLabel: {color: colors.muted, fontSize: 11, fontWeight: '900'},
  reviewValue: {color: colors.text, fontSize: 13, fontWeight: '800', lineHeight: 19, marginTop: 3},
  reviewActions: {flexDirection: 'row', gap: 10, marginTop: 10},
  reviewSecondary: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flex: 1, paddingVertical: 13},
  reviewSecondaryText: {color: colors.text, fontSize: 13, fontWeight: '900'},
  reviewPrimary: {alignItems: 'center', backgroundColor: colors.primary, borderRadius: 14, flex: 1.2, paddingVertical: 13},
  reviewPrimaryText: {color: colors.text, fontSize: 13, fontWeight: '900'},
});
