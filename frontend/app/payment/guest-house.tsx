import React, { useState } from "react";
import {
  View,
 Text,
  StyleSheet,
  Alert,
  Pressable,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  completeGuestRoomPayment,
} from "@/src/services/api";

import {
  COLORS,
  SPACING,
  RADIUS,
  FONTS,
} from "@/src/theme";

export default function GuestHousePayment() {

  const router = useRouter();

  const params =
    useLocalSearchParams();

  const [loading, setLoading] =
    useState(false);

  const amount =
    Number(params.amount);

  async function payNow() {

    try {

      setLoading(true);

      const result =
        await completeGuestRoomPayment({

          payment_id:
            String(params.payment_id),

        });

        if (!result.success) {

          Alert.alert(
            "Payment",
            result.message ??
            "Payment failed."
          );

          return;

        }

        Alert.alert(

          "Success",

          "Guest Room booked successfully.",

          [

            {

              text: "OK",

              onPress: () =>

                router.replace("/amenity"),

            },

          ]

        );

    }

    catch (e: any) {

      Alert.alert(

        "Payment",

        e?.message ??
        "Unable to process payment."

      );

    }

    finally {

      setLoading(false);

    }

  }

  return (
    <View style={styles.container}>

      <LinearGradient
        colors={["#1A1508", "#0A0A0A"]}
        style={styles.header}
      >

        <SafeAreaView>

          <View style={styles.headerRow}>

            <Text style={styles.headerTitle}>
              Guest House Payment
            </Text>

          </View>

        </SafeAreaView>

      </LinearGradient>

      <View style={styles.body}>

        <View style={styles.summaryCard}>

          <Text style={styles.label}>
            Room
          </Text>

          <Text style={styles.value}>
            {params.room}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.label}>
            Check-In
          </Text>

          <Text style={styles.value}>
            {params.checkin_date}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.label}>
            Check-Out
          </Text>

          <Text style={styles.value}>
            {params.checkout_date}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.label}>
            Amount
          </Text>

          <Text style={styles.amount}>
            ₹ {amount.toLocaleString()}
          </Text>

        </View>

        <View style={styles.infoCard}>

          <Text style={styles.infoText}>

            • Payment will confirm your booking.

            {"\n\n"}

            • Room availability will be verified once again before confirmation.

            {"\n\n"}

            • Receipt will be generated automatically after successful payment.

          </Text>

        </View>

        <Pressable
          style={[
            styles.button,
            loading && {
              opacity: 0.6,
            },
          ]}
          disabled={loading}
          onPress={payNow}
        >

          <Text style={styles.buttonText}>

            {loading
              ? "PROCESSING..."
              : "PAY NOW"}

          </Text>

        </Pressable>

      </View>

    </View>

  );

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  header: {
    paddingBottom: SPACING.lg,
  },

  headerRow: {
    paddingTop: SPACING.lg,
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 24,
    fontFamily: FONTS.serif,
    color: COLORS.onSurface,
  },

  body: {
    flex: 1,
    padding: SPACING.xl,
  },

  summaryCard: {
    backgroundColor:
      COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: 20,
    marginBottom: 24,
  },

  label: {
    color: COLORS.muted,
    fontSize: 14,
  },

  value: {
    color: COLORS.onSurface,
    fontSize: 18,
    marginTop: 4,
    fontWeight: "600",
  },

  amount: {
    color: COLORS.brand,
    fontSize: 26,
    fontWeight: "700",
    marginTop: 8,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },

  infoCard: {
    backgroundColor:
      COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    padding: 18,
    marginBottom: 30,
  },

  infoText: {
    color: COLORS.muted,
    lineHeight: 24,
    fontSize: 15,
  },

  button: {
    backgroundColor: COLORS.brand,
    paddingVertical: 18,
    borderRadius: RADIUS.md,
    alignItems: "center",
  },

  buttonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "700",
  },

});