import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  variant: 'pro' | 'client';
  onDone: () => void;
}

export function SplashOverlay({ variant, onDone }: Props) {
  const opacity  = useRef(new Animated.Value(0)).current;
  const scale    = useRef(new Animated.Value(0.85)).current;
  const fadeOut  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Fade + scale in
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(scale,   { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
      ]),
      // Hold
      Animated.delay(900),
      // Fade out
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

        {/* Brand name */}
        <View style={s.brandRow}>
          <Text style={s.brandName}>BookedUp</Text>
          {variant === 'pro' && (
            <View style={s.proBadge}>
              <Text style={s.proBadgeText}>Pro</Text>
            </View>
          )}
        </View>

        {/* Tagline */}
        <Text style={s.tagline}>
          {variant === 'pro'
            ? 'Espace professionnel'
            : 'Réservez en quelques secondes'}
        </Text>

        {/* Bottom bar */}
        <View style={s.bottomDots}>
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
  content: {
    alignItems: 'center',
    gap: 12,
  },

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

  brandRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandName:  { color: '#fff', fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  proBadge:   { backgroundColor: '#7c3aed', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  proBadgeText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },

  tagline: { color: 'rgba(255,255,255,0.45)', fontSize: 14, letterSpacing: 0.3 },

  bottomDots: { flexDirection: 'row', gap: 6, marginTop: 40 },
  dot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)' },
  dotActive:  { backgroundColor: '#7c3aed', width: 20 },
});
