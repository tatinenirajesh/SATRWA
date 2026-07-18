import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { API, COLORS } from "@/src/theme";

export default function PaymentHistory() {

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);

  async function load() {

    try {

      // TODO:
      // Later replace these with logged-in resident details

      const block = "A";
      const flat_no = "101";

      const res = await fetch(
        `${API}/api/resident/payment-history?block=${block}&flat_no=${flat_no}`
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
            {p.receipt_no || "Pending"}
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