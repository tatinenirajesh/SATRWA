import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";

import { bookCommunityHall } from "@/src/services/api";
import { getSession, Session } from "@/src/services/session";

import {
  COLORS,
  SPACING,
  RADIUS,
  FONTS,
} from "@/src/theme";

export default function CommunityHall() {

  const router = useRouter();

  const [session, setSession] =
    useState<Session | null>(null);

  const [hallType, setHallType] =
    useState<"FUNCTION" | "DINING">("FUNCTION");

  const [bookingDate, setBookingDate] =
    useState(new Date());

  const [showCalendar, setShowCalendar] =
    useState(false);

  useEffect(() => {

    async function loadSession() {

      const s = await getSession();

      if (!s) {

        router.replace("/");

        return;

      }

      setSession(s);

    }

    loadSession();

  }, []);

  if (!session) {

    return null;

  }

  return (

    <View style={styles.container}>

      <LinearGradient
        colors={["#1A1508", "#0A0A0A"]}
        style={styles.header}
      >

        <SafeAreaView>

          <View style={styles.headerRow}>

            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
            >

              <Ionicons
                name="arrow-back"
                size={22}
                color={COLORS.brand}
              />

            </Pressable>

            <Text style={styles.headerTitle}>
              Community Hall
            </Text>

            <View style={{ width: 40 }} />

          </View>

        </SafeAreaView>

      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
      >

        <Text style={styles.sectionTitle}>
          Select Hall
        </Text>

        <Pressable
          style={[
            styles.card,
            hallType === "FUNCTION" &&
              styles.selected,
          ]}
          onPress={() =>
            setHallType("FUNCTION")
          }
        >

          <Ionicons
            name="business-outline"
            size={34}
            color={COLORS.brand}
          />

          <View style={styles.textArea}>

            <Text style={styles.cardTitle}>
              Function Hall
            </Text>

            <Text style={styles.cardSub}>
              Weddings, receptions,
              birthdays and other
              large gatherings.
            </Text>

            <Text style={styles.price}>
              ₹10,000
            </Text>

          </View>

        </Pressable>

        <Pressable
          style={[
            styles.card,
            hallType === "DINING" &&
              styles.selected,
          ]}
          onPress={() =>
            setHallType("DINING")
          }
        >

          <Ionicons
            name="restaurant-outline"
            size={34}
            color={COLORS.brand}
          />

          <View style={styles.textArea}>

            <Text style={styles.cardTitle}>
              Dining Hall
            </Text>

            <Text style={styles.cardSub}>
              Dining,
              meetings and
              small gatherings.
            </Text>

            <Text style={styles.price}>
              ₹5,000
            </Text>

          </View>

        </Pressable>

                <Text style={styles.sectionTitle}>
          Booking Date
        </Text>

        <Pressable
          style={styles.dateCard}
          onPress={() => setShowCalendar(true)}
        >

          <Ionicons
            name="calendar-outline"
            size={24}
            color={COLORS.brand}
          />

          <Text style={styles.dateText}>
            {bookingDate.toDateString()}
          </Text>

        </Pressable>

        {showCalendar && (

          <DateTimePicker

            value={bookingDate}

            mode="date"

            minimumDate={new Date()}

            display="default"

            onChange={(event, selectedDate) => {

              setShowCalendar(false);

              if (selectedDate) {

                setBookingDate(selectedDate);

              }

            }}

          />

        )}

        <View style={styles.notice}>

          <Ionicons
            name="information-circle-outline"
            size={22}
            color={COLORS.brand}
          />

          <Text style={styles.noticeText}>

            • Only one booking is allowed for each date.

            {"\n\n"}

            • Maintenance dues must be cleared before booking.

            {"\n\n"}

            • Booking is confirmed only after successful payment.

            {"\n\n"}

            • Cancellation is allowed only up to 24 hours before the event.

          </Text>

        </View>

        <Pressable

          style={styles.button}

          onPress={async () => {

            try {

              const result = await bookCommunityHall({

                email: session.email,

                booking_date:
                  bookingDate
                    .toISOString()
                    .split("T")[0],

                session: "FULL DAY",

                function_hall:
                  hallType === "FUNCTION",

                dining_hall:
                  hallType === "DINING",

              });

              if (!result.success) {

                let message = "Unable to process booking.";

              if (typeof result?.detail === "string") {

                  message = result.detail;

              } else if (Array.isArray(result?.detail)) {

                  message = result.detail
                      .map((x: any) => x.msg)
                      .join("\n");

              console.log("BOOK RESULT");
              console.log(JSON.stringify(result, null, 2));

              } else if (typeof result?.message === "string") {

                  message = result.message;

              }

              Alert.alert("Booking", message);

                return;

              }

              router.push({

                pathname:
                  "/payment/community-hall",

                params: {

                  payment_id:
                    result.payment.payment_id,

                  amount:
                    String(result.amount),

                  booking_date:
                    result.booking_date,

                  function_hall:
                    String(result.function_hall),

                  dining_hall:
                    String(result.dining_hall),

                },

              });

            } catch (e: any) {

              Alert.alert(

                "Booking",

                e?.message ??
                "Unable to contact server."

              );

            }

          }}

        >

          <Text style={styles.buttonText}>

            BOOK NOW

          </Text>

        </Pressable>

      </ScrollView>

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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surfaceSecondary,
  },

  headerTitle: {
    fontSize: 24,
    fontFamily: FONTS.serif,
    color: COLORS.onSurface,
  },

  body: {
    padding: SPACING.xl,
    paddingBottom: 60,
  },

  sectionTitle: {
    fontSize: 22,
    fontFamily: FONTS.serif,
    color: COLORS.onSurface,
    marginBottom: 16,
    marginTop: 12,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  selected: {
    borderColor: COLORS.brand,
    borderWidth: 2,
  },

  textArea: {
    flex: 1,
    marginLeft: 16,
  },

  cardTitle: {
    fontSize: 20,
    fontFamily: FONTS.serif,
    color: COLORS.onSurface,
  },

  cardSub: {
    marginTop: 8,
    color: COLORS.muted,
    lineHeight: 22,
    fontSize: 15,
  },

  price: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.brand,
  },

  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    padding: 18,
    marginBottom: 20,
  },

  dateText: {
    marginLeft: 14,
    fontSize: 17,
    color: COLORS.onSurface,
    fontFamily: FONTS.sans,
  },

  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    padding: 18,
    marginBottom: 30,
  },

  noticeText: {
    flex: 1,
    marginLeft: 10,
    color: COLORS.muted,
    lineHeight: 24,
    fontSize: 15,
  },

  button: {
    backgroundColor: COLORS.brand,
    paddingVertical: 18,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },

  buttonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "700",
  },

});