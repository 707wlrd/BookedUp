import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onDone: () => void;
}

export function SplashOverlay({ onDone }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.85)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(scale,   { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
      ]),
      Animated.delay(900),
      Animated.timing(fadeOut, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => onDone());
  }, []);

  return (
    <Animated.View style={[s.overlay, { opacity: fadeOut }]}>
      <Animated.View style={[s.content, { opacity, transform: [{ scale }] }]}>
        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoCircle}>
            <Ionicons name="flash" size={28} color="#fff" />
          </View>
        </View>

        {/* Brand */}
        <Text style={s.brandName}>BookedUp</Text>
        <Text style={s.tagline}>Réservez en quelques secondes</Text>

        {/* Dots */}
        <View style={s.dots}>
          <View style={[s.dot, s.dotActive]} />
          <View style={s.dot} />
          <View style={s.dot} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#05060a',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  content: { alignItems: 'center', gap: 12 },

  logoWrap:   { marginBottom: 8 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: '#7c3aed',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },

  brandName: { color: '#fff', fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  tagline:   { color: 'rgba(255,255,255,0.45)', fontSize: 14, letterSpacing: 0.3 },

  dots:      { flexDirection: 'row', gap: 6, marginTop: 40 },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)' },
  dotActive: { backgroundColor: '#7c3aed', width: 20 },
});
