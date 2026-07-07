import { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput,
  ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { COLORS, SPACING, RADIUS, FONTS, BLOCKS, API } from "@/src/theme";

type PayEntry = { block: string; flat_no: string; amount: string };

export default function Corporate() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [payer, setPayer] = useState<any>(null);
  const [showCoveredFlats, setShowCoveredFlats] = useState(true);

  // Add-flat state (post login)
  const [addBlock, setAddBlock] = useState("A");
  const [addFlatNo, setAddFlatNo] = useState("");

  // Payment entries
  const [entries, setEntries] = useState<PayEntry[]>([{ block: "A", flat_no: "", amount: "" }]);
  const [txnRef, setTxnRef] = useState("");
  const [payMethod, setPayMethod] = useState<"txn" | "upi">("txn");
  const [receipts, setReceipts] = useState<any[] | null>(null);

  // Conveyance + Gate Pass state (per-flat, one at a time)
  const [cgBlock, setCgBlock] = useState("A");
  const [cgFlatNo, setCgFlatNo] = useState("");
  const [cgTxnRef, setCgTxnRef] = useState("");
  const [cgReceiptNo, setCgReceiptNo] = useState<string | null>(null);
  const [cgGatePass, setCgGatePass] = useState<any>(null);
  const [cgLoading, setCgLoading] = useState(false);

  const doRegister = async () => {
    if (!name.trim() || pin.trim().length < 4) {
      return Alert.alert("Invalid", "Enter a name and a PIN with at least 4 digits.");
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      return Alert.alert("Valid Email Required", "Enter an email for PIN recovery.");
    }
    setLoading(true);
    try {
      const r = await fetch(`${API}/corporate/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), pin: pin.trim(), email: email.trim(), flats: [] }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Registration failed");
      Alert.alert("Registered", "You can now log in with your name and PIN.");
      setAuthMode("login");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setLoading(false); }
  };

  const doLogin = async () => {
    if (!name.trim() || !pin.trim()) return Alert.alert("Invalid", "Enter your name and PIN.");
    setLoading(true);
    try {
      const r = await fetch(`${API}/corporate/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), pin: pin.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Login failed");
      setPayer(d.payer);
      const initialEntries: PayEntry[] = (d.payer.flats || []).map((f: any) => ({
        block: f.block, flat_no: f.flat_no, amount: "",
      }));
      setEntries(initialEntries.length ? initialEntries : [{ block: "A", flat_no: "", amount: "" }]);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setLoading(false); }
  };

  const addFlatToPayer = async () => {
    if (!addFlatNo.trim() || !payer) return Alert.alert("Invalid", "Enter a flat number.");
    setLoading(true);
    try {
      const r = await fetch(
        `${API}/corporate/flats/add?payer_id=${payer.id}&block=${addBlock}&flat_no=${encodeURIComponent(addFlatNo.trim())}&pin=${encodeURIComponent(pin.trim())}`,
        { method: "POST" }
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Failed");
      Alert.alert("Added", `${addBlock}-${addFlatNo} added to your covered flats.`);
      setPayer((prev: any) => prev ? {
        ...prev,
        flats: [...(prev.flats || []), { block: addBlock, flat_no: addFlatNo.trim(), registered: true, dues: null }],
      } : prev);
      setAddFlatNo("");
      setEntries(prev => [...prev, { block: addBlock, flat_no: addFlatNo.trim(), amount: "" }]);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setLoading(false); }
  };

  const updateEntry = (idx: number, field: keyof PayEntry, value: string) => {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const addEntryRow = () => setEntries(prev => [...prev, { block: "A", flat_no: "", amount: "" }]);
  const removeEntryRow = (idx: number) => setEntries(prev => prev.filter((_, i) => i !== idx));
  const selectFlatForPayment = (flat: any) => {
    const due = flat.dues?.total_due;
    setEntries(prev => {
      const amount = due && due > 0 ? String(due) : "";
      if (prev.length === 1 && !prev[0].flat_no.trim() && !prev[0].amount.trim()) {
        return [{ block: flat.block, flat_no: flat.flat_no, amount }];
      }
      if (prev.some(e => e.block === flat.block && e.flat_no === flat.flat_no)) return prev;
      return [...prev, { block: flat.block, flat_no: flat.flat_no, amount }];
    });
  };

  const totalAmount = entries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const submitPayment = async () => {
    const clean = entries.filter(e => e.flat_no.trim() && parseFloat(e.amount) > 0);
    if (clean.length === 0) return Alert.alert("Invalid", "Enter at least one flat with an amount.");
    if (!txnRef.trim()) {
      return Alert.alert("Reference Required", "Enter the UPI reference number or bank transaction number.");
    }
    setLoading(true);
    try {
      const r = await fetch(`${API}/corporate/pay`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payer_id: payer.id,
          entries: clean.map(e => ({ block: e.block, flat_no: e.flat_no.trim(), amount: parseFloat(e.amount) })),
          txn_ref: txnRef.trim(),
          upi_id: payMethod === "upi" ? "corporate-upi" : "",
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        const detail = d.detail;
        const msg = typeof detail === "object" ? (detail.errors || []).join("\n") : (detail || "Payment failed");
        throw new Error(msg);
      }
      setReceipts(d.receipts);
      Alert.alert("Payment Recorded", `₹${d.total_paid.toLocaleString("en-IN")} distributed across ${d.receipts.length} flat(s). The committee will verify shortly.`);
    } catch (e: any) {
      Alert.alert("Could not process payment", e.message);
    } finally { setLoading(false); }
  };

  const payConveyanceForFlat = async () => {
    if (!cgFlatNo.trim() || !payer) return Alert.alert("Invalid", "Enter a flat number.");
    if (!cgTxnRef.trim()) return Alert.alert("Reference Required", "Enter the UPI reference number or bank transaction number.");
    setCgLoading(true);
    try {
      const r = await fetch(`${API}/corporate/pay`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payer_id: payer.id,
          entries: [{ block: cgBlock, flat_no: cgFlatNo.trim(), amount: 250, purpose: "conveyance" }],
          txn_ref: cgTxnRef.trim(),
          upi_id: "",
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        const detail = d.detail;
        const msg = typeof detail === "object" ? (detail.errors || []).join("\n") : (detail || "Payment failed");
        throw new Error(msg);
      }
      setCgReceiptNo(d.receipts[0].receipt_no);
      setCgGatePass(null);
      Alert.alert("Conveyance Paid", `Receipt ${d.receipts[0].receipt_no} for ${cgBlock}-${cgFlatNo}. You can now request a gate pass.`);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setCgLoading(false); }
  };

  const requestGatePassForFlat = async () => {
    if (!cgReceiptNo || !payer) return;
    setCgLoading(true);
    try {
      const r = await fetch(`${API}/gatepass/request`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          block: cgBlock, flat_no: cgFlatNo.trim(),
          conveyance_receipt_no: cgReceiptNo,
          requested_by: "corporate", corporate_payer_id: payer.id,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Request failed");
      setCgGatePass(d.gate_pass);
      Alert.alert("Gate Pass Requested", "Sent to the committee for approval. Share the approved pass with the resident once ready.");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setCgLoading(false); }
  };

  // ---------- AUTH SCREEN ----------
  if (!payer) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#1a1508", "#0A0A0A"]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <View style={styles.headerRow}>
            <Pressable testID="corp-back-btn" onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color={COLORS.brand} />
            </Pressable>
            <Text style={styles.headerTitle}>Corporate Payer</Text>
            <View style={{ width: 40 }} />
          </View>
          <KeyboardAwareScrollView contentContainerStyle={styles.scroll} bottomOffset={60}>
            <Text style={styles.heading}>{authMode === "login" ? "Corporate Login" : "Register as Corporate Payer"}</Text>
            <Text style={styles.subheading}>
              {authMode === "login"
                ? "For bulk payers covering multiple flats (e.g. management companies)"
                : "Create a login for your organization to pay dues across your flats"}
            </Text>

            <Text style={styles.label}>Organization Name</Text>
            <TextInput
              testID="corp-name-input"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Blooming Dale School"
              placeholderTextColor={COLORS.muted}
              style={styles.input}
            />

            <Text style={styles.label}>PIN</Text>
            <TextInput
              testID="corp-pin-input"
              value={pin}
              onChangeText={setPin}
              placeholder="Minimum 4 digits"
              placeholderTextColor={COLORS.muted}
              style={styles.input}
              secureTextEntry
              keyboardType="number-pad"
            />

            {authMode === "register" && (
              <>
                <Text style={styles.label}>Recovery Email</Text>
                <TextInput
                  testID="corp-email-input"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="accounts@example.com"
                  placeholderTextColor={COLORS.muted}
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Text style={styles.hint}>Used if your organization needs committee help to reset the PIN.</Text>
              </>
            )}

            <Pressable
              testID={authMode === "login" ? "corp-login-btn" : "corp-register-btn"}
              onPress={authMode === "login" ? doLogin : doRegister}
              style={styles.primaryBtn}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color={COLORS.onBrand} /> : (
                <Text style={styles.primaryBtnText}>{authMode === "login" ? "Login" : "Register"}</Text>
              )}
            </Pressable>

            <Pressable
              testID="corp-switch-mode"
              onPress={() => setAuthMode(m => m === "login" ? "register" : "login")}
              style={{ marginTop: SPACING.lg, alignSelf: "center" }}
            >
              <Text style={styles.link}>
                {authMode === "login" ? "New organization? Register" : "Already registered? Login"}
              </Text>
            </Pressable>
          </KeyboardAwareScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ---------- PAYMENT SCREEN ----------
  return (
    <View style={styles.container}>
      <LinearGradient colors={["#1a1508", "#0A0A0A"]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.headerRow}>
          <Pressable testID="corp-back-btn2" onPress={() => setPayer(null)} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={COLORS.brand} />
          </Pressable>
          <Text style={styles.headerTitle}>{payer.name}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Pressable
            testID="covered-flats-toggle"
            onPress={() => setShowCoveredFlats(v => !v)}
            style={styles.sectionHeaderRow}
          >
            <Text style={[styles.sectionLabel, { marginTop: 0, marginBottom: 0 }]}>COVERED FLATS ({payer.flats.length})</Text>
            <Ionicons name={showCoveredFlats ? "chevron-up" : "chevron-down"} size={18} color={COLORS.brand} />
          </Pressable>
          {showCoveredFlats && payer.flats.map((f: any, i: number) => (
            <Pressable key={i} onPress={() => selectFlatForPayment(f)} style={styles.flatChip}>
              <Text style={styles.flatChipText}>
                {f.block}-{f.flat_no} {f.registered ? "" : "(not registered yet)"}
              </Text>
              {f.registered && f.dues && (
                <Text style={styles.flatChipDue}>
                  {f.dues.has_any_due ? `Due ₹${f.dues.total_due.toLocaleString("en-IN")}` : "Clear"}
                </Text>
              )}
            </Pressable>
          ))}

          <View style={styles.addFlatRow}>
            <View style={{ flexDirection: "row", gap: 4 }}>
              {BLOCKS.map(b => (
                <Pressable key={b} testID={`corp-add-block-${b}`} onPress={() => setAddBlock(b)} style={[styles.miniBlockPill, addBlock === b && styles.miniBlockPillActive]}>
                  <Text style={[styles.miniBlockText, addBlock === b && styles.miniBlockTextActive]}>{b}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              testID="corp-add-flat-input"
              value={addFlatNo}
              onChangeText={setAddFlatNo}
              placeholder="Flat no"
              placeholderTextColor={COLORS.muted}
              style={[styles.input, { flex: 1, height: 40 }]}
            />
            <Pressable testID="corp-add-flat-btn" onPress={addFlatToPayer} style={styles.addBtn}>
              <Ionicons name="add" size={18} color={COLORS.onBrand} />
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>CONVEYANCE & GATE PASS</Text>
          <Text style={styles.hint}>Pay the one-time conveyance charge for a covered flat, then request a gate pass for its resident.</Text>
          <View style={styles.formCardCg}>
            <View style={{ flexDirection: "row", gap: SPACING.sm }}>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {BLOCKS.map(b => (
                  <Pressable key={b} testID={`cg-block-${b}`} onPress={() => { setCgBlock(b); setCgReceiptNo(null); setCgGatePass(null); }} style={[styles.miniBlockPill, cgBlock === b && styles.miniBlockPillActive]}>
                    <Text style={[styles.miniBlockText, cgBlock === b && styles.miniBlockTextActive]}>{b}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                testID="cg-flat-input"
                value={cgFlatNo}
                onChangeText={(v) => { setCgFlatNo(v); setCgReceiptNo(null); setCgGatePass(null); }}
                placeholder="Flat no"
                placeholderTextColor={COLORS.muted}
                style={[styles.input, { flex: 1, height: 40 }]}
              />
            </View>

            {!cgReceiptNo ? (
              <>
                <TextInput
                  testID="cg-txn-input"
                  value={cgTxnRef}
                  onChangeText={setCgTxnRef}
                  placeholder="UPI / bank reference no."
                  placeholderTextColor={COLORS.muted}
                  style={[styles.input, { marginTop: SPACING.md }]}
                />
                <Pressable testID="cg-pay-btn" onPress={payConveyanceForFlat} disabled={cgLoading || !cgTxnRef.trim()} style={[styles.primaryBtn, { marginTop: SPACING.md }, !cgTxnRef.trim() && { opacity: 0.5 }]}>
                  {cgLoading ? <ActivityIndicator color={COLORS.onBrand} /> : <Text style={styles.primaryBtnText}>Pay ₹250 Conveyance</Text>}
                </Pressable>
              </>
            ) : cgGatePass ? (
              <View style={styles.cgStatusBox}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.cgStatusText}>Gate pass requested — status: {cgGatePass.status}</Text>
              </View>
            ) : (
              <Pressable testID="cg-request-pass-btn" onPress={requestGatePassForFlat} disabled={cgLoading} style={[styles.primaryBtn, { marginTop: SPACING.md, backgroundColor: COLORS.brand }]}>
                {cgLoading ? <ActivityIndicator color={COLORS.onBrand} /> : <Text style={styles.primaryBtnText}>Request Gate Pass</Text>}
              </Pressable>
            )}
          </View>

          <Text style={styles.sectionLabel}>PAYMENT ENTRIES</Text>
          <Text style={styles.hint}>Enter the amount to pay for each flat. It&apos;s applied against that flat&apos;s oldest pending months first.</Text>

          {entries.map((e, idx) => (
            <View key={idx} style={styles.entryRow} testID={`corp-entry-${idx}`}>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {BLOCKS.map(b => (
                  <Pressable key={b} onPress={() => updateEntry(idx, "block", b)} style={[styles.miniBlockPill, e.block === b && styles.miniBlockPillActive]}>
                    <Text style={[styles.miniBlockText, e.block === b && styles.miniBlockTextActive]}>{b}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                testID={`corp-entry-flat-${idx}`}
                value={e.flat_no}
                onChangeText={v => updateEntry(idx, "flat_no", v)}
                placeholder="Flat"
                placeholderTextColor={COLORS.muted}
                style={[styles.input, { flex: 1, height: 40 }]}
              />
              <TextInput
                testID={`corp-entry-amount-${idx}`}
                value={e.amount}
                onChangeText={v => updateEntry(idx, "amount", v)}
                placeholder="₹"
                placeholderTextColor={COLORS.muted}
                keyboardType="decimal-pad"
                style={[styles.input, { width: 90, height: 40 }]}
              />
              <Pressable testID={`corp-remove-entry-${idx}`} onPress={() => removeEntryRow(idx)} style={styles.removeBtn}>
                <Ionicons name="close" size={16} color={COLORS.error} />
              </Pressable>
            </View>
          ))}

          <Pressable testID="corp-add-entry-btn" onPress={addEntryRow} style={styles.addRowBtn}>
            <Ionicons name="add-circle-outline" size={16} color={COLORS.brand} />
            <Text style={styles.addRowText}>Add another flat</Text>
          </Pressable>

          <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
          <View style={styles.segment}>
            <Pressable testID="corp-method-txn" onPress={() => setPayMethod("txn")} style={[styles.segBtn, payMethod === "txn" && styles.segBtnActive]}>
              <Text style={[styles.segText, payMethod === "txn" && styles.segTextActive]}>Transaction No.</Text>
            </Pressable>
            <Pressable testID="corp-method-upi" onPress={() => setPayMethod("upi")} style={[styles.segBtn, payMethod === "upi" && styles.segBtnActive]}>
              <Text style={[styles.segText, payMethod === "upi" && styles.segTextActive]}>UPI</Text>
            </Pressable>
          </View>

          <TextInput
            testID="corp-txn-input"
            value={txnRef}
            onChangeText={setTxnRef}
            placeholder={payMethod === "txn" ? "Bank transaction reference number" : "UPI reference number"}
            placeholderTextColor={COLORS.muted}
            style={[styles.input, { marginTop: SPACING.md }]}
          />
          {payMethod === "upi" && (
            <Text style={styles.hint}>Pay via UPI to the society&apos;s VPA as usual, then enter the UPI reference here before submitting.</Text>
          )}

          <View style={styles.totalCard}>
            <Text style={styles.totalCardLabel}>TOTAL TO PAY</Text>
            <Text style={styles.totalCardAmt}>₹{totalAmount.toLocaleString("en-IN")}</Text>
          </View>

          {receipts && (
            <View style={styles.receiptsBox}>
              <Text style={styles.sectionLabel}>LAST PAYMENT — RECEIPTS</Text>
              {receipts.map((r: any) => (
                <Text key={r.receipt_no} style={styles.receiptLine}>
                  {r.receipt_no} · {r.block}-{r.flat_no} · ₹{r.total_amount.toLocaleString("en-IN")}
                </Text>
              ))}
            </View>
          )}

          <Pressable testID="corp-submit-pay-btn" onPress={submitPayment} style={[styles.primaryBtn, (!txnRef.trim() || totalAmount <= 0) && { opacity: 0.5 }]} disabled={loading || totalAmount <= 0 || !txnRef.trim()}>
            {loading ? <ActivityIndicator color={COLORS.onBrand} /> : (
              <Text style={styles.primaryBtnText}>Pay ₹{totalAmount.toLocaleString("en-IN")}</Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.md },
  iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { fontFamily: FONTS.serif, color: COLORS.onSurface, fontSize: 20 },
  scroll: { padding: SPACING.xl, paddingBottom: 80 },
  heading: { fontFamily: FONTS.serif, color: COLORS.onSurface, fontSize: 22, textAlign: "center", marginTop: SPACING.md },
  subheading: { fontFamily: FONTS.sans, color: COLORS.muted, fontSize: 13, textAlign: "center", marginTop: 4, marginBottom: SPACING.lg },
  label: { color: COLORS.onSurfaceTertiary, fontSize: 12, letterSpacing: 1.2, marginTop: SPACING.lg, marginBottom: SPACING.sm, fontFamily: FONTS.sans, textTransform: "uppercase" },
  input: { height: 52, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary, color: COLORS.onSurface, fontSize: 16, paddingHorizontal: SPACING.lg, fontFamily: FONTS.sans },
  primaryBtn: { marginTop: SPACING.xl, height: 54, borderRadius: RADIUS.md, backgroundColor: COLORS.brand, justifyContent: "center", alignItems: "center" },
  primaryBtnText: { color: COLORS.onBrand, fontWeight: "700", fontSize: 16, fontFamily: FONTS.sans },
  link: { color: COLORS.brand, fontSize: 13, fontFamily: FONTS.sans },
  sectionLabel: { color: COLORS.muted, fontSize: 11, letterSpacing: 2, fontFamily: FONTS.sans, marginTop: SPACING.xl, marginBottom: SPACING.sm },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: SPACING.xl, marginBottom: SPACING.sm },
  hint: { color: COLORS.muted, fontSize: 12, fontFamily: FONTS.sans, fontStyle: "italic", marginBottom: SPACING.md },
  flatChip: { flexDirection: "row", justifyContent: "space-between", padding: SPACING.md, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm },
  flatChipText: { color: COLORS.onSurface, fontFamily: FONTS.sans, fontSize: 13 },
  flatChipMeta: { color: COLORS.muted, fontFamily: FONTS.sans, fontSize: 11, marginTop: 2 },
  flatChipDue: { color: COLORS.brand, fontFamily: FONTS.serif, fontSize: 13 },
  addFlatRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginTop: SPACING.sm },
  addBtn: { width: 40, height: 40, borderRadius: RADIUS.sm, backgroundColor: COLORS.brand, justifyContent: "center", alignItems: "center" },
  miniBlockPill: { width: 30, height: 40, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary, justifyContent: "center", alignItems: "center" },
  miniBlockPillActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  miniBlockText: { color: COLORS.onSurface, fontFamily: FONTS.serif, fontSize: 13 },
  miniBlockTextActive: { color: COLORS.onBrand, fontWeight: "700" },
  entryRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginBottom: SPACING.sm },
  removeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.errorBg },
  addRowBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center", marginTop: SPACING.sm, padding: SPACING.sm },
  addRowText: { color: COLORS.brand, fontFamily: FONTS.sans, fontSize: 13 },
  segment: { flexDirection: "row", backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, padding: 4, borderWidth: 1, borderColor: COLORS.border },
  segBtn: { flex: 1, height: 44, borderRadius: RADIUS.sm, justifyContent: "center", alignItems: "center" },
  segBtnActive: { backgroundColor: COLORS.brand },
  segText: { color: COLORS.onSurfaceTertiary, fontSize: 13, fontFamily: FONTS.sans },
  segTextActive: { color: COLORS.onBrand, fontWeight: "700" },
  totalCard: { marginTop: SPACING.xl, padding: SPACING.xl, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.brand, alignItems: "center" },
  totalCardLabel: { color: COLORS.muted, fontSize: 11, letterSpacing: 2, fontFamily: FONTS.sans },
  totalCardAmt: { fontFamily: FONTS.serif, color: COLORS.brand, fontSize: 36, marginTop: 4 },
  receiptsBox: { marginTop: SPACING.md },
  receiptLine: { color: COLORS.onSurfaceTertiary, fontSize: 12, fontFamily: FONTS.sans, marginBottom: 4 },
  formCardCg: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg },
  cgStatusBox: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginTop: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.successBg, borderRadius: RADIUS.md },
  cgStatusText: { color: COLORS.success, fontSize: 13, fontFamily: FONTS.sans, flex: 1 },
});
