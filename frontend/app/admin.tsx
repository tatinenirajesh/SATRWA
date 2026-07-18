import { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert, Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { COLORS, SPACING, RADIUS, FONTS, API } from "@/src/theme";
import {
    pendingPayments,
} from "@/src/services/api";

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

const [tab,setTab]=useState<
"today"|
"pending"|
"all"|
"series"|
"settings"|
"tools"|
"flats"|
"gatepass"|
"manual"|
"Reports"
>("today");
  const [gatePasses, setGatePasses] = useState<any[]>([]);

const [manualType,setManualType]=useState("maintenance");

const [manualBlock,setManualBlock]=useState("A");

const [manualFlat,setManualFlat]=useState("");

const [manualAmount,setManualAmount]=useState("");

const [manualMode,setManualMode]=useState("cash");

const [manualRemarks,setManualRemarks]=useState("");

const [pending,setPending]=useState<any[]>([]);

  // Tools tab state
  const [testBlock, setTestBlock] = useState("A");
  const [testFlatNo, setTestFlatNo] = useState("");
  const [testAmount, setTestAmount] = useState("1");
  const [testNote, setTestNote] = useState("Admin Test Payment");
  const [resetBlock, setResetBlock] = useState("A");
  const [resetFlatNo, setResetFlatNo] = useState("");

  // Flats tab state
  const [flatsList, setFlatsList] = useState<any[]>([]);
  const [odBlock, setOdBlock] = useState("A");
  const [odFlatNo, setOdFlatNo] = useState("");
  const [odAmount, setOdAmount] = useState("");
  const [qrBlock, setQrBlock] = useState("A");
  const [qrFlatNo, setQrFlatNo] = useState("");
  const [qrBhk, setQrBhk] = useState<"2BHK" | "3BHK">("2BHK");
  const [qrOwnerName, setQrOwnerName] = useState("");
  const [qrPhone, setQrPhone] = useState("");

const verify = async () => {

  console.log("PIN ENTERED =", pin);

  setLoading(true);

  try {

    console.log("API =", API);

    const r = await fetch(`${API}/api/admin/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pin: pin.trim(),
      }),
    });

    console.log("STATUS =", r.status);

    const d = await r.json();

    console.log("RESPONSE =", d);

    if (!d.ok)
      throw new Error("Invalid PIN");

    setAuthed(true);

    loadAll();

  } catch (e:any) {

    console.log("ERROR =", e);

    Alert.alert(
      "Access Denied",
      e.message
    );

  } finally {

    setLoading(false);

  }

};

const loadAll = async () => {

    const [r1,r2,r3,r4,r5,r6,r7] = await Promise.all([
        fetch(`${API}/api/admin/series`),
        fetch(`${API}/api/admin/payments`),
        fetch(`${API}/api/admin/payments/today`),
        fetch(`${API}/api/admin/late-fee`),
        fetch(`${API}/api/admin/flats`),
        fetch(`${API}/api/admin/gatepasses`),
        fetch(`${API}/api/admin/pending-payments`)
    ]);

    setSeriesList((await r1.json()).series || []);
    const all = await r2.json();

setAllPayments({
    maintenance: all.maintenance || [],
    bookings: all.bookings || [],
});
    setTodayPayments(await r3.json());

    const lf = await r4.json();
    setLateFee(String(lf.late_fee));

    setFlatsList((await r5.json()).flats || []);
    setGatePasses((await r6.json()).gate_passes || []);
    setPending(await r7.json());

};

  const approveGatePass = async (pass_id: string) => {
    try {
      const r = await fetch(`${API}/api/admin/gatepass/approve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pass_id, pin }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Failed");
      Alert.alert("Approved", `Pass ${d.gate_pass.pass_number} issued. Reminder: deactivate this flat's login the day after move-out (Flats tab → delete).`);
      loadAll();
    } catch (e: any) { Alert.alert("Error", e.message); }
  };

  const rejectGatePass = async (pass_id: string) => {
    Alert.alert("Reject Request", "Are you sure you want to reject this gate pass request?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject", style: "destructive", onPress: async () => {
          try {
            const r = await fetch(`${API}/api/admin/gatepass/reject`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pass_id, pin, reason: "Rejected by committee" }),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.detail || "Failed");
            loadAll();
          } catch (e: any) { Alert.alert("Error", e.message); }
        }
      },
    ]);
  };

  const addSeries = async () => {
    const s = parseInt(startNum), e = parseInt(endNum);
    if (!prefix.trim() || isNaN(s) || isNaN(e) || e < s) {
      return Alert.alert("Invalid", "Provide prefix and valid start/end range.");
    }
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/admin/series`, {
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
      const r = await fetch(`${API}/api/admin/series/activate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ series_id, pin }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Failed");
      loadAll();
    } catch (e: any) { Alert.alert("Error", e.message); }
  };

  const saveLateFee = async () => {
    if (lateFee) {
      Alert.alert("Fixed Rule", "Late fee is fixed by policy and applies automatically after the 15th. It cannot be changed from the app.");
      return;
    }
    const v = parseInt(lateFee);
    if (isNaN(v) || v < 0) return Alert.alert("Invalid", "Enter a valid amount");
    try {
      const r = await fetch(`${API}/api/admin/late-fee`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ late_fee: v, pin }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Failed");
      Alert.alert("Saved", `Late fee set to ₹${d.late_fee} per month`);
      loadAll();
    } catch (e: any) { Alert.alert("Error", e.message); }
  };

  const exportAll = () => Linking.openURL(`${API}/api/admin/export?pin=${encodeURIComponent(pin)}`);
  const exportToday = () => Linking.openURL(`${API}/api/admin/export/today?pin=${encodeURIComponent(pin)}`);

  const runTestPayment = async () => {
    const amt = parseFloat(testAmount);
    if (!testFlatNo.trim() || isNaN(amt) || amt <= 0) {
      return Alert.alert("Invalid", "Enter block, flat number, and a valid amount.");
    }
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/admin/test-payment`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ block: testBlock, flat_no: testFlatNo.trim(), amount: amt, note: testNote, pin }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Failed");
      Alert.alert("Test Payment Recorded", `Receipt ${d.receipt.receipt_no} · ₹${amt} for ${testBlock}-${testFlatNo}`);
      setTestFlatNo("");
      loadAll();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setLoading(false); }
  };

  const runResetFlat = async () => {
    if (!resetFlatNo.trim()) return Alert.alert("Invalid", "Enter block and flat number.");
    Alert.alert(
      "Reset Test Data",
      `This deletes ALL maintenance + amenity records for ${resetBlock}-${resetFlatNo}. This cannot be undone. Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive", onPress: async () => {
            setLoading(true);
            try {
              const r = await fetch(`${API}/api/admin/test-reset`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin, scope: "flat", block: resetBlock, flat_no: resetFlatNo.trim() }),
              });
              const d = await r.json();
              if (!r.ok) throw new Error(d.detail || "Failed");
              Alert.alert("Reset Done", `Removed ${d.deleted_maintenance} maintenance + ${d.deleted_bookings} booking records.`);
              setResetFlatNo("");
              loadAll();
            } catch (e: any) {
              Alert.alert("Error", e.message);
            } finally { setLoading(false); }
          }
        },
      ]
    );
  };

  const runResetAllTest = async () => {
    Alert.alert(
      "Reset ALL Test Payments",
      "This deletes every payment/booking across all flats that's tagged as TEST. Real resident payments are untouched. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All Test", style: "destructive", onPress: async () => {
            setLoading(true);
            try {
              const r = await fetch(`${API}/api/admin/test-reset`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin, scope: "all_test" }),
              });
              const d = await r.json();
              if (!r.ok) throw new Error(d.detail || "Failed");
              Alert.alert("Reset Done", `Removed ${d.deleted_maintenance} maintenance + ${d.deleted_bookings} test records.`);
              loadAll();
            } catch (e: any) {
              Alert.alert("Error", e.message);
            } finally { setLoading(false); }
          }
        },
      ]
    );
  };

  const quickRegisterFlat = async () => {
    if (!qrFlatNo.trim()) return Alert.alert("Invalid", "Enter a flat number.");
    setLoading(true);
    try {
      const now = new Date();
      const startMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const r = await fetch(`${API}/auth/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          block: qrBlock, flat_no: qrFlatNo.trim(), bhk_type: qrBhk,
          owner_name: qrOwnerName.trim(), phone: qrPhone.trim(), start_month: startMonth,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Registration failed");
      Alert.alert("Flat Registered", `${qrBlock}-${qrFlatNo} added. It can now be used for corporate/bulk payments even before the resident logs in themselves.`);
      setQrFlatNo(""); setQrOwnerName(""); setQrPhone("");
      loadAll();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setLoading(false); }
  };

  const saveOpeningDue = async () => {
    const amt = parseFloat(odAmount);
    if (!odFlatNo.trim() || isNaN(amt) || amt < 0) {
      return Alert.alert("Invalid", "Enter block, flat number, and a valid amount.");
    }
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/admin/opening-due`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ block: odBlock, flat_no: odFlatNo.trim(), amount: amt, pin }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Failed");
      Alert.alert("Opening Due Saved", `${odBlock}-${odFlatNo}: ₹${amt.toLocaleString("en-IN")}`);
      setOdFlatNo(""); setOdAmount("");
      loadAll();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally { setLoading(false); }
  };

  const deleteFlat = async (block: string, flat_no: string) => {
    Alert.alert(
      "Delete Flat",
      `This permanently deletes ${block}-${flat_no}'s registration AND all its payment/booking history. This cannot be undone. Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything", style: "destructive", onPress: async () => {
            setLoading(true);
            try {
              const r = await fetch(`${API}/api/admin/flat/delete`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ block, flat_no, pin }),
              });
              const d = await r.json();
              if (!r.ok) throw new Error(d.detail || "Failed");
              Alert.alert("Deleted", `${block}-${flat_no} removed. New owner can now register fresh.`);
              loadAll();
            } catch (e: any) {
              Alert.alert("Error", e.message);
            } finally { setLoading(false); }
          }
        },
      ]
    );
  };

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

const saveManualPayment = async () => {
  if (!manualFlat.trim()) {
    return Alert.alert("Enter Flat Number");
  }

  const amount = parseFloat(manualAmount);

  if (isNaN(amount) || amount <= 0) {
    return Alert.alert("Enter valid amount");
  }

  setLoading(true);

  try {
    const r = await fetch(`${API}/api/admin/manual-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pin,
        payment_type: manualType,
        payment_mode: manualMode,
        block: manualBlock,
        flat_no: manualFlat,
        amount,
        remarks: manualRemarks,
      }),
    });

    const d = await r.json();

    if (!r.ok) {
      throw new Error(d.detail || "Failed");
    }

    Alert.alert(
      "Success",
      `Receipt ${d.receipt_no} generated`
    );

    setManualFlat("");
    setManualAmount("");
    setManualRemarks("");

    loadAll();

  } catch (e: any) {

    Alert.alert("Error", e.message);

  } finally {

    setLoading(false);

  }
  };

const approvePayment = async (
    id: string,
    paymentType: string
) => {

  const r = await fetch(`${API}/api/admin/approve-payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id,
      payment_type: paymentType,
      pin,
    }),
  });

  
}

const rejectPayment = async(
id:string,
paymentType:string
)=>{

  try {

    const r = await fetch(`${API}/api/admin/reject-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({

    id,

    payment_type: paymentType,

    pin,

    reason:"Rejected by Admin"

}),
    });

    const d = await r.json();

    if (!r.ok) {
      throw new Error(d.detail || "Failed");
    }

    Alert.alert(
      "Rejected",
      d.message
    );

    loadAll();

  } catch (e: any) {

    Alert.alert("Error", e.message);

  }
};
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
          <TabBtn
    label={`Pending (${pending.length})`}
    active={tab==="pending"}
    onPress={()=>setTab("pending")}
/>
          <TabBtn label="All" active={tab === "all"} onPress={() => setTab("all")} testID="all-tab" />
          <TabBtn label="Series" active={tab === "series"} onPress={() => setTab("series")} testID="series-tab" />
          <TabBtn label="Settings" active={tab === "settings"} onPress={() => setTab("settings")} testID="settings-tab" />
        </View>
        <View style={[styles.tabs,{marginTop:SPACING.sm}]}>
    <TabBtn
        label="Tools"
        active={tab==="tools"}
        onPress={()=>setTab("tools")}
        testID="tools-tab"
    />

    <TabBtn
        label="Flats"
        active={tab==="flats"}
        onPress={()=>setTab("flats")}
        testID="flats-tab"
    />

    <TabBtn
        label="Manual"
        active={tab==="manual"}
        onPress={()=>setTab("manual")}
        testID="manual-tab"
    />

    <TabBtn
        label="Gate Pass"
        active={tab==="gatepass"}
        onPress={()=>setTab("gatepass")}
        testID="gatepass-tab"
    />
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

        {tab==="pending" && (

<View>

<Text style={styles.sectionLabel}>
Pending Payments
</Text>

{pending.length===0 && (

<Text style={styles.emptyText}>
No pending payments.
</Text>

)}

{pending.map((p:any)=>(

<View
key={p.id}
style={styles.paymentCard}
>

<Text>
{p.payment_type?.toUpperCase()}
</Text>

<Text>

{p.block}-{p.flat_no}

</Text>

<Text>

₹{p.amount}

</Text>

<Text>

{p.payment_mode}

</Text>

<Text>

Txn:
{p.transaction_ref}

</Text>

<Pressable

style={styles.primaryBtn}

onPress={() =>
  approvePayment(
    p.id,
    p.payment_type
  )
}

>

<Text style={styles.primaryBtnText}>
Approve
</Text>

</Pressable>

<Pressable

style={[
styles.primaryBtn,
{backgroundColor:"#b00020"}
]}

onPress={()=>

rejectPayment(

p.id,

p.payment_type

)

}

>

<Text style={styles.primaryBtnText}>
Reject
</Text>

</Pressable>

</View>

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
                editable={false}
                keyboardType="number-pad"
                style={[styles.input, { opacity: 0.7 }]}
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

        {tab === "tools" && (
          <View testID="tools-panel">
            <Text style={styles.sectionLabel}>TEST PAYMENT (any amount, e.g. ₹1)</Text>
            <View style={styles.formCard}>
              <Text style={styles.formLabel}>Block</Text>
              <View style={{ flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md }}>
                {["A", "B", "C", "D", "F"].map(b => (
                  <Pressable
                    key={b}
                    testID={`test-block-${b}`}
                    onPress={() => setTestBlock(b)}
                    style={[styles.blockPill, testBlock === b && styles.blockPillActive]}
                  >
                    <Text style={[styles.blockPillText, testBlock === b && styles.blockPillTextActive]}>{b}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.formLabel}>Flat No</Text>
              <TextInput testID="test-flat-input" value={testFlatNo} onChangeText={setTestFlatNo} style={styles.input} placeholder="e.g. 101" placeholderTextColor={COLORS.muted} />
              <Text style={[styles.formLabel, { marginTop: SPACING.md }]}>Amount (₹)</Text>
              <TextInput testID="test-amount-input" value={testAmount} onChangeText={setTestAmount} keyboardType="decimal-pad" style={styles.input} placeholder="1" placeholderTextColor={COLORS.muted} />
              <Text style={[styles.formLabel, { marginTop: SPACING.md }]}>Note</Text>
              <TextInput testID="test-note-input" value={testNote} onChangeText={setTestNote} style={styles.input} />
              <Pressable testID="run-test-payment-btn" onPress={runTestPayment} style={styles.primaryBtn} disabled={loading}>
                {loading ? <ActivityIndicator color={COLORS.onBrand} /> : <Text style={styles.primaryBtnText}>Record Test Payment</Text>}
              </Pressable>
              <Text style={styles.pinHint}>Use this to test real UPI links with a small amount instead of full dues.</Text>
            </View>

            <Text style={styles.sectionLabel}>RESET TEST DATA — SINGLE FLAT</Text>
            <View style={styles.formCard}>
              <Text style={styles.formLabel}>Block</Text>
              <View style={{ flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md }}>
                {["A", "B", "C", "D", "F"].map(b => (
                  <Pressable
                    key={b}
                    testID={`reset-block-${b}`}
                    onPress={() => setResetBlock(b)}
                    style={[styles.blockPill, resetBlock === b && styles.blockPillActive]}
                  >
                    <Text style={[styles.blockPillText, resetBlock === b && styles.blockPillTextActive]}>{b}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.formLabel}>Flat No</Text>
              <TextInput testID="reset-flat-input" value={resetFlatNo} onChangeText={setResetFlatNo} style={styles.input} placeholder="e.g. 101" placeholderTextColor={COLORS.muted} />
              <Pressable testID="run-reset-flat-btn" onPress={runResetFlat} style={[styles.primaryBtn, { backgroundColor: COLORS.error }]} disabled={loading}>
                <Text style={styles.primaryBtnText}>Delete This Flat&apos;s Payments</Text>
              </Pressable>
              <Text style={styles.pinHint}>Wipes maintenance + amenity records for one flat so you can retest the same login.</Text>
            </View>

            <Text style={styles.sectionLabel}>RESET ALL TEST-TAGGED PAYMENTS</Text>
            <View style={styles.formCard}>
              <Text style={styles.pinHint}>
                Deletes every payment across every flat that&apos;s tagged as TEST (from the tool above). Does not touch real resident payments.
              </Text>
              <Pressable testID="run-reset-all-test-btn" onPress={runResetAllTest} style={[styles.primaryBtn, { backgroundColor: COLORS.error }]} disabled={loading}>
                <Text style={styles.primaryBtnText}>Clear All Test Payments</Text>
              </Pressable>
            </View>
          </View>
        )}

        {tab === "flats" && (
          <View testID="flats-panel">
            <Text style={styles.sectionLabel}>QUICK-REGISTER A FLAT</Text>
            <View style={styles.formCard}>
              <Text style={styles.pinHint}>
                For flats no individual resident has logged into the app yet (e.g. staff units a corporate payer covers). Owner name/phone are optional here.
              </Text>
              <Text style={[styles.formLabel, { marginTop: SPACING.md }]}>Block</Text>
              <View style={{ flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md }}>
                {["A", "B", "C", "D", "F"].map(b => (
                  <Pressable
                    key={b}
                    testID={`qr-block-${b}`}
                    onPress={() => setQrBlock(b)}
                    style={[styles.blockPill, qrBlock === b && styles.blockPillActive]}
                  >
                    <Text style={[styles.blockPillText, qrBlock === b && styles.blockPillTextActive]}>{b}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.formLabel}>Flat No</Text>
              <TextInput testID="qr-flat-input" value={qrFlatNo} onChangeText={setQrFlatNo} style={styles.input} placeholder="e.g. 502" placeholderTextColor={COLORS.muted} />
              <Text style={[styles.formLabel, { marginTop: SPACING.md }]}>Flat Type</Text>
              <View style={{ flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md }}>
                {(["2BHK", "3BHK"] as const).map(t => (
                  <Pressable
                    key={t}
                    testID={`qr-bhk-${t}`}
                    onPress={() => setQrBhk(t)}
                    style={[styles.blockPill, { flex: 1 }, qrBhk === t && styles.blockPillActive]}
                  >
                    <Text style={[styles.blockPillText, qrBhk === t && styles.blockPillTextActive]}>{t}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.formLabel}>Owner Name (optional)</Text>
              <TextInput testID="qr-owner-input" value={qrOwnerName} onChangeText={setQrOwnerName} style={styles.input} placeholder="Leave blank if unknown" placeholderTextColor={COLORS.muted} />
              <Text style={[styles.formLabel, { marginTop: SPACING.md }]}>Phone (optional)</Text>
              <TextInput testID="qr-phone-input" value={qrPhone} onChangeText={setQrPhone} style={styles.input} placeholder="Leave blank if unknown" placeholderTextColor={COLORS.muted} keyboardType="phone-pad" maxLength={10} />
              <Pressable testID="quick-register-btn" onPress={quickRegisterFlat} style={styles.primaryBtn} disabled={loading}>
                {loading ? <ActivityIndicator color={COLORS.onBrand} /> : <Text style={styles.primaryBtnText}>Register Flat</Text>}
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>SET OPENING / HISTORICAL DUE</Text>
            <View style={styles.formCard}>
              <Text style={styles.formLabel}>Block</Text>
              <View style={{ flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md }}>
                {["A", "B", "C", "D", "F"].map(b => (
                  <Pressable
                    key={b}
                    testID={`od-block-${b}`}
                    onPress={() => setOdBlock(b)}
                    style={[styles.blockPill, odBlock === b && styles.blockPillActive]}
                  >
                    <Text style={[styles.blockPillText, odBlock === b && styles.blockPillTextActive]}>{b}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.formLabel}>Flat No</Text>
              <TextInput testID="od-flat-input" value={odFlatNo} onChangeText={setOdFlatNo} style={styles.input} placeholder="e.g. 101" placeholderTextColor={COLORS.muted} />
              <Text style={[styles.formLabel, { marginTop: SPACING.md }]}>Opening Due Amount (₹)</Text>
              <TextInput testID="od-amount-input" value={odAmount} onChangeText={setOdAmount} keyboardType="decimal-pad" style={styles.input} placeholder="e.g. 5000" placeholderTextColor={COLORS.muted} />
              <Pressable testID="save-opening-due-btn" onPress={saveOpeningDue} style={styles.primaryBtn} disabled={loading}>
                {loading ? <ActivityIndicator color={COLORS.onBrand} /> : <Text style={styles.primaryBtnText}>Save Opening Due</Text>}
              </Pressable>
              <Text style={styles.pinHint}>Set to ₹0 to clear a previously-entered opening due.</Text>
            </View>

            <Text style={styles.sectionLabel}>ALL REGISTERED FLATS ({flatsList.length})</Text>
            {flatsList.length === 0 && <Text style={styles.emptyText}>No flats registered yet.</Text>}
            {flatsList.map((f: any) => (
              <View key={f.id} style={styles.flatRow} testID={`flat-row-${f.block}-${f.flat_no}`}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pTitle}>{f.block}-{f.flat_no} · {f.bhk_type}</Text>
                  <Text style={styles.pSub} numberOfLines={1}>
                    {f.owner_name || "No name"} · {f.phone || "No phone"}
                    {f.opening_due > 0 ? ` · Opening due ₹${Number(f.opening_due).toLocaleString("en-IN")}` : ""}
                    {f.corporate_covered ? ` · Corporate: ${f.corporate_payer_name}` : ""}
                  </Text>
                </View>
                <Pressable
                  testID={`delete-flat-${f.block}-${f.flat_no}`}
                  onPress={() => deleteFlat(f.block, f.flat_no)}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
        
        {tab==="manual" && (

<View>

<Text style={styles.sectionLabel}>
MANUAL RECEIPT ENTRY
</Text>

<View style={styles.formCard}>

<Text style={styles.formLabel}>
Receipt Type
</Text>

<View style={{flexDirection:"row",gap:10}}>

<Pressable
style={[
styles.blockPill,
manualType=="maintenance" &&
styles.blockPillActive
]}
onPress={()=>setManualType("maintenance")}
>

<Text
style={[
styles.blockPillText,
manualType=="maintenance" &&
styles.blockPillTextActive
]}
>

Maintenance

</Text>

</Pressable>

<Pressable
style={[
styles.blockPill,
manualType=="clubhouse" &&
styles.blockPillActive
]}
onPress={()=>setManualType("clubhouse")}
>

<Text
style={[
styles.blockPillText,
manualType=="clubhouse" &&
styles.blockPillTextActive
]}
>

Clubhouse

</Text>

</Pressable>

</View>


<Text
style={[
styles.formLabel,
{marginTop:20}
]}
>

Payment Mode

</Text>

<View style={{flexDirection:"row",gap:10}}>

<Pressable
style={[
styles.blockPill,
manualMode=="cash" &&
styles.blockPillActive
]}
onPress={()=>setManualMode("cash")}
>

<Text
style={[
styles.blockPillText,
manualMode=="cash" &&
styles.blockPillTextActive
]}
>

Cash

</Text>

</Pressable>

<Pressable
style={[
styles.blockPill,
manualMode=="online" &&
styles.blockPillActive
]}
onPress={()=>setManualMode("online")}
>

<Text
style={[
styles.blockPillText,
manualMode=="online" &&
styles.blockPillTextActive
]}
>

Online

</Text>

</Pressable>

</View>


<Text style={[styles.formLabel,{marginTop:20}]}>
Block
</Text>

<TextInput
style={styles.input}
value={manualBlock}
onChangeText={setManualBlock}
/>

<Text style={[styles.formLabel,{marginTop:20}]}>
Flat
</Text>

<TextInput
style={styles.input}
value={manualFlat}
onChangeText={setManualFlat}
/>

<Text style={[styles.formLabel,{marginTop:20}]}>
Amount
</Text>

<TextInput
style={styles.input}
value={manualAmount}
keyboardType="numeric"
onChangeText={setManualAmount}
/>

<Text style={[styles.formLabel,{marginTop:20}]}>
Remarks
</Text>

<TextInput
style={styles.input}
value={manualRemarks}
onChangeText={setManualRemarks}
/>

<Pressable
style={styles.primaryBtn}
onPress={saveManualPayment}
>

<Text style={styles.primaryBtnText}>

Generate Receipt

</Text>

</Pressable>

</View>

</View>

)}

        {tab === "gatepass" && (
          <View testID="gatepass-panel">
            <Text style={styles.sectionLabel}>GATE PASS REQUESTS ({gatePasses.length})</Text>
            {gatePasses.length === 0 && <Text style={styles.emptyText}>No gate pass requests yet.</Text>}
            {gatePasses.map((g: any) => (
              <View key={g.id} style={styles.flatRow} testID={`gatepass-row-${g.block}-${g.flat_no}`}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Text style={styles.pTitle}>{g.block}-{g.flat_no}</Text>
                    <View style={[
                      styles.statusChip,
                      g.status === "approved" ? styles.statusOk : g.status === "rejected" ? { backgroundColor: COLORS.errorBg } : styles.statusWarn,
                    ]}>
                      <Text style={[
                        styles.statusChipText,
                        { color: g.status === "approved" ? COLORS.success : g.status === "rejected" ? COLORS.error : COLORS.warning },
                      ]}>
                        {g.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.pSub} numberOfLines={2}>
                    {g.requested_by === "corporate" ? "Corporate request" : "Individual request"}
                    {g.owner_name ? ` · ${g.owner_name}` : ""}
                    {" · Conveyance receipt "}{g.conveyance_receipt_no}
                    {g.pass_number ? ` · ${g.pass_number}` : ""}
                  </Text>
                </View>
                {g.status === "Pending ({pending.length})" && (
                  <View style={{ flexDirection: "row", gap: SPACING.sm }}>
                    <Pressable testID={`gatepass-approve-${g.id}`} onPress={() => approveGatePass(g.id)} style={styles.activateBtn}>
                      <Text style={styles.activateBtnText}>Approve</Text>
                    </Pressable>
                    <Pressable testID={`gatepass-reject-${g.id}`} onPress={() => rejectGatePass(g.id)} style={styles.deleteBtn}>
                      <Ionicons name="close" size={16} color={COLORS.error} />
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
            <Text style={[styles.pinHint, { marginTop: SPACING.lg }]}>
              After approving, remind the resident to show the approval screen to security. The next day, deactivate the flat from the Flats tab so a new occupant can register.
            </Text>
          </View>
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
      const r = await fetch(`${API}/api/admin/verify-payment`, {
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
              {p.verified ? "VERIFIED" : "Pending ({pending.length})"}
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
  blockPill: { flex: 1, height: 40, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, justifyContent: "center", alignItems: "center" },
  blockPillActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  blockPillText: { color: COLORS.onSurface, fontFamily: FONTS.serif, fontSize: 15 },
  blockPillTextActive: { color: COLORS.onBrand, fontWeight: "700" },
  flatRow: { flexDirection: "row", alignItems: "center", padding: SPACING.md, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm, gap: SPACING.md },
  deleteBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.errorBg, borderWidth: 1, borderColor: COLORS.error },
});
