import React from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  COLORS,
  SPACING,
  RADIUS,
  FONTS,
} from "@/src/theme";

const DATA = [
  {
    id: "1",
    month: "June 2026",
    amount: "₹2,000",
    receipt: "SATRWA-2026-0001",
    date: "05-Jun-2026",
  },
  {
    id: "2",
    month: "May 2026",
    amount: "₹2,000",
    receipt: "SATRWA-2026-0002",
    date: "05-May-2026",
  },
];

export default function Receipts() {

  return (

    <SafeAreaView style={styles.container}>

      <View style={styles.header}>

        <Pressable onPress={() => router.back()}>

          <Ionicons
            name="arrow-back"
            size={24}
            color={COLORS.brand}
          />

        </Pressable>

        <Text style={styles.title}>
          Receipts
        </Text>

      </View>

      <FlatList
        data={DATA}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (

          <View style={styles.card}>

            <Text style={styles.month}>
              {item.month}
            </Text>

            <Text style={styles.amount}>
              {item.amount}
            </Text>

            <Text style={styles.info}>
              Receipt : {item.receipt}
            </Text>

            <Text style={styles.info}>
              Paid On : {item.date}
            </Text>

            <Pressable style={styles.button}>

              <Ionicons
                name="download-outline"
                size={20}
                color="#000"
              />

              <Text style={styles.buttonText}>
                Download Receipt
              </Text>

            </Pressable>

          </View>

        )}
      />

    </SafeAreaView>

  );

}

const styles = StyleSheet.create({

  container:{
    flex:1,
    backgroundColor:COLORS.surface,
  },

  header:{
    flexDirection:"row",
    alignItems:"center",
    padding:SPACING.xl,
  },

  title:{
    marginLeft:20,
    color:COLORS.brand,
    fontFamily:FONTS.serif,
    fontSize:28,
  },

  list:{
    padding:SPACING.xl,
    paddingBottom:80,
  },

  card:{
    backgroundColor:COLORS.surfaceSecondary,
    borderRadius:RADIUS.lg,
    padding:20,
    marginBottom:18,
  },

  month:{
    color:COLORS.brand,
    fontFamily:FONTS.serif,
    fontSize:22,
  },

  amount:{
    color:COLORS.onSurface,
    fontSize:26,
    marginTop:10,
    fontWeight:"700",
  },

  info:{
    color:COLORS.muted,
    marginTop:8,
  },

  button:{
    marginTop:20,
    backgroundColor:COLORS.brand,
    borderRadius:RADIUS.md,
    flexDirection:"row",
    justifyContent:"center",
    alignItems:"center",
    padding:15,
  },

  buttonText:{
    marginLeft:10,
    color:"#000",
    fontWeight:"700",
  },

});