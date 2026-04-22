import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import {
  colors,
  gradients,
  layout,
  radii,
  shadows,
  spacing,
  typography,
} from "./src/designSystem";
import {
  loginUser,
  registerUser,
} from "./src/api";
import { sendWelcomeNotification } from "./src/nativeNotifications";
import { ActionButton, Field, Notice, Panel, Pill } from "./src/ui";

const TROJAN_LOGO = require("./assets/vsu-trojans-logo.png");
const TROJAN_WORDMARK = require("./assets/vsu-trojans-wordmark.png");

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState("signin");
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const { width, height } = useWindowDimensions();
  const isWide = width >= layout.wideBreakpoint;
  const isCompact = height < 780;
  const isTightMobile = !isWide && (width < 430 || height < 860);

  async function completeSession(nextSession) {
    setSession(nextSession);
    setFeedback(null);
    await sendWelcomeNotification(nextSession.user.email);
  }

  function switchMode(nextMode) {
    setAuthMode(nextMode);
    setFeedback(null);
  }

  async function handleCredentialsSubmit() {
    const emailValue = email.trim().toLowerCase();
    const passwordValue = password.trim();

    if (!emailValue || !passwordValue) {
      setFeedback({
        message: "Enter your VSU email and password to continue.",
        tone: "error",
        title: "Missing fields",
      });
      return;
    }

    setBusy(true);
    setFeedback(null);

    try {
      if (authMode === "register") {
        await registerUser({ email: emailValue, password: passwordValue });
      }

      const result = await loginUser({ email: emailValue, password: passwordValue });
      await completeSession(result);
    } catch (error) {
      setFeedback({
        message: error.message || "Please try again.",
        tone: "error",
        title: "Unable to continue",
      });
    } finally {
      setBusy(false);
    }
  }

  function logOut() {
    setSession(null);
    setPassword("");
    setFeedback({
      message: "You’ve been signed out.",
      tone: "info",
      title: "Session ended",
    });
  }

  if (session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <LinearGradient colors={gradients.background} style={styles.screen}>
          <ScrollView contentContainerStyle={styles.loggedInScroll}>
            <Panel style={styles.dashboardCard}>
              <Image resizeMode="contain" source={TROJAN_WORDMARK} style={styles.dashboardWordmark} />
              <Image resizeMode="contain" source={TROJAN_LOGO} style={styles.dashboardLogo} />
              <Pill
                style={styles.dashboardPill}
                textStyle={styles.dashboardPillText}
              >
                Authenticated
              </Pill>
              <Text style={styles.dashboardTitle}>Welcome back to Trojan Fitness</Text>
              <Text style={styles.dashboardSubtitle}>
                You're signed in with your VSU email and ready to get moving.
              </Text>
              <Notice tone="info" title="Signed in">
                {session.user.email}
              </Notice>
              <ActionButton label="Log out" onPress={logOut} style={styles.dashboardButton} variant="secondary" />
            </Panel>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <LinearGradient colors={gradients.background} style={styles.screen}>
        <View pointerEvents="none" style={styles.orbTop} />
        <View pointerEvents="none" style={styles.orbBottom} />
        <Image
          pointerEvents="none"
          resizeMode="contain"
          source={TROJAN_LOGO}
          style={[styles.backgroundMark, isWide && styles.backgroundMarkWide]}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
        >
          <View
            style={[
              styles.authViewport,
              isCompact && styles.authViewportCompact,
              isTightMobile && styles.authViewportTight,
            ]}
          >
            <View style={[styles.topBar, isTightMobile && styles.topBarTight]}>
              <View style={[styles.brandLockup, isTightMobile && styles.brandLockupTight]}>
                <Image
                  resizeMode="contain"
                  source={TROJAN_LOGO}
                  style={[styles.cornerLogo, isTightMobile && styles.cornerLogoTight]}
                />
                <Image
                  resizeMode="contain"
                  source={TROJAN_WORDMARK}
                  style={[styles.cornerWordmark, isTightMobile && styles.cornerWordmarkTight]}
                />
              </View>
            </View>

            <View
              style={[
                styles.authStage,
                isWide && styles.authStageWide,
                isCompact && styles.authStageCompact,
                isTightMobile && styles.authStageTight,
              ]}
            >
              <View
                style={[
                  styles.statement,
                  isWide && styles.statementWide,
                  isCompact && styles.statementCompact,
                  isTightMobile && styles.statementTight,
                ]}
              >
                <Text style={[styles.statementTitle, isTightMobile && styles.statementTitleTight]}>
                  train like a trojan
                </Text>
                <Text style={[styles.statementCopy, isTightMobile && styles.statementCopyTight]}>
                  {authMode === "register"
                    ? "Create your account to get started."
                    : "Sign in with your VSU email."}
                </Text>
              </View>

              <LinearGradient
                colors={["rgba(244, 131, 34, 0.95)", "rgba(22, 112, 190, 0.9)"]}
                end={{ x: 1, y: 0.8 }}
                start={{ x: 0, y: 0 }}
                style={[
                  styles.authFrame,
                  isWide && styles.authFrameWide,
                  isTightMobile && styles.authFrameTight,
                ]}
              >
                <View style={[styles.authCard, isTightMobile && styles.authCardTight]}>
                  <View style={[styles.modeTabs, isTightMobile && styles.modeTabsTight]}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => switchMode("signin")}
                      style={[
                        styles.modeTab,
                        isTightMobile && styles.modeTabTight,
                        authMode === "signin" && styles.modeTabActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modeTabText,
                          isTightMobile && styles.modeTabTextTight,
                          authMode === "signin" && styles.modeTabTextActive,
                        ]}
                      >
                        Sign in
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => switchMode("register")}
                      style={[
                        styles.modeTab,
                        isTightMobile && styles.modeTabTight,
                        authMode === "register" && styles.modeTabActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modeTabText,
                          isTightMobile && styles.modeTabTextTight,
                          authMode === "register" && styles.modeTabTextActive,
                        ]}
                      >
                        Register
                      </Text>
                    </Pressable>
                  </View>

                  <View style={[styles.cardHeader, isTightMobile && styles.cardHeaderTight]}>
                    <Text style={[styles.cardEyebrow, isTightMobile && styles.cardEyebrowTight]}>
                      {authMode === "register" ? "New account" : "Welcome back"}
                    </Text>
                    <Text style={[styles.cardTitle, isTightMobile && styles.cardTitleTight]}>
                      {authMode === "register" ? "Create account" : "Sign in"}
                    </Text>
                  </View>

                  {feedback ? (
                    <Notice
                      bodyStyle={styles.authNoticeBody}
                      style={styles.authNotice}
                      title={feedback.title}
                      titleStyle={styles.authNoticeTitle}
                      tone={feedback.tone}
                    >
                      {feedback.message}
                    </Notice>
                  ) : null}

                  <View style={[styles.formStack, isTightMobile && styles.formStackTight]}>
                    <Field
                      autoComplete="email"
                      keyboardType="email-address"
                      label="VSU email"
                      onChangeText={setEmail}
                      placeholder="example@students.vsu.edu"
                      textContentType="emailAddress"
                      value={email}
                      style={isTightMobile ? styles.fieldInputTight : null}
                      variant="dark"
                    />
                    <Field
                      autoComplete={authMode === "register" ? "new-password" : "current-password"}
                      label="Password"
                      onChangeText={setPassword}
                      placeholder="At least 8 characters"
                      secureTextEntry
                      textContentType={authMode === "register" ? "newPassword" : "password"}
                      style={isTightMobile ? styles.fieldInputTight : null}
                      value={password}
                      variant="dark"
                    />

                    <ActionButton
                      gradientColors={["#f48322", "#f7a347", "#1670be"]}
                      innerStyle={[styles.primaryButtonInner, isTightMobile && styles.primaryButtonInnerTight]}
                      label={authMode === "register" ? "Create account" : "Enter app"}
                      loading={busy}
                      onPress={handleCredentialsSubmit}
                      style={[styles.primaryButtonShell, isTightMobile && styles.primaryButtonShellTight]}
                      textStyle={[styles.primaryButtonText, isTightMobile && styles.primaryButtonTextTight]}
                      variant="primary"
                    />
                  </View>

                  <View style={[styles.authFooter, isTightMobile && styles.authFooterTight]}>
                    {authMode === "register" ? (
                      <Pressable onPress={() => switchMode("signin")}>
                        <Text style={[styles.footerLink, isTightMobile && styles.footerLinkTight]}>Already have an account? Sign in</Text>
                      </Pressable>
                    ) : (
                      <Pressable onPress={() => switchMode("register")}>
                        <Text style={[styles.footerLink, isTightMobile && styles.footerLinkTight]}>Need an account? Register</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </LinearGradient>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.navy,
    flex: 1,
  },
  screen: {
    backgroundColor: colors.navy,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  orbTop: {
    backgroundColor: "rgba(244, 131, 34, 0.18)",
    borderRadius: 220,
    height: 260,
    position: "absolute",
    right: -80,
    top: -30,
    width: 260,
  },
  orbBottom: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 220,
    bottom: 40,
    height: 220,
    left: -100,
    position: "absolute",
    width: 220,
  },
  backgroundMark: {
    bottom: -140,
    height: 420,
    opacity: 0.12,
    position: "absolute",
    right: -120,
    width: 420,
  },
  backgroundMarkWide: {
    bottom: -120,
    height: 520,
    right: -80,
    width: 520,
  },
  authViewport: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  authViewportCompact: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  authViewportTight: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  topBar: {
    alignItems: "flex-start",
    minHeight: 72,
    justifyContent: "center",
  },
  topBarTight: {
    minHeight: 54,
  },
  brandLockup: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  brandLockupTight: {
    gap: spacing.sm,
  },
  cornerLogo: {
    borderRadius: 24,
    height: 48,
    width: 48,
  },
  cornerLogoTight: {
    height: 38,
    width: 38,
  },
  cornerWordmark: {
    height: 24,
    width: 120,
  },
  cornerWordmarkTight: {
    height: 18,
    width: 92,
  },
  authStage: {
    alignItems: "center",
    flex: 1,
    gap: spacing.xxxl,
    justifyContent: "center",
  },
  authStageCompact: {
    gap: spacing.xxl,
  },
  authStageTight: {
    gap: spacing.lg,
    justifyContent: "flex-start",
  },
  authStageWide: {
    alignSelf: "center",
    flexDirection: "row",
    gap: 56,
    justifyContent: "space-between",
    maxWidth: layout.contentMaxWidth,
    width: "100%",
  },
  statement: {
    gap: spacing.md,
    maxWidth: 430,
    width: "100%",
  },
  statementWide: {
    flex: 1,
    marginRight: spacing.xl,
    maxWidth: 460,
  },
  statementCompact: {
    gap: spacing.sm,
  },
  statementTight: {
    gap: spacing.xs,
    maxWidth: "100%",
  },
  statementTitle: {
    color: colors.white,
    fontFamily: typography.fontFamilyBrand,
    fontSize: Platform.select({ web: 60, default: 50 }),
    fontWeight: "700",
    lineHeight: Platform.select({ web: 64, default: 54 }),
    textTransform: "none",
  },
  statementTitleTight: {
    fontSize: 32,
    lineHeight: 34,
    maxWidth: 260,
  },
  statementCopy: {
    color: "rgba(255, 255, 255, 0.76)",
    fontFamily: typography.fontFamilySans,
    fontSize: 19,
    lineHeight: 30,
    maxWidth: 360,
  },
  statementCopyTight: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 280,
  },
  authFrame: {
    borderRadius: 34,
    padding: 1.25,
    width: "100%",
  },
  authFrameWide: {
    maxWidth: 510,
  },
  authFrameTight: {
    maxWidth: "100%",
  },
  authCard: {
    backgroundColor: "rgba(5, 18, 32, 0.88)",
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 33,
    borderWidth: 1,
    flexShrink: 0,
    gap: spacing.xl,
    paddingHorizontal: Platform.select({ web: 34, default: 26 }),
    paddingVertical: Platform.select({ web: 34, default: 28 }),
    width: "100%",
  },
  authCardTight: {
    gap: spacing.lg,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  modeTabs: {
    alignSelf: "stretch",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: radii.pill,
    flexDirection: "row",
    padding: 6,
  },
  modeTabsTight: {
    padding: 4,
  },
  modeTab: {
    borderRadius: radii.pill,
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modeTabTight: {
    minHeight: 42,
    paddingHorizontal: spacing.sm,
  },
  modeTabActive: {
    backgroundColor: "rgba(244, 131, 34, 0.18)",
    ...shadows.soft,
  },
  modeTabText: {
    color: "rgba(255, 255, 255, 0.64)",
    fontFamily: typography.fontFamilySans,
    fontSize: typography.body,
    fontWeight: "700",
    textAlign: "center",
  },
  modeTabTextActive: {
    color: colors.white,
  },
  modeTabTextTight: {
    fontSize: 14,
  },
  cardHeader: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  cardHeaderTight: {
    gap: 4,
    paddingTop: 0,
  },
  cardEyebrow: {
    color: "rgba(244, 131, 34, 0.9)",
    fontFamily: typography.fontFamilySans,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  cardEyebrowTight: {
    fontSize: 10,
    letterSpacing: 1.1,
  },
  cardTitle: {
    color: colors.white,
    fontFamily: typography.fontFamilyBrand,
    fontSize: 38,
    fontWeight: "700",
    lineHeight: 42,
  },
  cardTitleTight: {
    fontSize: 28,
    lineHeight: 30,
  },
  formStack: {
    gap: spacing.lg,
  },
  formStackTight: {
    gap: spacing.md,
  },
  fieldInputTight: {
    minHeight: 52,
    paddingVertical: spacing.md,
  },
  authNotice: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  authNoticeTitle: {
    color: colors.white,
  },
  authNoticeBody: {
    color: "rgba(255, 255, 255, 0.82)",
  },
  primaryButtonShell: {
    marginTop: spacing.sm,
  },
  primaryButtonShellTight: {
    marginTop: spacing.xs,
  },
  primaryButtonInner: {
    minHeight: 62,
  },
  primaryButtonInnerTight: {
    minHeight: 54,
  },
  primaryButtonText: {
    letterSpacing: 0.2,
  },
  primaryButtonTextTight: {
    fontSize: 16,
  },
  secondaryButtonShell: {
    marginTop: spacing.xs,
    shadowOpacity: 0,
  },
  secondaryButtonShellTight: {
    marginTop: 0,
  },
  secondaryButtonInner: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderColor: "rgba(255, 255, 255, 0.12)",
    minHeight: 58,
  },
  secondaryButtonInnerTight: {
    minHeight: 50,
  },
  secondaryButtonText: {
    color: colors.white,
  },
  secondaryButtonTextTight: {
    fontSize: 15,
  },
  codeMeta: {
    color: "rgba(255, 255, 255, 0.58)",
    fontFamily: typography.fontFamilySans,
    fontSize: typography.caption,
    lineHeight: 18,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  codeMetaTight: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 0,
  },
  authFooter: {
    alignItems: "center",
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    borderTopWidth: 1,
    marginTop: spacing.sm,
    paddingTop: spacing.lg,
  },
  authFooterTight: {
    marginTop: spacing.xs,
    paddingTop: spacing.md,
  },
  footerLink: {
    color: "rgba(255, 255, 255, 0.78)",
    fontFamily: typography.fontFamilySans,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  footerLinkTight: {
    fontSize: 14,
  },
  loggedInScroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  dashboardCard: {
    alignItems: "center",
    alignSelf: "center",
    gap: spacing.lg,
    maxWidth: 560,
    width: "100%",
  },
  dashboardWordmark: {
    height: 28,
    width: 220,
  },
  dashboardLogo: {
    aspectRatio: 1280 / 1147,
    height: 220,
    width: "100%",
  },
  dashboardPill: {
    backgroundColor: colors.royal,
    borderColor: colors.royal,
  },
  dashboardPillText: {
    color: colors.white,
  },
  dashboardTitle: {
    color: colors.ink,
    fontFamily: typography.fontFamilyBrand,
    fontSize: typography.heading,
    fontWeight: "700",
    textAlign: "center",
  },
  dashboardSubtitle: {
    color: colors.inkSoft,
    fontFamily: typography.fontFamilySans,
    fontSize: typography.body,
    lineHeight: 24,
    textAlign: "center",
  },
  dashboardButton: {
    alignSelf: "stretch",
  },
});
