import { useLocalSearchParams, router } from "expo-router";
import React, { useState } from "react";
import {
View,
Text,
StyleSheet,
TextInput,
Pressable,
Alert,
ScrollView,
} from "react-native";

import { COLORS } from "../../constants/colors";
import { completeCommunityHallPayment } from "../../services/api";

export default function CommunityHallPayment(){

const params = useLocalSearchParams();

const paymentId = String(params.payment_id);

const amount = Number(params.amount);

const bookingDate = String(params.booking_date);

const functionHall =
params.function_hall === "true";

const diningHall =
params.dining_hall === "true";

const [upiId,setUpiId]=useState("");

const [upiRef,setUpiRef]=useState("");

return (

<View style={styles.container}>

<ScrollView
showsVerticalScrollIndicator={false}
contentContainerStyle={{
padding:20,
}}
>

<Text style={styles.title}>
Community Hall Payment
</Text>

<View style={styles.card}>

<Text style={styles.label}>
Booking Date
</Text>

<Text style={styles.value}>
{bookingDate}
</Text>

<Text style={styles.label}>
Booking Amount
</Text>

<Text style={styles.amount}>
₹ {amount.toLocaleString()}
</Text>

<Text style={styles.note}>
Pay the above amount using the Township UPI ID and enter the transaction details below.
Booking will be confirmed only after payment verification.
</Text>

</View>

<View style={styles.card}>

<Text style={styles.label}>
Township UPI ID
</Text>

<Text style={styles.upi}>
srianjaneyatownship@icici
</Text>

<Text style={styles.label}>
Your UPI ID
</Text>

<TextInput
style={styles.input}
placeholder="example@oksbi"
placeholderTextColor="#777"
value={upiId}
onChangeText={setUpiId}
/>

<Text style={styles.label}>
UPI Reference Number
</Text>

<TextInput
style={styles.input}
placeholder="Transaction Reference"
placeholderTextColor="#777"
keyboardType="number-pad"
value={upiRef}
onChangeText={setUpiRef}
/>

<Pressable
style={styles.button}
onPress={async()=>{

if(!upiId.trim()){

Alert.alert(
"UPI ID",
"Please enter your UPI ID."
);

return;

}

if(!upiRef.trim()){

Alert.alert(
"Reference Number",
"Please enter the UPI transaction reference number."
);

return;

}

const result =
await completeCommunityHallPayment({

payment_id: paymentId,

upi_id: upiId,

upi_ref_no: upiRef,

booking_date: bookingDate,

function_hall: functionHall,

dining_hall: diningHall,

});

if(!result.success){

Alert.alert(
"Payment",
result.message
);

return;

}

Alert.alert(

"Booking Confirmed",

"Community Hall booked successfully.",

[
{
text:"OK",

onPress:()=>{

router.replace(
"/resident-home"
);

},
},
],

);

}}

>

<Text style={styles.buttonText}>
SUBMIT PAYMENT
</Text>

</Pressable>

</View>

</ScrollView>

</View>

);

}

const styles=StyleSheet.create({

container:{
flex:1,
backgroundColor:"#000",
},

title:{
fontSize:28,
fontWeight:"700",
color:COLORS.brand,
marginBottom:20,
},

card:{
backgroundColor:"#1b1b1b",
borderRadius:14,
padding:18,
marginBottom:20,
},

label:{
color:"#aaa",
fontSize:14,
marginBottom:6,
},

value:{
fontSize:18,
color:"#fff",
fontWeight:"600",
marginBottom:18,
},

amount:{
fontSize:34,
fontWeight:"700",
color:COLORS.brand,
marginBottom:20,
},

note:{
color:"#aaa",
lineHeight:22,
},

upi:{
fontSize:18,
fontWeight:"700",
color:COLORS.brand,
marginBottom:20,
},

input:{
borderWidth:1,
borderColor:"#444",
borderRadius:10,
padding:14,
color:"#fff",
marginBottom:18,
},

button:{
backgroundColor:COLORS.brand,
padding:18,
borderRadius:12,
alignItems:"center",
marginTop:10,
},

buttonText:{
fontWeight:"700",
fontSize:18,
color:"#000",
},

});