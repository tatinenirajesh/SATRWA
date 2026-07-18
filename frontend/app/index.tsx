import React, { useEffect, useRef } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { BrandLogo } from "@/src/components/BrandLogo";
import {
  COLORS,
  SPACING,
  RADIUS,
  FONTS,
} from "@/src/theme";

import { getSession } from "@/src/services/session";

export default function LandingScreen() {

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {

    async function load() {

      const session = await getSession();

      if (session) {

        router.replace("/home");

      }

    }

    load();

  }, []);

  function startAdminTimer() {

    timer.current = setTimeout(() => {

      router.push("/admin");

    },5000);

  }

function stopTimer(){

    if(timer.current){

        clearTimeout(timer.current);

        timer.current = null;

    }

}

  return(

    <View style={styles.container}>

      <LinearGradient
        colors={["#1a1508","#0A0A0A"]}
        style={styles.header}
      >

        <SafeAreaView>

          <Pressable
            onPressIn={startAdminTimer}
            onPressOut={stopTimer}
            style={styles.logoArea}
          >

            <BrandLogo size={96}/>

            <Text style={styles.title}>
              SATRWA
            </Text>

            <Text style={styles.subtitle}>
              Sri Anjaneya Township
            </Text>

          </Pressable>

        </SafeAreaView>

      </LinearGradient>

      <View style={styles.body}>

        <Text style={styles.welcome}>
          Welcome Home
        </Text>

        <Pressable
          style={styles.card}
          onPress={()=>router.push("/individual")}
        >

          <Text style={styles.cardIcon}>
            🏠
          </Text>

          <Text style={styles.cardTitle}>
            Individual
          </Text>

          <Text style={styles.cardSub}>
            Owners & Tenants
          </Text>

        </Pressable>

        <Pressable
          style={styles.card}
          onPress={()=>router.push("/corporate-login")}
        >

          <Text style={styles.cardIcon}>
            🏢
          </Text>

          <Text style={styles.cardTitle}>
            Corporate
          </Text>

          <Text style={styles.cardSub}>
            Schools & Companies
          </Text>

        </Pressable>

        <Text style={styles.version}>
          Version 1.0.0
        </Text>

      </View>

    </View>

  );

}

const styles=StyleSheet.create({

container:{
flex:1,
backgroundColor:COLORS.surface,
},

header:{
paddingBottom:SPACING.xxxl,
},

logoArea:{
alignItems:"center",
paddingTop:SPACING.xxxl,
},

title:{
fontFamily:FONTS.serif,
fontSize:34,
color:COLORS.brand,
marginTop:SPACING.lg,
},

subtitle:{
fontFamily:FONTS.sans,
color:COLORS.onSurface,
fontSize:14,
marginTop:4,
},

body:{
flex:1,
backgroundColor:COLORS.surface,
marginTop:-18,
borderTopLeftRadius:28,
borderTopRightRadius:28,
padding:SPACING.xl,
},

welcome:{
fontFamily:FONTS.serif,
fontSize:28,
color:COLORS.onSurface,
textAlign:"center",
marginBottom:SPACING.xxl,
},

card:{
backgroundColor:COLORS.surfaceSecondary,
borderWidth:1,
borderColor:COLORS.border,
borderRadius:RADIUS.lg,
padding:SPACING.xl,
marginBottom:SPACING.lg,
alignItems:"center",
},

cardIcon:{
fontSize:42,
},

cardTitle:{
fontFamily:FONTS.serif,
fontSize:24,
color:COLORS.brand,
marginTop:12,
},

cardSub:{
fontFamily:FONTS.sans,
color:COLORS.muted,
marginTop:4,
},

version:{
textAlign:"center",
marginTop:"auto",
marginBottom:SPACING.lg,
color:COLORS.muted,
fontFamily:FONTS.sans,
}

});