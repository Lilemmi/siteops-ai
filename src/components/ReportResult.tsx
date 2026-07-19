import React from 'react';
import {Alert, Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useTranslation} from 'react-i18next';
import {
  AlertTriangle,
  Clock3,
  Edit3,
  MapPin,
  PackageX,
  Save,
  Share2,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react-native';
import {shareReportCsv, shareReportPdf} from '../services/reportExport';
import {getLocalizedReport} from '../services/contentLocalization';
import {colors, radii} from '../theme';
import {StructuredReport} from '../types/report';
import {AppCard} from './AppCard';

function InsightRow({
  icon,
  label,
  value,
  tone = colors.primary,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <View style={styles.insightRow}>
      <View style={[styles.insightIcon, {backgroundColor: `${tone}22`}]}>{icon}</View>
      <View style={styles.insightCopy}>
        <Text style={styles.insightLabel}>{label}</Text>
        <Text style={styles.insightValue}>{value}</Text>
      </View>
    </View>
  );
}

function Bullets({items}: {items: string[]}) {
  const {t} = useTranslation();
  if (!items.length) {
    return <Text style={styles.empty}>{t('common.notSpecified')}</Text>;
  }
  return (
    <View style={styles.bullets}>
      {items.map((item, index) => (
        <Text key={`${item}-${index}`} style={styles.bullet}>
          {index + 1}. {item}
        </Text>
      ))}
    </View>
  );
}

export function ReportResult({
  report,
  onEdit,
  onCreateTasks,
}: {
  report: StructuredReport;
  onEdit?: () => void;
  onCreateTasks?: () => void;
}) {
  const {t, i18n} = useTranslation();
  const localized = getLocalizedReport(report, i18n.language);
  async function handleExport() {
    try {
      await shareReportCsv(report);
    } catch {
      Alert.alert(t('report.exportFailed'), t('report.exportFailedMessage'));
    }
  }

  async function handlePdfExport() {
    try {
      await shareReportPdf(report);
    } catch {
      Alert.alert(t('report.exportFailed'), t('report.exportFailedMessage'));
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.analysisHeader}>
        <LinearGradient colors={['#1C2C5D', '#3B1D78']} style={styles.orb}>
          <Sparkles size={34} color={colors.text} />
        </LinearGradient>
        <Text style={styles.done}>{t('report.analyzed')}</Text>
        <Text style={styles.summary}>{localized.summary}</Text>
      </View>

      <View style={styles.stack}>
        <InsightRow
          icon={<Users size={18} color={colors.success} />}
          label={t('report.workers')}
          value={`${report.workersCount ?? t('common.notSpecified')}`}
          tone={colors.success}
        />
        <InsightRow
          icon={<Wrench size={18} color={colors.success} />}
          label={t('report.tasksCompleted')}
          value={localized.completedWork.map(item => item.description).join(', ') || t('common.notSpecified')}
          tone={colors.success}
        />
        <InsightRow
          icon={<MapPin size={18} color={colors.primary2} />}
          label={t('report.location')}
          value={report.floors.length ? t('tasks.level', {level: report.floors.join(', ')}) : localized.site}
          tone={colors.primary2}
        />
        <InsightRow
          icon={<AlertTriangle size={18} color={colors.danger} />}
          label={t('report.issues')}
          value={localized.delays.map(item => item.reason).join(', ') || t('common.none')}
          tone={colors.danger}
        />
        <InsightRow
          icon={<PackageX size={18} color={colors.warning} />}
          label={t('report.materialsMissing')}
          value={localized.missingMaterials.map(item => `${item.name} ${item.quantity}`).join(', ') || t('common.none')}
          tone={colors.warning}
        />
        <InsightRow
          icon={<Clock3 size={18} color={colors.danger} />}
          label={t('report.delays')}
          value={localized.delays.map(item => item.impact).join(', ') || t('common.none')}
          tone={colors.danger}
        />
      </View>

      <AppCard title={t('report.nextSteps')}>
        <Bullets items={localized.nextDayTasks} />
      </AppCard>

      <AppCard title={t('report.managerMessage')}>
        <Text style={[styles.message, i18n.language === 'he' && styles.hebrew]}>{localized.managerMessage}</Text>
      </AppCard>

      {report.contradictions.length ? (
        <AppCard title={t('report.contradictions')}>
          <Bullets items={localized.contradictions} />
        </AppCard>
      ) : null}

      {report.photos?.length ? (
        <AppCard title={t('report.photosInReport')} right={<Text style={styles.heLabel}>{report.photos.length}</Text>}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
            {report.photos.map(photo => (
              <Image key={photo.id} source={{uri: photo.uri}} style={styles.photo} />
            ))}
          </ScrollView>
        </AppCard>
      ) : null}

      <View style={styles.actions}>
        <Pressable onPress={onEdit} style={styles.secondary}>
          <Edit3 size={17} color={colors.text} />
          <Text style={styles.secondaryText}>{t('common.edit')}</Text>
        </Pressable>
        <Pressable onPress={handleExport} style={styles.secondary}>
          <Share2 size={17} color={colors.text} />
          <Text style={styles.secondaryText}>CSV</Text>
        </Pressable>
        <Pressable onPress={handlePdfExport} style={styles.secondary}>
          <Share2 size={17} color={colors.text} />
          <Text style={styles.secondaryText}>PDF</Text>
        </Pressable>
        <Pressable onPress={onCreateTasks} style={styles.primary}>
          <LinearGradient colors={[colors.primary, colors.primary2]} style={styles.primaryFill}>
            <Save size={17} color={colors.text} />
            <Text style={styles.primaryText}>{t('report.saveTasks')}</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <View style={styles.sourcePill}>
        <Text style={styles.sourceText}>{report.source === 'gpt' ? t('report.gptOutput') : t('report.demoOutput')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {gap: 14},
  analysisHeader: {alignItems: 'center', paddingTop: 12},
  orb: {alignItems: 'center', borderRadius: 36, height: 72, justifyContent: 'center', width: 72},
  done: {color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 14},
  summary: {color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 5, textAlign: 'center'},
  stack: {gap: 10},
  insightRow: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 13},
  insightIcon: {alignItems: 'center', borderRadius: 10, height: 38, justifyContent: 'center', width: 38},
  insightCopy: {flex: 1},
  insightLabel: {color: colors.muted, fontSize: 11, fontWeight: '800'},
  insightValue: {color: colors.text, fontSize: 14, fontWeight: '800', lineHeight: 20, marginTop: 2},
  bullets: {gap: 7},
  bullet: {color: colors.text, fontSize: 14, lineHeight: 21},
  empty: {color: colors.muted, fontSize: 13},
  heLabel: {color: colors.primary2, fontSize: 11, fontWeight: '900'},
  message: {color: colors.text, fontSize: 15, lineHeight: 24},
  hebrew: {color: colors.text, fontSize: 15, lineHeight: 24, textAlign: 'right', writingDirection: 'rtl'},
  photos: {gap: 10},
  photo: {backgroundColor: colors.surface2, borderRadius: 14, height: 92, width: 92},
  actions: {flexDirection: 'row', gap: 10},
  secondary: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', gap: 7, height: 52, justifyContent: 'center', paddingHorizontal: 16},
  secondaryText: {color: colors.text, fontSize: 13, fontWeight: '900'},
  primary: {flex: 1},
  primaryFill: {alignItems: 'center', borderRadius: radii.md, flexDirection: 'row', gap: 8, height: 52, justifyContent: 'center', paddingHorizontal: 12},
  primaryText: {color: colors.text, fontSize: 13, fontWeight: '900'},
  sourcePill: {alignSelf: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7},
  sourceText: {color: colors.faint, fontSize: 11, fontWeight: '800'},
});
