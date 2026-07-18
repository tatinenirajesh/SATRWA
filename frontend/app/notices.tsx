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
    id:"1",
    title:"Swimming Pool Opening",
    date:"10 Jul 2026",
    body:"Swimming Pool will be operational from Monday. Timings: 6 AM - 10 AM and 5 PM - 9 PM.",
  },

  {
    id:"2",
    title:"Maintenance Due Reminder",
    date:"08 Jul 2026",
    body:"Residents are requested to pay maintenance before the 10th to avoid late fee.",
  },

  {
    id:"3",
    title:"Owners Meeting",
    date:"05 Jul 2026",
    body:"General Body Meeting will be held in Club House at 6 PM followed by dinner.",
  },

];

export default function Notices(){

  return(

    <SafeAreaView style={styles.container}>

      <View style={styles.header}>

        <Pressable onPress={()=>router.back()}>

          <Ionicons
            name="arrow-back"
            size={24}
            color={COLORS.brand}
          />

        </Pressable>

        <Text style={styles.title}>
          Society Notices
        </Text>

      </View>

      <FlatList
        data={DATA}
        keyExtractor={(item)=>item.id}
        contentContainerStyle={styles.list}
        renderItem={({item})=>(

          <View style={styles.card}>

            <View style={styles.top}>

              <Text style={styles.noticeTitle}>
                {item.title}
              </Text>

              <Text style={styles.date}>
                {item.date}
              </Text>

            </View>

            <Text style={styles.body}>
              {item.body}
            </Text>

          </View>

        )}
      />

    </SafeAreaView>

  );

}

const styles=StyleSheet.create({

container:{
flex:1,
backgroundColor:COLORS.surface,
},

header:{
padding:SPACING.xl,
flexDirection:"row",
alignItems:"center",
},

title:{
marginLeft:20,
fontSize:28,
fontFamily:FONTS.serif,
color:COLORS.brand,
},

list:{
paddingHorizontal:SPACING.xl,
paddingBottom:80,
},

card:{
backgroundColor:COLORS.surfaceSecondary,
borderRadius:RADIUS.lg,
padding:20,
marginBottom:18,
},

top:{
marginBottom:15,
},

noticeTitle:{
fontSize:20,
fontFamily:FONTS.serif,
color:COLORS.brand,
},

date:{
marginTop:5,
color:COLORS.muted,
},

body:{
fontSize:15,
lineHeight:24,
color:COLORS.onSurface,
},

});