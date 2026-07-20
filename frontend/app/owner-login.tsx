import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import {
  COLORS,
  SPACING,
  RADIUS,
  FONTS,
} from "@/src/theme";

import { BrandLogo } from "@/src/components/BrandLogo";

import { login } from "@/src/services/api";
import { saveSession } from "@/src/services/session";

export default function OwnerLogin() {

  const [email, setEmail] = useState("");

  const [pin, setPin] = useState("");

  const [loading, setLoading] = useState(false);

  const [showPin, setShowPin] = useState(false);

  async function onLogin() {

    if (!email.trim()) {
      Alert.alert(
        "Validation",
        "Email is required."
      );
      return;
    }

    const emailRegex =
      /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!emailRegex.test(email.trim())) {
      Alert.alert(
        "Validation",
        "Enter a valid email."
      );
      return;
    }

    if (pin.length !== 4) {
      Alert.alert(
        "Validation",
        "PIN must contain exactly 4 digits."
      );
      return;
    }

    setLoading(true);

    const res = await login(
      "OWNER",
      email.trim().toLowerCase(),
      pin
    );

    setLoading(false);

    if (!res.ok) {

      Alert.alert(
        "Login",
        res.error || "Unable to login."
      );

      return;

    }

    const account = res.data.account;

    const flat = res.data.flat;

    await saveSession({

      id: account.id,

      role: account.role,

      email: account.email,

      approved: account.approved,

      last_login: account.last_login,

      block: flat.block,

      flat_no: flat.flat_no,

      bhk_type: flat.bhk_type,

      owner_name: flat.owner_name,

      phone: flat.phone,

      corporate_covered:
        flat.corporate_covered,

      corporate_payer_name:
        flat.corporate_payer_name,

    });

    router.replace("/resident-home");

  }

  return (

    <View style={styles.container}>

      <LinearGradient
        colors={["#1A1508","#0A0A0A"]}
        style={styles.header}
      >

        <SafeAreaView>

          <View style={styles.headerContent}>

            <BrandLogo size={70}/>

            <Text style={styles.title}>
              Owner Login
            </Text>

            <Text style={styles.subtitle}>
              Sign in using Email & PIN
            </Text>

          </View>

        </SafeAreaView>

      </LinearGradient>

      <KeyboardAvoidingView
        style={{flex:1}}
        behavior={
          Platform.OS==="ios"
          ?"padding"
          :"height"
        }
      >

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.body}
        >

          <Text style={styles.label}>
            Email Address
          </Text>

          <TextInput
            style={styles.input}
            value={email}
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Enter email"
            placeholderTextColor="#666"
          />

          <Text style={styles.label}>
            4 Digit PIN
          </Text>

          <View style={styles.pinRow}>

            <TextInput
              style={styles.pinInput}
              value={pin}
              secureTextEntry={!showPin}
              keyboardType="number-pad"
              maxLength={4}
              onChangeText={(text)=>
                setPin(
                  text
                    .replace(/\D/g,"")
                    .slice(0,4)
                )
              }
              placeholder="****"
              placeholderTextColor="#666"
            />

            <Pressable
              onPress={()=>
                setShowPin(!showPin)
              }
            >

              <Ionicons
                name={
                  showPin
                  ?"eye-off"
                  :"eye"
                }
                size={24}
                color={COLORS.brand}
              />

            </Pressable>

          </View>
          <Pressable
            style={styles.loginButton}
            onPress={onLogin}
            disabled={loading}
          >

            <Text style={styles.loginButtonText}>

              {loading
                ? "Signing In..."
                : "Login"}

            </Text>

          </Pressable>

         <Pressable
          style={styles.forgot}
          onPress={() =>
            router.push("/forgot-pin")
          }
        >


            <Text style={styles.forgotText}>
              Forgot PIN?
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

      </KeyboardAvoidingView>

    </View>

  );

}

const styles = StyleSheet.create({

  container:{
    flex:1,
    backgroundColor:COLORS.surface,
  },

  header:{
    paddingBottom:SPACING.xxxl,
  },

  headerContent:{
    alignItems:"center",
    paddingTop:SPACING.xxl,
  },

  title:{
    color:COLORS.brand,
    fontSize:30,
    fontFamily:FONTS.serif,
    marginTop:SPACING.lg,
  },

  subtitle:{
    color:COLORS.muted,
    marginTop:8,
    fontFamily:FONTS.sans,
  },

  body:{
    padding:SPACING.xl,
    paddingBottom:60,
  },

  label:{
    color:COLORS.onSurface,
    marginBottom:8,
    marginTop:18,
    fontSize:15,
    fontFamily:FONTS.sans,
  },

  input:{
    backgroundColor:COLORS.surfaceSecondary,
    borderRadius:RADIUS.md,
    borderWidth:1,
    borderColor:COLORS.border,
    padding:16,
    color:COLORS.onSurface,
    fontFamily:FONTS.sans,
  },

  pinRow:{
    flexDirection:"row",
    alignItems:"center",
    backgroundColor:COLORS.surfaceSecondary,
    borderRadius:RADIUS.md,
    borderWidth:1,
    borderColor:COLORS.border,
    paddingHorizontal:16,
  },

  pinInput:{
    flex:1,
    color:COLORS.onSurface,
    paddingVertical:16,
    fontFamily:FONTS.sans,
  },

  loginButton:{
    marginTop:SPACING.xxxl,
    backgroundColor:COLORS.brand,
    borderRadius:RADIUS.md,
    alignItems:"center",
    paddingVertical:18,
  },

  loginButtonText:{
    color:"#000",
    fontWeight:"700",
    fontSize:17,
  },

  forgot:{
    alignItems:"center",
    marginTop:SPACING.xl,
  },

  forgotText:{
    color:COLORS.brand,
    fontFamily:FONTS.sans,
    fontSize:15,
  },

  back:{
    alignItems:"center",
    marginTop:SPACING.xxl,
  },

  backText:{
    color:COLORS.muted,
    fontFamily:FONTS.sans,
    fontSize:15,
  },

});