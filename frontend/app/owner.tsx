import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { BrandLogo } from "@/src/components/BrandLogo";
import {
  COLORS,
  SPACING,
  RADIUS,
  FONTS,
} from "@/src/theme";

export default function OwnerScreen() {

  return (

    <View style={styles.container}>

      <LinearGradient
        colors={["#1a1508", "#0A0A0A"]}
        style={styles.header}
      >

        <SafeAreaView>

          <View style={styles.headerContent}>

            <BrandLogo size={70} />

            <Text style={styles.title}>
              Property Owner
            </Text>

            <Text style={styles.subtitle}>
              Select an option below
            </Text>

          </View>

        </SafeAreaView>

      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
      >

        <Pressable
          style={styles.card}
          onPress={() => router.push("/owner-login")}
        >

          <Ionicons
            name="log-in-outline"
            size={40}
            color={COLORS.brand}
          />

          <Text style={styles.cardTitle}>
            Login
          </Text>

          <Text style={styles.cardText}>
            Already approved by the
            association committee?
            Sign in using your Email
            and PIN.
          </Text>

        </Pressable>

        <Pressable
          style={styles.card}
          onPress={() => router.push("/owner-register")}
        >

          <Ionicons
            name="person-add-outline"
            size={40}
            color={COLORS.brand}
          />

          <Text style={styles.cardTitle}>
            Register Property
          </Text>

          <Text style={styles.cardText}>
            First time using SATRWA?
            Register your flat,
            verify your email and
            submit for committee
            approval.
          </Text>

        </Pressable>

        <Pressable
          style={styles.back}
          onPress={() => router.back()}
        >

          <Text style={styles.backText}>
            ← Back
          </Text>

        </Pressable>

      </ScrollView>

    </View>

  );

}

const styles = StyleSheet.create({

  container:{
    flex:1,
    backgroundColor:COLORS.surface,
  },

  header:{
    paddingBottom:SPACING.xxxl,
  },

  headerContent:{
    alignItems:"center",
    paddingTop:SPACING.xxl,
  },

  title:{
    color:COLORS.brand,
    fontSize:30,
    fontFamily:FONTS.serif,
    marginTop:SPACING.lg,
  },

  subtitle:{
    color:COLORS.muted,
    marginTop:6,
    fontFamily:FONTS.sans,
  },

  body:{
    padding:SPACING.xl,
    marginTop:-18,
  },

  card:{
    backgroundColor:COLORS.surfaceSecondary,
    borderRadius:RADIUS.lg,
    borderWidth:1,
    borderColor:COLORS.border,
    padding:SPACING.xl,
    marginBottom:SPACING.xl,
    alignItems:"center",
  },

  cardTitle:{
    color:COLORS.onSurface,
    fontSize:24,
    fontFamily:FONTS.serif,
    marginTop:18,
  },

  cardText:{
    color:COLORS.muted,
    textAlign:"center",
    marginTop:12,
    lineHeight:22,
    fontFamily:FONTS.sans,
  },

  back:{
    alignItems:"center",
    marginTop:SPACING.lg,
  },

  backText:{
    color:COLORS.brand,
    fontFamily:FONTS.sans,
    fontSize:16,
  },

});