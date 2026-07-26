import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function CommunityHallPayment() {

    const params = useLocalSearchParams();

    return (

        <View
            style={{
                flex:1,
                justifyContent:"center",
                alignItems:"center"
            }}
        >

            <Text>Community Hall Payment</Text>

            <Text>
                Payment ID : {params.payment_id}
            </Text>

            <Text>
                Amount : ₹{params.amount}
            </Text>

        </View>

    );

}