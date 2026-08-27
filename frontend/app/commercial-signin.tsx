import React, {
  useState,
} from "react";

import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
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
  useLocalSearchParams,
  router,
} from "expo-router";

import {
  COLORS,
  SPACING,
  RADIUS,
  FONTS,
} from "@/src/theme";

import {
  commercialLogin,
  corporateLogin,
} from "@/src/services/api";

import {
  saveSession,
} from "@/src/services/session";


export default function CommercialSigninScreen() {

  const { type } =
    useLocalSearchParams<{
      type?: string;
    }>();


  const accountType =
    String(type || "CANTEEN").toUpperCase();


  const isCorporate =
    accountType === "CORPORATE";


  const [identifier, setIdentifier] =
    useState("");

  const [pin, setPin] =
    useState("");

  const [loading, setLoading] =
    useState(false);


  let title =
    "Canteen Login";

  let description =
    "Sign in to access your account and payments.";


  if (
    accountType === "SUPERMARKET"
  ) {

    title =
      "Super Market Login";

  }


  if (isCorporate) {

    title =
      "Corporate Login";

    description =
      "Sign in to manage flats and corporate payments.";

  }


  function handleBack() {

    if (router.canGoBack()) {

      router.back();

    } else {

      router.replace("/");

    }

  }


  async function handleLogin() {

    const cleanIdentifier =
      identifier.trim();

    const cleanPin =
      pin.trim();


    if (!cleanIdentifier) {

      Alert.alert(
        "Required",
        isCorporate
          ? "Please enter your registered organization name."
          : "Please enter your registered email address."
      );

      return;

    }


    if (!cleanPin) {

      Alert.alert(
        "PIN Required",
        "Please enter your PIN."
      );

      return;

    }


    setLoading(true);


    try {

      let result;


      if (isCorporate) {

        result =
          await corporateLogin(
            cleanIdentifier,
            cleanPin
          );

      } else {

        result =
          await commercialLogin(
            cleanIdentifier.toLowerCase(),
            cleanPin
          );

      }


      if (!result.ok) {

        Alert.alert(
          "Login Failed",
          result.error ||
            "Invalid credentials."
        );

        return;

      }


      const account =
        result.data;


      if (!isCorporate) {

        if (
          !account?.id ||
          !account?.email
        ) {

          console.log(
            "INVALID COMMERCIAL LOGIN RESPONSE:",
            account
          );

          Alert.alert(
            "Login Error",
            "Invalid account information received from the server."
          );

          return;

        }


        const normalizedAccountType =
          String(
            account.account_type || ""
          )
            .trim()
            .toUpperCase();


        console.log(
          "COMMERCIAL LOGIN ACCOUNT:",
          account
        );

        console.log(
          "NORMALIZED ACCOUNT TYPE:",
          normalizedAccountType
        );


        if (
          normalizedAccountType !== "CANTEEN" &&
          normalizedAccountType !== "SUPERMARKET"
        ) {

          Alert.alert(
            "Login Error",
            "Unknown commercial account type received from the server."
          );

          return;

        }


        await saveSession({

          id:
            String(account.id),

          role:
            "COMMERCIAL",

          account_type:
            normalizedAccountType as
              | "CANTEEN"
              | "SUPERMARKET",

          shop_name:
            account.shop_name,

          owner_name:
            account.owner_name,

          phone:
            account.phone,

          email:
            String(account.email)
              .trim()
              .toLowerCase(),

        });


        Keyboard.dismiss();


        if (
          normalizedAccountType ===
          "CANTEEN"
        ) {

          router.replace(
            "/commercial-canteen-dashboard"
          );

          return;

        }


        router.replace(
          "/commercial-supermarket-dashboard"
        );

        return;

      }


      if (isCorporate) {

        if (!account?.id) {

          Alert.alert(
            "Login Error",
            "Invalid corporate account information received from the server."
          );

          return;

        }


        await saveSession({

          id:
            account.id,

          role:
            "CORPORATE",

          email:
            account.email || "",

          name:
            account.name ||
            cleanIdentifier,

        });


        Keyboard.dismiss();


        router.replace(
          "/corporate-dashboard"
        );

        return;

      }


    } catch (error) {

      console.log(
        "LOGIN ERROR:",
        error
      );


      Alert.alert(
        "Error",
        "Unable to login. Please try again."
      );

    } finally {

      setLoading(false);

    }

  }


  return (

    <SafeAreaView
      style={styles.container}
    >

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
      >

        <ScrollView
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          <View
            style={styles.body}
          >

            <Text
              style={styles.title}
            >
              {title}
            </Text>


            <Text
              style={styles.subtitle}
            >
              {description}
            </Text>


            <Text
              style={styles.label}
            >
              {
                isCorporate
                  ? "Organization Name"
                  : "Email Address"
              }
            </Text>


            <TextInput
              value={identifier}
              onChangeText={setIdentifier}
              placeholder={
                isCorporate
                  ? "Enter organization name"
                  : "Enter registered email"
              }
              placeholderTextColor={
                COLORS.muted
              }
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={
                isCorporate
                  ? "default"
                  : "email-address"
              }
              editable={!loading}
              returnKeyType="next"
              onSubmitEditing={() => {
                Keyboard.dismiss();
              }}
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
              placeholderTextColor={
                COLORS.muted
              }
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={() => {
                Keyboard.dismiss();
                handleLogin();
              }}
              style={styles.input}
            />


            <Pressable
              style={[
                styles.loginButton,
                loading &&
                  styles.disabledButton,
              ]}
              disabled={loading}
              onPress={() => {
                Keyboard.dismiss();
                handleLogin();
              }}
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
              style={styles.forgotPinButton}
              onPress={() => {

                router.push({
                  pathname: "/forgot-pin",

                  params: {
                    type: "COMMERCIAL",
                  },
                });

              }}
          >
              <Text style={styles.forgotPinText}>
                Forgot PIN?
              </Text>
            </Pressable>

            
            {!isCorporate && (

              <Pressable
                style={styles.registerButton}
                disabled={loading}
                onPress={() => {

                  Keyboard.dismiss();

                  router.push({
                    pathname: "/commercial-register",
                    params: {
                      type: accountType,
                    },
                  });

                }}
              >

                <Text
                  style={styles.registerText}
                >
                  Register
                </Text>

              </Pressable>

            )}


            <Pressable
              style={styles.backButton}
              disabled={loading}
              onPress={handleBack}
            >

              <Text
                style={styles.backText}
              >
                ← Back
              </Text>

            </Pressable>

          </View>

        </ScrollView>

      </KeyboardAvoidingView>

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

    forgotPinButton: {
    alignItems: "center",
    marginTop: 20,
    },

  forgotPinText: {
    color: COLORS.brand,
    fontSize: 16,
    fontWeight: "600",
    },


    keyboardContainer: {
      flex: 1,
    },


    scrollContent: {
      flexGrow: 1,
    },


    body: {
      flex: 1,
      padding:
        SPACING.xl,
      justifyContent:
        "center",
      paddingBottom:
        SPACING.xxxl,
    },


    title: {
      color:
        COLORS.brand,
      fontSize:
        30,
      fontFamily:
        FONTS.serif,
      marginBottom:
        8,
    },


    subtitle: {
      color:
        COLORS.muted,
      marginBottom:
        40,
      lineHeight:
        22,
      fontFamily:
        FONTS.sans,
    },


    label: {
      color:
        COLORS.onSurface,
      marginBottom:
        8,
      fontWeight:
        "600",
      fontFamily:
        FONTS.sans,
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
      fontFamily:
        FONTS.sans,
    },


    loginButton: {
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


    loginText: {
      color:
        COLORS.onBrand,
      fontWeight:
        "700",
      fontSize:
        17,
      fontFamily:
        FONTS.sans,
    },


    registerButton: {
      alignItems:
        "center",
      marginTop:
        20,
      paddingVertical:
        10,
    },


    registerText: {
      color:
        COLORS.brand,
      fontSize:
        16,
      fontWeight:
        "600",
      fontFamily:
        FONTS.sans,
    },


    backButton: {
      alignItems:
        "center",
      marginTop:
        15,
      paddingBottom:
        20,
    },


    backText: {
      color:
        COLORS.brand,
      fontSize:
        16,
      fontFamily:
        FONTS.sans,
    },

  });