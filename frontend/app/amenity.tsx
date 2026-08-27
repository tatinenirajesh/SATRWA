import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  COLORS,
  SPACING,
  RADIUS,
  FONTS,
} from "@/src/theme";

export default function AmenityHome() {

  const router = useRouter();

  return (

    <View style={styles.container}>

      <LinearGradient
        colors={["#1a1508", "#0A0A0A"]}
        style={styles.header}
      >

        <SafeAreaView>

          <View style={styles.headerRow}>

            <Pressable
              onPress={() => router.back()}
              style={styles.back}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={COLORS.brand}
              />
            </Pressable>

            <Text style={styles.title}>
              Amenities
            </Text>

            <View style={{ width: 40 }} />

          </View>

        </SafeAreaView>

      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
      >

        <Card
          icon="business-outline"
          title="Community Hall"
          subtitle="Function Hall & Dining Hall"
          onPress={() =>
            router.push("/community-hall")
          }
        />

        <Card
          icon="bed-outline"
          title="Guest Rooms"
          subtitle="Book guest accommodation"
          onPress={() =>
            router.push("/guest-room")
          }
        />

        <Card
          icon="barbell-outline"
          title="Fitness & Recreation"
          subtitle="Gymnasium and Swimming Pool"
          onPress={() =>
            router.push("/gym-pool?tab=gym")
          }
        />

      </ScrollView>

    </View>

  );

}

function Card({
  icon,
  title,
  subtitle,
  onPress,
}: any) {

  return (

    <Pressable
      style={styles.card}
      onPress={onPress}
    >

      <View style={styles.iconCircle}>

        <Ionicons
          name={icon}
          size={34}
          color={COLORS.brand}
        />

      </View>

      <View style={{ flex: 1 }}>

        <Text style={styles.cardTitle}>
          {title}
        </Text>

        <Text style={styles.cardSub}>
          {subtitle}
        </Text>

      </View>

      <Ionicons
        name="chevron-forward"
        size={24}
        color={COLORS.brand}
      />

    </Pressable>

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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },

  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surfaceSecondary,
  },

  title: {
    fontSize: 24,
    fontFamily: FONTS.serif,
    color: COLORS.onSurface,
  },

  body: {
    padding: SPACING.xl,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceSecondary,
    padding: 20,
    borderRadius: RADIUS.lg,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.brandTint,
    marginRight: 18,
  },

  cardTitle: {
    fontSize: 20,
    fontFamily: FONTS.serif,
    color: COLORS.onSurface,
  },

  cardSub: {
    marginTop: 5,
    fontFamily: FONTS.sans,
    color: COLORS.muted,
  },

});