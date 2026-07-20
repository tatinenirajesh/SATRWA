import React, { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { API, COLORS } from "@/src/theme";

export default function ForgotPin(){

    const[email,setEmail]=useState("");
    const[otp,setOtp]=useState("");
    const[newPin,setNewPin]=useState("");
    const[confirmPin,setConfirmPin]=useState("");
    const[otpSent,setOtpSent]=useState(false);
    const [loading, setLoading] = useState(false);

    async function sendOTP() {

        if (loading) return;

        setLoading(true);

        try {

            const r = await fetch(
                `${API}/auth/request-pin-reset`,
                {
                    method:"POST",
                    headers:{
                        "Content-Type":"application/json"
                    },
                    body:JSON.stringify({
                        email
                    })
                }
            );

            const d = await r.json();

            if(!r.ok){
                Alert.alert("Error", d.detail);
                return;
            }

            setOtpSent(true);

            Alert.alert(
                "Success",
                "OTP sent successfully."
            );

        } finally {

            setLoading(false);

        }
    }

    async function resetPin(){

        const r=await fetch(
            `${API}/api/auth/reset-pin`,
            {
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify({
                    email,
                    otp,
                    new_pin:newPin,
                    confirm_pin:confirmPin
                })
            }
        );

        const d=await r.json();

        if(!r.ok){

            Alert.alert("Error",d.detail);
            return;

        }

        Alert.alert(
            "Success",
            "PIN reset successfully.",
            [
                {
                    text:"OK",
                    onPress:()=>router.back()
                }
            ]
        );

    }

    return(

        <SafeAreaView style={styles.container}>

            <Text style={styles.title}>
                Forgot PIN
            </Text>

            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
            />

            {!otpSent?(
                <Pressable
                    style={styles.button}
                    onPress={sendOTP}
                    disabled={loading}
                >
                    <Text style={styles.text}>
                        {loading ? "Sending..." : "Send OTP"}
                    </Text>
                </Pressable>
            ):(
                <>

                <TextInput
                    style={styles.input}
                    placeholder="OTP"
                    value={otp}
                    onChangeText={setOtp}
                />

                <TextInput
                    style={styles.input}
                    placeholder="New PIN"
                    value={newPin}
                    onChangeText={setNewPin}
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={4}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Confirm PIN"
                    value={confirmPin}
                    onChangeText={setConfirmPin}
                    keyboardType="number-pad"
                    secureTextEntry
                    maxLength={4}
                />

                <Pressable
                    style={styles.button}
                    onPress={resetPin}
                >
                    <Text style={styles.text}>
                        Reset PIN
                    </Text>
                </Pressable>

                </>
            )}

        </SafeAreaView>

    );

}

const styles=StyleSheet.create({

container:{
flex:1,
padding:20,
backgroundColor:"#fff"
},

title:{
fontSize:30,
fontWeight:"700",
marginBottom:30
},

input:{
borderWidth:1,
borderColor:"#ddd",
padding:15,
marginBottom:15,
borderRadius:10
},

button:{
backgroundColor:COLORS.brand,
padding:18,
borderRadius:10,
alignItems:"center"
},

text:{
fontWeight:"700"
}

});