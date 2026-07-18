import React, { ReactNode } from "react";
import {
  View,
  StyleSheet,
} from "react-native";

import {
  COLORS,
  SPACING,
  RADIUS,
} from "@/src/theme";

export default function FormCard({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({

  card: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    marginTop: SPACING.lg,
  },

});