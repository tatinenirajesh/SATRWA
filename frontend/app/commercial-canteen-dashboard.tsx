import React, {
  useEffect,
  useState,
} from "react";

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

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  router,
} from "expo-router";

import {
  COLORS,
  SPACING,
  RADIUS,
  FONTS,
} from "@/src/theme";

import {
  getCommercialCurrentBill,
  submitMeterReading,
} from "@/src/services/api";

import {
  clearSession,
  getSession,
} from "@/src/services/session";


export default function CommercialCanteenDashboard() {

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [email, setEmail] =
    useState("");

  const [shopName, setShopName] =
    useState("");

  const [previousReading, setPreviousReading] =
    useState(0);

  const [submittedReading, setSubmittedReading] =
    useState<number | null>(null);

  const [monthlyRent, setMonthlyRent] =
    useState(0);

  const [previousDue, setPreviousDue] =
    useState(0);

  const [electricityAmount, setElectricityAmount] =
    useState(0);

  const [miscellaneousAmount, setMiscellaneousAmount] =
    useState(0);

  const [miscellaneousDescription, setMiscellaneousDescription] =
    useState("");

  const [totalDue, setTotalDue] =
    useState(0);

  const [newReading, setNewReading] =
    useState("");


  async function loadDashboard() {

    try {

      setLoading(true);

      const session =
        await getSession();

      if (!session?.email) {

        Alert.alert(
          "Session Error",
          "Unable to find your account session."
        );

        router.replace(
          "/commercial-canteen"
        );

        return;

      }

      setEmail(
        session.email
      );

      const result =
        await getCommercialCurrentBill(
          session.email
        );

      if (!result.ok) {

        Alert.alert(
          "Error",
          result.error ||
            "Unable to load account details."
        );

        return;

      }

      const data =
        result.data;

      console.log(
        "COMMERCIAL BILL DATA:",
        data
      );

      setShopName(
        data.shop_name || ""
      );

      setPreviousReading(
        Number(
          data.previous_reading || 0
        )
      );

      /*
       * If the current month's reading
       * already exists, show payment/edit mode.
       */
      if (
        data.current_reading !== null &&
        data.current_reading !== undefined &&
        Number(data.current_reading) > 0
      ) {

        setSubmittedReading(
          Number(
            data.current_reading
          )
        );

      } else {

        setSubmittedReading(
          null
        );

      }

      setMonthlyRent(
        Number(
          data.monthly_rent || 0
        )
      );

      setPreviousDue(
        Number(
          data.previous_due || 0
        )
      );

      setElectricityAmount(
        Number(
          data.electricity_amount || 0
        )
      );

      setMiscellaneousAmount(
        Number(
          data.miscellaneous_amount || 0
        )
      );

      setMiscellaneousDescription(
        data.miscellaneous_description || ""
      );

      setTotalDue(
        Number(
          data.total_due || 0
        )
      );

    } catch (error) {

      console.log(
        "Dashboard Load Error:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to load your account."
      );

    } finally {

      setLoading(false);

    }

  }


  useEffect(() => {

    loadDashboard();

  }, []);


  async function handleSubmitReading() {

    if (!newReading.trim()) {

      Alert.alert(
        "Required",
        "Please enter the current meter reading."
      );

      return;

    }

    const reading =
      Number(newReading);

    if (
      isNaN(reading)
    ) {

      Alert.alert(
        "Invalid Reading",
        "Please enter a valid meter reading."
      );

      return;

    }

    if (
      reading < previousReading
    ) {

      Alert.alert(
        "Invalid Reading",
        `Current reading cannot be less than ${previousReading}.`
      );

      return;

    }

    try {

      setSubmitting(true);

      const result =
        await submitMeterReading(
          email,
          reading
        );

      if (!result.ok) {

        Alert.alert(
          "Submission Failed",
          result.error ||
            "Unable to submit meter reading."
        );

        return;

      }

      console.log(
        "METER READING RESPONSE:",
        result.data
      );

      setSubmittedReading(
        reading
      );

      setNewReading("");

      await loadDashboard();

      Alert.alert(
        "Success",
        `Meter reading submitted successfully.

Units Consumed: ${result.data.electricity_units}

Electricity Amount: ₹${result.data.electricity_amount}`
      );

    } catch (error) {

      console.log(
        "Meter Reading Error:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to submit meter reading."
      );

    } finally {

      setSubmitting(false);

    }

  }


  function handleEditReading() {

    if (
      submittedReading !== null
    ) {

      setNewReading(
        String(
          submittedReading
        )
      );

    }

    setSubmittedReading(
      null
    );

  }


  function handlePay() {

    router.push({
      pathname: "/payment",
      params: {
        email,
        amount: String(totalDue),
        account_type: "CANTEEN",
        shop_name: shopName,
      },
    });

  }


  async function handleLogout() {

    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",

          onPress: async () => {

            await clearSession();

            router.replace(
              "/"
            );

          },
        },
      ]
    );

  }


  if (loading) {

    return (

      <SafeAreaView
        style={styles.container}
      >

        <View
          style={styles.center}
        >

          <Text
            style={styles.loadingText}
          >
            Loading account...
          </Text>

        </View>

      </SafeAreaView>

    );

  }


  return (

    <SafeAreaView
      style={styles.container}
    >

      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
      >

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.body,
            { flexGrow: 1 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >

          <Text
            style={styles.title}
          >
            Canteen Dashboard
          </Text>


          <Text
            style={styles.shopName}
          >
            {shopName}
          </Text>


          {/* CURRENT BILL */}

          <View
            style={styles.billCard}
          >

            <Text
              style={styles.sectionTitle}
            >
              Current Bill
            </Text>


            {previousDue > 0 && (

              <View
                style={styles.row}
              >

                <Text
                  style={styles.label}
                >
                  Previous Due
                </Text>

                <Text
                  style={styles.value}
                >
                  ₹{previousDue.toFixed(2)}
                </Text>

              </View>

            )}


            <View
              style={styles.row}
            >

              <Text
                style={styles.label}
              >
                Monthly Rent
              </Text>

              <Text
                style={styles.value}
              >
                ₹{monthlyRent.toFixed(2)}
              </Text>

            </View>


            <View
              style={styles.row}
            >

              <Text
                style={styles.label}
              >
                Electricity Charges
              </Text>

              <Text
                style={styles.value}
              >
                ₹{electricityAmount.toFixed(2)}
              </Text>

            </View>


            {miscellaneousAmount > 0 && (

              <View
                style={styles.row}
              >

                <Text
                  style={styles.label}
                >
                  {
                    miscellaneousDescription ||
                    "Miscellaneous"
                  }
                </Text>

                <Text
                  style={styles.value}
                >
                  ₹{miscellaneousAmount.toFixed(2)}
                </Text>

              </View>

            )}


            <View
              style={styles.divider}
            />


            <View
              style={styles.row}
            >

              <Text
                style={styles.totalLabel}
              >
                Total Due
              </Text>

              <Text
                style={styles.totalValue}
              >
                ₹{totalDue.toFixed(2)}
              </Text>

            </View>

          </View>


          {/* METER READING */}

          <View
            style={styles.meterCard}
          >

            <Text
              style={styles.sectionTitle}
            >
              Meter Reading
            </Text>


            <Text
              style={styles.label}
            >
              Previous Reading
            </Text>

            <View
              style={styles.readingBox}
            >

              <Text
                style={styles.readingText}
              >
                {previousReading}
              </Text>

            </View>


            {
              submittedReading !== null
                ? (

                  <>
                    <Text
                      style={styles.label}
                    >
                      Current Reading
                    </Text>

                    <View
                      style={styles.readingBox}
                    >

                      <Text
                        style={styles.readingText}
                      >
                        {submittedReading}
                      </Text>

                    </View>


                    <View
                      style={styles.actionRow}
                    >

                      <Pressable
                        style={styles.editButton}
                        onPress={handleEditReading}
                      >

                        <Text
                          style={styles.editText}
                        >
                          Edit Reading
                        </Text>

                      </Pressable>


                      <Pressable
                        style={styles.payButton}
                        onPress={handlePay}
                      >

                        <Text
                          style={styles.payText}
                        >
                          Pay ₹{totalDue.toFixed(2)}
                        </Text>

                      </Pressable>

                    </View>

                  </>
                )
                : (

                  <>
                    <Text
                      style={styles.label}
                    >
                      Enter Current Reading
                    </Text>


                    <TextInput
                      value={newReading}
                      onChangeText={setNewReading}
                      placeholder={
                        `Enter reading above ${previousReading}`
                      }
                      placeholderTextColor={
                        COLORS.muted
                      }
                      keyboardType="numeric"
                      style={styles.input}
                    />


                    <Pressable
                      style={[
                        styles.submitButton,

                        submitting &&
                          styles.disabledButton,
                      ]}
                      disabled={
                        submitting
                      }
                      onPress={
                        handleSubmitReading
                      }
                    >

                      <Text
                        style={styles.submitText}
                      >

                        {
                          submitting
                            ? "Submitting..."
                            : "Submit Meter Reading"
                        }

                      </Text>

                    </Pressable>

                  </>
                )
            }

          </View>


          <Pressable
            style={styles.backButton}
            onPress={handleLogout}
          >

            <Text
              style={styles.backText}
            >
              Logout
            </Text>

          </Pressable>

        </ScrollView>

      </KeyboardAvoidingView>

    </SafeAreaView>

  );

}


const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor:
        COLORS.surface,
    },

    body: {
      padding:
        SPACING.xl,

      paddingBottom:
        50,
    },

    center: {
      flex: 1,

      justifyContent:
        "center",

      alignItems:
        "center",
    },

    loadingText: {
      color:
        COLORS.muted,

      fontSize:
        16,
    },

    title: {
      color:
        COLORS.brand,

      fontSize:
        30,

      fontFamily:
        FONTS.serif,

      textAlign:
        "center",
    },

    shopName: {
      color:
        COLORS.muted,

      fontSize:
        16,

      textAlign:
        "center",

      marginTop:
        8,

      marginBottom:
        SPACING.xl,
    },

    billCard: {
      backgroundColor:
        COLORS.surfaceSecondary,

      borderRadius:
        RADIUS.lg,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      padding:
        SPACING.xl,

      marginBottom:
        SPACING.xl,
    },

    meterCard: {
      backgroundColor:
        COLORS.surfaceSecondary,

      borderRadius:
        RADIUS.lg,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      padding:
        SPACING.xl,
    },

    sectionTitle: {
      color:
        COLORS.onSurface,

      fontSize:
        22,

      fontFamily:
        FONTS.serif,

      marginBottom:
        SPACING.lg,
    },

    row: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      marginBottom:
        SPACING.md,
    },

    label: {
      color:
        COLORS.muted,

      fontSize:
        15,

      marginBottom:
        8,
    },

    value: {
      color:
        COLORS.onSurface,

      fontSize:
        16,

      fontWeight:
        "600",
    },

    divider: {
      height:
        1,

      backgroundColor:
        COLORS.border,

      marginVertical:
        SPACING.md,
    },

    totalLabel: {
      color:
        COLORS.onSurface,

      fontSize:
        18,

      fontWeight:
        "700",
    },

    totalValue: {
      color:
        COLORS.brand,

      fontSize:
        20,

      fontWeight:
        "700",
    },

    readingBox: {
      backgroundColor:
        COLORS.surface,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADIUS.md,

      padding:
        16,

      marginBottom:
        SPACING.lg,
    },

    readingText: {
      color:
        COLORS.onSurface,

      fontSize:
        18,

      fontWeight:
        "600",
    },

    input: {
      backgroundColor:
        COLORS.surface,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        RADIUS.md,

      padding:
        16,

      color:
        COLORS.onSurface,

      fontSize:
        17,

      marginBottom:
        SPACING.lg,
    },

    submitButton: {
      backgroundColor:
        COLORS.brand,

      padding:
        18,

      borderRadius:
        RADIUS.md,

      alignItems:
        "center",
    },

    actionRow: {
      flexDirection:
        "row",

      gap:
        SPACING.md,
    },

    editButton: {
      flex: 1,

      borderWidth:
        1,

      borderColor:
        COLORS.brand,

      padding:
        18,

      borderRadius:
        RADIUS.md,

      alignItems:
        "center",
    },

    payButton: {
      flex: 1,

      backgroundColor:
        COLORS.brand,

      padding:
        18,

      borderRadius:
        RADIUS.md,

      alignItems:
        "center",
    },

    editText: {
      color:
        COLORS.brand,

      fontSize:
        15,

      fontWeight:
        "700",
    },

    payText: {
      color:
        COLORS.onBrand,

      fontSize:
        15,

      fontWeight:
        "700",
    },

    disabledButton: {
      opacity:
        0.6,
    },

    submitText: {
      color:
        COLORS.onBrand,

      fontSize:
        16,

      fontWeight:
        "700",
    },

    backButton: {
      alignItems:
        "center",

      marginTop:
        25,

      padding:
        12,
    },

    backText: {
      color:
        COLORS.brand,

      fontSize:
        16,

      fontFamily:
        FONTS.sans,
    },

  });