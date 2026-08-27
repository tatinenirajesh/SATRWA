import React, {
  useState,
} from "react";

import {
  Alert,
  Pressable,
  ScrollView,
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
  COLORS,
  SPACING,
  RADIUS,
  FONTS,
} from "@/src/theme";

import {
  commercialRegister,
  commercialSendOTP,
} from "@/src/services/api";


export default function CommercialRegister() {

  const {
    type,
  } = useLocalSearchParams<{
    type?: string;
  }>();


  const accountType =
    String(
      type || "CANTEEN"
    ).toUpperCase();


  const [shopName, setShopName] =
    useState("");

  const [ownerName, setOwnerName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [pin, setPin] =
    useState("");

  const [otp, setOtp] =
    useState("");

  const [otpSent, setOtpSent] =
    useState(false);

  const [loading, setLoading] =
    useState(false);


  function getTitle() {

    if (
      accountType === "SUPERMARKET"
    ) {

      return
        "Super Market Registration";

    }


    return
      "Canteen Registration";

  }


  function validateForm() {

    if (!shopName.trim()) {

      Alert.alert(
        "Required",
        "Please enter the business name."
      );

      return false;

    }


    if (!ownerName.trim()) {

      Alert.alert(
        "Required",
        "Please enter the owner name."
      );

      return false;

    }


    if (!phone.trim()) {

      Alert.alert(
        "Required",
        "Please enter the phone number."
      );

      return false;

    }


    if (!email.trim()) {

      Alert.alert(
        "Required",
        "Please enter the email address."
      );

      return false;

    }


    if (!pin.trim()) {

      Alert.alert(
        "Required",
        "Please enter a PIN."
      );

      return false;

    }


    if (
      pin.trim().length < 4
    ) {

      Alert.alert(
        "Invalid PIN",
        "PIN must contain at least 4 digits."
      );

      return false;

    }


    return true;

  }


  async function handleSendOTP() {

    if (!validateForm()) {

      return;

    }


    setLoading(true);


    try {

      const result =
        await commercialSendOTP(
          email
        );


      if (!result.ok) {

        Alert.alert(
          "Unable to Send OTP",
          result.error ||
            "Unable to send OTP."
        );

        return;

      }


      setOtpSent(
        true
      );


      Alert.alert(
        "OTP Sent",
        "A verification code has been sent to your registered email address."
      );

    } catch (error) {

      console.log(
        "COMMERCIAL OTP ERROR:",
        error
      );


      Alert.alert(
        "Error",
        "Unable to send OTP. Please try again."
      );

    } finally {

      setLoading(false);

    }

  }


  async function handleRegister() {

    if (!otpSent) {

      Alert.alert(
        "OTP Required",
        "Please send and verify your OTP first."
      );

      return;

    }


    if (!otp.trim()) {

      Alert.alert(
        "OTP Required",
        "Please enter the OTP sent to your email."
      );

      return;

    }


    setLoading(true);


    try {

      const result =
        await commercialRegister({

          account_type:
            accountType,

          shop_name:
            shopName.trim(),

          owner_name:
            ownerName.trim(),

          phone:
            phone.trim(),

          email:
            email
              .trim()
              .toLowerCase(),

          pin:
            pin.trim(),

          otp:
            otp.trim(),

        });


      if (!result.ok) {

        Alert.alert(
          "Registration Failed",
          result.error ||
            "Unable to verify OTP or register account."
        );

        return;

      }


      Alert.alert(
        "Registration Successful",
        "Your email has been verified and your account has been created.",
        [
          {
            text:
              "Login",

            onPress: () => {

              router.replace({
                pathname:
                  "/commercial-signin",

                params: {
                  type:
                    accountType,
                },

              });

            },

          },
        ]
      );

    } catch (error) {

      console.log(
        "COMMERCIAL REGISTRATION ERROR:",
        error
      );


      Alert.alert(
        "Error",
        "Unable to complete registration."
      );

    } finally {

      setLoading(false);

    }

  }


  return (

    <SafeAreaView
      style={styles.container}
    >

      <ScrollView
        contentContainerStyle={
          styles.body
        }
        keyboardShouldPersistTaps="handled"
      >

        <Text
          style={styles.title}
        >
          {getTitle()}
        </Text>


        <Text
          style={styles.subtitle}
        >
          Register your business account and verify your email.
        </Text>


        <Text
          style={styles.label}
        >
          Business Name
        </Text>

        <TextInput
          value={shopName}
          onChangeText={setShopName}
          placeholder="Enter business name"
          placeholderTextColor={
            COLORS.muted
          }
          editable={
            !otpSent &&
            !loading
          }
          style={styles.input}
        />


        <Text
          style={styles.label}
        >
          Owner Name
        </Text>

        <TextInput
          value={ownerName}
          onChangeText={setOwnerName}
          placeholder="Enter owner name"
          placeholderTextColor={
            COLORS.muted
          }
          editable={
            !otpSent &&
            !loading
          }
          style={styles.input}
        />


        <Text
          style={styles.label}
        >
          Phone Number
        </Text>

        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="Enter phone number"
          placeholderTextColor={
            COLORS.muted
          }
          keyboardType="phone-pad"
          editable={
            !otpSent &&
            !loading
          }
          style={styles.input}
        />


        <Text
          style={styles.label}
        >
          Email Address
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Enter email address"
          placeholderTextColor={
            COLORS.muted
          }
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={
            !otpSent &&
            !loading
          }
          style={styles.input}
        />


        <Text
          style={styles.label}
        >
          Create PIN
        </Text>

        <TextInput
          value={pin}
          onChangeText={setPin}
          placeholder="Enter 4 to 6 digit PIN"
          placeholderTextColor={
            COLORS.muted
          }
          secureTextEntry
          keyboardType="numeric"
          maxLength={6}
          editable={
            !otpSent &&
            !loading
          }
          style={styles.input}
        />


        {!otpSent && (

          <Pressable
            style={[
              styles.primaryButton,
              loading &&
                styles.disabledButton,
            ]}
            disabled={
              loading
            }
            onPress={
              handleSendOTP
            }
          >

            <Text
              style={styles.primaryButtonText}
            >
              {
                loading
                  ? "Sending OTP..."
                  : "Send OTP"
              }
            </Text>

          </Pressable>

        )}


        {otpSent && (

          <View>

            <Text
              style={styles.otpMessage}
            >
              OTP sent to:
              {" "}
              {email.trim().toLowerCase()}
            </Text>


            <Text
              style={styles.label}
            >
              Enter OTP
            </Text>

            <TextInput
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter OTP"
              placeholderTextColor={
                COLORS.muted
              }
              keyboardType="numeric"
              maxLength={6}
              style={styles.input}
            />


            <Pressable
              style={[
                styles.primaryButton,
                loading &&
                  styles.disabledButton,
              ]}
              disabled={
                loading
              }
              onPress={
                handleRegister
              }
            >

              <Text
                style={styles.primaryButtonText}
              >
                {
                  loading
                    ? "Verifying..."
                    : "Verify OTP & Register"
                }
              </Text>

            </Pressable>


            <Pressable
              style={styles.resendButton}
              disabled={
                loading
              }
              onPress={() => {

                setOtp("");

                handleSendOTP();

              }}
            >

              <Text
                style={styles.resendText}
              >
                Resend OTP
              </Text>

            </Pressable>

          </View>

        )}


        <Pressable
          style={styles.backButton}
          onPress={() =>
            router.back()
          }
        >

          <Text
            style={styles.backText}
          >
            ← Back
          </Text>

        </Pressable>

      </ScrollView>

    </SafeAreaView>

  );

}


const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor:
        COLORS.surface,
    },


    body: {
      padding:
        SPACING.xl,
      paddingBottom:
        50,
    },


    title: {
      color:
        COLORS.brand,
      fontSize:
        30,
      fontFamily:
        FONTS.serif,
      marginTop:
        20,
    },


    subtitle: {
      color:
        COLORS.muted,
      marginTop:
        8,
      marginBottom:
        35,
      lineHeight:
        22,
    },


    label: {
      color:
        COLORS.onSurface,
      marginBottom:
        8,
      fontWeight:
        "600",
    },


    input: {
      backgroundColor:
        COLORS.surfaceSecondary,
      borderWidth:
        1,
      borderColor:
        COLORS.border,
      borderRadius:
        RADIUS.md,
      padding:
        16,
      color:
        COLORS.onSurface,
      marginBottom:
        20,
      fontSize:
        16,
    },


    primaryButton: {
      marginTop:
        10,
      backgroundColor:
        COLORS.brand,
      padding:
        18,
      borderRadius:
        RADIUS.md,
      alignItems:
        "center",
    },


    disabledButton: {
      opacity:
        0.6,
    },


    primaryButtonText: {
      color:
        COLORS.onBrand,
      fontWeight:
        "700",
      fontSize:
        17,
    },


    otpMessage: {
      color:
        COLORS.muted,
      marginTop:
        20,
      marginBottom:
        20,
    },


    resendButton: {
      alignItems:
        "center",
      marginTop:
        18,
    },


    resendText: {
      color:
        COLORS.brand,
      fontSize:
        16,
      fontWeight:
        "600",
    },


    backButton: {
      alignItems:
        "center",
      marginTop:
        25,
    },


    backText: {
      color:
        COLORS.brand,
      fontSize:
        16,
    },

  });