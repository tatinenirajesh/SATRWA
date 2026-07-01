import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Switch } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, FONTS, API } from "@/src/theme";
import { getSession, Session } from "@/src/session";

export default function Maintenance() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [dues, setDues] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"full" | "one_month">("full");
  const [includeConveyance, setIncludeConveyance] = useState(false);

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

  const pending = dues.pending_count;
  const rate = dues.rate;
  const monthsToPay = mode === "full" ? pending : Math.min(1, pending);
  const maint = monthsToPay * rate;
  const conveyance = includeConveyance ? 250 : 0;
  const total = maint + conveyance;
  const canPay = total > 0;

  const proceed = () => {
    router.push({
      pathname: "/pay",
      params: {
        purpose: "maintenance",
        amount: String(total),
        mode,
        include_conveyance: includeConveyance ? "1" : "0",
      },
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
            <Text style={styles.headerTitle}>Maintenance</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.totalLabel}>TOTAL DUE</Text>
        <Text style={styles.totalAmt} testID="total-due-amount">
          ₹{dues.total_due.toLocaleString("en-IN")}
        </Text>
        <Text style={styles.totalSub}>
          {pending} pending month{pending === 1 ? "" : "s"} · {session.bhk_type} · ₹{rate}/mo
        </Text>

        {pending === 0 ? (
          <View style={styles.clearCard}>
            <Ionicons name="checkmark-circle" size={40} color={COLORS.success} />
            <Text style={styles.clearTitle}>All Dues Cleared</Text>
            <Text style={styles.clearSub}>You have no pending maintenance payments.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>PAYMENT OPTION</Text>
            <View style={styles.segment}>
              <Pressable
                testID="pay-full-tab"
                onPress={() => setMode("full")}
                style={[styles.segBtn, mode === "full" && styles.segBtnActive]}
              >
                <Text style={[styles.segText, mode === "full" && styles.segTextActive]}>Pay Full</Text>
                <Text style={[styles.segAmt, mode === "full" && styles.segAmtActive]}>
                  ₹{(pending * rate).toLocaleString("en-IN")}
                </Text>
              </Pressable>
              <Pressable
                testID="pay-one-tab"
                onPress={() => setMode("one_month")}
                style={[styles.segBtn, mode === "one_month" && styles.segBtnActive]}
              >
                <Text style={[styles.segText, mode === "one_month" && styles.segTextActive]}>One Month</Text>
                <Text style={[styles.segAmt, mode === "one_month" && styles.segAmtActive]}>
                  ₹{rate.toLocaleString("en-IN")}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.hint}>
              {mode === "one_month"
                ? `Adjusts oldest pending month: ${dues.pending_months[0]}`
                : `Covers ${pending} month${pending > 1 ? "s" : ""} from ${dues.pending_months[0]} to ${dues.pending_months[dues.pending_months.length - 1]}`}
            </Text>
          </>
        )}

        <Text style={styles.sectionLabel}>ADD-ON</Text>
        <View style={styles.conveyRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.conveyTitle}>Conveyance Charge</Text>
            <Text style={styles.conveySub}>One-time charge on move-in / move-out</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.conveyAmt}>₹250</Text>
            <Switch
              testID="conveyance-switch"
              value={includeConveyance}
              onValueChange={setIncludeConveyance}
              trackColor={{ false: COLORS.surfaceTertiary, true: COLORS.brand }}
              thumbColor={includeConveyance ? COLORS.onBrand : "#666"}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>SUMMARY</Text>
        <View style={styles.summaryCard}>
          <SummaryRow label={`Maintenance × ${monthsToPay}`} value={`₹${maint.toLocaleString("en-IN")}`} />
          <View style={styles.divider} />
          <SummaryRow label="Conveyance" value={`₹${conveyance.toLocaleString("en-IN")}`} />
          <View style={styles.divider} />
          <SummaryRow label="Total" value={`₹${total.toLocaleString("en-IN")}`} bold />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <SafeAreaView edges={["bottom"]}>
          <Pressable
            testID="proceed-pay-btn"
            onPress={proceed}
            disabled={!canPay}
            style={[styles.payBtn, !canPay && { opacity: 0.4 }]}
          >
            <Text style={styles.payBtnText}>Pay ₹{total.toLocaleString("en-IN")}</Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.onBrand} />
          </Pressable>
        </SafeAreaView>
      </View>
    </View>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.sRow}>
      <Text style={[styles.sLabel, bold && { color: COLORS.onSurface, fontWeight: "700" }]}>{label}</Text>
      <Text style={[styles.sValue, bold && { color: COLORS.brand, fontSize: 20 }]}>{value}</Text>
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
  scroll: { padding: SPACING.xl, paddingBottom: 120 },
  totalLabel: { color: COLORS.muted, fontSize: 11, letterSpacing: 2, fontFamily: FONTS.sans },
  totalAmt: { fontFamily: FONTS.serif, color: COLORS.brand, fontSize: 56, marginTop: 4 },
  totalSub: { color: COLORS.onSurfaceTertiary, fontSize: 13, marginTop: 2, fontFamily: FONTS.sans },
  sectionLabel: { color: COLORS.muted, fontSize: 11, letterSpacing: 2, fontFamily: FONTS.sans, marginTop: SPACING.xxl, marginBottom: SPACING.sm },
  segment: { flexDirection: "row", backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, padding: 4, borderWidth: 1, borderColor: COLORS.border },
  segBtn: { flex: 1, height: 64, borderRadius: RADIUS.sm, justifyContent: "center", alignItems: "center" },
  segBtnActive: { backgroundColor: COLORS.brand },
  segText: { color: COLORS.onSurfaceTertiary, fontSize: 13, fontFamily: FONTS.sans, letterSpacing: 0.5 },
  segTextActive: { color: COLORS.onBrand, fontWeight: "700" },
  segAmt: { color: COLORS.muted, fontSize: 12, marginTop: 2, fontFamily: FONTS.sans },
  segAmtActive: { color: COLORS.onBrand, fontWeight: "600" },
  hint: { color: COLORS.muted, fontSize: 12, marginTop: SPACING.sm, fontFamily: FONTS.sans, fontStyle: "italic" },
  conveyRow: { flexDirection: "row", alignItems: "center", padding: SPACING.lg, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md },
  conveyTitle: { color: COLORS.onSurface, fontSize: 15, fontFamily: FONTS.sans, fontWeight: "600" },
  conveySub: { color: COLORS.muted, fontSize: 11, marginTop: 2, fontFamily: FONTS.sans },
  conveyAmt: { color: COLORS.brand, fontSize: 16, fontFamily: FONTS.serif, marginBottom: 4 },
  summaryCard: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingVertical: SPACING.sm },
  sRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg },
  sLabel: { color: COLORS.onSurfaceTertiary, fontSize: 14, fontFamily: FONTS.sans },
  sValue: { color: COLORS.onSurface, fontSize: 15, fontFamily: FONTS.serif },
  divider: { height: 1, backgroundColor: COLORS.divider, marginHorizontal: SPACING.lg },
  clearCard: { backgroundColor: COLORS.successBg, borderRadius: RADIUS.md, padding: SPACING.xl, alignItems: "center", marginTop: SPACING.xl },
  clearTitle: { fontFamily: FONTS.serif, color: COLORS.success, fontSize: 22, marginTop: SPACING.sm },
  clearSub: { color: COLORS.onSurfaceTertiary, fontSize: 13, marginTop: 4, fontFamily: FONTS.sans, textAlign: "center" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: SPACING.xl, paddingTop: SPACING.md },
  payBtn: { height: 56, borderRadius: RADIUS.md, backgroundColor: COLORS.brand, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: SPACING.sm },
  payBtnText: { color: COLORS.onBrand, fontSize: 16, fontWeight: "700", fontFamily: FONTS.sans, letterSpacing: 0.5 },
});
