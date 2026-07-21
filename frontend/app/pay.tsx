import { useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  TextInput, Alert, Linking, Image, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { COLORS, SPACING, RADIUS, FONTS, API } from "@/src/theme";
import { getSession } from "@/src/services/session";

type Step = "pay" | "confirm";

export default function Pay() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    purpose: string; amount: string; mode?: string; include_conveyance?: string;
    include_opening_due?: string; members?: string; persons?: string;
  }>();

  const amount = Number(params.amount || 0);
  const purpose = params.purpose || "";
  const purposeLabel = purpose === "maintenance" ? "Maintenance Payment"
    : purpose === "gym" ? "Gymnasium Booking"
    : purpose === "pool" ? "Swimming Pool Booking" : "Payment";

  const [session, setSession] = useState<any>(null);
  const [upiInfo, setUpiInfo] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<Step>("pay");
  const [refNo, setRefNo] = useState("");

  useEffect(() => {
    (async () => {
      const s = await getSession();
      if (!s) { router.replace("/"); return; }
      setSession(s);
      const note = `${purpose === "maintenance" ? "Maint" : purpose === "gym" ? "Gym" : "Pool"} ${s.block}-${s.flat_no}`;
      const r = await fetch(`${API}/upi/info?amount=${amount}&note=${encodeURIComponent(note)}`);
      setUpiInfo(await r.json());
    })();
  }, []);

  const qrUrl = useMemo(() => {
    if (!session) return "";
    const note = `${purpose === "maintenance" ? "Maint" : purpose === "gym" ? "Gym" : "Pool"} ${session.block}-${session.flat_no}`;
    return `${API}/upi/qr?amount=${amount}&note=${encodeURIComponent(note)}&t=${Date.now()}`;
  }, [session, amount, purpose]);

  const openApp = async (url: string, appName: string) => {
    try {
      const ok = await Linking.canOpenURL(url).catch(() => false);
      if (ok) {
        await Linking.openURL(url);
      } else {
        // Fallback to generic upi:// which Android will show as chooser
        await Linking.openURL(upiInfo.upi_url);
      }
      // After returning, show confirmation step
      setStep("confirm");
    } catch (e: any) {
      Alert.alert(
        `${appName} not installed?`,
        "Please install a UPI app or use another payment method. You can copy the VPA and pay manually."
      );
    }
  };

  const copyVpa = async () => {
    await Clipboard.setStringAsync(upiInfo.vpa);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const confirmPayment = async () => {
    if (!session) return;
    if (!refNo.trim()) {
      Alert.alert("Reference Required", "Enter the UPI reference number or bank transaction number before saving the receipt.");
      return;
    }
    setProcessing(true); setStatus("processing");
    try {
      let receipt: any;
      const commonBody = {
        block: session.block, flat_no: session.flat_no,
        upi_id: upiInfo?.vpa || "",
        upi_ref_no: refNo.trim(),
      };
      if (purpose === "maintenance") {
        const r = await fetch(`${API}/maintenance/pay`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...commonBody,
            mode: params.mode || "full",
            include_conveyance: params.include_conveyance === "1",
            include_opening_due: params.include_opening_due === "1",
          }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || "Payment failed");
        receipt = d.receipt;
      } else if (purpose === "gym") {
        const r = await fetch(`${API}/amenity/gym`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...commonBody,
            members: Number(params.members || 1),
            booking_date: new Date().toISOString().slice(0, 10),
          }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(typeof d.detail === "string" ? d.detail : "Booking failed");
        receipt = d.receipt;
      } else if (purpose === "pool") {
        const r = await fetch(`${API}/amenity/pool`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...commonBody,
            persons: Number(params.persons || 1),
            booking_date: new Date().toISOString().slice(0, 10),
          }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(typeof d.detail === "string" ? d.detail : "Booking failed");
        receipt = d.receipt;
      }
      setStatus("done");
      setTimeout(() => {
        if (receipt?.receipt_no) {

    router.replace({
        pathname:"/receipt",
        params:{no:receipt.receipt_no}
    });

} else {

    Alert.alert(
        "Payment Successful",
        "Payment recorded successfully."
    );

    router.replace("/resident-home");

}
      }, 500);
    } catch (e: any) {
      setStatus("idle");
      Alert.alert(
    "Payment Failed",
    e.message || "Please try again."
);
    } finally { setProcessing(false); }
  };

  if (!upiInfo) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.brand} size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#1a1508", "#0A0A0A"]} style={styles.headerGrad}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerRow}>
            <Pressable testID="back-btn" onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color={COLORS.brand} />
            </Pressable>
            <Text style={styles.headerTitle}>Secure Payment</Text>
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
        {step === "pay" ? (
          <>
            <View style={styles.amountCard}>
              <Text style={styles.amountLabel}>{purposeLabel}</Text>
              <Text style={styles.amountBig} testID="upi-amount">₹{amount.toLocaleString("en-IN")}</Text>
              <Text style={styles.amountSub}>
                Payable to {upiInfo.payee_name}
              </Text>
            </View>

            <Text style={styles.stepHead}>1. Pay via any UPI app</Text>

            <View style={styles.appGrid}>
              <UpiAppBtn testID="pay-gpay" label="GPay" color="#4285F4" letter="G"
                onPress={() => openApp(upiInfo.gpay_url, "GPay")} />
              <UpiAppBtn testID="pay-phonepe" label="PhonePe" color="#5F259F" letter="P"
                onPress={() => openApp(upiInfo.phonepe_url, "PhonePe")} />
              <UpiAppBtn testID="pay-paytm" label="Paytm" color="#00BAF2" letter="P"
                onPress={() => openApp(upiInfo.paytm_url, "Paytm")} />
              <UpiAppBtn testID="pay-any" label="Other UPI" color={COLORS.brand} letter="U"
                onPress={() => openApp(upiInfo.upi_url, "UPI")} />
            </View>

            <Text style={styles.orText}>— OR SCAN THE QR —</Text>

            <View style={styles.qrCard}>
              <Text style={styles.qrLabel}>SCAN TO PAY</Text>
              <View style={styles.qrBox}>
                <Image
                  source={{ uri: qrUrl }}
                  style={{ width: 220, height: 220 }}
                  resizeMode="contain"
                  testID="upi-qr-image"
                />
              </View>
              <Pressable onPress={copyVpa} style={styles.vpaBtn} testID="copy-vpa-btn">
                <Text style={styles.vpaText}>{upiInfo.vpa}</Text>
                <Ionicons name={copied ? "checkmark" : "copy-outline"} size={16} color={COLORS.brand} />
              </Pressable>
              <Text style={styles.qrSub}>{upiInfo.payee_name}</Text>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.brand} />
              <Text style={styles.infoText}>
                After paying, come back to this screen and tap{" "}
                <Text style={{ fontWeight: "700", color: COLORS.brand }}>I have paid</Text> to save your receipt.
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.confirmCard}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={32} color={COLORS.onBrand} />
              </View>
              <Text style={styles.confirmTitle}>Confirm Payment</Text>
              <Text style={styles.confirmSub}>
                Enter the 12-digit UPI reference number from your bank SMS or UPI app.
                Your payment will be verified automatically once ICICI Payment Gateway is integrated.
              </Text>
            </View>

            <Text style={styles.inputLabel}>UPI REFERENCE NUMBER</Text>
            <TextInput
              testID="ref-no-input"
              value={refNo}
              onChangeText={setRefNo}
              placeholder="e.g. 501234567890"
              placeholderTextColor={COLORS.muted}
              style={styles.input}
              keyboardType="number-pad"
              maxLength={20}
              returnKeyType="done"
            />
            <Text style={styles.hint}>
              This screen is temporary. Once ICICI Gateway is enabled, the transaction will be verified automatically.
            </Text>

            <Pressable
              testID="not-yet-btn"
              onPress={() => setStep("pay")}
              style={styles.linkBtn}
            >
              <Ionicons name="arrow-back" size={14} color={COLORS.muted} />
              <Text style={styles.linkBtnText}>I haven&apos;t paid yet, take me back</Text>
            </Pressable>
          </>
        )}

        <View style={{ height: 40 }} />
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ opened: 0, closed: 0 }}>
  <View style={styles.footer}>
    <Pressable
      style={styles.payBtn}
      disabled={processing}
      onPress={
        step === "pay"
          ? () => setStep("confirm")
          : confirmPayment
      }
    >
      {processing ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.payBtnText}>
          {step === "pay"
            ? "I HAVE PAID"
            : "CONFIRM PAYMENT"}
        </Text>
      )}
    </Pressable>
  </View>
</KeyboardStickyView>

     </View>
  );
}

type UpiAppBtnProps = {
  label: string;
  color: string;
  letter: string;
  onPress: () => void;
  testID: string;
};

function UpiAppBtn({
  label,
  color,
  letter,
  onPress,
  testID,
}: UpiAppBtnProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.appBtn,
        pressed && { opacity: 0.85 },
      ]}
    >
      <View
        style={[
          styles.appLogo,
          { backgroundColor: color },
        ]}
      >
        <Text style={styles.appLetter}>
          {letter}
        </Text>
      </View>

      <Text style={styles.appLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, backgroundColor: COLORS.surface, justifyContent: "center", alignItems: "center" },
  headerGrad: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: SPACING.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { fontFamily: FONTS.serif, color: COLORS.onSurface, fontSize: 22 },
  scroll: { padding: SPACING.xl, paddingBottom: SPACING.xl },

  amountCard: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.lg, padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.brand, alignItems: "center" },
  amountLabel: { color: COLORS.muted, fontSize: 11, letterSpacing: 2, fontFamily: FONTS.sans },
  amountBig: { fontFamily: FONTS.serif, color: COLORS.brand, fontSize: 52, marginTop: 4 },
  amountSub: { color: COLORS.onSurfaceTertiary, fontSize: 12, marginTop: 4, fontFamily: FONTS.sans },

  stepHead: { fontFamily: FONTS.serif, color: COLORS.onSurface, fontSize: 16, marginTop: SPACING.xl, marginBottom: SPACING.md },
  appGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md },
  appBtn: { width: "47%", height: 84, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border, flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.md, gap: SPACING.md },
  appLogo: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  appLetter: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", fontFamily: FONTS.serif },
  appLabel: { color: COLORS.onSurface, fontSize: 14, fontFamily: FONTS.sans, fontWeight: "600" },

  orText: { textAlign: "center", color: COLORS.muted, fontSize: 11, letterSpacing: 2, marginTop: SPACING.xl, fontFamily: FONTS.sans },
  qrCard: { marginTop: SPACING.md, backgroundColor: "#FFFFFF", borderRadius: RADIUS.lg, padding: SPACING.xl, borderWidth: 2, borderColor: COLORS.brand, alignItems: "center" },
  qrLabel: { color: "#666", fontSize: 11, letterSpacing: 3, fontFamily: FONTS.sans, marginBottom: SPACING.md },
  qrBox: { width: 220, height: 220, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" },
  vpaBtn: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginTop: SPACING.md, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.brand, backgroundColor: COLORS.brandTint },
  vpaText: { fontFamily: FONTS.serif, color: COLORS.brand, fontSize: 15, letterSpacing: 0.5 },
  qrSub: { color: "#333", fontSize: 11, marginTop: 8, fontFamily: FONTS.sans, fontWeight: "600" },

  infoBox: { flexDirection: "row", gap: SPACING.md, backgroundColor: COLORS.brandTint, borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.xl, borderWidth: 1, borderColor: COLORS.brand },
  infoText: { flex: 1, color: COLORS.onSurfaceTertiary, fontSize: 12, fontFamily: FONTS.sans, lineHeight: 18 },

  confirmCard: { alignItems: "center", padding: SPACING.xl },
  checkCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.brand, justifyContent: "center", alignItems: "center" },
  confirmTitle: { fontFamily: FONTS.serif, color: COLORS.onSurface, fontSize: 22, marginTop: SPACING.md, textAlign: "center" },
  confirmSub: { color: COLORS.muted, fontSize: 13, marginTop: 6, fontFamily: FONTS.sans, textAlign: "center", lineHeight: 20 },
  inputLabel: { color: COLORS.muted, fontSize: 11, letterSpacing: 2, fontFamily: FONTS.sans, marginBottom: SPACING.sm },
  input: { height: 52, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary, color: COLORS.onSurface, fontSize: 16, paddingHorizontal: SPACING.lg, fontFamily: FONTS.sans, letterSpacing: 1 },
  hint: { color: COLORS.muted, fontSize: 11, marginTop: 6, fontFamily: FONTS.sans, fontStyle: "italic" },

  linkBtn: { flexDirection: "row", alignSelf: "center", alignItems: "center", gap: 6, marginTop: SPACING.xl },
  linkBtnText: { color: COLORS.muted, fontSize: 12, fontFamily: FONTS.sans },

  footer: { backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: SPACING.xl, paddingTop: SPACING.md },
  payBtn: { height: 56, borderRadius: RADIUS.md, backgroundColor: COLORS.brand, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: SPACING.sm },
  payBtnText: { color: COLORS.onBrand, fontSize: 15, fontWeight: "700", fontFamily: FONTS.sans, letterSpacing: 0.3 },
});
