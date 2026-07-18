import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, FONTS, API } from "@/src/theme";
import { getSession, Session } from "@/src/services/session";

type Tab = "gym" | "pool";
const POOL: Record<number, number> = { 1: 700, 2: 1000, 3: 1500, 4: 2000 };

export default function Amenity() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [dues, setDues] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("gym");
  const [gymCount, setGymCount] = useState(1);
  const [poolPersons, setPoolPersons] = useState(1);

  const load = useCallback(async () => {
    const s = await getSession();
    if (!s) { router.replace("/"); return; }
    setSession(s);
    const r = await fetch(`${API}/dues/${s.block}/${s.flat_no}`);
    const d = await r.json();
    setDues(d.dues);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !session || !dues) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.brand} size="large" /></View>;
  }

  const blocked = !!dues.has_any_due;
  const gymTotal = gymCount * 300;
  const poolTotal = POOL[poolPersons];

  const proceed = () => {
    if (blocked) return;
    router.push({
      pathname: "/pay",
      params: tab === "gym"
        ? { purpose: "gym", amount: String(gymTotal), members: String(gymCount) }
        : { purpose: "pool", amount: String(poolTotal), persons: String(poolPersons) },
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#1a1508", "#0A0A0A"]} style={styles.headerGrad}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerRow}>
            <Pressable testID="back-btn" onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color={COLORS.brand} />
            </Pressable>
            <Text style={styles.headerTitle}>Clubhouse</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.segment}>
          <Pressable testID="gym-tab" onPress={() => setTab("gym")} style={[styles.segBtn, tab === "gym" && styles.segBtnActive]}>
            <Ionicons name="barbell-outline" size={18} color={tab === "gym" ? COLORS.onBrand : COLORS.onSurfaceTertiary} />
            <Text style={[styles.segText, tab === "gym" && styles.segTextActive]}>Gymnasium</Text>
          </Pressable>
          <Pressable testID="pool-tab" onPress={() => setTab("pool")} style={[styles.segBtn, tab === "pool" && styles.segBtnActive]}>
            <Ionicons name="water-outline" size={18} color={tab === "pool" ? COLORS.onBrand : COLORS.onSurfaceTertiary} />
            <Text style={[styles.segText, tab === "pool" && styles.segTextActive]}>Swimming Pool</Text>
          </Pressable>
        </View>

        {tab === "gym" ? (
          <View style={{ marginTop: SPACING.xl }}>
            <Text style={styles.priceHead}>₹300 <Text style={styles.priceSub}>/ person</Text></Text>
            <Text style={styles.subHint}>Select number of members</Text>
            <View style={styles.stepper}>
              <Pressable testID="gym-minus" onPress={() => setGymCount(Math.max(1, gymCount - 1))} style={styles.stepBtn}>
                <Ionicons name="remove" size={22} color={COLORS.brand} />
              </Pressable>
              <View style={styles.stepValue}>
                <Text style={styles.stepValueText} testID="gym-count">{gymCount}</Text>
                <Text style={styles.stepValueSub}>members</Text>
              </View>
              <Pressable testID="gym-plus" onPress={() => setGymCount(gymCount + 1)} style={styles.stepBtn}>
                <Ionicons name="add" size={22} color={COLORS.brand} />
              </Pressable>
            </View>
            <View style={styles.totalCard}>
              <Text style={styles.totalCardLabel}>TOTAL</Text>
              <Text style={styles.totalCardAmt}>₹{gymTotal.toLocaleString("en-IN")}</Text>
            </View>
          </View>
        ) : (
          <View style={{ marginTop: SPACING.xl }}>
            <Text style={styles.priceHead}>Pool Tariff</Text>
            <Text style={styles.subHint}>Per flat, based on persons</Text>
            {[1, 2, 3, 4].map(n => {
              const active = poolPersons === n;
              return (
                <Pressable
                  key={n}
                  testID={`pool-tier-${n}`}
                  onPress={() => setPoolPersons(n)}
                  style={[styles.tierRow, active && styles.tierRowActive]}
                >
                  <View style={[styles.tierBadge, active && { backgroundColor: COLORS.brand }]}>
                    <Text style={[styles.tierBadgeText, active && { color: COLORS.onBrand }]}>{n}</Text>
                  </View>
                  <Text style={styles.tierLabel}>{n} Person{n > 1 ? "s" : ""}</Text>
                  <Text style={styles.tierAmt}>₹{POOL[n].toLocaleString("en-IN")}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {blocked && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard} testID="dues-gate">
            <View style={styles.overlayIcon}>
              <Ionicons name="lock-closed" size={28} color={COLORS.error} />
            </View>
            <Text style={styles.overlayTitle}>Clear Dues First</Text>
            <Text style={styles.overlaySub}>
              You have ₹{dues.total_due.toLocaleString("en-IN")} in pending maintenance.
              Please clear dues to book amenities.
            </Text>
            <Pressable testID="go-to-maint-btn" onPress={() => router.replace("/maintenance")} style={styles.overlayBtn}>
              <Text style={styles.overlayBtnText}>Pay Maintenance</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.onBrand} />
            </Pressable>
          </View>
        </View>
      )}

      {!blocked && (
        <View style={styles.footer}>
          <SafeAreaView edges={["bottom"]}>
            <Pressable testID="proceed-book-btn" onPress={proceed} style={styles.payBtn}>
              <Text style={styles.payBtnText}>
                Book · ₹{(tab === "gym" ? gymTotal : poolTotal).toLocaleString("en-IN")}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.onBrand} />
            </Pressable>
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, backgroundColor: COLORS.surface, justifyContent: "center", alignItems: "center" },
  headerGrad: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: SPACING.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { fontFamily: FONTS.serif, color: COLORS.onSurface, fontSize: 22 },
  scroll: { padding: SPACING.xl, paddingBottom: 140 },
  segment: { flexDirection: "row", backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, padding: 4, borderWidth: 1, borderColor: COLORS.border },
  segBtn: { flex: 1, height: 48, borderRadius: RADIUS.sm, justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 6 },
  segBtnActive: { backgroundColor: COLORS.brand },
  segText: { color: COLORS.onSurfaceTertiary, fontSize: 13, fontFamily: FONTS.sans },
  segTextActive: { color: COLORS.onBrand, fontWeight: "700" },
  priceHead: { fontFamily: FONTS.serif, color: COLORS.brand, fontSize: 42 },
  priceSub: { fontSize: 16, color: COLORS.muted, fontFamily: FONTS.sans },
  subHint: { color: COLORS.muted, fontSize: 13, marginTop: 4, fontFamily: FONTS.sans, marginBottom: SPACING.xl },
  stepper: { flexDirection: "row", alignItems: "center", gap: SPACING.lg, marginTop: SPACING.md },
  stepBtn: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: COLORS.brand, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.brandTint },
  stepValue: { flex: 1, alignItems: "center", padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary },
  stepValueText: { fontFamily: FONTS.serif, color: COLORS.onSurface, fontSize: 36 },
  stepValueSub: { color: COLORS.muted, fontSize: 11, letterSpacing: 2, fontFamily: FONTS.sans, marginTop: 2 },
  totalCard: { marginTop: SPACING.xxl, padding: SPACING.xl, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.brand, alignItems: "center" },
  totalCardLabel: { color: COLORS.muted, fontSize: 11, letterSpacing: 2, fontFamily: FONTS.sans },
  totalCardAmt: { fontFamily: FONTS.serif, color: COLORS.brand, fontSize: 40, marginTop: 4 },
  tierRow: { flexDirection: "row", alignItems: "center", padding: SPACING.lg, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm, gap: SPACING.lg },
  tierRowActive: { borderColor: COLORS.brand },
  tierBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceTertiary, justifyContent: "center", alignItems: "center" },
  tierBadgeText: { fontFamily: FONTS.serif, fontSize: 20, color: COLORS.brand },
  tierLabel: { flex: 1, color: COLORS.onSurface, fontSize: 16, fontFamily: FONTS.sans },
  tierAmt: { fontFamily: FONTS.serif, color: COLORS.brand, fontSize: 20 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,10,10,0.85)", justifyContent: "center", alignItems: "center", padding: SPACING.xl },
  overlayCard: { backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.errorBg, borderRadius: RADIUS.lg, padding: SPACING.xl, alignItems: "center", maxWidth: 360 },
  overlayIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.errorBg, justifyContent: "center", alignItems: "center" },
  overlayTitle: { fontFamily: FONTS.serif, color: COLORS.error, fontSize: 24, marginTop: SPACING.md },
  overlaySub: { color: COLORS.onSurfaceTertiary, textAlign: "center", fontSize: 14, marginTop: SPACING.sm, fontFamily: FONTS.sans, lineHeight: 20 },
  overlayBtn: { marginTop: SPACING.xl, height: 48, paddingHorizontal: SPACING.xl, borderRadius: RADIUS.md, backgroundColor: COLORS.brand, flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  overlayBtnText: { color: COLORS.onBrand, fontWeight: "700", fontFamily: FONTS.sans },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: SPACING.xl, paddingTop: SPACING.md },
  payBtn: { height: 56, borderRadius: RADIUS.md, backgroundColor: COLORS.brand, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: SPACING.sm },
  payBtnText: { color: COLORS.onBrand, fontSize: 16, fontWeight: "700", fontFamily: FONTS.sans },
});
