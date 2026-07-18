import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  COLORS,
  SPACING,
  RADIUS,
  FONTS,
} from "@/src/theme";

const TYPES = [
  "Electrical",
  "Plumbing",
  "Security",
  "Housekeeping",
  "Parking",
  "Lift",
  "Others",
];

export default function Complaints() {

  const [type, setType] = useState("Electrical");

  const [subject, setSubject] = useState("");

  const [description, setDescription] = useState("");

  function submit() {

    if (!subject.trim()) {
      Alert.alert(
        "Validation",
        "Enter complaint subject."
      );
      return;
    }

    if (!description.trim()) {
      Alert.alert(
        "Validation",
        "Enter complaint description."
      );
      return;
    }

    Alert.alert(
      "Success",
      "Complaint submitted successfully."
    );

    setSubject("");

    setDescription("");

  }

  return (

    <SafeAreaView style={styles.container}>

      <ScrollView
        contentContainerStyle={styles.body}
      >

        <View style={styles.header}>

          <Pressable
            onPress={()=>router.back()}
          >

            <Ionicons
              name="arrow-back"
              size={24}
              color={COLORS.brand}
            />

          </Pressable>

          <Text style={styles.title}>
            Complaints
          </Text>

        </View>

        <Text style={styles.label}>
          Complaint Type
        </Text>

        <View style={styles.typeContainer}>

          {TYPES.map((x)=>(

            <Pressable
              key={x}
              style={[
                styles.typeButton,
                type===x &&
                styles.typeSelected
              ]}
              onPress={()=>setType(x)}
            >

              <Text
                style={[
                  styles.typeText,
                  type===x &&
                  styles.typeTextSelected
                ]}
              >
                {x}
              </Text>

            </Pressable>

          ))}

        </View>

        <Text style={styles.label}>
          Subject
        </Text>

        <TextInput
          style={styles.input}
          value={subject}
          onChangeText={setSubject}
          placeholder="Complaint Subject"
          placeholderTextColor="#666"
        />

        <Text style={styles.label}>
          Description
        </Text>

        <TextInput
          style={styles.description}
          multiline
          numberOfLines={6}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your issue..."
          placeholderTextColor="#666"
          textAlignVertical="top"
        />

        <Pressable
          style={styles.button}
          onPress={submit}
        >

          <Text style={styles.buttonText}>
            Submit Complaint
          </Text>

        </Pressable>

      </ScrollView>

    </SafeAreaView>

  );

}

const styles = StyleSheet.create({

container:{
flex:1,
backgroundColor:COLORS.surface,
},

body:{
padding:SPACING.xl,
paddingBottom:80,
},

header:{
flexDirection:"row",
alignItems:"center",
marginBottom:25,
},

title:{
marginLeft:20,
fontSize:28,
fontFamily:FONTS.serif,
color:COLORS.brand,
},

label:{
marginTop:15,
marginBottom:10,
color:COLORS.onSurface,
fontSize:15,
},

typeContainer:{
flexDirection:"row",
flexWrap:"wrap",
},

typeButton:{
paddingHorizontal:18,
paddingVertical:10,
borderRadius:30,
backgroundColor:COLORS.surfaceSecondary,
marginRight:10,
marginBottom:10,
},

typeSelected:{
backgroundColor:COLORS.brand,
},

typeText:{
color:COLORS.onSurface,
},

typeTextSelected:{
color:"#000",
fontWeight:"700",
},

input:{
backgroundColor:COLORS.surfaceSecondary,
borderRadius:RADIUS.md,
padding:16,
color:COLORS.onSurface,
},

description:{
backgroundColor:COLORS.surfaceSecondary,
borderRadius:RADIUS.md,
padding:16,
height:170,
color:COLORS.onSurface,
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

});