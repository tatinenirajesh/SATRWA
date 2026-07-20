import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  Session,
} from "@/src/services/session";

import {
  maintenanceSummary,
} from "@/src/services/api";

export default function MaintenanceScreen() {

  const [loading,setLoading]=useState(true);
  const [summary,setSummary]=useState<any>(null);
  const [session,setSession]=useState<Session|null>(null);

  useEffect(()=>{
    load();
  },[]);

  async function load(){

    try{

      const s=await getSession();

      if(!s){
        router.replace("/");
        return;
      }

      setSession(s);

      const data=await maintenanceSummary(s.email);

      setSummary(data);

    }catch(e:any){

      Alert.alert("Error",e.message);

    }finally{

      setLoading(false);

    }

  }

  function payNow(){

    Alert.alert(
      "ICICI Payment Gateway",
      "Gateway integration is under progress."
    );

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

      <ScrollView contentContainerStyle={styles.body}>

        <Pressable
          style={styles.back}
          onPress={()=>router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={28}
            color={COLORS.brand}
          />
        </Pressable>

        <Text style={styles.title}>
          Maintenance & Payments
        </Text>

        <View style={styles.card}>

          <Text style={styles.label}>
            Current Due
          </Text>

          <Text style={styles.amount}>
            ₹ {summary?.total_due ?? 0}
          </Text>

        </View>

        <View style={styles.card}>

          <Text style={styles.row}>
            Pending Months : {summary?.pending_count ?? 0}
          </Text>

          <Text style={styles.row}>
            Maintenance : ₹ {summary?.maintenance_total ?? 0}
          </Text>

          <Text style={styles.row}>
            Late Fee : ₹ {summary?.late_fee_total ?? 0}
          </Text>

          <Text style={styles.row}>
            Opening Due : ₹ {summary?.opening_due_remaining ?? 0}
          </Text>

        </View>

        <View style={styles.card}>

          <Text style={styles.section}>
            Online Payment
          </Text>

          <Text style={styles.small}>
            Secure payment through ICICI Payment Gateway.
          </Text>

          <Pressable
            style={styles.pay}
            onPress={payNow}
          >
            <Text style={styles.payText}>
              PAY NOW
            </Text>
          </Pressable>

        </View>

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
paddingBottom:40,
},

loading:{
flex:1,
justifyContent:"center",
alignItems:"center",
backgroundColor:COLORS.surface,
},

back:{
marginBottom:15,
},

title:{
fontSize:30,
fontFamily:FONTS.serif,
color:COLORS.brand,
marginBottom:25,
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
fontSize:38,
fontWeight:"700",
color:COLORS.brand,
marginTop:10,
},

row:{
fontSize:17,
marginBottom:12,
color:COLORS.onSurface,
},

section:{
fontSize:20,
fontWeight:"700",
color:COLORS.onSurface,
marginBottom:10,
},

small:{
fontSize:15,
color:COLORS.muted,
marginBottom:25,
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
color:"#fff",
},

});