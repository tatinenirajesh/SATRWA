import React, { useEffect, useState } from "react";
import {
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
  clearSession,
  getSession,
  Session,
} from "@/src/services/session";

export default function ResidentHome() {

  const [session, setSession] =
    useState<Session | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {

    const s = await getSession();

    if (!s) {
      router.replace("/");
      return;
    }

    setSession(s);

  }

  async function logout() {

    await clearSession();

    router.replace("/");

  }

  if (!session) return null;

  return (

    <SafeAreaView style={styles.container}>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.header}>

          <Text style={styles.welcome}>
            Welcome
          </Text>

          <Text style={styles.name}>
            {session.owner_name ?? "Resident"}
          </Text>

          <Text style={styles.flat}>
            Block {session.block} • Flat {session.flat_no}
          </Text>

        </View>

        <View style={styles.card}>

          <Text style={styles.cardTitle}>
            Account Details
          </Text>

          <Row
            icon="mail-outline"
            value={session.email}
          />

          <Row
            icon="call-outline"
            value={session.phone || "-"}
          />

          <Row
            icon="home-outline"
            value={session.bhk_type}
          />

        </View>

        <View style={styles.card}>

          <Text style={styles.cardTitle}>
            Quick Actions
          </Text>

          <View style={styles.gridContainer}>

              <Grid
              icon="wallet-outline"
              title="My Dues"
              route="/my-dues"
            />

            <Grid
              icon="card-outline"
              title="Maintenance"
              route="/maintenance"
            />

            <Grid
              icon="cash-outline"
              title="Pay Now"
              route="/pay"
            />

            <Grid
              icon="time-outline"
              title="Payment History"
              route="/payment-history"
            />

            <Grid
              icon="receipt-outline"
              title="Receipts"
              route="/history"
            />

            <Grid
              icon="megaphone-outline"
              title="Notices"
              route="/notices"
            />

            <Grid
              icon="warning-outline"
              title="Complaints"
              route="/complaints"
            />

            <Grid
              icon="people-outline"
              title="Visitors"
              route="/visitors"
            />

            <Grid
              icon="barbell-outline"
              title="Amenities"
              route="/amenity"
            />

            <Grid
              icon="shield-checkmark-outline"
              title="Gate Pass"
              route="/gatepass"
            />

          </View>

        </View>

        <Pressable
          style={styles.logout}
          onPress={logout}
        >

          <Text style={styles.logoutText}>
            Logout
          </Text>

        </Pressable>

      </ScrollView>

    </SafeAreaView>

  );

}

function Row({
  icon,
  value,
}: {
  icon: any;
  value: string;
}) {

  return (

    <View style={styles.row}>

      <Ionicons
        name={icon}
        size={20}
        color={COLORS.brand}
      />

      <Text style={styles.rowText}>
        {value}
      </Text>

    </View>

  );

}

function Grid({
  icon,
  title,
  route,
}: {
  icon: any;
  title: string;
  route?: string;
}) {

  return (

    <Pressable
      style={styles.grid}
      onPress={() => {
        if (route) {
          router.push(route as any);
        }
      }}
    >

      <Ionicons
        name={icon}
        size={32}
        color={COLORS.brand}
      />

      <Text style={styles.gridText}>
        {title}
      </Text>

    </Pressable>

  );

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  body: {
    padding: SPACING.xl,
    paddingBottom: 80,
  },

  header: {
    marginBottom: SPACING.xxl,
  },

  welcome: {
    fontSize: 18,
    color: COLORS.muted,
  },

  name: {
    fontSize: 32,
    color: COLORS.brand,
    fontFamily: FONTS.serif,
    marginTop: 8,
  },

  flat: {
    marginTop: 8,
    color: COLORS.onSurfaceSecondary,
  },

  card: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
  },

  cardTitle: {
    fontSize: 22,
    color: COLORS.onSurface,
    fontFamily: FONTS.serif,
    marginBottom: 20,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  rowText: {
    marginLeft: 15,
    color: COLORS.onSurface,
    fontSize: 16,
  },

  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  grid: {
    width: "48%",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 20,
    alignItems: "center",
    marginBottom: 15,
  },

  gridText: {
    marginTop: 10,
    color: COLORS.onSurface,
    fontWeight: "600",
    textAlign: "center",
  },

  logout: {
    backgroundColor: "#B22222",
    borderRadius: RADIUS.md,
    padding: 18,
    alignItems: "center",
    marginTop: 10,
  },

  logoutText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 17,
  },

});