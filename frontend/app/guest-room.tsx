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

import {
  checkGuestRoomAvailability,
  bookGuestRoom,
} from "@/src/services/api";

import {
  getSession,
  Session,
} from "@/src/services/session";

import {
  COLORS,
  SPACING,
  RADIUS,
  FONTS,
} from "@/src/theme";

export default function GuestRoom() {

  const router = useRouter();

  const [session, setSession] =
    useState<Session | null>(null);

  const [room, setRoom] =
    useState("101");

  const [checkinDate, setCheckinDate] =
    useState(new Date());

  const [checkoutDate, setCheckoutDate] =
    useState(
      new Date(
        Date.now() + 24 * 60 * 60 * 1000
      )
    );

  const [checkinTime, setCheckinTime] =
    useState(new Date());

  const [checkoutTime, setCheckoutTime] =
    useState(
      new Date(
        Date.now() + 24 * 60 * 60 * 1000
      )
    );

  const [showCheckinDate, setShowCheckinDate] =
    useState(false);

  const [showCheckoutDate, setShowCheckoutDate] =
    useState(false);

  const [showCheckinTime, setShowCheckinTime] =
    useState(false);

  const [showCheckoutTime, setShowCheckoutTime] =
    useState(false);

  const [checkingAvailability, setCheckingAvailability] =
    useState(false);

  const [available, setAvailable] =
    useState<boolean | null>(null);

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

  useEffect(() => {

    if (!session) return;

    checkAvailability();

  }, [
    room,
    checkinDate,
    checkoutDate,
  ]);

async function checkAvailability() {

    try {

        setCheckingAvailability(true);

        const result =
            await checkGuestRoomAvailability(
                checkinDate
                    .toISOString()
                    .split("T")[0]
            );

        console.log("AVAILABILITY RESPONSE:", result);

        if (!result.ok) {

            setAvailable(false);

            return;

        }

        const roomInfo = result.data.find(
            (x: any) => x.room === room
        );

        console.log("SELECTED ROOM:", room);
        console.log("ROOM INFO:", roomInfo);

        setAvailable(
            roomInfo?.available ?? false
        );

    } catch (e) {

        console.log(e);

        setAvailable(false);

    } finally {

        setCheckingAvailability(false);

    }

}

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
              Guest House
            </Text>

            <View style={{ width: 40 }} />

          </View>

        </SafeAreaView>

      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
      >
       <Text style={styles.sectionTitle}>
    Select Room
</Text>

{[
    { room: "101", price: 1250 },
    { room: "201", price: 1000 },
    { room: "202", price: 1000 },
].map((item) => (

      <Pressable
        key={item.room}
        style={[
            styles.card,
            room === item.room && styles.selected,
        ]}
        onPress={() => {

            console.log("ROOM CLICKED:", item.room);

            setRoom(item.room);

        }}
    >

        <Ionicons
            name="bed-outline"
            size={34}
            color={COLORS.brand}
        />

        <View style={styles.textArea}>

            <Text style={styles.cardTitle}>
                Room {item.room}
            </Text>

            <Text style={styles.cardSub}>
                Air Conditioned Guest Room
            </Text>

            <Text style={styles.price}>
                ₹{item.price} / Day
            </Text>

        </View>

    </Pressable>

))}

        <Text style={styles.sectionTitle}>
          Check-In Date
        </Text>

        <Pressable
          style={styles.dateCard}
          onPress={() => setShowCheckinDate(true)}
        >

          <Ionicons
            name="calendar-outline"
            size={24}
            color={COLORS.brand}
          />

          <Text style={styles.dateText}>
            {checkinDate.toDateString()}
          </Text>

        </Pressable>

        {showCheckinDate && (

          <DateTimePicker
            value={checkinDate}
            mode="date"
            minimumDate={new Date()}
            display="default"
            onChange={(event, value) => {

              setShowCheckinDate(false);

              if (value) {

                setCheckinDate(value);

              }

            }}
          />

        )}

        <Text style={styles.sectionTitle}>
          Check-In Time
        </Text>

        <Pressable
          style={styles.dateCard}
          onPress={() => setShowCheckinTime(true)}
        >

          <Ionicons
            name="time-outline"
            size={24}
            color={COLORS.brand}
          />

          <Text style={styles.dateText}>
            {checkinTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>

        </Pressable>

        {showCheckinTime && (

          <DateTimePicker
            value={checkinTime}
            mode="time"
            display="default"
            onChange={(event, value) => {

              setShowCheckinTime(false);

              if (value) {

                setCheckinTime(value);

              }

            }}
          />

        )}

        <Text style={styles.sectionTitle}>
          Check-Out Date
        </Text>

        <Pressable
          style={styles.dateCard}
          onPress={() => setShowCheckoutDate(true)}
        >

          <Ionicons
            name="calendar-outline"
            size={24}
            color={COLORS.brand}
          />

          <Text style={styles.dateText}>
            {checkoutDate.toDateString()}
          </Text>

        </Pressable>

        {showCheckoutDate && (

          <DateTimePicker
            value={checkoutDate}
            mode="date"
            minimumDate={checkinDate}
            display="default"
            onChange={(event, value) => {

              setShowCheckoutDate(false);

              if (value) {

                setCheckoutDate(value);

              }

            }}
          />

        )}

        <Text style={styles.sectionTitle}>
          Check-Out Time
        </Text>

        <Pressable
          style={styles.dateCard}
          onPress={() => setShowCheckoutTime(true)}
        >

          <Ionicons
            name="time-outline"
            size={24}
            color={COLORS.brand}
          />

          <Text style={styles.dateText}>
            {checkoutTime.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>

        </Pressable>

        {showCheckoutTime && (

          <DateTimePicker
            value={checkoutTime}
            mode="time"
            display="default"
            onChange={(event, value) => {

              setShowCheckoutTime(false);

              if (value) {

                setCheckoutTime(value);

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

          <View style={{ flex: 1, marginLeft: 10 }}>

            <Text style={styles.noticeText}>

              {checkingAvailability
                ? "Checking room availability..."
                : available === true
                ? "✅ Room Available"
                : available === false
                ? "❌ Room Not Available"
                : "Availability not checked."}

            </Text>

            <Text
              style={[
                styles.noticeText,
                { marginTop: 16 },
              ]}
            >

              • Guest room booking is confirmed only after successful payment.

              {"\n\n"}

              • Maintenance dues must be cleared.

              {"\n\n"}

              • Room availability will be verified again during payment.

              {"\n\n"}

              • Check-in and Check-out timings must be followed.

            </Text>

          </View>

        </View>

                <Pressable
          style={[
            styles.button,
            available === false && {
              opacity: 0.5,
            },
          ]}
          disabled={
            available === false ||
            checkingAvailability
          }
          onPress={async () => {

            try {

              const result =
                await bookGuestRoom({

                  email: session.email,

                  room,

                  checkin_date:
                    checkinDate
                      .toISOString()
                      .split("T")[0],

                  checkout_date:
                    checkoutDate
                      .toISOString()
                      .split("T")[0],

                  checkin_time:
                    checkinTime
                      .toLocaleTimeString([], {
                        hour12: false,
                        hour: "2-digit",
                        minute: "2-digit",
                      }),

                  checkout_time:
                    checkoutTime
                      .toLocaleTimeString([], {
                        hour12: false,
                        hour: "2-digit",
                        minute: "2-digit",
                      }),

                });

                console.log("BOOK RESULT:", result);

              if (!result.success) {

                let message =
                  "Unable to process booking.";

                if (
                  typeof result?.detail ===
                  "string"
                ) {

                  message = result.detail;

                } else if (
                  Array.isArray(result?.detail)
                ) {

                  message = result.detail
                    .map((x: any) => x.msg)
                    .join("\n");

                } else if (
                  typeof result?.message ===
                  "string"
                ) {

                  message = result.message;

                }

                Alert.alert(
                  "Booking",
                  message
                );

                return;

              }

              router.push({

                pathname:
                  "/payment/guest-house",

                params: {

                  payment_id:
                    result.payment.payment_id,

                  amount:
                    String(result.amount),

                  room,

                  checkin_date:
                    result.checkin_date,

                  checkout_date:
                    result.checkout_date,

                  checkin_time:
                    result.checkin_time,

                  checkout_time:
                    result.checkout_time,

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
    backgroundColor:
      COLORS.surfaceSecondary,
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
    marginTop: 12,
    marginBottom: 16,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor:
      COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  selected: {
    borderWidth: 2,
    borderColor: COLORS.brand,
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
    fontSize: 15,
    color: COLORS.muted,
    lineHeight: 22,
  },

  price: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.brand,
  },

  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor:
      COLORS.surfaceSecondary,
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
    backgroundColor:
      COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    padding: 18,
    marginBottom: 30,
  },

  noticeText: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 24,
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

