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
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  router,
} from "expo-router";

import {
  COLORS,
  SPACING,
  RADIUS,
  FONTS,
} from "@/src/theme";

import {
  corporateRegister,
  corporateSendOTP,
} from "@/src/services/api";


export default function CorporateRegister() {

  const [
    name,
    setName,
  ] = useState("");

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    pin,
    setPin,
  ] = useState("");

  const [
    otp,
    setOtp,
  ] = useState("");

  const [
    otpSent,
    setOtpSent,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);


  function validateForm() {

    if (!name.trim()) {

      Alert.alert(
        "Required",
        "Please enter the school or company name."
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
        "Please create a PIN."
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

    if (
      !validateForm()
    ) {

      return;
    }


    setLoading(
      true
    );


    try {

      const result =
        await corporateSendOTP(
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
        "A verification code has been sent to your email address."
      );

    } finally {

      setLoading(
        false
      );

    }

  }


  async function handleRegister() {

    if (!otp.trim()) {

      Alert.alert(
        "OTP Required",
        "Please enter the OTP sent to your email."
      );

      return;
    }


    setLoading(
      true
    );


    try {

      const result =
        await corporateRegister({

          name:
            name.trim(),

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
            "Unable to complete registration."
        );

        return;
      }


      Alert.alert(
        "Registration Successful",
        "Your account has been created successfully.",
        [
          {
            text:
              "Login",

            onPress: () =>
              router.replace(
                "/corporate-account"
              ),
          },
        ]
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

      <ScrollView
        contentContainerStyle={
          styles.body
        }
        keyboardShouldPersistTaps="handled"
      >

        <Text
          style={
            styles.title
          }
        >
          School / Company Registration
        </Text>


        <Text
          style={
            styles.subtitle
          }
        >
          Register your organization and verify your email.
        </Text>


        <Text
          style={
            styles.label
          }
        >
          School / Company Name
        </Text>

        <TextInput
          value={
            name
          }
          onChangeText={
            setName
          }
          editable={
            !otpSent
          }
          placeholder="Enter organization name"
          placeholderTextColor={
            COLORS.muted
          }
          style={
            styles.input
          }
        />


        <Text
          style={
            styles.label
          }
        >
          Email Address
        </Text>

        <TextInput
          value={
            email
          }
          onChangeText={
            setEmail
          }
          editable={
            !otpSent
          }
          placeholder="Enter email address"
          placeholderTextColor={
            COLORS.muted
          }
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={
            styles.input
          }
        />


        <Text
          style={
            styles.label
          }
        >
          Create PIN
        </Text>

        <TextInput
          value={
            pin
          }
          onChangeText={
            setPin
          }
          editable={
            !otpSent
          }
          placeholder="Enter 4 to 6 digit PIN"
          placeholderTextColor={
            COLORS.muted
          }
          keyboardType="numeric"
          secureTextEntry
          maxLength={6}
          style={
            styles.input
          }
        />


        {
          !otpSent && (

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
                style={
                  styles.primaryButtonText
                }
              >
                {
                  loading
                    ? "Sending OTP..."
                    : "Send OTP"
                }
              </Text>

            </Pressable>

          )
        }


        {
          otpSent && (

            <>

              <Text
                style={
                  styles.label
                }
              >
                Enter OTP
              </Text>

              <TextInput
                value={
                  otp
                }
                onChangeText={
                  setOtp
                }
                placeholder="Enter OTP"
                placeholderTextColor={
                  COLORS.muted
                }
                keyboardType="numeric"
                maxLength={6}
                style={
                  styles.input
                }
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
                  style={
                    styles.primaryButtonText
                  }
                >
                  {
                    loading
                      ? "Verifying..."
                      : "Verify OTP & Register"
                  }
                </Text>

              </Pressable>


              <Pressable
                style={
                  styles.resendButton
                }
                disabled={
                  loading
                }
                onPress={() => {

                  setOtp(
                    ""
                  );

                  handleSendOTP();

                }}
              >

                <Text
                  style={
                    styles.resendText
                  }
                >
                  Resend OTP
                </Text>

              </Pressable>

            </>

          )
        }


        <Pressable
          style={
            styles.backButton
          }
          onPress={() =>
            router.back()
          }
        >

          <Text
            style={
              styles.backText
            }
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
        16,
    },

    resendButton: {
      alignItems:
        "center",
      marginTop:
        20,
    },

    resendText: {
      color:
        COLORS.brand,
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