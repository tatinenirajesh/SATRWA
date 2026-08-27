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
} from "expo-router";

import {
  COLORS,
  SPACING,
  RADIUS,
  FONTS,
} from "@/src/theme";

import {
  corporateLogin,
} from "@/src/services/api";

import {
  saveSession,
} from "@/src/services/session";


export default function CorporateAccount() {

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    pin,
    setPin,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);


  async function handleLogin() {

    if (!email.trim()) {

      Alert.alert(
        "Required",
        "Please enter your registered email."
      );

      return;
    }


    if (!pin.trim()) {

      Alert.alert(
        "Required",
        "Please enter your PIN."
      );

      return;
    }


    setLoading(
      true
    );


    try {

      const result =
        await corporateLogin(
          email,
          pin
        );


      if (!result.ok) {

        Alert.alert(
          "Login Failed",
          result.error ||
            "Unable to login."
        );

        return;
      }


      const payer =
        result.data?.payer;


      if (!payer?.id) {

        Alert.alert(
          "Login Error",
          "Unable to find your account session."
        );

        return;
      }


      await saveSession({

        id:
          payer.id,

        role:
          "CORPORATE",

        email:
          payer.email,

        name:
          payer.name,

      });


      router.replace(
        "/corporate-dashboard"
      );

    } catch (
      error
    ) {

      console.log(
        "CORPORATE LOGIN ERROR:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to login. Please try again."
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

      <View
        style={
          styles.body
        }
      >

        <Text
          style={
            styles.title
          }
        >
          School / Company Login
        </Text>


        <Text
          style={
            styles.subtitle
          }
        >
          Sign in to manage your flats and maintenance payments.
        </Text>


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
          placeholder="Enter registered email"
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
          PIN
        </Text>


        <TextInput
          value={
            pin
          }
          onChangeText={
            setPin
          }
          placeholder="Enter your PIN"
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
            handleLogin
          }
        >

          <Text
            style={
              styles.primaryButtonText
            }
          >
            {
              loading
                ? "Signing in..."
                : "Login"
            }
          </Text>

        </Pressable>


        <Pressable
          style={
            styles.linkButton
          }
          onPress={() =>
            router.push({
              pathname:
                "/forgot-pin",

              params: {
                type:
                  "CORPORATE",
              },
            })
          }
        >

          <Text
            style={
              styles.linkText
            }
          >
            Forgot PIN?
          </Text>

        </Pressable>


        <Pressable
          style={
            styles.linkButton
          }
          onPress={() =>
            router.push(
              "/corporate-register"
            )
          }
        >

          <Text
            style={
              styles.linkText
            }
          >
            Register
          </Text>

        </Pressable>


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

      </View>

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
      flex: 1,
      padding:
        SPACING.xl,
      justifyContent:
        "center",
    },

    title: {
      color:
        COLORS.brand,
      fontSize:
        30,
      fontFamily:
        FONTS.serif,
    },

    subtitle: {
      color:
        COLORS.muted,
      marginTop:
        8,
      marginBottom:
        40,
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
      backgroundColor:
        COLORS.brand,
      padding:
        18,
      borderRadius:
        RADIUS.md,
      alignItems:
        "center",
      marginTop:
        5,
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

    linkButton: {
      alignItems:
        "center",
      marginTop:
        20,
    },

    linkText: {
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