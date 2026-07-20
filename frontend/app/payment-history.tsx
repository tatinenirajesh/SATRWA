import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { API, COLORS } from "@/src/theme";

import { getSession } from "@/src/services/session";

export default function PaymentHistory() {

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);

async function load() {

  try {

    const session = await getSession();

    if (!session) {

      setLoading(false);
      return;

    }

    const res = await fetch(
      `${API}/api/resident/payment-history?block=${session.block}&flat_no=${session.flat_no}`
    );

    const data = await res.json();

    setPayments(data);

  } catch (e) {

    console.log(e);

  }

  setLoading(false);

}

  useEffect(() => {

    load();

  }, []);

  if (loading) {

    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );

  }

  return (

    <ScrollView style={styles.container}>

      {payments.map((p, index) => (

        <View
          key={index}
          style={styles.card}
        >

          <Text style={styles.title}>
            {p.payment_type}
          </Text>

          <Text>
            Receipt :
            {p.receipt_no || "--"}
          </Text>

          <Text>
            Payment Mode :
            {p.payment_mode || "--"}
          </Text>

          <Text>
            UPI Ref :
            {p.upi_ref_no || "--"}
          </Text>

          <Text>
            Verified By :
            {p.verified_by || "--"}
          </Text>

          <Text>
            Amount :
            ₹{p.total_amount}
          </Text>

          <Text>
            Status :
            {p.status}
          </Text>

          <Text>
            Date :
            {p.paid_date}
          </Text>

        </View>

      ))}

    </ScrollView>

  );

}

const styles = StyleSheet.create({

  container:{
    flex:1,
    backgroundColor:"#fff",
    padding:16
  },

  card:{
    backgroundColor:"#fff",
    padding:16,
    marginBottom:12,
    borderRadius:10,
    borderWidth:1,
    borderColor:"#ddd"
  },

  title:{
    fontSize:18,
    fontWeight:"bold",
    color:COLORS.brand,
    marginBottom:8
  },

  center:{
    flex:1,
    justifyContent:"center",
    alignItems:"center"
  }

});