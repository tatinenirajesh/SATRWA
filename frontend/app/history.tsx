import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, FlatList } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, FONTS, API } from "@/src/theme";
import { getSession } from "@/src/services/session";

export default function History() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const s = await getSession();
      if (!s) { router.replace("/"); return; }
      const r = await fetch(`${API}/history/${s.block}/${s.flat_no}`);
      const d = await r.json();
      const combined = [
        ...(d.maintenance || []).map((x: any) => ({ ...x, kind: "maintenance" })),
        ...(d.bookings || []).map((x: any) => ({ ...x, kind: x.type })),
      ].sort((a, b) => (a.paid_at < b.paid_at ? 1 : -1));
      setItems(combined);
      setLoading(false);
    })();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#1a1508", "#0A0A0A"]} style={styles.headerGrad}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerRow}>
            <Pressable testID="back-btn" onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color={COLORS.brand} />
            </Pressable>
            <Text style={styles.headerTitle}>Payment History</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.brand} size="large" /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={48} color={COLORS.muted} />
          <Text style={styles.emptyText}>No transactions yet</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: SPACING.xl, gap: SPACING.md }}
          data={items}
          keyExtractor={(item) => item.receipt_no}
          renderItem={({ item }) => {
            const dt = new Date(item.paid_at);
            const label = item.kind === "maintenance" ? "Maintenance" : item.kind === "gym" ? "Gymnasium" : "Swimming Pool";
            const icon = item.kind === "maintenance" ? "receipt-outline" : item.kind === "gym" ? "barbell-outline" : "water-outline";
            return (
              <Pressable
                testID={`history-row-${item.receipt_no}`}
                onPress={() => router.push({ pathname: "/receipt", params: { no: item.receipt_no } })}
                style={styles.row}
              >
                <View style={styles.rowIcon}>
                  <Ionicons name={icon as any} size={20} color={COLORS.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{label}</Text>
                  <Text style={styles.rowSub}>{item.receipt_no} · {dt.toLocaleDateString("en-IN")}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.rowAmt}>₹{Number(item.total_amount).toLocaleString("en-IN")}</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: SPACING.md },
  headerGrad: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: SPACING.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { fontFamily: FONTS.serif, color: COLORS.onSurface, fontSize: 22 },
  emptyText: { color: COLORS.muted, fontSize: 14, fontFamily: FONTS.sans },
  row: { flexDirection: "row", alignItems: "center", padding: SPACING.lg, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md },
  rowIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.brandTint, borderWidth: 1, borderColor: COLORS.brand, justifyContent: "center", alignItems: "center" },
  rowTitle: { color: COLORS.onSurface, fontSize: 15, fontFamily: FONTS.serif },
  rowSub: { color: COLORS.muted, fontSize: 11, marginTop: 2, fontFamily: FONTS.sans, letterSpacing: 1 },
  rowAmt: { fontFamily: FONTS.serif, color: COLORS.brand, fontSize: 16 },
});
