import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, BLOCKS } from "@/src/theme";
import { sendOTP } from "@/src/services/api";
import { registerOwner } from "@/src/services/api";

export default function OwnerRegister() {

  const router = useRouter();

  const [block, setBlock] = useState("A");
  const [flatNo, setFlatNo] = useState("");

  const [bhkType, setBhkType] = useState("2BHK");

  const [ownerName, setOwnerName] = useState("");

  const [phone, setPhone] = useState("");

  const [email, setEmail] = useState("");

  const [otp, setOtp] = useState("");

  const [pin, setPin] = useState("");

  const [confirmPin, setConfirmPin] = useState("");

  const [otpSent, setOtpSent] = useState(false);

  const [loading, setLoading] = useState(false);

  const [showPin, setShowPin] = useState(false);

  async function onSendOTP() {

    if (!ownerName.trim()) {
      Alert.alert("Validation", "Enter owner name.");
      return;
    }

    if (!flatNo.trim()) {
      Alert.alert("Validation", "Enter flat number.");
      return;
    }

    if (!phone.trim()) {
    Alert.alert("Validation", "Mobile number is required.");
    return;
    }

    if (!phone.match(/^[6-9]\d{9}$/)) {
    Alert.alert("Validation", "Enter a valid 10-digit mobile number.");
    return;
    }

    if (!email.trim()) {
    Alert.alert("Validation", "Email is required.");
    return;
    }

    const emailRegex =
    /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!emailRegex.test(email.trim())) {
    Alert.alert("Validation", "Enter a valid email address.");
    return;
    }

    setLoading(true);

    const res = await sendOTP(email.trim().toLowerCase());

    setLoading(false);

    if (!res.ok) {
      Alert.alert("OTP", res.error || "Unable to send OTP.");
      return;
    }

    setOtpSent(true);

    Alert.alert(
      "Success",
      "OTP has been sent to your email."
    );

  }

async function onRegister() {

  if (!otp.trim()) {
    Alert.alert("Validation", "Enter the OTP.");
    return;
  }

  if (pin.length !== 4) {
    Alert.alert("Validation", "PIN must contain exactly 4 digits.");
    return;
  }

  if (pin !== confirmPin) {
    Alert.alert("Validation", "PINs do not match.");
    return;
  }

  setLoading(true);

  const res = await registerOwner({
    role: "OWNER",
    block,
    flat_no: flatNo.trim(),
    bhk_type: bhkType,
    owner_name: ownerName.trim(),
    phone: phone.trim(),
    email: email.trim().toLowerCase(),
    otp: otp.trim(),
    pin,
    confirm_pin: confirmPin,
  });

  setLoading(false);

  if (!res.ok) {
    Alert.alert(
      "Registration",
      res.error || "Unable to complete registration."
    );
    return;
  }

  Alert.alert(
    "Success",
    "Your registration has been submitted for committee approval.",
    [
      {
        text: "OK",
        onPress: () => router.replace("/pending"),
      },
    ]
  );
}

  return (

    <KeyboardAvoidingView
    style={{ flex: 1, backgroundColor: COLORS.surface }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    keyboardVerticalOffset={20}
    >

    <ScrollView
    contentContainerStyle={styles.container}
    keyboardShouldPersistTaps="handled"
    keyboardDismissMode="interactive"
    showsVerticalScrollIndicator={false}
    >	

        <Text style={styles.heading}>
          Register Property
        </Text>

        <Text style={styles.sub}>
          Committee approval required
        </Text>

        <Text style={styles.label}>
          Block
        </Text>

        <View style={styles.blockRow}>

          {BLOCKS.map((b)=>(
            <Pressable
              key={b}
              onPress={()=>setBlock(b)}
              style={[
                styles.block,
                block===b && styles.blockSelected
              ]}
            >
              <Text
                style={[
                  styles.blockText,
                  block===b && styles.blockTextSelected
                ]}
              >
                {b}
              </Text>

            </Pressable>
          ))}

        </View>

        <Text style={styles.label}>
          Flat Number
        </Text>

        <TextInput
          style={styles.input}
          value={flatNo}
          onChangeText={setFlatNo}
          keyboardType="number-pad"
        />

        <Text style={styles.label}>
          Flat Type
        </Text>

        <View style={styles.typeRow}>

          <Pressable
            style={[
              styles.typeButton,
              bhkType==="2BHK" && styles.typeSelected
            ]}
            onPress={()=>setBhkType("2BHK")}
          >
            <Text style={styles.typeText}>
              2BHK
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.typeButton,
              bhkType==="3BHK" && styles.typeSelected
            ]}
            onPress={()=>setBhkType("3BHK")}
          >
            <Text style={styles.typeText}>
              3BHK
            </Text>
          </Pressable>

        </View>

        <Text style={styles.label}>
          Owner Name
        </Text>

        <TextInput
          style={styles.input}
          value={ownerName}
          onChangeText={setOwnerName}
        />

        <Text style={styles.label}>
          Phone
        </Text>

        <TextInput
          style={styles.input}
          value={phone}
          keyboardType="phone-pad"
          onChangeText={setPhone}
        />

        <Text style={styles.label}>
          Email
        </Text>

        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        {!otpSent && (

          <Pressable
            style={styles.button}
            onPress={onSendOTP}
            disabled={loading}
          >

            <Text style={styles.buttonText}>

              {loading
                ? "Sending OTP..."
                : "Send OTP"}

            </Text>

          </Pressable>

        )}

        {otpSent && (

          <>
            <Text style={styles.label}>
              OTP
            </Text>

            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={otp}
              onChangeText={(text) => setOtp(text.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
            />

            <Text style={styles.label}>
              PIN
            </Text>

            <View style={styles.pinRow}>

              <TextInput
                style={styles.pinInput}
                secureTextEntry={!showPin}
                keyboardType="number-pad"
                value={pin}
                onChangeText={(text) => setPin(text.replace(/\D/g, "").slice(0, 4))}
                maxLength={4}
                />
	      
             <Pressable
                onPress={()=>setShowPin(!showPin)}
              >

                <Ionicons
                  name={
                    showPin
                    ? "eye-off"
                    : "eye"
                  }
                  size={24}
                  color={COLORS.brand}
                />

              </Pressable>

            </View>

            <Text style={styles.label}>
              Confirm PIN
            </Text>

            <TextInput
              style={styles.input}
              secureTextEntry={!showPin}
              keyboardType="number-pad"
              value={confirmPin}
              onChangeText={(text)=>
              setConfirmPin(
              text.replace(/\D/g,"").slice(0,4)
                )
              }
              maxLength={4}
            />
          <Pressable
          style={styles.button}
          onPress={onRegister}
          disabled={loading}
          >
       <Text style={styles.buttonText}>
        {loading ? "Submitting..." : "Register"}
    </Text>
</Pressable>

          </>

        )}

      </ScrollView>

    </KeyboardAvoidingView>

  );

}

const styles = StyleSheet.create({

container:{
padding:24,
paddingBottom:80,
},

heading:{
fontSize:30,
fontWeight:"700",
color:COLORS.brand,
marginTop:40,
},

sub:{
color:"#999",
marginBottom:25,
},

label:{
color:"#ddd",
marginTop:18,
marginBottom:8,
fontSize:15,
},

input:{
backgroundColor:"#1A1A1A",
borderRadius:12,
padding:15,
color:"white",
borderWidth:1,
borderColor:"#333",
},

blockRow:{
flexDirection:"row",
justifyContent:"space-between",
},

block:{
width:52,
height:52,
borderRadius:12,
justifyContent:"center",
alignItems:"center",
backgroundColor:"#222",
},

blockSelected:{
backgroundColor:COLORS.brand,
},

blockText:{
color:"white",
fontWeight:"700",
},

blockTextSelected:{
color:"black",
},

typeRow:{
flexDirection:"row",
gap:10,
},

typeButton:{
flex:1,
padding:18,
borderRadius:12,
backgroundColor:"#222",
alignItems:"center",
},

typeSelected:{
backgroundColor:COLORS.brand,
},

typeText:{
fontWeight:"700",
},

button:{
marginTop:30,
backgroundColor:COLORS.brand,
padding:18,
borderRadius:12,
alignItems:"center",
},

buttonText:{
fontWeight:"700",
fontSize:16,
color:"black",
},

pinRow:{
flexDirection:"row",
alignItems:"center",
backgroundColor:"#1A1A1A",
borderWidth:1,
borderColor:"#333",
borderRadius:12,
paddingHorizontal:15,
},

pinInput:{
flex:1,
paddingVertical:15,
color:"white",
}

});