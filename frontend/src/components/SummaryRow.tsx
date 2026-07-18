import React from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  COLORS,
} from "@/src/theme";

export default function SummaryRow({

label,

value,

}:any){

return(

<View style={styles.row}>

<Text style={styles.label}>

{label}

</Text>

<Text style={styles.value}>

{value}

</Text>

</View>

);

}

const styles=StyleSheet.create({

row:{
flexDirection:"row",
justifyContent:"space-between",
marginBottom:12,
},

label:{
color:COLORS.onSurfaceSecondary,
fontSize:16,
},

value:{
fontWeight:"700",
color:COLORS.onSurface,
fontSize:16,
},

});