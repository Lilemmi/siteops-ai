import React, {ReactNode} from 'react';
import {StyleSheet, Text, View, ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors, radii, shadows} from '../theme';

export function AppCard({
  children,
  title,
  right,
  style,
  accent = false,
}: {
  children: ReactNode;
  title?: string;
  right?: ReactNode;
  style?: ViewStyle;
  accent?: boolean;
}) {
  return (
    <LinearGradient
      colors={accent ? ['#182342', '#101827'] : ['#111928', '#0C1321']}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={[styles.card, style]}>
      {title ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {right}
        </View>
      ) : null}
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 16,
    ...shadows.card,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
});
