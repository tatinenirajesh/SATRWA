import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import {
  COLORS,
  SPACING,
  RADIUS,
  FONTS,
} from "@/src/theme";

export default function CommunityHall() {

  const router = useRouter();

  const [hallType, setHallType] =
   useState<"FUNCTION" | "DINING">("FUNCTION");

  const [bookingDate, setBookingDate] =
   useState(new Date());

  const [showCalendar, setShowCalendar] =
   useState(false);

  return (

    <View style={styles.container}>

      <LinearGradient
        colors={["#1A1508","#0A0A0A"]}
        style={styles.header}
      >

        <SafeAreaView>

          <View style={styles.headerRow}>

            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
            >

              <Ionicons
                name="arrow-back"
                size={22}
                color={COLORS.brand}
              />

            </Pressable>

            <Text style={styles.headerTitle}>
              Community Hall
            </Text>

            <View style={{width:40}} />

          </View>

        </SafeAreaView>

      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
      >

        <Text style={styles.sectionTitle}>
          Select Hall
        </Text>

        <Pressable
          style={[
            styles.card,
            hallType==="FUNCTION" && styles.selected
          ]}
          onPress={() => setHallType("FUNCTION")}
        >

          <Ionicons
            name="business-outline"
            size={36}
            color={COLORS.brand}
          />

          <View style={styles.textArea}>

            <Text style={styles.cardTitle}>
              Function Hall
            </Text>

            <Text style={styles.cardSub}>
              Ideal for weddings, receptions,
              birthdays and large gatherings.
            </Text>

            <Text style={styles.price}>
              ₹10,000 Booking Charge
            </Text>

          </View>

        </Pressable>

        <Pressable
          style={[
            styles.card,
            hallType==="DINING" && styles.selected
          ]}
          onPress={() => setHallType("DINING")}
        >

          <Ionicons
            name="restaurant-outline"
            size={36}
            color={COLORS.brand}
          />

          <View style={styles.textArea}>

            <Text style={styles.cardTitle}>
              Dining Hall
            </Text>

            <Text style={styles.cardSub}>
              Suitable for dining,
              meetings and small events.
            </Text>

            <Text style={styles.price}>
              ₹5,000 Booking Charge
            </Text>

          </View>

        </Pressable>

        <View style={styles.notice}>

          <Ionicons
            name="information-circle-outline"
            size={22}
            color={COLORS.brand}
          />

          <Text style={styles.noticeText}>

            Only one booking is allowed
            per date. Availability will be
            checked before payment.

          </Text>

        </View>

        <Pressable
          style={styles.button}
          onPress={() =>
            Alert.alert(
              "Next Step",
              "Calendar screen will open next."
            )
          }
        >

         <Text style={styles.sectionTitle}>
  Booking Date
</Text>

<Pressable
  style={styles.dateCard}
  onPress={() => setShowCalendar(true)}
>

  <Ionicons
    name="calendar-outline"
    size={26}
    color={COLORS.brand}
  />

  <Text style={styles.dateText}>
    {bookingDate.toDateString()}
  </Text>

</Pressable>

{showCalendar && (

<DateTimePicker

value={bookingDate}

mode="date"

minimumDate={new Date()}

display="default"

onChange={(event, selectedDate)=>{

setShowCalendar(false);

if(selectedDate){

setBookingDate(selectedDate);

}

}}

/>

)}

<View style={styles.notice}>

<Ionicons

name="information-circle-outline"

size={22}

color={COLORS.brand}

/>

<Text style={styles.noticeText}>

Only one booking is allowed
for each day.

Availability will be verified
before payment.

</Text>

</View>

<Pressable

style={styles.button}

onPress={()=>

Alert.alert(

"Next",

"Backend availability check comes next."

)

}

>

<Text style={styles.buttonText}>

Check Availability

</Text>

</Pressable>

        </Pressable>

      </ScrollView>

    </View>

  );

}

const styles = StyleSheet.create({

container:{
flex:1,
backgroundColor:COLORS.surface,
},

header:{
paddingBottom:SPACING.lg,
},

headerRow:{
flexDirection:"row",
alignItems:"center",
justifyContent:"space-between",
paddingHorizontal:SPACING.lg,
paddingTop:SPACING.sm,
},

backButton:{
width:40,
height:40,
borderRadius:20,
justifyContent:"center",
alignItems:"center",
backgroundColor:COLORS.surfaceSecondary,
},

headerTitle:{
fontSize:24,
fontFamily:FONTS.serif,
color:COLORS.onSurface,
},

body:{
padding:SPACING.xl,
},

sectionTitle:{
fontSize:22,
fontFamily:FONTS.serif,
color:COLORS.onSurface,
marginBottom:20,
},

card:{
flexDirection:"row",
backgroundColor:COLORS.surfaceSecondary,
borderRadius:RADIUS.lg,
padding:18,
marginBottom:18,
borderWidth:1,
borderColor:COLORS.border,
},

selected:{
borderColor:COLORS.brand,
borderWidth:2,
},

textArea:{
flex:1,
marginLeft:18,
},

cardTitle:{
fontSize:20,
fontFamily:FONTS.serif,
color:COLORS.onSurface,
},

cardSub:{
marginTop:8,
color:COLORS.muted,
lineHeight:22,
},

price:{
marginTop:14,
fontWeight:"700",
fontSize:16,
color:COLORS.brand,
},

notice:{
flexDirection:"row",
backgroundColor:COLORS.surfaceSecondary,
padding:18,
borderRadius:RADIUS.md,
marginTop:8,
},

noticeText:{
flex:1,
marginLeft:10,
color:COLORS.muted,
lineHeight:22,
},

button:{
marginTop:30,
backgroundColor:COLORS.brand,
padding:18,
borderRadius:RADIUS.md,
alignItems:"center",
},

buttonText:{
fontSize:17,
fontWeight:"700",
color:"#000",
},

dateCard:{
flexDirection:"row",
alignItems:"center",
backgroundColor:COLORS.surfaceSecondary,
padding:18,
borderRadius:RADIUS.md,
marginBottom:22,
},

dateText:{
marginLeft:15,
fontSize:17,
color:COLORS.onSurface,
fontFamily:FONTS.sans,
},

});