import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
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
  useFocusEffect,
} from "expo-router";

import {
  COLORS,
  SPACING,
  RADIUS,
  FONTS,
} from "@/src/theme";

import {
  addCorporateFlat,
  getCorporateProfile,
  removeCorporateFlat,
  requestCorporateGatePass,
} from "@/src/services/api";

import {
  clearSession,
  getSession,
  Session,
} from "@/src/services/session";


type CorporateFlat = {

  block: string;

  flat_no: string;

  bhk_type:
    | "2BHK"
    | "3BHK"
    | "DUPLEX";

  dues: {

    total_due?: number;

    current_month?: string;

    current_month_pending?: boolean;

    rate?: number;

  };

};


export default function CorporateDashboard() {

  const [
    session,
    setSession,
  ] = useState<
    Session | null
  >(null);


  const [
    flats,
    setFlats,
  ] = useState<
    CorporateFlat[]
  >([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    adding,
    setAdding,
  ] = useState(false);


  const [
    block,
    setBlock,
  ] = useState("");


  const [
    flatNo,
    setFlatNo,
  ] = useState("");


  const [
    bhkType,
    setBhkType,
  ] = useState<
    "2BHK" | "3BHK" | "DUPLEX"
  >(
    "2BHK"
  );


  const [
    gatePassBlock,
    setGatePassBlock,
  ] = useState("");


  const [
    gatePassFlat,
    setGatePassFlat,
  ] = useState("");


  const [
    moveOutDate,
    setMoveOutDate,
  ] = useState("");


  const [
    vehicleNumber,
    setVehicleNumber,
  ] = useState("");


  const [
    reason,
    setReason,
  ] = useState("");


  const [
    showGatePass,
    setShowGatePass,
  ] = useState(false);


  const loadDashboard =
    useCallback(
      async () => {

        setLoading(
          true
        );


        try {

          const currentSession =
            await getSession();


          if (
            !currentSession
            ||
            currentSession.role
              !== "CORPORATE"
          ) {

            Alert.alert(
              "Session Error",
              "Unable to find your account session."
            );

            router.replace(
              "/corporate-account"
            );

            return;
          }


          setSession(
            currentSession
          );


          const result =
            await getCorporateProfile(
              currentSession.id
            );


          if (!result.ok) {

            Alert.alert(
              "Error",
              result.error ||
                "Unable to load your flats."
            );

            return;
          }


          setFlats(
            result.data?.payer?.flats ||
              []
          );

        } finally {

          setLoading(
            false
          );

        }

      },
      []
    );


  useEffect(
    () => {

      loadDashboard();

    },
    [
      loadDashboard,
    ]
  );


  useFocusEffect(
    useCallback(
      () => {

        loadDashboard();

      },
      [
        loadDashboard,
      ]
    )
  );


  const totalDue =
    useMemo(
      () =>
        flats.reduce(
          (
            total,
            flat
          ) =>
            total +
            Number(
              flat.dues?.total_due ||
                0
            ),
          0
        ),
      [
        flats,
      ]
    );


  async function handleAddFlat() {

    if (
      !session
    ) {

      return;
    }


    if (
      !block.trim()
      ||
      !flatNo.trim()
    ) {

      Alert.alert(
        "Required",
        "Please enter both block and flat number."
      );

      return;
    }


    setAdding(
      true
    );


    try {

      const result =
        await addCorporateFlat(
          session.id,
          block,
          flatNo,
          bhkType
        );


      if (!result.ok) {

        Alert.alert(
          "Unable to Add Flat",
          result.error ||
            "Unable to add the flat."
        );

        return;
      }


      setBlock(
        ""
      );

      setFlatNo(
        ""
      );

      setBhkType(
        "2BHK"
      );


      await loadDashboard();

    } finally {

      setAdding(
        false
      );

    }

  }


  function handleRemoveFlat(
    flat: CorporateFlat
  ) {

    if (
      !session
    ) {

      return;
    }


    Alert.alert(
      "Remove Flat",
      `Remove ${flat.block}-${flat.flat_no} from your account?`,
      [
        {
          text:
            "Cancel",

          style:
            "cancel",
        },

        {
          text:
            "Remove",

          style:
            "destructive",

          onPress:
            async () => {

              const result =
                await removeCorporateFlat(
                  session.id,
                  flat.block,
                  flat.flat_no
                );


              if (!result.ok) {

                Alert.alert(
                  "Error",
                  result.error ||
                    "Unable to remove flat."
                );

                return;
              }


              await loadDashboard();

            },
        },
      ]
    );

  }


  async function handleGatePassRequest() {

    if (
      !session
    ) {

      return;
    }


    if (
      !gatePassBlock.trim()
      ||
      !gatePassFlat.trim()
      ||
      !moveOutDate.trim()
      ||
      !vehicleNumber.trim()
      ||
      !reason.trim()
    ) {

      Alert.alert(
        "Required",
        "Please complete all gate pass details."
      );

      return;
    }


    const result =
      await requestCorporateGatePass({

        payer_id:
          session.id,

        block:
          gatePassBlock,

        flat_no:
          gatePassFlat,

        move_out_date:
          moveOutDate,

        vehicle_number:
          vehicleNumber,

        reason:
          reason,

      });


    if (!result.ok) {

      Alert.alert(
        "Gate Pass Request Failed",
        result.error ||
          "Unable to request gate pass."
      );

      return;
    }


    setShowGatePass(
      false
    );


    setGatePassBlock(
      ""
    );

    setGatePassFlat(
      ""
    );

    setMoveOutDate(
      ""
    );

    setVehicleNumber(
      ""
    );

    setReason(
      ""
    );


    Alert.alert(
      "Request Submitted",
      "Your gate pass request has been submitted for admin approval."
    );

  }


  async function handleLogout() {

    await clearSession();

    router.replace(
      "/corporate-account"
    );

  }


  if (loading) {

    return (

      <SafeAreaView
        style={
          styles.container
        }
      >

        <View
          style={
            styles.loadingContainer
          }
        >

          <Text
            style={
              styles.loadingText
            }
          >
            Loading...
          </Text>

        </View>

      </SafeAreaView>

    );

  }


  return (

    <SafeAreaView
      style={
        styles.container
      }
    >

      <ScrollView
        contentContainerStyle={
          styles.body
        }
      >

        <Text
          style={
            styles.title
          }
        >
          School / Company
        </Text>


        <Text
          style={
            styles.organizationName
          }
        >
          {
            session?.name ||
              ""
          }
        </Text>


        <View
          style={
            styles.summaryCard
          }
        >

          <Text
            style={
              styles.summaryTitle
            }
          >
            Total Outstanding Due
          </Text>


          <Text
            style={
              styles.totalAmount
            }
          >
            ₹{
              totalDue.toFixed(
                2
              )
            }
          </Text>


          <Text
            style={
              styles.summaryText
            }
          >
            Total due across all flats registered under your account.
          </Text>

        </View>


        <Text
          style={
            styles.sectionTitle
          }
        >
          Add Flat
        </Text>


        <View
          style={
            styles.card
          }
        >

          <Text
            style={
              styles.label
            }
          >
            Block
          </Text>

          <TextInput
            value={
              block
            }
            onChangeText={
              setBlock
            }
            placeholder="Example: A"
            placeholderTextColor={
              COLORS.muted
            }
            autoCapitalize="characters"
            style={
              styles.input
            }
          />


          <Text
            style={
              styles.label
            }
          >
            Flat Number
          </Text>

          <TextInput
            value={
              flatNo
            }
            onChangeText={
              setFlatNo
            }
            placeholder="Example: 101"
            placeholderTextColor={
              COLORS.muted
            }
            style={
              styles.input
            }
          />


          <Text
            style={
              styles.label
            }
          >
            Flat Type
          </Text>


          <View
            style={
              styles.bhkRow
            }
          >

            {
              (
                [
                  "2BHK",
                  "3BHK",
                  "DUPLEX",
                ] as const
              ).map(
                (
                  type
                ) => (

                  <Pressable
                    key={
                      type
                    }
                    style={[
                      styles.bhkButton,

                      bhkType
                        === type
                        &&
                        styles.bhkButtonSelected,
                    ]}
                    onPress={() =>
                      setBhkType(
                        type
                      )
                    }
                  >

                    <Text
                      style={[
                        styles.bhkText,

                        bhkType
                          === type
                          &&
                          styles.bhkTextSelected,
                      ]}
                    >
                      {type}
                    </Text>

                  </Pressable>

                )
              )
            }

          </View>


          <Pressable
            style={[
              styles.primaryButton,

              adding &&
                styles.disabledButton,
            ]}
            disabled={
              adding
            }
            onPress={
              handleAddFlat
            }
          >

            <Text
              style={
                styles.primaryButtonText
              }
            >
              {
                adding
                  ? "Adding..."
                  : "Add Flat"
              }
            </Text>

          </Pressable>

        </View>


        <Text
          style={
            styles.sectionTitle
          }
        >
          My Flats
        </Text>


        {
          flats.length === 0 && (

            <View
              style={
                styles.emptyCard
              }
            >

              <Text
                style={
                  styles.emptyText
                }
              >
                No flats added yet.
              </Text>

            </View>

          )
        }


        {
          flats.map(
            (
              flat
            ) => {

              const due =
                Number(
                  flat.dues?.total_due ||
                    0
                );

              const currentRate =
                Number(
                  flat.dues?.rate ||
                    0
                );


              return (

                <View
                  key={
                    `${flat.block}-${flat.flat_no}`
                  }
                  style={
                    styles.flatCard
                  }
                >

                  <View
                    style={
                      styles.flatHeader
                    }
                  >

                    <View>

                      <Text
                        style={
                          styles.flatTitle
                        }
                      >
                        {flat.block}-{flat.flat_no}
                      </Text>

                      <Text
                        style={
                          styles.flatType
                        }
                      >
                        {flat.bhk_type}
                      </Text>

                    </View>


                    <Pressable
                      onPress={() =>
                        handleRemoveFlat(
                          flat
                        )
                      }
                    >

                      <Text
                        style={
                          styles.removeText
                        }
                      >
                        Remove
                      </Text>

                    </Pressable>

                  </View>


                  <View
                    style={
                      styles.divider
                    }
                  />


                  <View
                    style={
                      styles.dueRow
                    }
                  >

                    <Text
                      style={
                        styles.dueLabel
                      }
                    >
                      Total Due
                    </Text>

                    <Text
                      style={
                        due > 0
                          ? styles.dueAmount
                          : styles.noDueAmount
                      }
                    >
                      ₹{
                        due.toFixed(
                          2
                        )
                      }
                    </Text>

                  </View>


                  {
                    due === 0 && (

                      <View
                        style={
                          styles.dueRow
                        }
                      >

                        <Text
                          style={
                            styles.dueLabel
                          }
                        >
                          Current Month Charge
                        </Text>

                        <Text
                          style={
                            styles.currentRate
                          }
                        >
                          ₹{
                            currentRate.toFixed(
                              2
                            )
                          }
                        </Text>

                      </View>

                    )
                  }

                </View>

              );

            }
          )
        }


        <Pressable
          style={
            styles.primaryButton
          }
          onPress={() => {

            if (
              totalDue <= 0
            ) {

              Alert.alert(
                "No Due",
                "There is currently no outstanding amount to pay."
              );

              return;
            }


            Alert.alert(
              "Payment",
              `Total amount ₹${totalDue.toFixed(2)} will be used for payment integration in the next step.`
            );

          }}
        >

          <Text
            style={
              styles.primaryButtonText
            }
          >
            Pay Total ₹{
              totalDue.toFixed(
                2
              )
            }
          </Text>

        </Pressable>


        <Pressable
          style={
            styles.gatePassButton
          }
          onPress={() =>
            setShowGatePass(
              !showGatePass
            )
          }
        >

          <Text
            style={
              styles.gatePassButtonText
            }
          >
            Issue Gate Pass
          </Text>

        </Pressable>


        {
          showGatePass && (

            <View
              style={
                styles.card
              }
            >

              <Text
                style={
                  styles.sectionTitleSmall
                }
              >
                Gate Pass Request
              </Text>


              <TextInput
                value={
                  gatePassBlock
                }
                onChangeText={
                  setGatePassBlock
                }
                placeholder="Block"
                placeholderTextColor={
                  COLORS.muted
                }
                autoCapitalize="characters"
                style={
                  styles.input
                }
              />


              <TextInput
                value={
                  gatePassFlat
                }
                onChangeText={
                  setGatePassFlat
                }
                placeholder="Flat Number"
                placeholderTextColor={
                  COLORS.muted
                }
                style={
                  styles.input
                }
              />


              <TextInput
                value={
                  moveOutDate
                }
                onChangeText={
                  setMoveOutDate
                }
                placeholder="Move Out Date (YYYY-MM-DD)"
                placeholderTextColor={
                  COLORS.muted
                }
                style={
                  styles.input
                }
              />


              <TextInput
                value={
                  vehicleNumber
                }
                onChangeText={
                  setVehicleNumber
                }
                placeholder="Vehicle Number"
                placeholderTextColor={
                  COLORS.muted
                }
                autoCapitalize="characters"
                style={
                  styles.input
                }
              />


              <TextInput
                value={
                  reason
                }
                onChangeText={
                  setReason
                }
                placeholder="Reason"
                placeholderTextColor={
                  COLORS.muted
                }
                style={
                  styles.input
                }
              />


              <Pressable
                style={
                  styles.primaryButton
                }
                onPress={
                  handleGatePassRequest
                }
              >

                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Submit Gate Pass Request
                </Text>

              </Pressable>

            </View>

          )
        }


        <Pressable
          style={
            styles.logoutButton
          }
          onPress={
            handleLogout
          }
        >

          <Text
            style={
              styles.logoutText
            }
          >
            Logout
          </Text>

        </Pressable>

      </ScrollView>

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

    loadingContainer: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
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
      marginTop:
        15,
    },

    organizationName: {
      color:
        COLORS.muted,
      textAlign:
        "center",
      marginTop:
        8,
      marginBottom:
        SPACING.xl,
    },

    summaryCard: {
      backgroundColor:
        COLORS.surfaceSecondary,
      borderWidth:
        1,
      borderColor:
        COLORS.border,
      borderRadius:
        RADIUS.lg,
      padding:
        SPACING.xl,
    },

    summaryTitle: {
      color:
        COLORS.onSurface,
      fontSize:
        20,
      fontFamily:
        FONTS.serif,
    },

    totalAmount: {
      color:
        COLORS.brand,
      fontSize:
        30,
      fontWeight:
        "700",
      marginTop:
        SPACING.md,
    },

    summaryText: {
      color:
        COLORS.muted,
      marginTop:
        SPACING.sm,
      lineHeight:
        20,
    },

    sectionTitle: {
      color:
        COLORS.onSurface,
      fontSize:
        22,
      fontFamily:
        FONTS.serif,
      marginTop:
        SPACING.xxl,
      marginBottom:
        SPACING.md,
    },

    sectionTitleSmall: {
      color:
        COLORS.onSurface,
      fontSize:
        19,
      fontFamily:
        FONTS.serif,
      marginBottom:
        SPACING.lg,
    },

    card: {
      backgroundColor:
        COLORS.surfaceSecondary,
      borderWidth:
        1,
      borderColor:
        COLORS.border,
      borderRadius:
        RADIUS.lg,
      padding:
        SPACING.lg,
      marginBottom:
        SPACING.lg,
    },

    label: {
      color:
        COLORS.onSurface,
      marginBottom:
        8,
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
        14,
      color:
        COLORS.onSurface,
      marginBottom:
        SPACING.md,
    },

    bhkRow: {
      flexDirection:
        "row",
      gap:
        8,
      marginBottom:
        SPACING.md,
    },

    bhkButton: {
      flex: 1,
      borderWidth:
        1,
      borderColor:
        COLORS.border,
      borderRadius:
        RADIUS.md,
      paddingVertical:
        12,
      alignItems:
        "center",
    },

    bhkButtonSelected: {
      backgroundColor:
        COLORS.brand,
      borderColor:
        COLORS.brand,
    },

    bhkText: {
      color:
        COLORS.onSurface,
      fontWeight:
        "600",
    },

    bhkTextSelected: {
      color:
        COLORS.onBrand,
    },

    primaryButton: {
      backgroundColor:
        COLORS.brand,
      borderRadius:
        RADIUS.md,
      padding:
        17,
      alignItems:
        "center",
      marginTop:
        SPACING.md,
    },

    disabledButton: {
      opacity:
        0.6,
    },

    primaryButtonText: {
      color:
        COLORS.onBrand,
      fontWeight:
        "700",
      fontSize:
        16,
    },

    emptyCard: {
      padding:
        SPACING.xl,
      borderRadius:
        RADIUS.md,
      borderWidth:
        1,
      borderColor:
        COLORS.border,
      alignItems:
        "center",
    },

    emptyText: {
      color:
        COLORS.muted,
    },

    flatCard: {
      backgroundColor:
        COLORS.surfaceSecondary,
      borderWidth:
        1,
      borderColor:
        COLORS.border,
      borderRadius:
        RADIUS.lg,
      padding:
        SPACING.lg,
      marginBottom:
        SPACING.md,
    },

    flatHeader: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      alignItems:
        "center",
    },

    flatTitle: {
      color:
        COLORS.onSurface,
      fontSize:
        20,
      fontFamily:
        FONTS.serif,
    },

    flatType: {
      color:
        COLORS.muted,
      marginTop:
        4,
    },

    removeText: {
      color:
        "#DC2626",
      fontWeight:
        "700",
    },

    divider: {
      height:
        1,
      backgroundColor:
        COLORS.border,
      marginVertical:
        SPACING.md,
    },

    dueRow: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      marginBottom:
        8,
    },

    dueLabel: {
      color:
        COLORS.muted,
    },

    dueAmount: {
      color:
        COLORS.brand,
      fontWeight:
        "700",
    },

    noDueAmount: {
      color:
        "#16A34A",
      fontWeight:
        "700",
    },

    currentRate: {
      color:
        COLORS.onSurface,
      fontWeight:
        "700",
    },

    gatePassButton: {
      borderWidth:
        1,
      borderColor:
        COLORS.brand,
      borderRadius:
        RADIUS.md,
      padding:
        17,
      alignItems:
        "center",
      marginTop:
        SPACING.md,
    },

    gatePassButtonText: {
      color:
        COLORS.brand,
      fontWeight:
        "700",
    },

    logoutButton: {
      alignItems:
        "center",
      marginTop:
        SPACING.xxl,
    },

    logoutText: {
      color:
        COLORS.brand,
      fontSize:
        16,
    },

  });