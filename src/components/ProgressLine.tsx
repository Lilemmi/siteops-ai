import React, {useRef} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useFocusEffect} from '@react-navigation/native';
import {colors} from '../theme';

const defaultPoints = [25, 28, 43, 39, 47, 46, 61, 66, 59, 64, 79, 77, 83, 82];
const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

export function ProgressLine({points = defaultPoints}: {points?: number[]}) {
  const animated = useRef(points.map(() => new Animated.Value(0))).current;

  useFocusEffect(
    React.useCallback(() => {
    if (animated.length !== points.length) {
      return;
    }
    animated.forEach(value => value.setValue(0));
    Animated.stagger(
      28,
      animated.map((value, index) =>
        Animated.timing(value, {
          toValue: points[index],
          duration: 440,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ),
    ).start();
    }, [animated, points]),
  );

  return (
    <View style={styles.wrap}>
      {points.map((point, index) => (
        <View key={`${point}-${index}`} style={styles.column}>
          <AnimatedGradient
            colors={[colors.primary2, colors.primary]}
            style={[styles.bar, {height: animated[index] ?? point}]}
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
