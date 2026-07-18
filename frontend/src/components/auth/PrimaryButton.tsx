import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";

import { COLORS, RADIUS } from "@/src/theme";

type Props = {
  title: string;
  loading?: boolean;
  onPress: () => void;
};

export default function PrimaryButton({
  title,
  loading,
  onPress,
}: Props) {

  return (

    <Pressable
      onPress={onPress}
      disabled={loading}
      style={styles.button}
    >

      {loading ? (

        <ActivityIndicator color={COLORS.onBrand} />

      ) : (

        <Text style={styles.text}>
          {title}
        </Text>

      )}

    </Pressable>

  );

}

const styles = StyleSheet.create({

  button: {

    backgroundColor: COLORS.brand,

    borderRadius: RADIUS.md,

    paddingVertical: 16,

    alignItems: "center",

    marginTop: 20,

  },

  text: {

    color: COLORS.onBrand,

    fontSize: 16,

    fontWeight: "700",

  },

});