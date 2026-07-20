import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "react-native";

export default function GatePass() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Gate Pass Screen Working</Text>
    </SafeAreaView>
  );
}