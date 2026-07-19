import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {LucideIcon} from 'lucide-react-native';
import {AppCard} from './AppCard';
import {colors} from '../theme';

export function MetricCard({
  label,
  value,
  delta,
  icon: Icon,
  tone = 'blue',
  onPress,
}: {
  label: string;
  value: string;
  delta: string;
  icon: LucideIcon;
  tone?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  onPress?: () => void;
}) {
  const toneColor = {
    blue: colors.primary,
    green: colors.success,
    purple: colors.primary2,
    orange: colors.warning,
    red: colors.danger,
  }[tone];

  const content = (
    <AppCard style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.label}>{label}</Text>
        <Icon size={17} color={toneColor} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={[styles.delta, {color: toneColor}]}>{delta}</Text>
    </AppCard>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [styles.pressable, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {flex: 1, minHeight: 98},
  pressable: {flex: 1},
  pressed: {opacity: 0.72, transform: [{scale: 0.985}]},
  top: {flexDirection: 'row', justifyContent: 'space-between', gap: 8},
  label: {color: colors.muted, fontSize: 11, fontWeight: '700'},
  value: {color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 9},
  delta: {fontSize: 11, fontWeight: '800', marginTop: 5},
});
