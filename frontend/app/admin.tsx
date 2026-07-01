import { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert, Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { COLORS, SPACING, RADIUS, FONTS, API } from "@/src/theme";

export default function Admin() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);

  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any>({ maintenance: [], bookings: [], summary: {} });
  const [todayPayments, setTodayPayments] = useState<any>({ maintenance: [], bookings: [], summary: {} });
  const [lateFee, setLateFee] = useState("50");

  const [prefix, setPrefix] = useState("OP");
  const [startNum, setStartNum] = useState("101");
  const [endNum, setEndNum] = useState("200");

  const [tab, setTab] = useState<"today" | "all" | "series" | "settings">("today");

  const verify = async () => {
    if (!pin.trim()) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/admin/verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error("Invalid PIN");
      setAuthed(true);
      loadAll();
    } catch (e: any) {
      Alert.alert("Access Denied", e.message || "Invalid PIN");
    } finally { setLoading(false); }
  };

  const loadAll = async () => {
    const [r1, r2, r3, r4] = await Promise.all([
      fetch(`${API}/admin/series`),
      fetch(`${API}/admin/payments`),
      fetch(`${API}/admin/payments/today`),
      fetch(`${API}/admin/late-fee`),
    ]);
    setSeriesList((await r1.json()).series || []);
    setAllPayments(await r2.json());
    setTodayPayments(await r3.json());
    const lf = await r4.json();
    setLateFee(String(lf.late_fee));
  };

  const addSeries = async () => {
    const s = parseInt(startNum), e = parseInt(endNum);
    if (!prefix.trim() || isNaN(s) || isNaN(e) || e < s) {
      return Alert.alert("Invalid", "Provide prefix and valid start/end range.");
    }
    setLoading(true);
    try {
      const r = await fetch(`${API}/admin/series`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: prefix.trim(), start: s, end: e, pin }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Failed");
      Alert.alert("Added", `New active series ${d.series.prefix}${d.series.start}-${d.series.end}`);
      loadAll();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setLoading(false); }
  };

  const activate = async (series_id: string) => {
    try {
      const r = await fetch(`${API}/admin/series/activate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ series_id, pin }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Failed");
      loadAll();
    } catch (e: any) { Alert.alert("Error", e.message); }
  };

  const saveLateFee = async () => {
    const v = parseInt(lateFee);
    if (isNaN(v) || v < 0) return Alert.alert("Invalid", "Enter a valid amount");
    try {
      const r = await fetch(`${API}/admin/late-fee`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ late_fee: v, pin }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Failed");
      Alert.alert("Saved", `Late fee set to ₹${d.late_fee} per month`);
      loadAll();
    } catch (e: any) { Alert.alert("Error", e.message); }
  };

  const exportAll = () => Linking.openURL(`${API}/admin/export?pin=${encodeURIComponent(pin)}`);
  const exportToday = () => Linking.openURL(`${API}/admin/export/today?pin=${encodeURIComponent(pin)}`);

  if (!authed) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#1a1508", "#0A0A0A"]} style={styles.headerGrad}>
          <SafeAreaView edges={["top"]}>
            <View style={styles.headerRow}>
              <Pressable testID="back-btn" onPress={() => router.back()} style={styles.iconBtn}>
                <Ionicons name="chevron-back" size={22} color={COLORS.brand} />
              </Pressable>
              <Text style={styles.headerTitle}>Committee Admin</Text>
              <View style={{ width: 40 }} />
            </View>
          </SafeAreaView>
        </LinearGradient>
        <KeyboardAwareScrollView contentContainerStyle={{ padding: SPACING.xl }} bottomOffset={40}>
          <View style={styles.pinCard}>
            <Ionicons name="shield-checkmark-outline" size={40} color={COLORS.brand} />
            <Text style={styles.pinTitle}>Admin Access</Text>
            <Text style={styles.pinSub}>Enter your committee PIN to continue</Text>
            <TextInput
              testID="admin-pin-input"
              value={pin}
              onChangeText={setPin}
              placeholder="PIN"
              placeholderTextColor={COLORS.muted}
              secureTextEntry
              keyboardType="number-pad"
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={verify}
            />
            <Pressable testID="admin-verify-btn" onPress={verify} style={styles.primaryBtn} disabled={loading}>
              {loading ? <ActivityIndicator color={COLORS.onBrand} /> : (
                <Text style={styles.primaryBtnText}>Enter</Text>
              )}
            </Pressable>
            <Text style={styles.pinHint}>Default PIN: 1234 (change on backend)</Text>
          </View>
        </KeyboardAwareScrollView>
      </View>
    );
  }

  const active = seriesList.find(s => s.active);
  const todaySummary = todayPayments.summary || {};
  const allSummary = allPayments.summary || {};

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#1a1508", "#0A0A0A"]} style={styles.headerGrad}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerRow}>
            <Pressable testID="back-btn" onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color={COLORS.brand} />
            </Pressable>
            <Text style={styles.headerTitle}>Admin Panel</Text>
            <Pressable testID="refresh-btn" onPress={loadAll} style={styles.iconBtn}>
              <Ionicons name="refresh" size={18} color={COLORS.brand} />
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.tabsScroll}>
        <View style={styles.tabs}>
          <TabBtn label="Today" active={tab === "today"} onPress={() => setTab("today")} testID="today-tab" />
          <TabBtn label="All" active={tab === "all"} onPress={() => setTab("all")} testID="all-tab" />
          <TabBtn label="Series" active={tab === "series"} onPress={() => setTab("series")} testID="series-tab" />
          <TabBtn label="Settings" active={tab === "settings"} onPress={() => setTab("settings")} testID="settings-tab" />
        </View>
      </View>

      <KeyboardAwareScrollView contentContainerStyle={{ padding: SPACING.xl, paddingBottom: 60 }} bottomOffset={40}>
        {tab === "today" && (
          <View testID="today-panel">
            <View style={styles.statsCard}>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>COLLECTED TODAY</Text>
                <Text style={styles.statBig}>₹{Number(todaySummary.grand_total || 0).toLocaleString("en-IN")}</Text>
              </View>
              <View style={styles.statSplit}>
                <View>
                  <Text style={styles.statSubLabel}>Maintenance</Text>
                  <Text style={styles.statSubAmt}>
                    ₹{Number(todaySummary.maintenance_total || 0).toLocaleString("en-IN")}
                  </Text>
                  <Text style={styles.statSubHint}>{todaySummary.maintenance_count || 0} txn</Text>
                </View>
                <View>
                  <Text style={styles.statSubLabel}>Amenity</Text>
                  <Text style={styles.statSubAmt}>
                    ₹{Number(todaySummary.bookings_total || 0).toLocaleString("en-IN")}
                  </Text>
                  <Text style={styles.statSubHint}>{todaySummary.bookings_count || 0} txn</Text>
                </View>
              </View>
            </View>

            <Pressable testID="download-today-btn" onPress={exportToday} style={styles.exportBtn}>
              <Ionicons name="download-outline" size={16} color={COLORS.onBrand} />
              <Text style={styles.exportBtnText}>Download Today&apos;s Excel</Text>
            </Pressable>

            <Text style={styles.sectionLabel}>TODAY&apos;S MAINTENANCE ({todayPayments.maintenance.length})</Text>
            {todayPayments.maintenance.length === 0 && <Text style={styles.emptyText}>No maintenance payments today.</Text>}
            {todayPayments.maintenance.map((p: any) => (
              <PaymentRow key={p.receipt_no} p={p} router={router} kind="maintenance" pin={pin} onChange={loadAll} />
            ))}
            <Text style={styles.sectionLabel}>TODAY&apos;S AMENITY ({todayPayments.bookings.length})</Text>
            {todayPayments.bookings.length === 0 && <Text style={styles.emptyText}>No amenity bookings today.</Text>}
            {todayPayments.bookings.map((p: any) => (
              <PaymentRow key={p.receipt_no} p={p} router={router} kind="amenity" pin={pin} onChange={loadAll} />
            ))}
          </View>
        )}

        {tab === "all" && (
          <View testID="all-panel">
            <View style={styles.statsCard}>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>TOTAL COLLECTED</Text>
                <Text style={styles.statBig}>₹{Number(allSummary.grand_total || 0).toLocaleString("en-IN")}</Text>
                <Text style={styles.statSubHint}>
                  {(allSummary.maintenance_count || 0) + (allSummary.bookings_count || 0)} transactions
                </Text>
              </View>
            </View>

            <Pressable testID="download-all-btn" onPress={exportAll} style={styles.exportBtn}>
              <Ionicons name="download-outline" size={16} color={COLORS.onBrand} />
              <Text style={styles.exportBtnText}>Download All Excel</Text>
            </Pressable>

            <Text style={styles.sectionLabel}>MAINTENANCE ({allPayments.maintenance.length})</Text>
            {allPayments.maintenance.slice(0, 30).map((p: any) => (
              <PaymentRow key={p.receipt_no} p={p} router={router} kind="maintenance" pin={pin} onChange={loadAll} />
            ))}
            <Text style={styles.sectionLabel}>AMENITIES ({allPayments.bookings.length})</Text>
            {allPayments.bookings.slice(0, 30).map((p: any) => (
              <PaymentRow key={p.receipt_no} p={p} router={router} kind="amenity" pin={pin} onChange={loadAll} />
            ))}
          </View>
        )}

        {tab === "series" && (
          <>
            {active && (
              <View style={styles.activeCard} testID="active-series-card">
                <Text style={styles.activeLabel}>ACTIVE SERIES</Text>
                <Text style={styles.activePrefix}>{active.prefix}</Text>
                <Text style={styles.activeRange}>
                  {active.prefix}{String(active.start).padStart(3, "0")} – {active.prefix}{String(active.end).padStart(3, "0")}
                </Text>
                <Text style={styles.activeSub}>Next: {active.prefix}{String(active.current).padStart(3, "0")}</Text>
              </View>
            )}

            <Text style={styles.sectionLabel}>ADD NEW SERIES (FY END)</Text>
            <View style={styles.formCard}>
              <Text style={styles.formLabel}>Prefix</Text>
              <TextInput testID="series-prefix-input" value={prefix} onChangeText={setPrefix} style={styles.input} autoCapitalize="characters" />
              <View style={{ flexDirection: "row", gap: SPACING.md, marginTop: SPACING.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Start</Text>
                  <TextInput testID="series-start-input" value={startNum} onChangeText={setStartNum} keyboardType="number-pad" style={styles.input} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>End</Text>
                  <TextInput testID="series-end-input" value={endNum} onChangeText={setEndNum} keyboardType="number-pad" style={styles.input} />
                </View>
              </View>
              <Pressable testID="add-series-btn" onPress={addSeries} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Add & Activate</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>ALL SERIES</Text>
            {seriesList.map(s => (
              <View key={s.id} style={styles.seriesRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.seriesTitle}>
                    {s.prefix}{String(s.start).padStart(3, "0")} – {s.prefix}{String(s.end).padStart(3, "0")}
                  </Text>
                  <Text style={styles.seriesSub}>
                    Next: {s.prefix}{String(s.current).padStart(3, "0")}
                  </Text>
                </View>
                {s.active ? (
                  <View style={styles.activeChip}>
                    <Text style={styles.activeChipText}>ACTIVE</Text>
                  </View>
                ) : (
                  <Pressable testID={`activate-${s.id}`} onPress={() => activate(s.id)} style={styles.activateBtn}>
                    <Text style={styles.activateBtnText}>Activate</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </>
        )}

        {tab === "settings" && (
          <>
            <Text style={styles.sectionLabel}>LATE FEE (per late month)</Text>
            <View style={styles.formCard}>
              <Text style={styles.formLabel}>Amount in ₹</Text>
              <TextInput
                testID="late-fee-input"
                value={lateFee}
                onChangeText={setLateFee}
                keyboardType="number-pad"
                style={styles.input}
                returnKeyType="done"
              />
              <Text style={styles.pinHint}>
                Applied when a member pays after {15}th of the due month.
              </Text>
              <Pressable testID="save-late-fee-btn" onPress={saveLateFee} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Save Late Fee</Text>
              </Pressable>
            </View>
          </>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

function TabBtn({ label, active, onPress, testID }: { label: string; active: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function PaymentRow({ p, router, kind, pin, onChange }: { p: any; router: any; kind: string; pin: string; onChange: () => void }) {
  const dt = new Date(p.paid_at);
  const verify = async (e: any) => {
    e?.stopPropagation?.();
    try {
      const r = await fetch(`${API}/admin/verify-payment`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipt_no: p.receipt_no, pin, verified: !p.verified }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Failed");
      onChange();
    } catch (e: any) { Alert.alert("Error", e.message); }
  };
  return (
    <Pressable
      testID={`pay-row-${p.receipt_no}`}
      onPress={() => router.push({ pathname: "/receipt", params: { no: p.receipt_no } })}
      style={styles.pRow}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Text style={styles.pTitle}>{p.receipt_no} · {p.block}-{p.flat_no}</Text>
          <View style={[styles.statusChip, p.verified ? styles.statusOk : styles.statusWarn]}>
            <Text style={[styles.statusChipText, { color: p.verified ? COLORS.success : COLORS.warning }]}>
              {p.verified ? "VERIFIED" : "PENDING"}
            </Text>
          </View>
        </View>
        <Text style={styles.pSub} numberOfLines={1}>
          {p.owner_name ? `${p.owner_name} · ` : ""}
          {kind === "maintenance" ? `${p.months_count} mo${p.late_fee_amount > 0 ? ` +₹${p.late_fee_amount} late` : ""}` : `${p.type}${p.members ? ` · ${p.members}p` : ""}${p.persons ? ` · ${p.persons}p` : ""}`}
          {p.upi_ref_no ? ` · Ref ${p.upi_ref_no}` : ""}
          {" · "}{dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Text style={styles.pAmt}>₹{Number(p.total_amount).toLocaleString("en-IN")}</Text>
        <Pressable testID={`verify-${p.receipt_no}`} onPress={verify} style={[styles.verifyBtn, p.verified && { borderColor: COLORS.muted }]}>
          <Text style={[styles.verifyBtnText, p.verified && { color: COLORS.muted }]}>
            {p.verified ? "Undo" : "Verify"}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  headerGrad: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: SPACING.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { fontFamily: FONTS.serif, color: COLORS.onSurface, fontSize: 22 },
  pinCard: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.lg, padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  pinTitle: { fontFamily: FONTS.serif, color: COLORS.onSurface, fontSize: 24, marginTop: SPACING.md },
  pinSub: { color: COLORS.muted, fontSize: 12, marginTop: 4, fontFamily: FONTS.sans, marginBottom: SPACING.xl },
  pinHint: { color: COLORS.muted, fontSize: 11, marginTop: SPACING.md, fontFamily: FONTS.sans, fontStyle: "italic" },
  input: { height: 48, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, color: COLORS.onSurface, fontSize: 16, paddingHorizontal: SPACING.lg, fontFamily: FONTS.sans },
  primaryBtn: { marginTop: SPACING.lg, height: 48, paddingHorizontal: SPACING.xl, borderRadius: RADIUS.md, backgroundColor: COLORS.brand, justifyContent: "center", alignItems: "center", alignSelf: "stretch" },
  primaryBtnText: { color: COLORS.onBrand, fontWeight: "700", fontFamily: FONTS.sans },
  tabsScroll: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.md },
  tabs: { flexDirection: "row", gap: SPACING.sm, backgroundColor: COLORS.surfaceSecondary, padding: 4, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border },
  tab: { flex: 1, height: 34, borderRadius: RADIUS.pill, justifyContent: "center", alignItems: "center" },
  tabActive: { backgroundColor: COLORS.brand },
  tabText: { color: COLORS.onSurfaceTertiary, fontSize: 12, fontFamily: FONTS.sans },
  tabTextActive: { color: COLORS.onBrand, fontWeight: "700" },
  statsCard: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.brand, padding: SPACING.xl, marginBottom: SPACING.lg },
  statCol: { alignItems: "flex-start" },
  statLabel: { color: COLORS.muted, fontSize: 11, letterSpacing: 2, fontFamily: FONTS.sans },
  statBig: { fontFamily: FONTS.serif, color: COLORS.brand, fontSize: 40, marginTop: 4 },
  statSubLabel: { color: COLORS.muted, fontSize: 10, letterSpacing: 1, fontFamily: FONTS.sans },
  statSubAmt: { color: COLORS.onSurface, fontSize: 18, fontFamily: FONTS.serif, marginTop: 2 },
  statSubHint: { color: COLORS.muted, fontSize: 11, marginTop: 2, fontFamily: FONTS.sans },
  statSplit: { flexDirection: "row", justifyContent: "space-between", marginTop: SPACING.lg, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  exportBtn: { height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.brand, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: SPACING.sm },
  exportBtnText: { color: COLORS.onBrand, fontWeight: "700", fontSize: 14, fontFamily: FONTS.sans },
  activeCard: { backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.brand, borderRadius: RADIUS.lg, padding: SPACING.xl, alignItems: "center", marginBottom: SPACING.xl },
  activeLabel: { color: COLORS.muted, fontSize: 11, letterSpacing: 2, fontFamily: FONTS.sans },
  activePrefix: { fontFamily: FONTS.serif, color: COLORS.brand, fontSize: 44, marginTop: 4 },
  activeRange: { color: COLORS.onSurface, fontSize: 15, fontFamily: FONTS.serif, marginTop: 4 },
  activeSub: { color: COLORS.muted, fontSize: 12, marginTop: 4, fontFamily: FONTS.sans },
  sectionLabel: { color: COLORS.muted, fontSize: 11, letterSpacing: 2, fontFamily: FONTS.sans, marginTop: SPACING.xl, marginBottom: SPACING.md },
  emptyText: { color: COLORS.muted, fontSize: 13, fontStyle: "italic", fontFamily: FONTS.sans, textAlign: "center", padding: SPACING.md },
  formCard: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  formLabel: { color: COLORS.muted, fontSize: 11, letterSpacing: 1, fontFamily: FONTS.sans, marginBottom: SPACING.sm },
  seriesRow: { flexDirection: "row", alignItems: "center", padding: SPACING.md, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm },
  seriesTitle: { color: COLORS.onSurface, fontFamily: FONTS.serif, fontSize: 15 },
  seriesSub: { color: COLORS.muted, fontSize: 11, marginTop: 2, fontFamily: FONTS.sans },
  activeChip: { paddingHorizontal: SPACING.md, paddingVertical: 4, borderRadius: RADIUS.pill, backgroundColor: COLORS.successBg },
  activeChipText: { color: COLORS.success, fontSize: 10, letterSpacing: 1, fontWeight: "700" },
  activateBtn: { paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.brand },
  activateBtnText: { color: COLORS.brand, fontSize: 11, fontWeight: "700" },
  pRow: { flexDirection: "row", alignItems: "center", padding: SPACING.md, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm, gap: SPACING.md },
  pTitle: { color: COLORS.onSurface, fontFamily: FONTS.sans, fontSize: 13 },
  pSub: { color: COLORS.muted, fontSize: 11, marginTop: 2, fontFamily: FONTS.sans },
  pAmt: { fontFamily: FONTS.serif, color: COLORS.brand, fontSize: 15 },
  statusChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.pill },
  statusOk: { backgroundColor: COLORS.successBg },
  statusWarn: { backgroundColor: COLORS.warningBg },
  statusChipText: { fontSize: 9, letterSpacing: 1, fontWeight: "700", fontFamily: FONTS.sans },
  verifyBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.brand },
  verifyBtnText: { color: COLORS.brand, fontSize: 10, fontWeight: "700", fontFamily: FONTS.sans, letterSpacing: 0.5 },
});
