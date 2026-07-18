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

  const [session,setSession]=
    useState<Session|null>(null);

  const [loading,setLoading]=
    useState(true);

  const [summary,setSummary]=
    useState<any>(null);

    useEffect(()=>{

        load();

    },[]);

    async function load(){

        try{

            const s = await getSession();

            if(!s){

                return;

            }

            setSession(s);

            const data =
                await maintenanceSummary(
                    s.email
                );

            setSummary(data);

        }catch(e:any){

            Alert.alert(
                "Error",
                e.message
            );

        }finally{

            setLoading(false);

        }

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

        <SafeAreaView
            style={styles.container}
        >

            <ScrollView
                contentContainerStyle={styles.body}
            >

                <Text style={styles.title}>
                    Maintenance
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
                        Pending Months :
                        {" "}
                        {summary?.pending_count}
                    </Text>

                    <Text style={styles.row}>
                        Maintenance :
                        {" "}
                        ₹ {summary?.maintenance_total}
                    </Text>

                    <Text style={styles.row}>
                        Late Fee :
                        {" "}
                        ₹ {summary?.late_fee_total}
                    </Text>

                    <Text style={styles.row}>
                        Opening Due :
                        {" "}
                        ₹ {summary?.opening_due_remaining}
                    </Text>

                </View>

                <Pressable
                    style={styles.pay}
                >

                    <Text
                        style={styles.payText}
                    >
                        PAY NOW
                    </Text>

                </Pressable>

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
fontSize:36,
fontWeight:"700",
color:COLORS.brand,
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
color:"#fff",
fontSize:18,
fontWeight:"700",
},

});