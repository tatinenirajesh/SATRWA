import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
} from "react-native";

import {
  COLORS,
  RADIUS,
} from "@/src/theme";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
};

export default function PrimaryButton({
  title,
  onPress,
  disabled = false,
}: Props) {

  return (

    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        disabled && styles.disabled,
      ]}
    >

      <Text style={styles.text}>
        {title}
      </Text>

    </Pressable>

  );

}

const styles = StyleSheet.create({

button:{
backgroundColor:COLORS.brand,
padding:18,
borderRadius:RADIUS.md,
alignItems:"center",
},

disabled:{
opacity:.4,
},

text:{
color:"#fff",
fontWeight:"700",
fontSize:17,
},

});