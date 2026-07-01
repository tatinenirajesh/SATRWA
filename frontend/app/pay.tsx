import { useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, TextInput, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { COLORS, SPACING, RADIUS, FONTS, API } from "@/src/theme";
import { getSession } from "@/src/session";

const SOCIETY_UPI = "srianjaneya@upi";

export default function Pay() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    purpose: string; amount: string; mode?: string; include_conveyance?: string;
    members?: string; persons?: string;
  }>();
  const [upiId, setUpiId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");

  const amount = Number(params.amount || 0);
  const purpose = params.purpose || "";

  const purposeLabel = purpose === "maintenance" ? "Maintenance Payment"
    : purpose === "gym" ? "Gymnasium Booking"
    : purpose === "pool" ? "Swimming Pool Booking" : "Payment";

  const onPay = async () => {
    if (!upiId.trim() || !upiId.includes("@")) {
      Alert.alert("Enter UPI ID", "Please enter a valid UPI ID (e.g. name@upi)");
      return;
    }
    const s = await getSession();
    if (!s) { router.replace("/"); return; }

    setProcessing(true); setStatus("processing");
    try {
      let receipt;
      if (purpose === "maintenance") {
        const r = await fetch(`${API}/maintenance/pay`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            block: s.block, flat_no: s.flat_no,
            mode: params.mode || "full",
            include_conveyance: params.include_conveyance === "1",
            upi_id: upiId,
          }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || "Payment failed");
        receipt = d.receipt;
      } else if (purpose === "gym") {
        const r = await fetch(`${API}/amenity/gym`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            block: s.block, flat_no: s.flat_no,
            members: Number(params.members || 1),
            booking_date: new Date().toISOString().slice(0, 10),
            upi_id: upiId,
          }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(typeof d.detail === "string" ? d.detail : "Booking failed");
        receipt = d.receipt;
      } else if (purpose === "pool") {
        const r = await fetch(`${API}/amenity/pool`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            block: s.block, flat_no: s.flat_no,
            persons: Number(params.persons || 1),
            booking_date: new Date().toISOString().slice(0, 10),
            upi_id: upiId,
          }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(typeof d.detail === "string" ? d.detail : "Booking failed");
        receipt = d.receipt;
      }
      setStatus("done");
      setTimeout(() => {
        router.replace({ pathname: "/receipt", params: { no: receipt.receipt_no } });
      }, 700);
    } catch (e: any) {
      setStatus("idle");
      Alert.alert("Payment Failed", e.message || "Try again");
    } finally { setProcessing(false); }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#1a1508", "#0A0A0A"]} style={styles.headerGrad}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerRow}>
            <Pressable testID="back-btn" onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color={COLORS.brand} />
            </Pressable>
            <Text style={styles.headerTitle}>UPI Payment</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bottomOffset={120}
        extraKeyboardSpace={20}
      >
        <View style={styles.card}>
          <Text style={styles.label}>{purposeLabel}</Text>
          <Text style={styles.amt} testID="upi-amount">₹{amount.toLocaleString("en-IN")}</Text>
          <Text style={styles.mock}>MOCK PAYMENT · TEST MODE</Text>
        </View>

        <View style={styles.qrCard}>
          <Text style={styles.qrLabel}>SCAN & PAY</Text>
          <View style={styles.qrBox}>
            <Ionicons name="qr-code" size={140} color={COLORS.brand} />
          </View>
          <Text style={styles.upiId}>{SOCIETY_UPI}</Text>
          <Text style={styles.qrSub}>Sri Anjaneya Township Committee</Text>
        </View>

        <Text style={styles.orText}>— OR —</Text>

        <Text style={styles.inputLabel}>ENTER YOUR UPI ID</Text>
        <TextInput
          testID="upi-id-input"
          value={upiId}
          onChangeText={setUpiId}
          placeholder="yourname@upi"
          placeholderTextColor={COLORS.muted}
          style={styles.input}
          autoCapitalize="none"
          returnKeyType="done"
        />
        <Text style={styles.hint}>Since this is mock mode, any UPI ID with @ works.</Text>

        <View style={{ height: 40 }} />
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <SafeAreaView edges={["bottom"]} style={styles.footer}>
          <Pressable
            testID="confirm-pay-btn"
            onPress={onPay}
            disabled={processing || status === "done"}
            style={[styles.payBtn, (processing || status === "done") && { opacity: 0.7 }]}
          >
            {status === "processing" ? (
              <ActivityIndicator color={COLORS.onBrand} />
            ) : status === "done" ? (
              <>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.onBrand} />
                <Text style={styles.payBtnText}>Success</Text>
              </>
            ) : (
              <>
                <Text style={styles.payBtnText}>Confirm ₹{amount.toLocaleString("en-IN")}</Text>
                <Ionicons name="lock-closed" size={16} color={COLORS.onBrand} />
              </>
            )}
          </Pressable>
        </SafeAreaView>
      </KeyboardStickyView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  headerGrad: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: SPACING.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { fontFamily: FONTS.serif, color: COLORS.onSurface, fontSize: 22 },
  scroll: { padding: SPACING.xl, paddingBottom: SPACING.xl },
  card: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.lg, padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  label: { color: COLORS.muted, fontSize: 12, letterSpacing: 2, fontFamily: FONTS.sans },
  amt: { fontFamily: FONTS.serif, color: COLORS.brand, fontSize: 48, marginTop: 4 },
  mock: { color: COLORS.warning, fontSize: 10, letterSpacing: 2, fontFamily: FONTS.sans, marginTop: SPACING.sm, backgroundColor: COLORS.warningBg, paddingHorizontal: SPACING.md, paddingVertical: 4, borderRadius: RADIUS.pill },
  qrCard: { marginTop: SPACING.xl, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.lg, padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.brand, alignItems: "center" },
  qrLabel: { color: COLORS.muted, fontSize: 11, letterSpacing: 3, fontFamily: FONTS.sans, marginBottom: SPACING.lg },
  qrBox: { width: 180, height: 180, backgroundColor: "#0A0A0A", borderRadius: RADIUS.md, borderWidth: 2, borderColor: COLORS.brand, justifyContent: "center", alignItems: "center" },
  upiId: { fontFamily: FONTS.serif, color: COLORS.brand, fontSize: 18, marginTop: SPACING.lg, letterSpacing: 1 },
  qrSub: { color: COLORS.muted, fontSize: 11, marginTop: 2, fontFamily: FONTS.sans },
  orText: { textAlign: "center", color: COLORS.muted, fontSize: 11, letterSpacing: 2, marginTop: SPACING.xl, fontFamily: FONTS.sans },
  inputLabel: { color: COLORS.muted, fontSize: 11, letterSpacing: 2, fontFamily: FONTS.sans, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  input: { height: 52, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary, color: COLORS.onSurface, fontSize: 16, paddingHorizontal: SPACING.lg, fontFamily: FONTS.sans },
  hint: { color: COLORS.muted, fontSize: 11, marginTop: 6, fontFamily: FONTS.sans, fontStyle: "italic" },
  footer: { backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: SPACING.xl, paddingTop: SPACING.md },
  payBtn: { height: 56, borderRadius: RADIUS.md, backgroundColor: COLORS.brand, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: SPACING.sm },
  payBtnText: { color: COLORS.onBrand, fontSize: 15, fontWeight: "700", fontFamily: FONTS.sans, letterSpacing: 0.3 },
});
