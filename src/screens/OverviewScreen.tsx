import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {SectionCard} from '../components/SectionCard';
import {colors} from '../theme';
import {useTranslation} from 'react-i18next';

const roadmap = [
  ['overview.contradictions', 'overview.contradictionsText'],
  ['overview.finance', 'overview.financeText'],
  ['overview.weekly', 'overview.weeklyText'],
  ['overview.export', 'overview.exportText'],
];

export function OverviewScreen() {
  const {t} = useTranslation();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>SITEOPS AI</Text>
        <Text style={styles.title}>{t('overview.title')}</Text>
        <Text style={styles.subtitle}>{t('overview.subtitle')}</Text>

        <SectionCard title={t('overview.today')}>
          <View style={styles.stats}>
            <View style={styles.stat}><Text style={styles.statValue}>—</Text><Text style={styles.statLabel}>{t('overview.workers')}</Text></View>
            <View style={styles.stat}><Text style={styles.statValue}>—</Text><Text style={styles.statLabel}>{t('overview.delays')}</Text></View>
            <View style={styles.stat}><Text style={styles.statValue}>—</Text><Text style={styles.statLabel}>{t('overview.debt')}</Text></View>
          </View>
        </SectionCard>

        <Text style={styles.sectionTitle}>{t('overview.roadmap')}</Text>
        {roadmap.map(([title, description], index) => (
          <View key={title} style={styles.roadmapItem}>
            <View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View>
            <View style={styles.roadmapText}>
              <Text style={styles.roadmapTitle}>{t(title)}</Text>
              <Text style={styles.roadmapDescription}>{t(description)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {padding: 20, paddingBottom: 40, gap: 14},
  eyebrow: {fontSize: 11, letterSpacing: 1.2, color: colors.primary, fontWeight: '900', marginTop: 12},
  title: {fontSize: 31, lineHeight: 37, color: colors.text, fontWeight: '900'},
  subtitle: {fontSize: 14, lineHeight: 21, color: colors.muted, marginBottom: 8},
  stats: {flexDirection: 'row'},
  stat: {flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: colors.border},
  statValue: {fontSize: 25, fontWeight: '900', color: colors.primary},
  statLabel: {fontSize: 10, color: colors.muted, marginTop: 4},
  sectionTitle: {fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 9},
  roadmapItem: {flexDirection: 'row', gap: 13, paddingVertical: 10},
  number: {width: 34, height: 34, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center'},
  numberText: {color: colors.primary, fontWeight: '900'},
  roadmapText: {flex: 1},
  roadmapTitle: {fontSize: 15, fontWeight: '800', color: colors.text},
  roadmapDescription: {fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: 3},
});
