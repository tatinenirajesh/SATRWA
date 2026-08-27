import React, {
  useState,
} from "react";

import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  router,
  useLocalSearchParams,
} from "expo-router";

import {
  API,
  COLORS,
} from "@/src/theme";


export default function ForgotPin() {

  const {
    type,
  } = useLocalSearchParams<{
    type?: string;
  }>();


  const isCommercial =
    String(
      type || ""
    ).toUpperCase() ===
    "COMMERCIAL";


  const [
    email,
    setEmail
  ] = useState("");


  const [
    otp,
    setOtp
  ] = useState("");


  const [
    newPin,
    setNewPin
  ] = useState("");


  const [
    confirmPin,
    setConfirmPin
  ] = useState("");


  const [
    otpSent,
    setOtpSent
  ] = useState(false);


  const [
    loading,
    setLoading
  ] = useState(false);


  async function sendOTP() {

    if (loading) {

      return;

    }


    if (!email.trim()) {

      Alert.alert(
        "Required",
        "Please enter your registered email address."
      );

      return;

    }


    setLoading(
      true
    );


    try {

      const endpoint =
        isCommercial
          ? "/api/commercial/request-pin-reset"
          : "/auth/request-pin-reset";


      const r =
        await fetch(
          `${API}${endpoint}`,
          {

            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                email:
                  email
                    .trim()
                    .toLowerCase()
              })

          }
        );


      const d =
        await r.json();


      if (!r.ok) {

        Alert.alert(
          "Error",
          d.detail ||
            "Unable to send OTP."
        );

        return;

      }


      setOtpSent(
        true
      );


      Alert.alert(
        "Success",
        "OTP sent successfully."
      );

    } catch (error) {

      console.log(
        "SEND OTP ERROR:",
        error
      );


      Alert.alert(
        "Error",
        "Unable to send OTP."
      );

    } finally {

      setLoading(
        false
      );

    }

  }


  async function resetPin() {

    if (
      !otp.trim()
    ) {

      Alert.alert(
        "Required",
        "Please enter the OTP."
      );

      return;

    }


    if (
      newPin.length < 4
    ) {

      Alert.alert(
        "Invalid PIN",
        "PIN must contain at least 4 digits."
      );

      return;

    }


    if (
      newPin !==
      confirmPin
    ) {

      Alert.alert(
        "Error",
        "PINs do not match."
      );

      return;

    }


    setLoading(
      true
    );


    try {

      const endpoint =
        isCommercial
          ? "/api/commercial/reset-pin"
          : "/api/auth/reset-pin";


      const r =
        await fetch(
          `${API}${endpoint}`,
          {

            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({

                email:
                  email
                    .trim()
                    .toLowerCase(),

                otp:
                  otp.trim(),

                new_pin:
                  newPin,

                confirm_pin:
                  confirmPin,

              })

          }
        );


      const d =
        await r.json();


      if (!r.ok) {

        Alert.alert(
          "Error",
          d.detail ||
            "Unable to reset PIN."
        );

        return;

      }


      Alert.alert(
        "Success",
        "PIN reset successfully.",
        [
          {

            text:
              "OK",

            onPress: () => {

              router.back();

            }

          }
        ]
      );

    } catch (error) {

      console.log(
        "RESET PIN ERROR:",
        error
      );


      Alert.alert(
        "Error",
        "Unable to reset PIN."
      );

    } finally {

      setLoading(
        false
      );

    }

  }


  return (

    <SafeAreaView
      style={
        styles.container
      }
    >
    <Pressable
    style={styles.backButton}
    onPress={() => router.back()}
 >
    <Text style={styles.backText}>
      ← Back
    </Text>
  </Pressable>

      <Text
        style={
          styles.title
        }
      >
        Forgot PIN
      </Text>


      <TextInput
        style={
          styles.input
        }
        placeholder="Registered Email"
        value={
          email
        }
        onChangeText={
          setEmail
        }
        autoCapitalize="none"
        keyboardType="email-address"
        editable={
          !otpSent &&
          !loading
        }
      />


      {
        !otpSent
          ? (

            <Pressable
              style={
                styles.button
              }
              onPress={
                sendOTP
              }
              disabled={
                loading
              }
            >

              <Text
                style={
                  styles.text
                }
              >

                {
                  loading
                    ? "Sending..."
                    : "Send OTP"
                }

              </Text>

            </Pressable>

          )
          : (

            <View>

              <TextInput
                style={
                  styles.input
                }
                placeholder="OTP"
                value={
                  otp
                }
                onChangeText={
                  setOtp
                }
                keyboardType="number-pad"
                maxLength={6}
              />


              <TextInput
                style={
                  styles.input
                }
                placeholder="New PIN"
                value={
                  newPin
                }
                onChangeText={
                  setNewPin
                }
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
              />


              <TextInput
                style={
                  styles.input
                }
                placeholder="Confirm PIN"
                value={
                  confirmPin
                }
                onChangeText={
                  setConfirmPin
                }
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
              />


              <Pressable
                style={
                  styles.button
                }
                onPress={
                  resetPin
                }
                disabled={
                  loading
                }
              >

                <Text
                  style={
                    styles.text
                  }
                >

                  {
                    loading
                      ? "Resetting..."
                      : "Reset PIN"
                  }

                </Text>

              </Pressable>

            </View>

          )
      }

    </SafeAreaView>

  );

}


const styles =
  StyleSheet.create({

    container: {

      flex:
        1,

      padding:
        20,

      backgroundColor:
        "#fff"

    },


    title: {

      fontSize:
        30,

      fontWeight:
        "700",

      marginBottom:
        30

    },


    input: {

      borderWidth:
        1,

      borderColor:
        "#ddd",

      padding:
        15,

      marginBottom:
        15,

      borderRadius:
        10

    },


    button: {

      backgroundColor:
        COLORS.brand,

      padding:
        18,

      borderRadius:
        10,

      alignItems:
        "center"

    },


    text: {

      fontWeight:
        "700"

    }

  });