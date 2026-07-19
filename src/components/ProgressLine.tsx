import React from 'react';
import {StyleSheet, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors} from '../theme';

const defaultPoints = [25, 28, 43, 39, 47, 46, 61, 66, 59, 64, 79, 77, 83, 82];

export function ProgressLine({points = defaultPoints}: {points?: number[]}) {
  return (
    <View style={styles.wrap}>
      {points.map((point, index) => (
        <View key={`${point}-${index}`} style={styles.column}>
          <LinearGradient
            colors={[colors.primary2, colors.primary]}
            style={[styles.bar, {height: point}]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 5,
    height: 94,
    paddingTop: 10,
  },
  column: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.035)',
    justifyContent: 'flex-end',
  },
  bar: {
    borderRadius: 8,
    minHeight: 18,
  },
});
