import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  COLORS,
  SPACING,
  RADIUS,
  FONTS,
} from "@/src/theme";

import {
  getSession,
} from "@/src/services/session";

import {
  maintenanceSummary,
} from "@/src/services/api";

export default function MyDues() {

  const [loading,setLoading]=useState(true);
  const [summary,setSummary]=useState<any>(null);

  useEffect(()=>{
    load();
  },[]);

  async function load(){

    const session=await getSession();

    if(!session){
      router.replace("/");
      return;
    }

    const res=await maintenanceSummary(session.email);

    if(res.ok){
      setSummary(res.data);
    }

    setLoading(false);

  }

  if(loading){

    return(
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={COLORS.brand}
        />
      </SafeAreaView>
    );

  }

  return(

    <SafeAreaView style={styles.container}>

      <ScrollView
        contentContainerStyle={styles.body}
      >

        <Pressable
          onPress={()=>router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={28}
            color={COLORS.brand}
          />
        </Pressable>

        <Text style={styles.title}>
          My Dues
        </Text>

        {summary?.total_due>0?(
          <>

            <View style={styles.card}>

              <Text style={styles.label}>
                Outstanding Amount
              </Text>

              <Text style={styles.amount}>
                ₹ {summary.total_due}
              </Text>

            </View>

            <View style={styles.card}>

              <Text style={styles.row}>
                Pending Months : {summary.pending_count}
              </Text>

              <Text style={styles.row}>
                Maintenance : ₹ {summary.maintenance_total}
              </Text>

              <Text style={styles.row}>
                Late Fee : ₹ {summary.late_fee_total}
              </Text>

              <Text style={styles.row}>
                Opening Due : ₹ {summary.opening_due_remaining}
              </Text>

            </View>

            <Pressable
              style={styles.pay}
              onPress={()=>router.push("/maintenance")}
            >

              <Text style={styles.payText}>
                PAY NOW
              </Text>

            </Pressable>

          </>
        ):(
          <View style={styles.successCard}>

            <Ionicons
              name="checkmark-circle"
              size={70}
              color="#3CB371"
            />

            <Text style={styles.successTitle}>
              Hooray!
            </Text>

            <Text style={styles.successText}>
              You have no outstanding maintenance dues.
            </Text>

            <Text style={styles.successText}>
              Thank you for paying on time.
            </Text>

          </View>
        )}

      </ScrollView>

    </SafeAreaView>

  );

}

const styles=StyleSheet.create({

container:{
flex:1,
backgroundColor:COLORS.surface,
},

body:{
padding:SPACING.xl,
paddingBottom:50,
},

loading:{
flex:1,
justifyContent:"center",
alignItems:"center",
backgroundColor:COLORS.surface,
},

title:{
fontSize:30,
fontFamily:FONTS.serif,
color:COLORS.brand,
marginVertical:20,
},

card:{
backgroundColor:COLORS.surfaceSecondary,
padding:20,
borderRadius:RADIUS.lg,
marginBottom:20,
},

label:{
fontSize:18,
color:COLORS.muted,
},

amount:{
fontSize:40,
fontWeight:"700",
color:"#E53935",
marginTop:10,
},

row:{
fontSize:17,
marginBottom:12,
color:COLORS.onSurface,
},

pay:{
backgroundColor:COLORS.brand,
padding:18,
borderRadius:RADIUS.md,
alignItems:"center",
},

payText:{
fontSize:18,
fontWeight:"700",
color:"#000",
},

successCard:{
backgroundColor:COLORS.surfaceSecondary,
padding:35,
borderRadius:RADIUS.lg,
alignItems:"center",
marginTop:20,
},

successTitle:{
fontSize:30,
fontWeight:"700",
marginTop:20,
marginBottom:15,
color:"#3CB371",
},

successText:{
fontSize:17,
textAlign:"center",
marginBottom:10,
color:COLORS.onSurface,
},

});