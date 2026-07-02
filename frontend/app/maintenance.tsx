import { useState, useCallback } from "react";
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
  const [mode, setMode] = useState<"full" | "current_month">("full");
  const [includeConveyance, setIncludeConveyance] = useState(false);
  const [includeOpeningDue, setIncludeOpeningDue] = useState(true);

  const load = useCallback(async () => {
    const s = await getSession();
    if (!s) { router.replace("/"); return; }
    setSession(s);
    const r = await fetch(`${API}/dues/${s.block}/${s.flat_no}`);
    const d = await r.json();
    setDues(d.dues);
    setLoading(false);
  }, [router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !session || !dues) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.brand} size="large" /></View>;
  }

  const pending: string[] = dues.pending_months;
  const lateMonths: string[] = dues.late_months;
  const rate: number = dues.rate;
  const lateFeePerMonth: number = dues.late_fee_per_month;
  const currentMonth: string = dues.current_month;
  const currentMonthPending: boolean = dues.current_month_pending;

  const monthsToPay = mode === "full" ? pending
    : (currentMonthPending ? [currentMonth] : []);
  const lateMonthsPaid = monthsToPay.filter(m => lateMonths.includes(m));

  const openingDueRemaining: number = dues.opening_due_remaining || 0;
  const canIncludeOpeningDue = mode === "full" && openingDueRemaining > 0;

  const maint = monthsToPay.length * rate;
  const lateFee = lateMonthsPaid.length * lateFeePerMonth;
  const conveyance = includeConveyance ? 250 : 0;
  const openingDueAmt = canIncludeOpeningDue && includeOpeningDue ? openingDueRemaining : 0;
  const total = maint + conveyance + lateFee + openingDueAmt;
  const canPay = total > 0;

  const proceed = () => {
    router.push({
      pathname: "/pay",
      params: {
        purpose: "maintenance",
        amount: String(total),
        mode,
        include_conveyance: includeConveyance ? "1" : "0",
        include_opening_due: canIncludeOpeningDue && includeOpeningDue ? "1" : "0",
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
        <Text style={styles.totalLabel}>TOTAL DUE (incl. late fee)</Text>
        <Text style={styles.totalAmt} testID="total-due-amount">
          ₹{dues.total_due.toLocaleString("en-IN")}
        </Text>
        <Text style={styles.totalSub}>
          {pending.length} pending month{pending.length === 1 ? "" : "s"} · {session.bhk_type} · ₹{rate}/mo
          {openingDueRemaining > 0 ? ` · Opening due ₹${openingDueRemaining.toLocaleString("en-IN")}` : ""}
        </Text>

        {dues.late_count > 0 && (
          <View style={styles.warnCard} testID="late-fee-notice">
            <Ionicons name="warning-outline" size={18} color={COLORS.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warnTitle}>
                Late Fee: ₹{dues.late_fee_total.toLocaleString("en-IN")}
              </Text>
              <Text style={styles.warnSub}>
                {dues.late_count} late month{dues.late_count === 1 ? "" : "s"} × ₹{lateFeePerMonth}
                {" · "}Due by {dues.due_day}th of each month
              </Text>
            </View>
          </View>
        )}

        {openingDueRemaining > 0 && (
          <View style={styles.warnCard} testID="opening-due-notice">
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warnTitle}>
                Opening / Historical Due: ₹{openingDueRemaining.toLocaleString("en-IN")}
              </Text>
              <Text style={styles.warnSub}>
                Set by the committee for dues prior to app registration. Clear it together with a full payment.
              </Text>
            </View>
          </View>
        )}

        {!dues.has_any_due ? (
          <View style={styles.clearCard}>
            <Ionicons name="checkmark-circle" size={40} color={COLORS.success} />
            <Text style={styles.clearTitle}>All Dues Cleared</Text>
            <Text style={styles.clearSub}>You have no pending maintenance payments.</Text>
          </View>
        ) : pending.length === 0 ? (
          <View style={{ marginTop: SPACING.xl }} />
        ) : (
          <>
            <Text style={styles.sectionLabel}>PAYMENT OPTION</Text>
            <View style={styles.segment}>
              <Pressable
                testID="pay-full-tab"
                onPress={() => setMode("full")}
                style={[styles.segBtn, mode === "full" && styles.segBtnActive]}
              >
                <Text style={[styles.segText, mode === "full" && styles.segTextActive]}>
                  Pay All Pending
                </Text>
                <Text style={[styles.segAmt, mode === "full" && styles.segAmtActive]}>
                  {pending.length} month{pending.length > 1 ? "s" : ""}
                </Text>
              </Pressable>
              <Pressable
                testID="pay-current-tab"
                onPress={() => setMode("current_month")}
                disabled={!currentMonthPending}
                style={[
                  styles.segBtn,
                  mode === "current_month" && styles.segBtnActive,
                  !currentMonthPending && { opacity: 0.4 },
                ]}
              >
                <Text style={[styles.segText, mode === "current_month" && styles.segTextActive]}>
                  Current Month
                </Text>
                <Text style={[styles.segAmt, mode === "current_month" && styles.segAmtActive]}>
                  {currentMonthPending ? currentMonth : "Paid"}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.hint}>
              {mode === "current_month" && currentMonthPending
                ? `Pays only ${currentMonth} (current month). Older dues remain.`
                : `Covers ${pending.length} month${pending.length > 1 ? "s" : ""} from ${pending[0]} to ${pending[pending.length - 1]}.`}
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

        {openingDueRemaining > 0 && (
          <View style={[styles.conveyRow, { marginTop: SPACING.md }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.conveyTitle}>Clear Opening Due</Text>
              <Text style={styles.conveySub}>
                {canIncludeOpeningDue ? "Included with full payment" : "Switch to \"Pay All Pending\" to clear this"}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.conveyAmt}>₹{openingDueRemaining.toLocaleString("en-IN")}</Text>
              <Switch
                testID="opening-due-switch"
                value={includeOpeningDue}
                onValueChange={setIncludeOpeningDue}
                disabled={!canIncludeOpeningDue}
                trackColor={{ false: COLORS.surfaceTertiary, true: COLORS.brand }}
                thumbColor={includeOpeningDue ? COLORS.onBrand : "#666"}
              />
            </View>
          </View>
        )}

        <Text style={styles.sectionLabel}>SUMMARY</Text>
        <View style={styles.summaryCard}>
          <SummaryRow label={`Maintenance × ${monthsToPay.length}`} value={`₹${maint.toLocaleString("en-IN")}`} />
          <View style={styles.divider} />
          <SummaryRow
            label={`Late Fee × ${lateMonthsPaid.length}`}
            value={`₹${lateFee.toLocaleString("en-IN")}`}
          />
          <View style={styles.divider} />
          <SummaryRow label="Conveyance" value={`₹${conveyance.toLocaleString("en-IN")}`} />
          {openingDueRemaining > 0 && (
            <>
              <View style={styles.divider} />
              <SummaryRow label="Opening Due" value={`₹${openingDueAmt.toLocaleString("en-IN")}`} />
            </>
          )}
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
  warnCard: { marginTop: SPACING.lg, flexDirection: "row", alignItems: "flex-start", gap: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.warningBg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.warning },
  warnTitle: { color: COLORS.warning, fontSize: 14, fontWeight: "700", fontFamily: FONTS.sans },
  warnSub: { color: COLORS.onSurfaceTertiary, fontSize: 12, marginTop: 2, fontFamily: FONTS.sans },
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
