import React,{useEffect,useState} from "react";
import {
View,
Text,
StyleSheet,
Pressable
} from "react-native";

import {API,COLORS} from "@/src/theme";

export default function MyDues(){

const [dues,setDues]=useState<any>();

useEffect(()=>{

load();

},[]);

async function load(){

const block="A";
const flat="101";

const r=await fetch(

`${API}/api/resident/my-dues?block=${block}&flat_no=${flat}`

);

setDues(await r.json());

}

if(!dues){

return null;

}

return(

<View style={styles.container}>

<Text style={styles.title}>
My Dues
</Text>

<Row
title="Current Month"
value={dues.current_month}
/>

<Row
title="Previous Due"
value={dues.previous_due}
/>

<Row
title="Late Fee"
value={dues.late_fee}
/>

<Row
title="Conveyance"
value={dues.conveyance}
/>

<View style={styles.total}>

<Text style={styles.totalText}>
Total
</Text>

<Text style={styles.totalText}>
₹{dues.total_due}
</Text>

</View>

<Pressable
style={styles.button}
>

<Text style={styles.pay}>
PAY NOW
</Text>

</Pressable>

</View>

);

}

function Row({title,value}:any){

return(

<View style={styles.row}>

<Text>{title}</Text>

<Text>
₹{value}
</Text>

</View>

);

}

const styles=StyleSheet.create({

container:{
flex:1,
padding:20,
backgroundColor:"#fff"
},

title:{
fontSize:26,
fontWeight:"700",
marginBottom:20
},

row:{
flexDirection:"row",
justifyContent:"space-between",
paddingVertical:12
},

total:{
marginTop:25,
borderTopWidth:1,
paddingTop:20,
flexDirection:"row",
justifyContent:"space-between"
},

totalText:{
fontWeight:"700",
fontSize:20
},

button:{
marginTop:40,
backgroundColor:COLORS.brand,
padding:18,
borderRadius:12
},

pay:{
textAlign:"center",
fontWeight:"700"
}

});