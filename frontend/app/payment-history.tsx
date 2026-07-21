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
  maintenanceHistory,
} from "@/src/services/api";

export default function PaymentHistory(){

    const[loading,setLoading]=useState(true);
    const[data,setData]=useState<any[]>([]);

    useEffect(()=>{
        load();
    },[]);

    async function load(){

        const session=await getSession();

        if(!session){

            router.replace("/");
            return;

        }

        const res=await maintenanceHistory(
            session.email
        );

        if(res.ok){

            setData(res.data || []);

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
                    Payment History
                </Text>

                {data.length===0?(
                    <View style={styles.empty}>

                        <Ionicons
                            name="receipt-outline"
                            size={70}
                            color={COLORS.brand}
                        />

                        <Text style={styles.emptyTitle}>
                            No Payments Yet
                        </Text>

                        <Text style={styles.emptyText}>
                            Your maintenance payment history will appear here.
                        </Text>

                    </View>
                ):(
                    data.map((x:any,index:number)=>(

                        <View
                            key={index}
                            style={styles.card}
                        >

                            <Text style={styles.receipt}>
                                Receipt No
                            </Text>

                            <Text style={styles.value}>
                                {x.receipt_no || "-"}
                            </Text>

                            <Text style={styles.row}>
                                Amount :
                                {" "}
                                ₹ {x.total_amount ?? x.amount ?? 0}
                            </Text>

                            <Text style={styles.row}>
                                Paid On :
                                {" "}
                                {x.payment_date || x.created_at || "-"}
                            </Text>

                            <Text style={styles.row}>
                                Status :
                                {" "}
                                {x.status || "SUCCESS"}
                            </Text>

                            <Text style={styles.row}>
                                Months :
                                {" "}
                                {(x.months_covered || []).join(", ")}
                            </Text>

                        </View>

                    ))
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
paddingBottom:60,
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

empty:{
marginTop:40,
backgroundColor:COLORS.surfaceSecondary,
padding:35,
borderRadius:RADIUS.lg,
alignItems:"center",
},

emptyTitle:{
fontSize:24,
fontWeight:"700",
marginTop:20,
marginBottom:10,
color:COLORS.brand,
},

emptyText:{
textAlign:"center",
fontSize:16,
color:COLORS.onSurface,
},

card:{
backgroundColor:COLORS.surfaceSecondary,
padding:20,
borderRadius:RADIUS.lg,
marginBottom:20,
},

receipt:{
fontSize:14,
color:COLORS.muted,
},

value:{
fontSize:22,
fontWeight:"700",
color:COLORS.brand,
marginBottom:20,
},

row:{
fontSize:16,
marginBottom:10,
color:COLORS.onSurface,
},

});