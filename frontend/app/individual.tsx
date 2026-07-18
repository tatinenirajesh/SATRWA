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

export default function IndividualScreen() {
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
              Individual Resident
            </Text>

            <Text style={styles.subtitle}>
              Choose how you want to continue
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
      >

        <Pressable
          style={styles.card}
          onPress={() => router.push("/owner")}
        >
          <View style={styles.iconCircle}>
            <Ionicons
              name="home-outline"
              size={30}
              color={COLORS.brand}
            />
          </View>

          <Text style={styles.cardTitle}>
            Property Owner
          </Text>

          <Text style={styles.cardText}>
            Login to manage maintenance,
            payments, gate passes and
            tenant information.
          </Text>

          <View style={styles.button}>
            <Text style={styles.buttonText}>
              Continue as Owner
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={styles.card}
          onPress={() => router.push("/tenant")}
        >
          <View style={styles.iconCircle}>
            <Ionicons
              name="people-outline"
              size={30}
              color={COLORS.brand}
            />
          </View>

          <Text style={styles.cardTitle}>
            Tenant
          </Text>

          <Text style={styles.cardText}>
            Access your maintenance,
            clubhouse, payments and
            services.
          </Text>

          <View style={styles.button}>
            <Text style={styles.buttonText}>
              Continue as Tenant
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
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
    fontFamily:FONTS.sans,
    marginTop:5,
  },

  body:{
    padding:SPACING.xl,
    marginTop:-20,
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

  iconCircle:{
    width:70,
    height:70,
    borderRadius:35,
    justifyContent:"center",
    alignItems:"center",
    backgroundColor:COLORS.brandTint,
    borderWidth:1,
    borderColor:COLORS.brand,
  },

  cardTitle:{
    color:COLORS.onSurface,
    fontFamily:FONTS.serif,
    fontSize:24,
    marginTop:18,
  },

  cardText:{
    color:COLORS.muted,
    textAlign:"center",
    marginTop:10,
    lineHeight:22,
    fontFamily:FONTS.sans,
  },

  button:{
    marginTop:25,
    backgroundColor:COLORS.brand,
    paddingHorizontal:28,
    paddingVertical:14,
    borderRadius:RADIUS.md,
  },

  buttonText:{
    color:COLORS.onBrand,
    fontWeight:"700",
    fontSize:15,
  },

  backButton:{
    alignItems:"center",
    marginTop:SPACING.lg,
  },

  backText:{
    color:COLORS.brand,
    fontFamily:FONTS.sans,
    fontSize:16,
  }

});