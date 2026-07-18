import { useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, FONTS, API } from "@/src/theme";
import { getSession, saveSession, clearSession, Session } from "@/src/services/session";
import { BrandLogo } from "@/src/components/BrandLogo";

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [dues, setDues] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const s = await getSession();
    if (!s) { router.replace("/"); return; }
    setSession(s);
    try {
      const r = await fetch(`${API}/dues/${s.block}/${s.flat_no}`);
      const d = await r.json();
      setDues(d.dues);
      // Corporate coverage can be added by a bulk payer even after a resident has already
      // registered — re-sync it here so the conveyance option hides/shows correctly.
      if (d.flat && !!d.flat.corporate_covered !== !!s.corporate_covered) {
        const updated = { ...s, corporate_covered: !!d.flat.corporate_covered, corporate_payer_name: d.flat.corporate_payer_name || null };
        await saveSession(updated);
        setSession(updated);
      }
    } catch {}
    setLoading(false); setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onLogout = async () => {
    await clearSession();
    router.replace("/");
  };

  if (loading || !session) {
    return (
      <View style={styles.center}><ActivityIndicator color={COLORS.brand} size="large" /></View>
    );
  }

  const hasDues = !!dues?.has_any_due;

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#1a1508", "#0A0A0A"]} style={styles.headerGrad}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerRow}>
            <View style={styles.logoRow}>
              <BrandLogo size={54} />
              <View>
                <Text style={styles.hello}>NAMASTE</Text>
                <Text style={styles.flatText}>
                  {session.block} · {session.flat_no}
                </Text>
                {!!session.owner_name && (
                  <Text style={styles.ownerText}>{session.owner_name}</Text>
                )}
              </View>
            </View>
            <Pressable testID="logout-btn" onPress={onLogout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={18} color={COLORS.brand} />
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.brand} />}
      >
        <View style={styles.duesCard} testID="dues-summary-card">
          <View style={styles.duesTop}>
            <Text style={styles.duesLabel}>OUTSTANDING DUES</Text>
            <View style={[styles.badge, hasDues ? styles.badgeWarn : styles.badgeOk]}>
              <Text style={[styles.badgeText, { color: hasDues ? COLORS.warning : COLORS.success }]}>
                {hasDues
                  ? dues.pending_count > 0
                    ? `${dues.pending_count} MONTH${dues.pending_count > 1 ? "S" : ""}`
                    : "OPENING DUE"
                  : "CLEAR"}
              </Text>
            </View>
          </View>
          <Text style={styles.duesAmount}>
            ₹{dues?.total_due?.toLocaleString("en-IN") || 0}
          </Text>
          <Text style={styles.duesSub}>
            {session.bhk_type} · ₹{dues?.rate?.toLocaleString("en-IN") || 0} per month
            {dues?.late_fee_total > 0 ? ` · Late fee ₹${dues.late_fee_total}` : ""}
            {dues?.opening_due_remaining > 0 ? ` · Opening due ₹${dues.opening_due_remaining.toLocaleString("en-IN")}` : ""}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>What would you like to do?</Text>

        <Pressable
          testID="maintenance-card"
          onPress={() => router.push("/maintenance")}
          style={({ pressed }) => [styles.heroCard, pressed && { opacity: 0.9 }]}
        >
          <LinearGradient
            colors={["#2a1f08", "#0A0A0A"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroInner}>
            <View style={styles.heroIcon}>
              <Ionicons name="receipt-outline" size={26} color={COLORS.brand} />
            </View>
            <Text style={styles.heroTitle}>Maintenance</Text>
            <Text style={styles.heroSub}>Pay monthly dues</Text>
            <View style={styles.heroCta}>
              <Text style={styles.heroCtaText}>PAY NOW</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.brand} />
            </View>
          </View>
        </Pressable>

        <Pressable
          testID="amenity-card"
          onPress={() => router.push("/amenity")}
          style={({ pressed }) => [styles.heroCard, pressed && { opacity: 0.9 }]}
        >
          <LinearGradient
            colors={["#1a1a1a", "#0A0A0A"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroInner}>
            <View style={styles.heroIcon}>
              <Ionicons name="fitness-outline" size={26} color={COLORS.brand} />
            </View>
            <Text style={styles.heroTitle}>Clubhouse</Text>
            <Text style={styles.heroSub}>Book Gym or Swimming Pool</Text>
            <View style={styles.heroCta}>
              <Text style={styles.heroCtaText}>BOOK NOW</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.brand} />
            </View>
          </View>
        </Pressable>

        {!session.corporate_covered && (
          <Pressable
            testID="conveyance-card"
            onPress={() => router.push({ pathname: "/pay", params: { purpose: "conveyance", amount: "250", mode: "full", include_conveyance: "1" } })}
            style={({ pressed }) => [styles.heroCard, pressed && { opacity: 0.9 }]}
          >
            <LinearGradient
              colors={["#12201a", "#0A0A0A"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroInner}>
              <View style={styles.heroIcon}>
                <Ionicons name="swap-horizontal-outline" size={26} color={COLORS.brand} />
              </View>
              <Text style={styles.heroTitle}>Conveyance</Text>
              <Text style={styles.heroSub}>One-time move-in / move-out charge · ₹250</Text>
              <View style={styles.heroCta}>
                <Text style={styles.heroCtaText}>PAY NOW</Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.brand} />
              </View>
            </View>
          </Pressable>
        )}

        {session.corporate_covered && (
          <View style={styles.corpNotice} testID="corporate-covered-notice">
            <Ionicons name="business-outline" size={18} color={COLORS.brand} />
            <Text style={styles.corpNoticeText}>
              Conveyance and gate pass for this flat are handled by{" "}
              <Text style={{ color: COLORS.brand, fontWeight: "700" }}>
                {session.corporate_payer_name || "your organization"}
              </Text>
              , not paid individually here.
            </Text>
          </View>
        )}

        {!session.corporate_covered && (
          <Pressable
            testID="gatepass-link"
            onPress={() => router.push("/gatepass")}
            style={styles.secondaryRow}
          >
            <Ionicons name="exit-outline" size={18} color={COLORS.brand} />
            <Text style={styles.secondaryText}>Moving Out? Request Gate Pass</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
          </Pressable>
        )}

        <Pressable
          testID="history-link"
          onPress={() => router.push("/history")}
          style={styles.secondaryRow}
        >
          <Ionicons name="time-outline" size={18} color={COLORS.brand} />
          <Text style={styles.secondaryText}>Payment History</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
        </Pressable>
        
        <Pressable
    testID="profile-link"
    onPress={() => router.push("/profile")}
    style={styles.secondaryRow}
>
    <Ionicons
        name="person-outline"
        size={18}
        color={COLORS.brand}
    />

    <Text style={styles.secondaryText}>
        My Profile
    </Text>

    <Ionicons
        name="chevron-forward"
        size={18}
        color={COLORS.muted}
    />
</Pressable>

        <Pressable
    testID="notice-link"
    onPress={() => router.push("/notices")}
    style={styles.secondaryRow}
>
    <Ionicons
        name="notifications-outline"
        size={18}
        color={COLORS.brand}
    />

    <Text style={styles.secondaryText}>
        Notices & Circulars
    </Text>

    <Ionicons
        name="chevron-forward"
        size={18}
        color={COLORS.muted}
    />
</Pressable>

        <Pressable
    testID="guest-room-link"
    onPress={() => router.push("/guest-room")}
    style={styles.secondaryRow}
>
    <Ionicons
        name="bed-outline"
        size={18}
        color={COLORS.brand}
    />

    <Text style={styles.secondaryText}>
        Guest Room Booking
    </Text>

    <Ionicons
        name="chevron-forward"
        size={18}
        color={COLORS.muted}
    />
</Pressable>

        <Pressable
    testID="hall-link"
    onPress={() => router.push("/community-hall")}
    style={styles.secondaryRow}
>
    <Ionicons
        name="business-outline"
        size={18}
        color={COLORS.brand}
    />

    <Text style={styles.secondaryText}>
        Community Hall Booking
    </Text>

    <Ionicons
        name="chevron-forward"
        size={18}
        color={COLORS.muted}
    />
</Pressable>

        
        <Pressable
  testID="admin-link"
  onPress={() => router.push("/admin")}
  style={styles.secondaryRow}
>
  <Ionicons
    name="shield-checkmark-outline"
    size={18}
    color={COLORS.brand}
  />

  <Text style={styles.secondaryText}>
    Admin Panel
  </Text>

  <Ionicons
    name="chevron-forward"
    size={18}
    color={COLORS.muted}
  />
</Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, backgroundColor: COLORS.surface, justifyContent: "center", alignItems: "center" },
  headerGrad: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.lg },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: SPACING.md },
  logoRow: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  hello: { fontFamily: FONTS.sans, color: COLORS.muted, fontSize: 10, letterSpacing: 2 },
  flatText: { fontFamily: FONTS.serif, color: COLORS.onSurface, fontSize: 20, marginTop: 2 },
  ownerText: { fontFamily: FONTS.sans, color: COLORS.brand, fontSize: 12, marginTop: 2 },
  logoutBtn: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
    justifyContent: "center", alignItems: "center",
    backgroundColor: COLORS.surfaceSecondary,
  },
  scroll: { padding: SPACING.xl, paddingTop: SPACING.md },
  duesCard: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.xl, marginBottom: SPACING.xl,
  },
  duesTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  duesLabel: { fontFamily: FONTS.sans, color: COLORS.muted, fontSize: 11, letterSpacing: 2 },
  badge: { paddingHorizontal: SPACING.md, paddingVertical: 4, borderRadius: RADIUS.pill },
  badgeOk: { backgroundColor: COLORS.successBg },
  badgeWarn: { backgroundColor: COLORS.warningBg },
  badgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 1, fontFamily: FONTS.sans },
  duesAmount: {
    fontFamily: FONTS.serif, fontSize: 44, color: COLORS.brand,
    marginTop: SPACING.md, letterSpacing: 0.5,
  },
  duesSub: { fontFamily: FONTS.sans, color: COLORS.onSurfaceTertiary, fontSize: 13, marginTop: 4 },
  sectionTitle: {
    fontFamily: FONTS.serif, color: COLORS.onSurface, fontSize: 20,
    marginBottom: SPACING.md, textAlign: "center",
  },
  heroCard: {
    height: 160, borderRadius: RADIUS.lg, overflow: "hidden",
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  heroInner: { flex: 1, padding: SPACING.xl, justifyContent: "space-between", alignItems: "center" },
  heroIcon: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 1, borderColor: COLORS.brand,
    justifyContent: "center", alignItems: "center",
    backgroundColor: COLORS.brandTint,
  },
  heroTitle: { fontFamily: FONTS.serif, color: COLORS.onSurface, fontSize: 26, textAlign: "center" },
  heroSub: { fontFamily: FONTS.sans, color: COLORS.muted, fontSize: 13, marginTop: -8, textAlign: "center" },
  heroCta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  heroCtaText: { color: COLORS.brand, fontSize: 12, letterSpacing: 2, fontWeight: "700", fontFamily: FONTS.sans },
  secondaryRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.md,
    padding: SPACING.lg, borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border,
    marginTop: SPACING.md,
  },
  secondaryText: { color: COLORS.onSurface, fontFamily: FONTS.sans, fontSize: 15 },
  corpNotice: {
    flexDirection: "row", gap: SPACING.md, alignItems: "flex-start",
    backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: SPACING.lg, marginBottom: SPACING.lg,
  },
  corpNoticeText: { flex: 1, color: COLORS.onSurfaceTertiary, fontSize: 13, fontFamily: FONTS.sans, lineHeight: 19 },
});
