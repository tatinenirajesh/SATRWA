import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, FONTS, SPACING, RADIUS } from "@/src/theme";

export default function PendingScreen() {

  return (

    <SafeAreaView style={styles.container}>

      <View style={styles.content}>

        <View style={styles.iconCircle}>

          <Ionicons
            name="time-outline"
            size={64}
            color={COLORS.brand}
          />

        </View>

        <Text style={styles.title}>
          Registration Submitted
        </Text>

        <Text style={styles.subtitle}>
          Thank you for registering with
          {"\n"}
          Sri Anjaneya Township.
        </Text>

        <View style={styles.card}>

          <Text style={styles.cardTitle}>
            Current Status
          </Text>

          <View style={styles.statusRow}>

            <Ionicons
              name="ellipse"
              size={14}
              color="#FFC107"
            />

            <Text style={styles.status}>
              Pending Committee Approval
            </Text>

          </View>

          <Text style={styles.info}>
            Your registration request has been
            submitted successfully.
            {"\n\n"}
            The Association Committee will verify
            your details before activating your
            account.
            {"\n\n"}
            Once approved, you will receive an
            email confirmation and can log in
            using your Email and PIN.
          </Text>

        </View>

      </View>

      <Pressable
        style={styles.button}
        onPress={() => router.replace("/")}
      >

        <Text style={styles.buttonText}>
          Back to Home
        </Text>

      </Pressable>

    </SafeAreaView>

  );

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    justifyContent: "space-between",
  },

  content: {
    alignItems: "center",
    padding: SPACING.xl,
    paddingTop: 60,
  },

  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.xl,
  },

  title: {
    color: COLORS.brand,
    fontSize: 30,
    fontFamily: FONTS.serif,
    textAlign: "center",
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 16,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 24,
  },

  card: {
    width: "100%",
    marginTop: SPACING.xxl,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
  },

  cardTitle: {
    color: COLORS.onSurface,
    fontSize: 20,
    marginBottom: 20,
    fontFamily: FONTS.serif,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  status: {
    color: "#FFC107",
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "700",
  },

  info: {
    color: COLORS.onSurfaceSecondary,
    lineHeight: 24,
    fontSize: 15,
  },

  button: {
    margin: SPACING.xl,
    backgroundColor: COLORS.brand,
    borderRadius: RADIUS.md,
    paddingVertical: 18,
    alignItems: "center",
  },

  buttonText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 18,
  },

});