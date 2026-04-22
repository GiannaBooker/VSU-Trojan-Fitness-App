import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  alpha,
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from "./designSystem";

export function Panel({ children, style }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function Notice({ bodyStyle, children, style, title, titleStyle, tone = "info" }) {
  const toneStyles = noticeStyles[tone] || noticeStyles.info;

  return (
    <View style={[styles.notice, toneStyles.container, style]}>
      {title ? <Text style={[styles.noticeTitle, toneStyles.title, titleStyle]}>{title}</Text> : null}
      <Text style={[styles.noticeBody, toneStyles.body, bodyStyle]}>{children}</Text>
    </View>
  );
}

export function Pill({ children, style, textStyle }) {
  return (
    <View style={[styles.pill, style]}>
      <Text style={[styles.pillText, textStyle]}>{children}</Text>
    </View>
  );
}

export function ActionButton({
  disabled,
  gradientColors,
  innerStyle,
  label,
  loading,
  onPress,
  style,
  textStyle,
  variant = "primary",
}) {
  const variantStyle = buttonStyles[variant] || buttonStyles.primary;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.buttonShell,
        pressed && !disabled && !loading ? styles.buttonPressed : null,
        disabled || loading ? styles.buttonDisabled : null,
        style,
      ]}
    >
      {gradientColors ? (
        <LinearGradient
          colors={gradientColors}
          end={{ x: 1, y: 0.4 }}
          start={{ x: 0, y: 0 }}
          style={[styles.buttonFill, variantStyle.button, innerStyle]}
        >
          {loading ? (
            <ActivityIndicator color={variantStyle.spinnerColor} />
          ) : (
            <Text style={[styles.buttonText, variantStyle.text, textStyle]}>{label}</Text>
          )}
        </LinearGradient>
      ) : (
        <View style={[styles.buttonFill, variantStyle.button, innerStyle]}>
          {loading ? (
            <ActivityIndicator color={variantStyle.spinnerColor} />
          ) : (
            <Text style={[styles.buttonText, variantStyle.text, textStyle]}>{label}</Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

export function Field({
  autoCapitalize = "none",
  autoCorrect = false,
  containerStyle,
  hint,
  hintStyle,
  keyboardType,
  label,
  labelStyle,
  style,
  variant = "light",
  ...inputProps
}) {
  const fieldVariant = fieldVariants[variant] || fieldVariants.light;

  return (
    <View style={[styles.fieldWrap, containerStyle]}>
      {label ? <Text style={[styles.fieldLabel, fieldVariant.label, labelStyle]}>{label}</Text> : null}
      <TextInput
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        keyboardType={keyboardType}
        placeholderTextColor={fieldVariant.placeholder}
        style={[styles.fieldInput, fieldVariant.input, style]}
        {...inputProps}
      />
      {hint ? <Text style={[styles.fieldHint, fieldVariant.hint, hintStyle]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: alpha(colors.white, 0.94),
    borderColor: alpha(colors.white, 0.4),
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.xl,
    ...shadows.card,
  },
  notice: {
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  noticeTitle: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.caption,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  noticeBody: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.body,
    lineHeight: 22,
  },
  pill: {
    alignSelf: "flex-start",
    backgroundColor: alpha(colors.white, 0.18),
    borderColor: alpha(colors.white, 0.18),
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pillText: {
    color: colors.white,
    fontFamily: typography.fontFamilySans,
    fontSize: typography.caption,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  buttonFill: {
    alignItems: "center",
    borderRadius: radii.md,
    justifyContent: "center",
    minHeight: 60,
    paddingHorizontal: spacing.lg,
    width: "100%",
  },
  buttonShell: {
    borderRadius: radii.md,
    overflow: "hidden",
    ...shadows.soft,
  },
  buttonPressed: {
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: typography.fontFamilySans,
    fontSize: typography.body,
    fontWeight: "700",
    textAlign: "center",
  },
  fieldWrap: {
    gap: spacing.sm,
  },
  fieldLabel: {
    color: colors.ink,
    fontFamily: typography.fontFamilySans,
    fontSize: typography.caption,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginLeft: 2,
    textTransform: "uppercase",
  },
  fieldInput: {
    backgroundColor: alpha(colors.white, 0.95),
    borderColor: colors.haze,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.ink,
    fontFamily: typography.fontFamilySans,
    fontSize: typography.body,
    minHeight: 60,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  fieldHint: {
    color: colors.inkMuted,
    fontFamily: typography.fontFamilySans,
    fontSize: typography.caption,
    lineHeight: 18,
    marginLeft: 2,
  },
});

const fieldVariants = {
  dark: {
    hint: {
      color: alpha(colors.white, 0.65),
    },
    input: {
      backgroundColor: alpha(colors.white, 0.08),
      borderColor: alpha(colors.white, 0.18),
      color: colors.white,
    },
    label: {
      color: alpha(colors.white, 0.82),
    },
    placeholder: alpha(colors.white, 0.46),
  },
  light: {
    hint: {
      color: colors.inkMuted,
    },
    input: {
      backgroundColor: alpha(colors.white, 0.95),
      borderColor: colors.haze,
      color: colors.ink,
    },
    label: {
      color: colors.ink,
    },
    placeholder: colors.inkMuted,
  },
};

const noticeStyles = StyleSheet.create({
  info: {
    body: {
      color: colors.infoDeep,
    },
    container: {
      backgroundColor: alpha(colors.info, 0.84),
      borderColor: alpha(colors.infoDeep, 0.12),
    },
    title: {
      color: colors.infoDeep,
    },
  },
  success: {
    body: {
      color: colors.success,
    },
    container: {
      backgroundColor: colors.successSoft,
      borderColor: alpha(colors.success, 0.18),
    },
    title: {
      color: colors.success,
    },
  },
  error: {
    body: {
      color: colors.error,
    },
    container: {
      backgroundColor: colors.errorSoft,
      borderColor: alpha(colors.error, 0.14),
    },
    title: {
      color: colors.error,
    },
  },
});

const buttonStyles = StyleSheet.create({
  primary: {
    button: {
      backgroundColor: colors.orange,
    },
    spinnerColor: colors.white,
    text: {
      color: colors.white,
    },
  },
  secondary: {
    button: {
      backgroundColor: colors.royal,
    },
    spinnerColor: colors.white,
    text: {
      color: colors.white,
    },
  },
  ghost: {
    button: {
      backgroundColor: alpha(colors.white, 0.3),
      borderColor: alpha(colors.white, 0.3),
      borderWidth: 1,
    },
    spinnerColor: colors.royal,
    text: {
      color: colors.royal,
    },
  },
});
