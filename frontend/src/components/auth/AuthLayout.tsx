import React, { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BrandLogo } from "@/src/components/BrandLogo";
import { COLORS, SPACING, FONTS } from "@/src/theme";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function AuthLayout({
  title,
  subtitle,
  children,
}: Props) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1a1508", "#0A0A0A"]}
        style={styles.header}
      >
        <SafeAreaView>

          <View style={styles.logo}>

            <BrandLogo size={70} />

            <Text style={styles.title}>
              {title}
            </Text>

            {!!subtitle && (
              <Text style={styles.subtitle}>
                {subtitle}
              </Text>
            )}

          </View>

        </SafeAreaView>
      </LinearGradient>

      <View style={styles.body}>
        {children}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  header: {
    paddingBottom: SPACING.xxxl,
  },

  logo: {
    alignItems: "center",
    paddingTop: SPACING.xxl,
  },

  title: {
    color: COLORS.onSurface,
    fontSize: 30,
    marginTop: SPACING.lg,
    fontFamily: FONTS.serif,
  },

  subtitle: {
    color: COLORS.muted,
    marginTop: 6,
    fontFamily: FONTS.sans,
  },

  body: {
    flex: 1,
    marginTop: -20,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.xl,
  },

});