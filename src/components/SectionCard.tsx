import React, {PropsWithChildren} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, shadows} from '../theme';

interface Props extends PropsWithChildren {
  title: string;
  subtitle?: string;
  tone?: 'default' | 'warning';
}

export function SectionCard({title, subtitle, tone = 'default', children}: Props) {
  return (
    <View style={[styles.card, tone === 'warning' && styles.warningCard]}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 17,
    ...shadows.card,
  },
  warningCard: {backgroundColor: colors.warningSoft, borderColor: '#F2CC9F'},
  title: {fontSize: 17, fontWeight: '800', color: colors.text},
  subtitle: {fontSize: 12, color: colors.muted, marginTop: 3},
  content: {marginTop: 12, gap: 9},
});
