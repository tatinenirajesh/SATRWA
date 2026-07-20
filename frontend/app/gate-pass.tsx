import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import {
  API,
  COLORS,
  SPACING,
  RADIUS,
  FONTS,
} from "@/src/theme";

import {
  getSession,
} from "@/src/services/session";

export default function GatePass() {

  const [moveDate, setMoveDate] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {

    if (!moveDate.trim()) {
      Alert.alert(
        "Validation",
        "Enter Move Out Date."
      );
      return;
    }

    if (!vehicleNo.trim()) {
      Alert.alert(
        "Validation",
        "Enter Vehicle Number."
      );
      return;
    }

    if (!reason.trim()) {
      Alert.alert(
        "Validation",
        "Enter Reason."
      );
      return;
    }

    const session = await getSession();

    if (!session) {

      Alert.alert(
        "Session",
        "Please login again."
      );

      return;

    }

    setLoading(true);

    try {

      const check = await fetch(

        `${API}/api/gate-pass/check`,

        {

          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({

            resident_email: session.email,

            block: session.block,

            flat_no: session.flat_no,

            move_out_date: moveDate,

            vehicle_number: vehicleNo,

            reason,

          }),

        }

      );

      const eligibility = await check.json();

      if (!check.ok) {

        setLoading(false);

        Alert.alert(
          "Error",
          eligibility.detail || "Unable to process request."
        );

        return;

      }

      if (!eligibility.eligible) {

        setLoading(false);

        Alert.alert(

          "Gate Pass Denied",

          `Outstanding Maintenance Due

₹ ${eligibility.due}

Please clear all dues before generating Gate Pass.`

        );

        return;

      }

      setLoading(false);

      Alert.alert(

        "Conveyance Charges",

        "₹250\n\nProceed to Payment?",

        [

          {
            text: "Cancel",
            style: "cancel",
          },

          {

            text: "Proceed",

            onPress: async () => {

              const pay = await fetch(

                `${API}/api/gate-pass/pay`,

                {

                  method: "POST",

                  headers: {
                    "Content-Type": "application/json",
                  },

                  body: JSON.stringify({

                    resident_email: session.email,

                    block: session.block,

                    flat_no: session.flat_no,

                    move_out_date: moveDate,

                    vehicle_number: vehicleNo,

                    reason,

                  }),

                }

              );

              const gp = await pay.json();

              if (!pay.ok) {

                Alert.alert(
                  "Error",
                  gp.detail || "Unable to generate Gate Pass."
                );

                return;

              }

              Alert.alert(

                "Gate Pass Generated",

                `Gate Pass No : ${gp.gate_pass_no}

Your conveyance payment has been recorded successfully.`,

                [

                  {

                    text: "OK",

                    onPress: () => router.back(),

                  },

                ]

              );

            },

          },

        ]

      );

    } catch (e: any) {

      setLoading(false);

      Alert.alert(
        "Error",
        e.message
      );

    }

  }

  return (

    <SafeAreaView style={styles.container}>

      <ScrollView contentContainerStyle={styles.body}>

        <Text style={styles.title}>
          Move Out Gate Pass
        </Text>

        <Text style={styles.note}>
          Gate Pass will be generated only after verifying that there are no outstanding maintenance dues. A conveyance charge of ₹250 is applicable.
        </Text>

        <Text style={styles.label}>
          Move Out Date
        </Text>

        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={moveDate}
          onChangeText={setMoveDate}
        />

        <Text style={styles.label}>
          Vehicle Number
        </Text>

        <TextInput
          style={styles.input}
          placeholder="AP39AB1234"
          autoCapitalize="characters"
          value={vehicleNo}
          onChangeText={(x) =>
            setVehicleNo(x.toUpperCase())
          }
        />

        <Text style={styles.label}>
          Reason
        </Text>

        <TextInput
          style={styles.reason}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          placeholder="Reason for shifting..."
          value={reason}
          onChangeText={setReason}
        />

        <Pressable
          style={styles.button}
          disabled={loading}
          onPress={generate}
        >

          <Text style={styles.buttonText}>
            {loading
              ? "Checking..."
              : "Generate Gate Pass"}
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

    </SafeAreaView>

  );

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  body: {
    padding: SPACING.xl,
    paddingBottom: 60,
  },

  title: {
    fontSize: 30,
    fontFamily: FONTS.serif,
    color: COLORS.brand,
    marginBottom: 15,
  },

  note: {
    backgroundColor: "#FFF8E1",
    padding: 15,
    borderRadius: 10,
    marginBottom: 25,
    color: "#444",
  },

  label: {
    fontSize: 16,
    marginBottom: 8,
    marginTop: 10,
    color: COLORS.onSurface,
  },

  input: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    padding: 16,
    marginBottom: 15,
  },

  reason: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    padding: 16,
    height: 130,
    marginBottom: 30,
  },

  button: {
    backgroundColor: COLORS.brand,
    padding: 18,
    borderRadius: RADIUS.md,
    alignItems: "center",
  },

  buttonText: {
    fontWeight: "700",
    fontSize: 17,
  },

  back: {
    marginTop: 25,
    alignItems: "center",
  },

  backText: {
    fontSize: 16,
  },

});