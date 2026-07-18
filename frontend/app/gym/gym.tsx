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
  gymStatus,
} from "@/src/services/api";

export default function GymHome(){

    const [loading,setLoading]=
        useState(true);

    const [status,setStatus]=
        useState<any>();

    useEffect(()=>{

        load();

    },[]);

    async function load(){

        const session =
            await getSession();

        if(!session){

            router.replace("/");

            return;

        }

        const result =
            await gymStatus(
                session.email
            );

        if(result.ok){

            setStatus(
                result.data
            );

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

        <SafeAreaView
            style={styles.container}
        >

            <ScrollView
                contentContainerStyle={styles.body}
            >

                <Text style={styles.title}>
                    Gymnasium
                </Text>

                <View style={styles.card}>

                    <Text style={styles.heading}>
                        Membership
                    </Text>

                    <Text style={styles.status}>

                        {
                            status?.active
                            ? "ACTIVE"
                            : "NOT ACTIVE"
                        }

                    </Text>

                    <Text style={styles.cycle}>

                        Billing Cycle

                    </Text>

                    <Text>

                        {
                            status?.cycle_start
                        }

                        {"  →  "}

                        {
                            status?.cycle_end
                        }

                    </Text>

                </View>

                <Pressable
                    style={styles.button}
                    onPress={()=>
                        router.push(
                            "/gym/membership"
                        )
                    }
                >

                    <Text style={styles.buttonText}>
                        Become Member
                    </Text>

                </Pressable>

                <Pressable
                    style={styles.button}
                    onPress={()=>
                        router.push(
                            "/gym/availability"
                        )
                    }
                >

                    <Text style={styles.buttonText}>
                        View Availability
                    </Text>

                </Pressable>

                <Pressable
                    style={styles.button}
                    onPress={()=>
                        router.push(
                            "/gym/booking"
                        )
                    }
                >

                    <Text style={styles.buttonText}>
                        Book Slot
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
marginBottom:25,
},

heading:{
fontSize:20,
fontWeight:"700",
marginBottom:10,
},

status:{
fontSize:28,
fontWeight:"700",
color:COLORS.brand,
},

cycle:{
marginTop:15,
marginBottom:5,
fontWeight:"700",
},

button:{
backgroundColor:COLORS.brand,
padding:18,
borderRadius:RADIUS.md,
marginBottom:15,
alignItems:"center",
},

buttonText:{
color:"#fff",
fontWeight:"700",
fontSize:17,
},

});