import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, FONTS, API } from "@/src/theme";

export default function Receipt() {
  const router = useRouter();
  const { no } = useLocalSearchParams<{ no: string }>();
  const [rec, setRec] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/receipt/${no}`);
        const d = await r.json();
        setRec(d);
      } finally { setLoading(false); }
    })();
  }, [no]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={COLORS.brand} size="large" /></View>;
  }
  if (!rec) {
    return <View style={styles.center}><Text style={{ color: COLORS.error }}>Receipt not found</Text></View>;
  }

  const dt = new Date(rec.paid_at);
  const typeLabel = rec.type === "maintenance" ? "Maintenance" : rec.type === "gym" ? "Gymnasium" : "Swimming Pool";

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#1a1508", "#0A0A0A"]} style={styles.headerGrad}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerRow}>
            <Pressable testID="back-btn" onPress={() => router.replace("/home")} style={styles.iconBtn}>
              <Ionicons name="close" size={22} color={COLORS.brand} />
            </Pressable>
            <Text style={styles.headerTitle}>Receipt</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.successHero}>
          <View style={styles.tickWrap}>
            <Ionicons name="checkmark" size={40} color={COLORS.onBrand} />
          </View>
          <Text style={styles.successTitle}>Payment Successful</Text>
          <Text style={styles.successSub}>Thank you for your prompt payment</Text>
        </View>

        <View style={styles.receiptCard} testID="receipt-card">
          <View style={styles.brandTop}>
            <Text style={styles.brandName}>SATRWA</Text>
            <Text style={styles.brandFull}>Sri Anjaneya Township</Text>
            <View style={styles.brandLine} />
          </View>

          <View style={styles.receiptTopRow}>
            <View>
              <Text style={styles.smallLabel}>RECEIPT NO</Text>
              <Text style={styles.recNo} testID="receipt-number">{rec.receipt_no}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.smallLabel}>DATE</Text>
              <Text style={styles.recDate}>{dt.toLocaleDateString("en-IN")}</Text>
            </View>
          </View>

          <View style={styles.dotDivider} />

          <Row label="Type" value={typeLabel} />
          <Row label="Block / Flat" value={`${rec.block} · ${rec.flat_no}`} />
          {!!rec.owner_name && <Row label="Owner" value={rec.owner_name} />}
          {rec.type === "maintenance" && (
            <>
              <Row label="Flat Type" value={rec.bhk_type} />
              <Row label="Months Paid" value={`${rec.months_count} × ₹${rec.rate}`} />
              {(rec.months_covered || []).length > 0 && (
                <Row label="Period" value={rec.months_covered.join(", ")} />
              )}
              {rec.conveyance_amount > 0 && (
                <Row label="Conveyance" value={`₹${rec.conveyance_amount}`} />
              )}
            </>
          )}
          {rec.type === "gym" && (
            <>
              <Row label="Members" value={String(rec.members)} />
              <Row label="Rate" value={`₹${rec.rate_per_person} / person`} />
              <Row label="Date" value={rec.booking_date} />
            </>
          )}
          {rec.type === "pool" && (
            <>
              <Row label="Persons" value={String(rec.persons)} />
              <Row label="Date" value={rec.booking_date} />
            </>
          )}
          <Row label="UPI ID" value={rec.upi_id || "—"} />

          <View style={styles.dotDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL PAID</Text>
            <Text style={styles.totalValue}>₹{Number(rec.total_amount).toLocaleString("en-IN")}</Text>
          </View>

          <View style={styles.stamp}>
            <Text style={styles.stampText}>PAID</Text>
          </View>

          <Text style={styles.footNote}>
            This is a computer-generated receipt for {typeLabel} on record.
          </Text>
        </View>

        <Pressable testID="done-btn" onPress={() => router.replace("/home")} style={styles.doneBtn}>
          <Ionicons name="home-outline" size={16} color={COLORS.brand} />
          <Text style={styles.doneText}>Back to Home</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
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
  scroll: { padding: SPACING.xl },
  successHero: { alignItems: "center", marginBottom: SPACING.xl },
  tickWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.brand, justifyContent: "center", alignItems: "center" },
  successTitle: { fontFamily: FONTS.serif, color: COLORS.onSurface, fontSize: 24, marginTop: SPACING.md },
  successSub: { color: COLORS.muted, fontSize: 12, marginTop: 4, fontFamily: FONTS.sans },
  receiptCard: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.brand, padding: SPACING.xl, overflow: "hidden" },
  brandTop: { alignItems: "center", marginBottom: SPACING.lg },
  brandName: { fontFamily: FONTS.serif, color: COLORS.brand, fontSize: 24, letterSpacing: 3 },
  brandFull: { color: COLORS.onSurfaceTertiary, fontSize: 11, letterSpacing: 3, marginTop: 2, fontFamily: FONTS.sans },
  brandLine: { width: 40, height: 1, backgroundColor: COLORS.brand, marginTop: SPACING.sm, opacity: 0.6 },
  receiptTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  smallLabel: { color: COLORS.muted, fontSize: 10, letterSpacing: 2, fontFamily: FONTS.sans },
  recNo: { fontFamily: FONTS.serif, color: COLORS.brand, fontSize: 22, marginTop: 2 },
  recDate: { fontFamily: FONTS.serif, color: COLORS.onSurface, fontSize: 16, marginTop: 2 },
  dotDivider: { borderStyle: "dashed", borderTopWidth: 1, borderColor: COLORS.brandDim, marginVertical: SPACING.lg, opacity: 0.5 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 6, gap: SPACING.md },
  rowLabel: { color: COLORS.muted, fontSize: 12, fontFamily: FONTS.sans, letterSpacing: 1 },
  rowValue: { color: COLORS.onSurface, fontSize: 13, fontFamily: FONTS.sans, textAlign: "right", flex: 1, marginLeft: SPACING.md },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontFamily: FONTS.serif, color: COLORS.onSurface, fontSize: 16, letterSpacing: 1 },
  totalValue: { fontFamily: FONTS.serif, color: COLORS.brand, fontSize: 28 },
  stamp: { alignSelf: "flex-end", marginTop: SPACING.lg, borderWidth: 2, borderColor: COLORS.success, paddingHorizontal: SPACING.md, paddingVertical: 4, borderRadius: 4, transform: [{ rotate: "-8deg" }] },
  stampText: { color: COLORS.success, fontFamily: FONTS.serif, fontSize: 16, letterSpacing: 3, fontWeight: "700" },
  footNote: { color: COLORS.muted, fontSize: 10, textAlign: "center", marginTop: SPACING.xl, fontFamily: FONTS.sans, fontStyle: "italic" },
  doneBtn: { marginTop: SPACING.xl, height: 48, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.brand, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: SPACING.sm },
  doneText: { color: COLORS.brand, fontSize: 14, fontWeight: "700", fontFamily: FONTS.sans },
});
