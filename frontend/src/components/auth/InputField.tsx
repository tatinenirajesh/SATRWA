import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

import {
  COLORS,
  SPACING,
  RADIUS,
  FONTS,
} from "@/src/theme";

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export default function InputField({
  label,
  error,
  ...props
}: Props) {
  return (
    <View style={styles.container}>

      <Text style={styles.label}>
        {label}
      </Text>

      <TextInput
        placeholderTextColor={COLORS.muted}
        style={[
          styles.input,
          !!error && styles.inputError,
        ]}
        {...props}
      />

      {!!error && (
        <Text style={styles.error}>
          {error}
        </Text>
      )}

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    marginBottom: SPACING.lg,
  },

  label: {
    color: COLORS.onSurface,
    fontFamily: FONTS.sans,
    marginBottom: 6,
    fontSize: 13,
    letterSpacing: 0.5,
  },

  input: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.onSurface,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    fontFamily: FONTS.sans,
  },

  inputError: {
    borderColor: COLORS.error,
  },

  error: {
    color: COLORS.error,
    marginTop: 5,
    fontSize: 12,
    fontFamily: FONTS.sans,
  },

});