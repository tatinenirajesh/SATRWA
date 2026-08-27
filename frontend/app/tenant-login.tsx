import React, { useState } from "react";

import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { router } from "expo-router";

import {
  COLORS,
  SPACING,
  RADIUS,
  FONTS,
} from "@/src/theme";

import {
  login,
} from "@/src/services/api";

import {
  saveSession,
} from "@/src/services/session";


export default function TenantLogin() {

  const [email, setEmail] =
    useState("");

  const [pin, setPin] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  async function handleLogin() {

    if (!email.trim()) {

      Alert.alert(
        "Email Required",
        "Please enter your registered email address."
      );

      return;

    }


    if (!pin.trim()) {

      Alert.alert(
        "PIN Required",
        "Please enter your PIN."
      );

      return;

    }


    setLoading(true);


    const result =
      await login(
        "TENANT",
        email.trim().toLowerCase(),
        pin.trim()
      );


    setLoading(false);


    if (!result.ok) {

      Alert.alert(
        "Login Failed",
        result.error ||
          "Unable to login."
      );

      return;

    }


    console.log(
      "TENANT LOGIN RESPONSE:",
      result.data
    );


    const account = result.data.account;

    await saveSession({
    id: account.id,

    role: "TENANT",

    block: account.block,

    flat_no: account.flat_no,

    bhk_type: account.bhk_type,

    owner_name: account.owner_name,

    tenant_name: account.owner_name,

    phone: account.phone,

    email: account.email,

    approved: account.approved,
    });


    router.replace(
      "/resident-home"
    );

  }


  return (

    <SafeAreaView
      style={styles.container}
    >

      <View
        style={styles.body}
      >

        <Text
          style={styles.title}
        >
          Tenant Login
        </Text>


        <Text
          style={styles.subtitle}
        >
          Sign in using your registered
          email and PIN
        </Text>


        <Text
          style={styles.label}
        >
          Email Address
        </Text>


        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          placeholderTextColor={COLORS.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />


        <Text
          style={styles.label}
        >
          PIN
        </Text>


        <TextInput
          value={pin}
          onChangeText={setPin}
          placeholder="Enter your PIN"
          placeholderTextColor={COLORS.muted}
          secureTextEntry
          keyboardType="numeric"
          maxLength={6}
          style={styles.input}
        />


        <Pressable
          style={[
            styles.loginButton,
            loading &&
              styles.disabledButton,
          ]}
          disabled={loading}
          onPress={handleLogin}
        >

          <Text
            style={styles.loginText}
          >
            {
              loading
                ? "Logging in..."
                : "Login"
            }
          </Text>

        </Pressable>


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
      fontSize: 32,
      fontFamily:
        FONTS.serif,
      marginBottom: 8,
    },

    subtitle: {
      color:
        COLORS.muted,
      marginBottom: 40,
      lineHeight: 22,
    },

    label: {
      color:
        COLORS.onSurface,
      marginBottom: 8,
      fontWeight:
        "600",
    },

    input: {
      backgroundColor:
        COLORS.surfaceSecondary,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius:
        RADIUS.md,
      padding: 16,
      color:
        COLORS.onSurface,
      marginBottom: 20,
      fontSize: 16,
    },

    loginButton: {
      marginTop: 10,
      backgroundColor:
        COLORS.brand,
      padding: 18,
      borderRadius:
        RADIUS.md,
      alignItems:
        "center",
    },

    disabledButton: {
      opacity: 0.6,
    },

    loginText: {
      color:
        COLORS.onBrand,
      fontWeight:
        "700",
      fontSize: 17,
    },

    backButton: {
      alignItems:
        "center",
      marginTop: 25,
    },

    backText: {
      color:
        COLORS.brand,
      fontSize: 16,
    },

  });