import React, {useCallback, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getReports} from '../services/reportStorage';
import {colors, shadows} from '../theme';
import {StructuredReport} from '../types/report';
import {useTranslation} from 'react-i18next';
import {getLocalizedReport} from '../services/contentLocalization';

export function HistoryScreen() {
  const {t, i18n} = useTranslation();
  const [reports, setReports] = useState<StructuredReport[]>([]);

  useFocusEffect(
    useCallback(() => {
      getReports().then(setReports);
    }, []),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>{t('history.eyebrow')}</Text>
        <Text style={styles.title}>{t('history.title')}</Text>
        <Text style={styles.subtitle}>{t('history.subtitle')}</Text>

        {reports.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>▤</Text>
            <Text style={styles.emptyTitle}>{t('history.empty')}</Text>
            <Text style={styles.emptyText}>{t('history.emptyHint')}</Text>
          </View>
        ) : (
          reports.map(report => {
            const localized = getLocalizedReport(report, i18n.language);
            return (
              <View key={report.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.date}>{report.reportDate}</Text>
                  <Text style={styles.badge}>{report.source.toUpperCase()}</Text>
                </View>
                <Text style={styles.summary}>{localized.summary}</Text>
                <View style={styles.metrics}>
                  <Text style={styles.metric}>◉ {report.workersCount ?? '—'} {t('history.workers')}</Text>
                  <Text style={styles.metric}>⌁ {report.floors.join(', ') || '—'} {t('history.floor')}</Text>
                  <Text style={styles.metric}>⚠ {localized.delays.length} {t('history.delays')}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {padding: 20, paddingBottom: 40},
  eyebrow: {fontSize: 11, letterSpacing: 1.2, color: colors.primary, fontWeight: '900', marginTop: 12},
  title: {fontSize: 32, color: colors.text, fontWeight: '900', marginTop: 7},
  subtitle: {fontSize: 14, color: colors.muted, marginTop: 7, marginBottom: 22},
  emptyCard: {alignItems: 'center', padding: 34, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border},
  emptyIcon: {fontSize: 36, color: colors.primary},
  emptyTitle: {fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 12},
  emptyText: {fontSize: 13, color: colors.muted, marginTop: 6},
  card: {backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 17, marginBottom: 12, ...shadows.card},
  cardTop: {flexDirection: 'row', justifyContent: 'space-between'},
  date: {fontSize: 12, color: colors.primary, fontWeight: '800'},
  badge: {fontSize: 9, fontWeight: '900', color: colors.muted, backgroundColor: colors.background, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6},
  summary: {fontSize: 16, lineHeight: 22, color: colors.text, fontWeight: '700', marginTop: 10},
  metrics: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14},
  metric: {fontSize: 11, color: colors.muted},
});
