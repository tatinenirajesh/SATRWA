import { useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, TextInput, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, FONTS, API } from "@/src/theme";
import { getSession, Session } from "@/src/services/session";

export default function GatePass() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [dues, setDues] = useState<any>(null);
  const [gatePass, setGatePass] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refNo, setRefNo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const s = await getSession();
    if (!s) { router.replace("/"); return; }
    setSession(s);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${API}/dues/${s.block}/${s.flat_no}`),
        fetch(`${API}/gatepass/status/${s.block}/${s.flat_no}`),
      ]);
      const d1 = await r1.json();
      const d2 = await r2.json();
      setDues(d1.dues);
      setGatePass(d2.gate_pass);
    } catch {}
    setLoading(false);
  }, [router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const payAndRequest = async () => {
    if (!session) return;
    if (!refNo.trim()) {
      Alert.alert("Reference Required", "Enter the UPI reference number or bank transaction number before requesting a gate pass.");
      return;
    }
    setSubmitting(true);
    try {
      const payRes = await fetch(`${API}/maintenance/pay`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          block: session.block, flat_no: session.flat_no,
          mode: "full", include_conveyance: true,
          upi_id: "", upi_ref_no: refNo.trim(),
        }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.detail || "Conveyance payment failed");

      const gpRes = await fetch(`${API}/gatepass/request`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          block: session.block, flat_no: session.flat_no,
          conveyance_receipt_no: payData.receipt.receipt_no,
          requested_by: "individual",
        }),
      });
      const gpData = await gpRes.json();
      if (!gpRes.ok) throw new Error(gpData.detail || "Gate pass request failed");

      setGatePass(gpData.gate_pass);
      Alert.alert("Request Submitted", "Conveyance paid and your gate pass request has been sent to the committee for approval.");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setSubmitting(false); }
  };

  if (loading || !session || !dues) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.brand} size="large" /></View>;
  }

  const hasDues = !!dues.has_any_due;
  const hasPending = gatePass && gatePass.status === "pending";
  const isApproved = gatePass && gatePass.status === "approved";

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#1a1508", "#0A0A0A"]} style={styles.headerGrad}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerRow}>
            <Pressable testID="back-btn" onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color={COLORS.brand} />
            </Pressable>
            <Text style={styles.headerTitle}>Gate Pass</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.intro}>
          Moving out? Clear all dues, pay the one-time conveyance charge, and request a gate pass.
          Once the committee approves it, show the approval on your phone to security — no QR scan needed.
        </Text>

        {isApproved && (
          <View style={styles.passCard} testID="gatepass-approved-card">
            <Ionicons name="checkmark-circle" size={40} color={COLORS.success} />
            <Text style={styles.passTitle}>Gate Pass Approved</Text>
            <Text style={styles.passNumber}>{gatePass.pass_number}</Text>
            <Text style={styles.passSub}>
              Show this screen to security at the gate. Approved {new Date(gatePass.approved_at).toLocaleDateString("en-IN")}.
            </Text>
          </View>
        )}

        {hasPending && (
          <View style={styles.pendingCard} testID="gatepass-pending-card">
            <Ionicons name="time-outline" size={32} color={COLORS.warning} />
            <Text style={styles.pendingTitle}>Request Pending</Text>
            <Text style={styles.pendingSub}>
              Your gate pass request is awaiting committee approval. Pull to refresh or check back shortly.
            </Text>
          </View>
        )}

        {gatePass && gatePass.status === "rejected" && (
          <View style={styles.warnCard} testID="gatepass-rejected-card">
            <Ionicons name="close-circle-outline" size={20} color={COLORS.error} />
            <Text style={styles.warnText}>
              Your last request was rejected{gatePass.rejected_reason ? `: ${gatePass.rejected_reason}` : "."} You can submit a new request below.
            </Text>
          </View>
        )}

        {!isApproved && !hasPending && (
          <>
            {hasDues ? (
              <View style={styles.blockCard} testID="gatepass-dues-block">
                <Ionicons name="lock-closed" size={28} color={COLORS.error} />
                <Text style={styles.blockTitle}>Clear Dues First</Text>
                <Text style={styles.blockSub}>
                  You have ₹{dues.total_due.toLocaleString("en-IN")} outstanding. Clear it before requesting a gate pass.
                </Text>
                <Pressable testID="go-to-maint-btn" onPress={() => router.push("/maintenance")} style={styles.blockBtn}>
                  <Text style={styles.blockBtnText}>Pay Maintenance</Text>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.onBrand} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.formCard}>
                <Text style={styles.formLabel}>Conveyance Charge</Text>
                <Text style={styles.formAmt}>₹250</Text>
                <Text style={styles.formHint}>One-time move-out charge. Pay now to submit your gate pass request.</Text>
                <TextInput
                  testID="gatepass-ref-input"
                  value={refNo}
                  onChangeText={setRefNo}
                  placeholder="UPI / bank reference no."
                  placeholderTextColor={COLORS.muted}
                  style={styles.input}
                />
                <Pressable
                  testID="pay-and-request-btn"
                  onPress={payAndRequest}
                  disabled={submitting || !refNo.trim()}
                  style={[styles.primaryBtn, !refNo.trim() && { opacity: 0.5 }]}
                >
                  {submitting ? <ActivityIndicator color={COLORS.onBrand} /> : (
                    <Text style={styles.primaryBtnText}>Pay ₹250 & Request Gate Pass</Text>
                  )}
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>
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
  scroll: { padding: SPACING.xl, paddingBottom: 60 },
  intro: { color: COLORS.onSurfaceTertiary, fontSize: 13, fontFamily: FONTS.sans, lineHeight: 19, marginBottom: SPACING.xl, textAlign: "center" },
  passCard: { backgroundColor: COLORS.successBg, borderRadius: RADIUS.lg, padding: SPACING.xl, alignItems: "center" },
  passTitle: { fontFamily: FONTS.serif, color: COLORS.success, fontSize: 20, marginTop: SPACING.sm },
  passNumber: { fontFamily: FONTS.serif, color: COLORS.onSurface, fontSize: 28, marginTop: SPACING.sm, letterSpacing: 1 },
  passSub: { color: COLORS.onSurfaceTertiary, fontSize: 12, marginTop: SPACING.sm, textAlign: "center", fontFamily: FONTS.sans },
  pendingCard: { backgroundColor: COLORS.warningBg, borderRadius: RADIUS.lg, padding: SPACING.xl, alignItems: "center" },
  pendingTitle: { fontFamily: FONTS.serif, color: COLORS.warning, fontSize: 18, marginTop: SPACING.sm },
  pendingSub: { color: COLORS.onSurfaceTertiary, fontSize: 12, marginTop: 4, textAlign: "center", fontFamily: FONTS.sans },
  warnCard: { flexDirection: "row", gap: SPACING.sm, alignItems: "flex-start", backgroundColor: COLORS.errorBg, borderRadius: RADIUS.md, padding: SPACING.lg, marginBottom: SPACING.lg },
  warnText: { flex: 1, color: COLORS.onSurfaceTertiary, fontSize: 12, fontFamily: FONTS.sans, lineHeight: 18 },
  blockCard: { backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.errorBg, borderRadius: RADIUS.lg, padding: SPACING.xl, alignItems: "center" },
  blockTitle: { fontFamily: FONTS.serif, color: COLORS.error, fontSize: 20, marginTop: SPACING.sm },
  blockSub: { color: COLORS.onSurfaceTertiary, fontSize: 13, marginTop: SPACING.sm, textAlign: "center", fontFamily: FONTS.sans },
  blockBtn: { marginTop: SPACING.lg, height: 48, paddingHorizontal: SPACING.xl, borderRadius: RADIUS.md, backgroundColor: COLORS.brand, flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  blockBtnText: { color: COLORS.onBrand, fontWeight: "700", fontFamily: FONTS.sans },
  formCard: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.xl, alignItems: "center" },
  formLabel: { color: COLORS.muted, fontSize: 11, letterSpacing: 2, fontFamily: FONTS.sans },
  formAmt: { fontFamily: FONTS.serif, color: COLORS.brand, fontSize: 44, marginTop: 4 },
  formHint: { color: COLORS.onSurfaceTertiary, fontSize: 12, marginTop: SPACING.sm, textAlign: "center", fontFamily: FONTS.sans, marginBottom: SPACING.lg },
  input: { height: 48, width: "100%", borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, color: COLORS.onSurface, fontSize: 14, paddingHorizontal: SPACING.lg, fontFamily: FONTS.sans, marginBottom: SPACING.md },
  primaryBtn: { height: 54, width: "100%", borderRadius: RADIUS.md, backgroundColor: COLORS.brand, justifyContent: "center", alignItems: "center" },
  primaryBtnText: { color: COLORS.onBrand, fontWeight: "700", fontSize: 15, fontFamily: FONTS.sans },
});
