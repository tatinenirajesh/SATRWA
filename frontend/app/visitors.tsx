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

const VISITORS = [

  {
    id:"1",
    name:"Amazon Delivery",
    purpose:"Parcel Delivery",
    time:"10 Jul 2026 • 11:20 AM",
    status:"Completed",
  },

  {
    id:"2",
    name:"Ramesh Kumar",
    purpose:"Guest",
    time:"09 Jul 2026 • 7:10 PM",
    status:"Completed",
  },

  {
    id:"3",
    name:"Swiggy",
    purpose:"Food Delivery",
    time:"08 Jul 2026 • 9:40 PM",
    status:"Completed",
  },

];

export default function Visitors(){

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
Visitors
</Text>

</View>

<FlatList
data={VISITORS}
keyExtractor={(item)=>item.id}
contentContainerStyle={styles.list}
renderItem={({item})=>(

<View style={styles.card}>

<View style={styles.row}>

<Ionicons
name="person-circle-outline"
size={48}
color={COLORS.brand}
/>

<View style={styles.info}>

<Text style={styles.name}>
{item.name}
</Text>

<Text style={styles.purpose}>
{item.purpose}
</Text>

<Text style={styles.time}>
{item.time}
</Text>

</View>

<View style={styles.badge}>

<Text style={styles.badgeText}>
{item.status}
</Text>

</View>

</View>

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
padding:18,
marginBottom:16,
},

row:{
flexDirection:"row",
alignItems:"center",
},

info:{
flex:1,
marginLeft:15,
},

name:{
fontSize:18,
fontWeight:"700",
color:COLORS.onSurface,
},

purpose:{
marginTop:5,
color:COLORS.brand,
},

time:{
marginTop:5,
color:COLORS.muted,
},

badge:{
backgroundColor:"#143D26",
paddingHorizontal:12,
paddingVertical:8,
borderRadius:25,
},

badgeText:{
color:"#7DFFAE",
fontWeight:"700",
},

});