import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, font, radius, spacing } from '../lib/theme';

/** Every text node in the app goes through here so RTL alignment is never forgotten. */
export function T({
  children,
  size = 'md',
  weight = 'normal',
  color = colors.text,
  align = 'right',
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  size?: keyof typeof font.sizes;
  weight?: 'normal' | 'bold' | 'extrabold';
  color?: string;
  align?: 'right' | 'center' | 'left';
  style?: StyleProp<any>;
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontSize: font.sizes[size],
          color,
          textAlign: align,
          writingDirection: 'rtl',
          fontWeight: weight === 'extrabold' ? '800' : weight === 'bold' ? '700' : '400',
          lineHeight: font.sizes[size] * 1.6,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const content = <View style={[styles.card, style]}>{children}</View>;
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
      {content}
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        variant === 'primary' && { backgroundColor: colors.brand },
        variant === 'outline' && {
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
        },
        variant === 'ghost' && { backgroundColor: 'transparent' },
        isDisabled && { opacity: 0.5 },
        pressed && !isDisabled && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.brand} />
      ) : (
        <T
          size="md"
          weight="bold"
          align="center"
          color={variant === 'primary' ? '#fff' : colors.text}
        >
          {label}
        </T>
      )}
    </Pressable>
  );
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'brand' | 'free' | 'gold';
}) {
  const bg =
    tone === 'brand'
      ? colors.brandLight
      : tone === 'free'
        ? '#d1fae5'
        : tone === 'gold'
          ? '#fef3c7'
          : '#f3f4f6';
  const fg =
    tone === 'brand'
      ? colors.brandDark
      : tone === 'free'
        ? '#047857'
        : tone === 'gold'
          ? '#b45309'
          : colors.textMuted;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <T size="xs" weight="bold" color={fg}>
        {label}
      </T>
    </View>
  );
}

export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clamped}%` }]} />
    </View>
  );
}

export function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  if (url) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Image } = require('react-native');
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#f3f4f6' }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.brandLight,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <T weight="bold" color={colors.brandDark} align="center">
        {(name || 'ف').trim().charAt(0)}
      </T>
    </View>
  );
}

export function Loading({ label = 'بنحمّل…' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.brand} size="large" />
      <T color={colors.textMuted} align="center" style={{ marginTop: spacing.md }}>
        {label}
      </T>
    </View>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.center}>
      <T size="lg" weight="bold" align="center">
        {title}
      </T>
      {body ? (
        <T color={colors.textMuted} align="center" style={{ marginTop: spacing.sm }}>
          {body}
        </T>
      ) : null}
      {action ? <View style={{ marginTop: spacing.lg }}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <T size="lg" weight="bold" align="center">
        حصلت مشكلة
      </T>
      <T color={colors.textMuted} align="center" style={{ marginTop: spacing.sm }}>
        {message}
      </T>
      {onRetry ? (
        <Button label="جرّب تاني" onPress={onRetry} style={{ marginTop: spacing.lg }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  btn: {
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: '#f3f4f6',
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.brand, borderRadius: radius.pill },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    minHeight: 220,
  },
});
