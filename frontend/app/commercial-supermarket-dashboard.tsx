import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
  FONTS,
  RADIUS,
  SPACING,
} from "@/src/theme";

import {
  getCommercialCurrentBill,
  getCommercialPaymentHistory,
} from "@/src/services/api";

import {
  clearSession,
  getSession,
} from "@/src/services/session";


type CurrentBill = {
  id?: string;

  shop_name?: string;

  billing_month?: string;

  previous_due?: number;

  monthly_rent?: number;

  miscellaneous_amount?: number;

  miscellaneous_description?: string;

  total_due?: number;

  amount_paid?: number;

  balance_due?: number;

  status?: string;
};


type Payment = {
  id?: string;

  billing_month?: string;

  amount?: number;

  amount_paid?: number;

  payment_amount?: number;

  payment_date?: string;

  status?: string;

  transaction_id?: string;

  transaction_ref?: string;

  txn_ref?: string;
};


function formatAmount(
  value: number
) {
  return `₹${Number(
    value || 0
  ).toFixed(2)}`;
}


function formatBillingMonth(
  billingMonth?: string
) {

  if (!billingMonth) {
    return "";
  }

  const parts =
    billingMonth.split("-");

  if (
    parts.length !== 2
  ) {
    return billingMonth;
  }

  const year =
    Number(parts[0]);

  const month =
    Number(parts[1]);

  if (
    !year ||
    !month
  ) {
    return billingMonth;
  }

  return new Date(
    year,
    month - 1,
    1
  ).toLocaleDateString(
    "en-IN",
    {
      month: "long",
      year: "numeric",
    }
  );

}


function formatPaymentDate(
  date?: string
) {

  if (!date) {
    return "";
  }

  const parsed =
    new Date(date);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return date;
  }

  return parsed.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );

}


export default function CommercialSupermarketDashboard() {

  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);


  const [
    bill,
    setBill,
  ] =
    useState<CurrentBill | null>(
      null
    );


  const [
    payments,
    setPayments,
  ] =
    useState<Payment[]>(
      []
    );


  const [
    shopName,
    setShopName,
  ] =
    useState("Super Market");


  const loadDashboard =
    useCallback(
      async (
        showLoader = true
      ) => {

        try {

          if (
            showLoader
          ) {
            setLoading(true);
          }

          const session =
            await getSession();


          if (
            !session?.email
          ) {

            Alert.alert(
              "Session Expired",
              "Please login again."
            );

            router.replace({
            pathname: "/commercial-signin",
            params: {
                type: "SUPERMARKET",
            },
            });

            return;

          }


          const [
            billResult,
            historyResult,
          ] =
            await Promise.all(
              [

                getCommercialCurrentBill(
                  session.email
                ),

                getCommercialPaymentHistory(
                  session.email
                ),

              ]
            );


          if (
            !billResult.ok
          ) {

            Alert.alert(
              "Unable to Load Bill",
              billResult.error ||
                "Unable to load your current bill."
            );

            return;

          }


          const billData =
            billResult.data as CurrentBill;


          setBill(
            billData
          );


          setShopName(
            billData.shop_name ||
              "Super Market"
          );


          if (
            historyResult.ok
          ) {

            const historyData =
              historyResult.data as {
                payments?: Payment[];
              };


            setPayments(
              Array.isArray(
                historyData?.payments
              )
                ? historyData.payments
                : []
            );

          } else {

            /*
              Current bill should still work
              even if history is temporarily
              unavailable.
            */

            setPayments([]);

          }

        }

        catch (
          error
        ) {

          console.log(
            "SUPERMARKET DASHBOARD ERROR:",
            error
          );

          Alert.alert(
            "Error",
            "Unable to load Super Market account details."
          );

        }

        finally {

          setLoading(false);

          setRefreshing(false);

        }

      },
      []
    );


  useEffect(
    () => {

      loadDashboard();

    },
    [
      loadDashboard
    ]
  );


  async function handleRefresh() {

    setRefreshing(true);

    await loadDashboard(
      false
    );

  }


  function handlePayment() {

    if (
      !bill
    ) {
      return;
    }


    const amount =
      Number(
        bill.balance_due ??
          bill.total_due ??
          0
      );


    if (
      amount <= 0
    ) {

      Alert.alert(
        "No Payment Due",
        "There is currently no outstanding amount to pay."
      );

      return;

    }


    /*
      Payment gateway integration
      will be connected here later.

      The bill amount is already
      fixed by the backend/admin.
      The Super Market user cannot
      edit the amount.
    */

    Alert.alert(
      "Payment",
      `Amount payable: ${formatAmount(
        amount
      )}`
    );

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


  const previousDue =
    Number(
      bill?.previous_due ?? 0
    );


  const monthlyRent =
    Number(
      bill?.monthly_rent ?? 0
    );


  const miscellaneousAmount =
    Number(
      bill?.miscellaneous_amount ?? 0
    );


  const totalDue =
    Number(
      bill?.total_due ?? 0
    );


  const balanceDue =
    Number(
      bill?.balance_due ??
        totalDue
    );


  const isPaid =
    balanceDue <= 0 ||
    bill?.status === "PAID";


  if (
    loading
  ) {

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

          <ActivityIndicator
            size="large"
            color={COLORS.brand}
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading your account...
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
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >

        {/* HEADER */}

        <View
          style={
            styles.header
          }
        >

          <Text
            style={
              styles.title
            }
          >
            Super Market
          </Text>


          <Text
            style={
              styles.shopName
            }
          >
            {shopName}
          </Text>

        </View>


        {/* CURRENT BILL */}

        <View
          style={
            styles.card
          }
        >

          <Text
            style={
              styles.cardTitle
            }
          >
            Current Bill
          </Text>


          {
            bill?.billing_month
              ? (
                <Text
                  style={
                    styles.billingMonth
                  }
                >
                  {
                    formatBillingMonth(
                      bill.billing_month
                    )
                  }
                </Text>
              )
              : null
          }


          {
            previousDue > 0 &&
            (

              <View
                style={
                  styles.row
                }
              >

                <Text
                  style={
                    styles.label
                  }
                >
                  Previous Due
                </Text>


                <Text
                  style={
                    styles.dueAmount
                  }
                >
                  {
                    formatAmount(
                      previousDue
                    )
                  }
                </Text>

              </View>

            )
          }


          <View
            style={
              styles.row
            }
          >

            <Text
              style={
                styles.label
              }
            >
              Monthly Rent
            </Text>


            <Text
              style={
                styles.amount
              }
            >
              {
                formatAmount(
                  monthlyRent
                )
              }
            </Text>

          </View>


          {
            miscellaneousAmount > 0 &&
            (

              <View
                style={
                  styles.row
                }
              >

                <Text
                  style={
                    styles.label
                  }
                >
                  {
                    bill?.miscellaneous_description ||
                    "Miscellaneous Charges"
                  }
                </Text>


                <Text
                  style={
                    styles.amount
                  }
                >
                  {
                    formatAmount(
                      miscellaneousAmount
                    )
                  }
                </Text>

              </View>

            )
          }


          <View
            style={
              styles.divider
            }
          />


          <View
            style={
              styles.totalRow
            }
          >

            <Text
              style={
                styles.totalLabel
              }
            >
              Total Payable
            </Text>


            <Text
              style={
                styles.totalAmount
              }
            >
              {
                formatAmount(
                  balanceDue
                )
              }
            </Text>

          </View>


          <View
            style={
              styles.statusContainer
            }
          >

            <Text
              style={
                styles.statusLabel
              }
            >
              Payment Status
            </Text>


            <View
              style={
                isPaid
                  ? styles.paidBadge
                  : styles.pendingBadge
              }
            >

              <Text
                style={
                  isPaid
                    ? styles.paidBadgeText
                    : styles.pendingBadgeText
                }
              >
                {
                  isPaid
                    ? "PAID"
                    : "PENDING"
                }
              </Text>

            </View>

          </View>

        </View>


        {/* PAYMENT */}

        {
          !isPaid &&
          balanceDue > 0 &&
          (

            <Pressable
              style={
                styles.payButton
              }
              onPress={
                handlePayment
              }
            >

              <Text
                style={
                  styles.payButtonText
                }
              >
                Pay{" "}
                {
                  formatAmount(
                    balanceDue
                  )
                }
              </Text>

            </Pressable>

          )
        }


        {
          isPaid &&
          (

            <View
              style={
                styles.noDueCard
              }
            >

              <Text
                style={
                  styles.noDueText
                }
              >
                No outstanding payment.
              </Text>

            </View>

          )
        }


        {/* PAYMENT HISTORY */}

        <View
          style={
            styles.historySection
          }
        >

          <View
            style={
              styles.historyHeader
            }
          >

            <Text
              style={
                styles.historyTitle
              }
            >
              Payment History
            </Text>


            <Pressable
              onPress={
                handleRefresh
              }
              disabled={
                refreshing
              }
            >

              <Text
                style={
                  styles.refreshText
                }
              >
                {
                  refreshing
                    ? "Refreshing..."
                    : "Refresh"
                }
              </Text>

            </Pressable>

          </View>


          {
            payments.length === 0 &&
            (

              <View
                style={
                  styles.emptyHistory
                }
              >

                <Text
                  style={
                    styles.emptyHistoryText
                  }
                >
                  No payment history available.
                </Text>

              </View>

            )
          }


          {
            payments.map(
              (
                payment,
                index
              ) => {

                const paymentAmount =
                  Number(
                    payment.amount_paid ??
                      payment.payment_amount ??
                      payment.amount ??
                      0
                  );


                const reference =
                  payment.transaction_id ||
                  payment.transaction_ref ||
                  payment.txn_ref;


                return (

                  <View
                    key={
                      payment.id ||
                      `${payment.billing_month}-${index}`
                    }
                    style={
                      styles.historyCard
                    }
                  >

                    <View
                      style={
                        styles.historyTopRow
                      }
                    >

                      <Text
                        style={
                          styles.historyMonth
                        }
                      >
                        {
                          formatBillingMonth(
                            payment.billing_month
                          ) ||
                          "Payment"
                        }
                      </Text>


                      <Text
                        style={
                          styles.historyAmount
                        }
                      >
                        {
                          formatAmount(
                            paymentAmount
                          )
                        }
                      </Text>

                    </View>


                    {
                      payment.payment_date &&
                      (

                        <Text
                          style={
                            styles.historyDate
                          }
                        >
                          Paid on{" "}
                          {
                            formatPaymentDate(
                              payment.payment_date
                            )
                          }
                        </Text>

                      )
                    }


                    <View
                      style={
                        styles.historyBottomRow
                      }
                    >

                      <Text
                        style={
                          styles.historyStatus
                        }
                      >
                        {
                          payment.status ||
                          "PAID"
                        }
                      </Text>


                      {
                        reference &&
                        (

                          <Text
                            style={
                              styles.referenceText
                            }
                            numberOfLines={
                              1
                            }
                          >
                            Ref: {reference}
                          </Text>

                        )
                      }

                    </View>

                  </View>

                );

              }
            )
          }

        </View>


        {/* LOGOUT */}

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


    content: {

      padding:
        SPACING.xl,

      paddingBottom:
        50,

    },


    loadingContainer: {

      flex: 1,

      justifyContent:
        "center",

      alignItems:
        "center",

    },


    loadingText: {

      marginTop:
        SPACING.md,

      color:
        COLORS.muted,

      fontSize:
        15,

      fontFamily:
        FONTS.sans,

    },


    header: {

      alignItems:
        "center",

      marginTop:
        SPACING.md,

      marginBottom:
        SPACING.xxl,

    },


    title: {

      color:
        COLORS.brand,

      fontSize:
        30,

      fontFamily:
        FONTS.serif,

    },


    shopName: {

      marginTop:
        SPACING.sm,

      color:
        COLORS.muted,

      fontSize:
        15,

      fontFamily:
        FONTS.sans,

    },


    card: {

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


    cardTitle: {

      color:
        COLORS.onSurface,

      fontSize:
        22,

      fontFamily:
        FONTS.serif,

    },


    billingMonth: {

      marginTop:
        SPACING.xs,

      marginBottom:
        SPACING.xl,

      color:
        COLORS.muted,

      fontSize:
        13,

      fontFamily:
        FONTS.sans,

    },


    row: {

      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",

      marginBottom:
        SPACING.md,

    },


    label: {

      flex: 1,

      paddingRight:
        SPACING.md,

      color:
        COLORS.muted,

      fontSize:
        15,

      fontFamily:
        FONTS.sans,

    },


    amount: {

      color:
        COLORS.onSurface,

      fontSize:
        15,

      fontWeight:
        "700",

      fontFamily:
        FONTS.sans,

    },


    dueAmount: {

      color:
        "#D97706",

      fontSize:
        15,

      fontWeight:
        "700",

      fontFamily:
        FONTS.sans,

    },


    divider: {

      height:
        1,

      backgroundColor:
        COLORS.border,

      marginVertical:
        SPACING.md,

    },


    totalRow: {

      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",

    },


    totalLabel: {

      color:
        COLORS.onSurface,

      fontSize:
        17,

      fontWeight:
        "700",

      fontFamily:
        FONTS.sans,

    },


    totalAmount: {

      color:
        COLORS.brand,

      fontSize:
        21,

      fontWeight:
        "700",

      fontFamily:
        FONTS.sans,

    },


    statusContainer: {

      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",

      marginTop:
        SPACING.xl,

    },


    statusLabel: {

      color:
        COLORS.muted,

      fontSize:
        14,

      fontFamily:
        FONTS.sans,

    },


    pendingBadge: {

      paddingHorizontal:
        SPACING.md,

      paddingVertical:
        5,

      borderRadius:
        RADIUS.sm,

      backgroundColor:
        "#FEF3C7",

    },


    pendingBadgeText: {

      color:
        "#92400E",

      fontSize:
        12,

      fontWeight:
        "700",

      fontFamily:
        FONTS.sans,

    },


    paidBadge: {

      paddingHorizontal:
        SPACING.md,

      paddingVertical:
        5,

      borderRadius:
        RADIUS.sm,

      backgroundColor:
        "#DCFCE7",

    },


    paidBadgeText: {

      color:
        "#166534",

      fontSize:
        12,

      fontWeight:
        "700",

      fontFamily:
        FONTS.sans,

    },


    payButton: {

      height:
        56,

      marginTop:
        SPACING.xl,

      borderRadius:
        RADIUS.md,

      backgroundColor:
        COLORS.brand,

      justifyContent:
        "center",

      alignItems:
        "center",

    },


    payButtonText: {

      color:
        COLORS.onBrand,

      fontSize:
        16,

      fontWeight:
        "700",

      fontFamily:
        FONTS.sans,

    },


    noDueCard: {

      marginTop:
        SPACING.xl,

      padding:
        SPACING.lg,

      borderRadius:
        RADIUS.md,

      borderWidth:
        1,

      borderColor:
        "#86EFAC",

      backgroundColor:
        "#F0FDF4",

      alignItems:
        "center",

    },


    noDueText: {

      color:
        "#166534",

      fontSize:
        14,

      fontWeight:
        "700",

      fontFamily:
        FONTS.sans,

    },


    historySection: {

      marginTop:
        SPACING.xxl,

    },


    historyHeader: {

      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",

      marginBottom:
        SPACING.md,

    },


    historyTitle: {

      color:
        COLORS.onSurface,

      fontSize:
        21,

      fontFamily:
        FONTS.serif,

    },


    refreshText: {

      color:
        COLORS.brand,

      fontSize:
        14,

      fontWeight:
        "700",

      fontFamily:
        FONTS.sans,

    },


    emptyHistory: {

      padding:
        SPACING.xl,

      borderRadius:
        RADIUS.md,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.surfaceSecondary,

      alignItems:
        "center",

    },


    emptyHistoryText: {

      color:
        COLORS.muted,

      fontSize:
        14,

      fontFamily:
        FONTS.sans,

    },


    historyCard: {

      padding:
        SPACING.lg,

      marginBottom:
        SPACING.md,

      borderRadius:
        RADIUS.md,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.surfaceSecondary,

    },


    historyTopRow: {

      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",

    },


    historyMonth: {

      flex: 1,

      color:
        COLORS.onSurface,

      fontSize:
        16,

      fontWeight:
        "700",

      fontFamily:
        FONTS.sans,

    },


    historyAmount: {

      color:
        COLORS.brand,

      fontSize:
        16,

      fontWeight:
        "700",

      fontFamily:
        FONTS.sans,

    },


    historyDate: {

      marginTop:
        SPACING.sm,

      color:
        COLORS.muted,

      fontSize:
        13,

      fontFamily:
        FONTS.sans,

    },


    historyBottomRow: {

      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",

      marginTop:
        SPACING.md,

    },


    historyStatus: {

      color:
        "#166534",

      fontSize:
        12,

      fontWeight:
        "700",

      fontFamily:
        FONTS.sans,

    },


    referenceText: {

      flex: 1,

      textAlign:
        "right",

      marginLeft:
        SPACING.md,

      color:
        COLORS.muted,

      fontSize:
        11,

      fontFamily:
        FONTS.sans,

    },


    logoutButton: {

      alignItems:
        "center",

      marginTop:
        SPACING.xxl,

      paddingVertical:
        SPACING.md,

    },


    logoutText: {

      color:
        COLORS.brand,

      fontSize:
        15,

      fontFamily:
        FONTS.sans,

    },

  });