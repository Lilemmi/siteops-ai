import React, {ReactNode, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Pressable,
  PressableProps,
  StyleProp,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import {colors} from '../theme';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

export function FadeInView({
  children,
  delay = 0,
  duration = 360,
  distance = 14,
  style,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  const runAnimation = React.useCallback(() => {
    opacity.stopAnimation();
    translateY.stopAnimation();
    opacity.setValue(0);
    translateY.setValue(distance);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, distance, duration, opacity, translateY]);

  useFocusEffect(runAnimation);

  return (
    <Animated.View style={[style, {opacity, transform: [{translateY}]}]}>
      {children}
    </Animated.View>
  );
}

export function FocusFadeView({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    React.useCallback(() => {
      opacity.setValue(0);
      scale.setValue(0.985);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          damping: 18,
          stiffness: 180,
          mass: 0.7,
          useNativeDriver: true,
        }),
      ]).start();
    }, [opacity, scale]),
  );

  return <Animated.View style={[style, {opacity, transform: [{scale}]}]}>{children}</Animated.View>;
}

export function CountUpText({
  value,
  style,
  duration = 560,
  formatter,
}: {
  value: number;
  style?: StyleProp<TextStyle>;
  duration?: number;
  formatter?: (value: number) => string;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  const runCount = React.useCallback(() => {
    progress.stopAnimation();
    progress.setValue(0);
    setDisplay(0);
    const listenerId = progress.addListener(({value: current}) => {
      setDisplay(Math.round(current * value));
    });
    Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({finished}) => {
      if (finished) {
        setDisplay(value);
      }
      progress.removeListener(listenerId);
    });
    return () => progress.removeListener(listenerId);
  }, [duration, progress, value]);

  useFocusEffect(runCount);

  return <Text style={style}>{formatter ? formatter(display) : display}</Text>;
}

export function CountUpString({
  value,
  style,
  duration,
}: {
  value: string;
  style?: StyleProp<TextStyle>;
  duration?: number;
}) {
  const parsed = useMemo(() => parseAnimatedNumber(value), [value]);
  if (!parsed) {
    return <Text style={style}>{value}</Text>;
  }
  return (
    <CountUpText
      value={parsed.value}
      duration={duration}
      style={style}
      formatter={current => `${parsed.prefix}${new Intl.NumberFormat('en-US').format(current)}${parsed.suffix}`}
    />
  );
}

export function AnimatedProgressFill({
  percent,
  style,
  gradientColors = [colors.primary, colors.primary2],
}: {
  percent: number;
  style?: StyleProp<ViewStyle>;
  gradientColors?: string[];
}) {
  const width = useRef(new Animated.Value(0)).current;

  const runProgress = React.useCallback(() => {
    width.setValue(0);
    Animated.timing(width, {
      toValue: Math.max(0, Math.min(100, percent)),
      duration: 760,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percent, width]);

  useFocusEffect(runProgress);

  return (
    <AnimatedGradient
      colors={gradientColors}
      style={[style, {width: width.interpolate({inputRange: [0, 100], outputRange: ['0%', '100%']})}]}
    />
  );
}

export function PressScale({children, style, ...props}: PressableProps & {children: ReactNode; style?: StyleProp<ViewStyle>}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      damping: 16,
      stiffness: 260,
      mass: 0.6,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      {...props}
      onPressIn={event => {
        animate(0.975);
        props.onPressIn?.(event);
      }}
      onPressOut={event => {
        animate(1);
        props.onPressOut?.(event);
      }}>
      <Animated.View style={[style, {transform: [{scale}]}]}>{children}</Animated.View>
    </Pressable>
  );
}

function parseAnimatedNumber(value: string) {
  const match = value.match(/^([^0-9-]*)([-]?[0-9][0-9,.\s]*)(.*)$/);
  if (!match) {
    return null;
  }
  const numeric = Number(match[2].replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return {prefix: match[1], value: numeric, suffix: match[3]};
}
