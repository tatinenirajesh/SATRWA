import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
} from "react-native";

import { router } from "expo-router";

import { API, COLORS } from "@/src/theme";

export default function PayMaintenance() {

  const [dues, setDues] = useState<any>();

  const [upiId, setUpiId] = useState("");

  const [upiRef, setUpiRef] = useState("");

  useEffect(() => {

    load();

  }, []);

  async function load() {

    const block = "A";

    const flat = "101";

    const r = await fetch(
      `${API}/api/resident/my-dues?block=${block}&flat_no=${flat}`
    );

    setDues(await r.json());

  }

  async function submit() {

    const body = {

      block: "A",

      flat_no: "101",

      upi_id: upiId,

      upi_ref_no: upiRef,

    };

    const r = await fetch(

      `${API}/api/pay-maintenance`,

      {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify(body),

      }

    );

    const d = await r.json();

    if (!r.ok) {

      Alert.alert("Error", d.detail || "Payment failed");

      return;

    }

    Alert.alert(

      "Submitted",

      "Payment submitted for verification."

    );

    router.back();

  }

  if (!dues) return null;

  return (

    <View style={styles.container}>

      <Text style={styles.title}>
        Maintenance Payment
      </Text>

      <Text style={styles.amount}>
        ₹ {dues.total_due}
      </Text>

      <TextInput
        placeholder="UPI ID"
        value={upiId}
        onChangeText={setUpiId}
        style={styles.input}
      />

      <TextInput
        placeholder="UPI Reference Number"
        value={upiRef}
        onChangeText={setUpiRef}
        style={styles.input}
      />

      <Pressable
        style={styles.button}
        onPress={submit}
      >

        <Text style={styles.buttonText}>
          Submit Payment
        </Text>

      </Pressable>

    </View>

  );

}

const styles = StyleSheet.create({

container:{

flex:1,

padding:20,

backgroundColor:"#fff",

},

title:{

fontSize:26,

fontWeight:"700",

marginBottom:30,

},

amount:{

fontSize:42,

fontWeight:"700",

color:COLORS.brand,

marginBottom:40,

},

input:{

borderWidth:1,

borderColor:"#ddd",

padding:14,

marginBottom:18,

borderRadius:10,

},

button:{

backgroundColor:COLORS.brand,

padding:18,

borderRadius:12,

},

buttonText:{

textAlign:"center",

fontWeight:"700",

},

});