import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, FONTS, BLOCKS, API } from "@/src/theme";
import { saveSession, getSession } from "@/src/session";

export default function Login() {
  const router = useRouter();
  const [block, setBlock] = useState("A");
  const [flatNo, setFlatNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [bhk, setBhk] = useState<"2BHK" | "3BHK">("2BHK");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [startMonth, setStartMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    (async () => {
      const s = await getSession();
      if (s) router.replace("/home");
      else setChecking(false);
    })();
  }, []);

  const onLogin = async () => {
    if (!flatNo.trim()) return Alert.alert("Enter Flat No", "Please enter your flat number.");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ block, flat_no: flatNo.trim() }),
      });
      const data = await res.json();
      if (!data.exists) {
        setMode("register");
      } else {
        await saveSession({
          block: data.flat.block, flat_no: data.flat.flat_no,
          bhk_type: data.flat.bhk_type, owner_name: data.flat.owner_name,
          phone: data.flat.phone, start_month: data.flat.start_month,
        });
        router.replace("/home");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Network error");
    } finally { setLoading(false); }
  };

  const onRegister = async () => {
    if (!/^\d{4}-\d{2}$/.test(startMonth)) return Alert.alert("Invalid Start Month", "Use format YYYY-MM (e.g. 2025-01)");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          block, flat_no: flatNo.trim(), bhk_type: bhk,
          owner_name: ownerName.trim(), phone: phone.trim(), start_month: startMonth,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");
      await saveSession({
        block: data.flat.block, flat_no: data.flat.flat_no,
        bhk_type: data.flat.bhk_type, owner_name: data.flat.owner_name,
        phone: data.flat.phone, start_month: data.flat.start_month,
      });
      router.replace("/home");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Network error");
    } finally { setLoading(false); }
  };

  if (checking) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={COLORS.brand} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1a1508", "#0A0A0A", "#0A0A0A"]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.crestWrap}>
              <View style={styles.crestOuter}>
                <View style={styles.crestInner}>
                  <Text style={styles.crestMark}>SATRWA</Text>
                </View>
              </View>
              <Text style={styles.brandTitle}>Sri Anjaneya</Text>
              <Text style={styles.brandSub}>TOWNSHIP</Text>
              <View style={styles.rule} />
            </View>

            <Text style={styles.heading}>
              {mode === "login" ? "Resident Access" : "Register your Flat"}
            </Text>
            <Text style={styles.subheading}>
              {mode === "login"
                ? "Select your block and enter flat number"
                : "First time here. Tell us a bit about your flat."}
            </Text>

            <Text style={styles.label}>Block</Text>
            <View style={styles.blockRow}>
              {BLOCKS.map(b => {
                const active = block === b;
                return (
                  <Pressable
                    key={b}
                    testID={`block-select-${b}`}
                    onPress={() => setBlock(b)}
                    style={[styles.blockPill, active && styles.blockPillActive]}
                  >
                    <Text style={[styles.blockText, active && styles.blockTextActive]}>{b}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Flat Number</Text>
            <TextInput
              testID="flat-no-input"
              value={flatNo}
              onChangeText={setFlatNo}
              placeholder="e.g. 101"
              placeholderTextColor={COLORS.muted}
              style={styles.input}
              autoCapitalize="characters"
            />

            {mode === "register" && (
              <>
                <Text style={styles.label}>Flat Type</Text>
                <View style={styles.blockRow}>
                  {(["2BHK", "3BHK"] as const).map(t => {
                    const active = bhk === t;
                    return (
                      <Pressable
                        key={t}
                        testID={`bhk-select-${t}`}
                        onPress={() => setBhk(t)}
                        style={[styles.bhkPill, active && styles.blockPillActive]}
                      >
                        <Text style={[styles.blockText, active && styles.blockTextActive]}>{t}</Text>
                        <Text style={[styles.bhkAmt, active && { color: COLORS.onBrand }]}>
                          ₹{t === "2BHK" ? "2,000" : "2,500"}/mo
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.label}>Owner Name (optional)</Text>
                <TextInput
                  testID="owner-name-input"
                  value={ownerName}
                  onChangeText={setOwnerName}
                  placeholder="Full name"
                  placeholderTextColor={COLORS.muted}
                  style={styles.input}
                />

                <Text style={styles.label}>Phone (optional)</Text>
                <TextInput
                  testID="phone-input"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="10-digit mobile"
                  placeholderTextColor={COLORS.muted}
                  style={styles.input}
                  keyboardType="phone-pad"
                />

                <Text style={styles.label}>Dues Start Month (YYYY-MM)</Text>
                <TextInput
                  testID="start-month-input"
                  value={startMonth}
                  onChangeText={setStartMonth}
                  placeholder="2025-01"
                  placeholderTextColor={COLORS.muted}
                  style={styles.input}
                />
                <Text style={styles.hint}>Maintenance dues will be counted from this month.</Text>
              </>
            )}

            <Pressable
              testID={mode === "login" ? "login-btn" : "register-btn"}
              onPress={mode === "login" ? onLogin : onRegister}
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.onBrand} />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>
                    {mode === "login" ? "Continue" : "Register Flat"}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.onBrand} />
                </>
              )}
            </Pressable>

            {mode === "register" && (
              <Pressable testID="back-to-login" onPress={() => setMode("login")} style={{ marginTop: SPACING.md, alignSelf: "center" }}>
                <Text style={styles.link}>Back to Login</Text>
              </Pressable>
            )}

            <Pressable testID="admin-link" onPress={() => router.push("/admin")} style={styles.adminLink}>
              <Ionicons name="shield-outline" size={14} color={COLORS.muted} />
              <Text style={styles.adminLinkText}>  Committee Admin</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  scroll: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xl },
  crestWrap: { alignItems: "center", marginTop: SPACING.xl, marginBottom: SPACING.xl },
  crestOuter: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 2, borderColor: COLORS.brand,
    justifyContent: "center", alignItems: "center",
    backgroundColor: COLORS.surfaceSecondary,
  },
  crestInner: {
    width: 78, height: 78, borderRadius: 39,
    borderWidth: 1, borderColor: COLORS.brandDim,
    justifyContent: "center", alignItems: "center",
    backgroundColor: "#0f0f0f",
  },
  crestMark: {
    fontFamily: FONTS.serif, color: COLORS.brand,
    fontSize: 14, letterSpacing: 2, fontWeight: "600",
  },
  brandTitle: {
    fontFamily: FONTS.serif, color: COLORS.onSurface,
    fontSize: 32, marginTop: SPACING.md, letterSpacing: 1,
  },
  brandSub: {
    fontFamily: FONTS.sans, color: COLORS.brand,
    fontSize: 12, letterSpacing: 6, marginTop: 2,
  },
  rule: { width: 40, height: 1, backgroundColor: COLORS.brand, marginTop: SPACING.md, opacity: 0.6 },
  heading: {
    fontFamily: FONTS.serif, color: COLORS.onSurface,
    fontSize: 24, marginTop: SPACING.md,
  },
  subheading: {
    fontFamily: FONTS.sans, color: COLORS.muted,
    fontSize: 13, marginTop: 4, marginBottom: SPACING.xl,
  },
  label: {
    color: COLORS.onSurfaceTertiary, fontSize: 12,
    letterSpacing: 1.2, marginTop: SPACING.lg, marginBottom: SPACING.sm,
    fontFamily: FONTS.sans, textTransform: "uppercase",
  },
  blockRow: { flexDirection: "row", gap: SPACING.sm, flexWrap: "wrap" },
  blockPill: {
    minWidth: 52, height: 48, paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: "center", alignItems: "center",
  },
  bhkPill: {
    flex: 1, minHeight: 64, paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: "center", alignItems: "center",
  },
  bhkAmt: { color: COLORS.muted, fontSize: 12, marginTop: 2, fontFamily: FONTS.sans },
  blockPillActive: {
    backgroundColor: COLORS.brand, borderColor: COLORS.brand,
  },
  blockText: {
    fontFamily: FONTS.serif, color: COLORS.onSurface, fontSize: 18,
  },
  blockTextActive: { color: COLORS.onBrand, fontWeight: "700" },
  input: {
    height: 52, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
    color: COLORS.onSurface, fontSize: 16,
    paddingHorizontal: SPACING.lg, fontFamily: FONTS.sans,
  },
  hint: { color: COLORS.muted, fontSize: 11, marginTop: 6, fontFamily: FONTS.sans },
  primaryBtn: {
    marginTop: SPACING.xxl, height: 54, borderRadius: RADIUS.md,
    backgroundColor: COLORS.brand, justifyContent: "center",
    alignItems: "center", flexDirection: "row", gap: SPACING.sm,
  },
  primaryBtnText: {
    color: COLORS.onBrand, fontWeight: "700", fontSize: 16,
    fontFamily: FONTS.sans, letterSpacing: 0.5,
  },
  link: { color: COLORS.brand, fontSize: 13, fontFamily: FONTS.sans },
  adminLink: {
    marginTop: SPACING.xxxl, alignSelf: "center", flexDirection: "row", alignItems: "center",
  },
  adminLinkText: { color: COLORS.muted, fontSize: 12, fontFamily: FONTS.sans },
});
