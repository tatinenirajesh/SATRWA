import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  COLORS,
  SPACING,
  RADIUS,
  FONTS,
} from "@/src/theme";

import {
  gymAvailability,
  poolAvailability,
} from "@/src/services/api";

type Tab = "gym" | "pool";

type GymSlot = {
  slot: string;
  booked_members: number;
  booked_flats: number;
  remaining_members: number;
  remaining_flats: number;
  available: boolean;
};

type PoolSlot = {
  slot: string;
  category: "ADULT" | "KID";
  booked_members: number;
  booked_flats: number;
  remaining: number;
  capacity: number;
  available: boolean;
};

const POOL_TARIFF: Record<number, number> = {
  1: 700,
  2: 1000,
  3: 1500,
  4: 2000,
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(date: string) {
  if (!date) return "";

  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

export default function GymPool() {

  const router = useRouter();

  const params = useLocalSearchParams<{
    tab?: string;
  }>();

  const [tab, setTab] =
    useState<Tab>(
      params.tab === "pool"
        ? "pool"
        : "gym"
    );

  const [bookingDate, setBookingDate] =
    useState(todayString());

  const [loading, setLoading] =
    useState(false);

  const [gymSlots, setGymSlots] =
    useState<GymSlot[]>([]);

  const [poolSlots, setPoolSlots] =
    useState<PoolSlot[]>([]);

  const [selectedSlot, setSelectedSlot] =
    useState("");

  const [category, setCategory] =
    useState<"ADULT" | "KID">("ADULT");

  const [members, setMembers] =
    useState(1);


  useEffect(() => {

    setSelectedSlot("");
    setMembers(1);

    loadAvailability();

  }, [tab, bookingDate]);


  async function loadAvailability() {

    setLoading(true);

    try {

      if (tab === "gym") {

        const result =
          await gymAvailability(bookingDate);

        if (!result.ok) {

          throw new Error(
            result.error ||
            "Unable to load Gym availability."
          );

        }

        const data: any = result.data;

        setGymSlots(
          Array.isArray(data)
            ? data
            : Array.isArray(data?.value)
              ? data.value
              : []
        );

      } else {

        const result =
          await poolAvailability(bookingDate);

        if (!result.ok) {

          throw new Error(
            result.error ||
            "Unable to load Pool availability."
          );

        }

        const data: any = result.data;

        setPoolSlots(
          Array.isArray(data)
            ? data
            : Array.isArray(data?.value)
              ? data.value
              : []
        );

      }

    } catch (error: any) {

      Alert.alert(
        "Unable to Load Availability",
        error?.message ||
        "Please try again."
      );

    } finally {

      setLoading(false);

    }

  }


  const selectedGymSlot =
    gymSlots.find(
      x => x.slot === selectedSlot
    );

  const selectedPoolSlot =
    poolSlots.find(
      x =>
        x.slot === selectedSlot &&
        x.category === category
    );


  const maxMembers =
    tab === "gym"
      ? Math.max(
          1,
          selectedGymSlot?.remaining_members || 1
        )
      : Math.min(
          4,
          Math.max(
            1,
            selectedPoolSlot?.remaining || 1
          )
        );


  const totalAmount =
    tab === "gym"
      ? members * 300
      : POOL_TARIFF[members] || 700;


  function changeMembers(
    direction: number
  ) {

    setMembers(current => {

      const next =
        current + direction;

      if (next < 1)
        return 1;

      if (next > maxMembers)
        return maxMembers;

      return next;

    });

  }


  function changeDate(
    days: number
  ) {

    const date =
      new Date(
        `${bookingDate}T00:00:00`
      );

    date.setDate(
      date.getDate() + days
    );

    setBookingDate(
      date.toISOString().slice(0, 10)
    );

  }


  function selectTab(
    nextTab: Tab
  ) {

    setTab(nextTab);

    setSelectedSlot("");

    setMembers(1);

  }


  function proceed() {

    if (!selectedSlot) {

      Alert.alert(
        "Select a Slot",
        "Please select an available time slot."
      );

      return;

    }


    if (
      tab === "gym" &&
      selectedGymSlot &&
      members >
        selectedGymSlot.remaining_members
    ) {

      Alert.alert(
        "Capacity Reached",
        `Only ${selectedGymSlot.remaining_members} member(s) can be booked for this slot.`
      );

      return;

    }


    if (
      tab === "pool" &&
      selectedPoolSlot &&
      members >
        selectedPoolSlot.remaining
    ) {

      Alert.alert(
        "Capacity Reached",
        `Only ${selectedPoolSlot.remaining} member(s) can be booked for this slot.`
      );

      return;

    }


    router.push({

      pathname: "/pay",

      params:

        tab === "gym"

          ? {

              purpose: "gym",

              amount:
                String(totalAmount),

              members:
                String(members),

              booking_date:
                bookingDate,

              slot:
                selectedSlot,

            }

          : {

              purpose: "pool",

              amount:
                String(totalAmount),

              members:
                String(members),

              booking_date:
                bookingDate,

              slot:
                selectedSlot,

              category,

            },

    });

  }


  const visiblePoolSlots =
    poolSlots.filter(
      x => x.category === category
    );


  return (

    <SafeAreaView
      style={styles.container}
    >

      <LinearGradient
        colors={[
          "#1A1508",
          "#0A0A0A",
        ]}
        style={styles.header}
      >

        <View
          style={styles.headerRow}
        >

          <Pressable
            onPress={() =>
              router.back()
            }
            style={styles.backButton}
          >

            <Ionicons
              name="chevron-back"
              size={24}
              color={COLORS.brand}
            />

          </Pressable>


          <Text
            style={styles.title}
          >
            Amenities
          </Text>


          <View
            style={{ width: 40 }}
          />

        </View>


        <View
          style={styles.tabs}
        >

          <Pressable
            onPress={() =>
              selectTab("gym")
            }
            style={[
              styles.tab,
              tab === "gym" &&
                styles.tabActive,
            ]}
          >

            <Ionicons
              name="barbell-outline"
              size={19}
              color={
                tab === "gym"
                  ? COLORS.onBrand
                  : COLORS.muted
              }
            />

            <Text
              style={[
                styles.tabText,
                tab === "gym" &&
                  styles.tabTextActive,
              ]}
            >
              Gym
            </Text>

          </Pressable>


          <Pressable
            onPress={() =>
              selectTab("pool")
            }
            style={[
              styles.tab,
              tab === "pool" &&
                styles.tabActive,
            ]}
          >

            <Ionicons
              name="water-outline"
              size={19}
              color={
                tab === "pool"
                  ? COLORS.onBrand
                  : COLORS.muted
              }
            />

            <Text
              style={[
                styles.tabText,
                tab === "pool" &&
                  styles.tabTextActive,
              ]}
            >
              Swimming Pool
            </Text>

          </Pressable>

        </View>

      </LinearGradient>


      <ScrollView
        contentContainerStyle={
          styles.body
        }
      >

        {/* DATE */}

        <Text
          style={styles.sectionTitle}
        >
          Booking Date
        </Text>


        <View
          style={styles.dateRow}
        >

          <Pressable
            style={styles.dateButton}
            onPress={() =>
              changeDate(-1)
            }
          >

            <Ionicons
              name="chevron-back"
              size={22}
              color={COLORS.brand}
            />

          </Pressable>


          <View
            style={styles.dateBox}
          >

            <Ionicons
              name="calendar-outline"
              size={20}
              color={COLORS.brand}
            />

            <Text
              style={styles.dateText}
            >
              {formatDate(bookingDate)}
            </Text>

          </View>


          <Pressable
            style={styles.dateButton}
            onPress={() =>
              changeDate(1)
            }
          >

            <Ionicons
              name="chevron-forward"
              size={22}
              color={COLORS.brand}
            />

          </Pressable>

        </View>


        {/* POOL CATEGORY */}

        {tab === "pool" && (

          <>

            <Text
              style={styles.sectionTitle}
            >
              Category
            </Text>


            <View
              style={styles.categoryRow}
            >

              {(["ADULT", "KID"] as const)
                .map(item => (

                  <Pressable
                    key={item}
                    onPress={() => {

                      setCategory(item);

                      setSelectedSlot("");

                      setMembers(1);

                    }}
                    style={[
                      styles.categoryButton,
                      category === item &&
                        styles.categoryActive,
                    ]}
                  >

                    <Text
                      style={[
                        styles.categoryText,
                        category === item &&
                          styles.categoryTextActive,
                      ]}
                    >
                      {item === "ADULT"
                        ? "Adult"
                        : "Kid"}
                    </Text>

                  </Pressable>

                ))}

            </View>

          </>

        )}


{/* SLOTS */}

<Text style={styles.sectionTitle}>
  Select Time Slot
</Text>

{loading ? (

  <View style={styles.loading}>

    <ActivityIndicator
      size="large"
      color={COLORS.brand}
    />

    <Text style={styles.loadingText}>
      Loading availability...
    </Text>

  </View>

) : (

  <>
    {(() => {

      const slots =
        tab === "gym"
          ? gymSlots
          : visiblePoolSlots;

      const morningSlots = slots.filter((item: any) => {
        const hour = parseInt(
          item.slot.split(":")[0],
          10
        );

        return hour < 12;
      });

      const eveningSlots = slots.filter((item: any) => {
        const hour = parseInt(
          item.slot.split(":")[0],
          10
        );

        return hour >= 12;
      });

      const renderSlots = (slotItems: any[]) => (

        <View style={styles.slotGrid}>

          {slotItems.map((item: any) => {

            const available = item.available;

            const remaining =
              tab === "gym"
                ? item.remaining_members
                : item.remaining;

            const active =
              selectedSlot === item.slot;

            return (

              <Pressable
                key={
                  tab === "pool"
                    ? `${item.slot}-${item.category}`
                    : item.slot
                }
                disabled={!available}
                onPress={() => {

                  setSelectedSlot(
                    item.slot
                  );

                  setMembers(1);

                }}
                style={[
                  styles.slot,

                  active &&
                    styles.slotActive,

                  !available &&
                    styles.slotDisabled,
                ]}
              >

                <Text
                  style={[
                    styles.slotTime,

                    !available &&
                      styles.slotDisabledText,
                  ]}
                >
                  {item.slot}
                </Text>

                <Text
                  style={[
                    styles.slotAvailability,

                    !available &&
                      styles.slotDisabledText,
                  ]}
                >
                  {available
                    ? `${remaining} remaining`
                    : "Full"}
                </Text>

                {active && (

                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={COLORS.brand}
                    style={styles.slotCheck}
                  />

                )}

              </Pressable>

            );

          })}

        </View>

      );

      return (

        <>

          {morningSlots.length > 0 && (

            <>

              <Text style={styles.slotGroupTitle}>
                Morning
              </Text>

              {renderSlots(morningSlots)}

            </>

          )}

          {eveningSlots.length > 0 && (

            <>

              <Text style={styles.slotGroupTitle}>
                Evening
              </Text>

              {renderSlots(eveningSlots)}

            </>

          )}

        </>

      );

    })()}

  </>

)}


{!loading &&
  (
    tab === "gym"
      ? gymSlots.length === 0
      : visiblePoolSlots.length === 0
  ) && (

  <Text style={styles.emptyText}>
    No slots available for this date.
  </Text>

)}

        {/* MEMBERS */}

        <Text
          style={styles.sectionTitle}
        >
          Number of Members
        </Text>


        <View
          style={styles.memberRow}
        >

          <Pressable
            onPress={() =>
              changeMembers(-1)
            }
            style={styles.memberButton}
          >

            <Ionicons
              name="remove"
              size={24}
              color={COLORS.brand}
            />

          </Pressable>


          <View
            style={styles.memberValue}
          >

            <Text
              style={styles.memberNumber}
            >
              {members}
            </Text>

            <Text
              style={styles.memberLabel}
            >
              Member{members > 1 ? "s" : ""}
            </Text>

          </View>


          <Pressable
            onPress={() =>
              changeMembers(1)
            }
            style={styles.memberButton}
          >

            <Ionicons
              name="add"
              size={24}
              color={COLORS.brand}
            />

          </Pressable>

        </View>


        {/* TOTAL */}

        <View
          style={styles.totalCard}
        >

          <Text
            style={styles.totalLabel}
          >
            Total Amount
          </Text>


          <Text
            style={styles.totalAmount}
          >
            ₹{totalAmount}
          </Text>


          <Text
            style={styles.totalSub}
          >
            {tab === "gym"
              ? "₹300 per member"
              : "Pool booking tariff"}
          </Text>

        </View>


        <Pressable
          onPress={proceed}
          style={styles.proceedButton}
        >

          <Text
            style={styles.proceedText}
          >
            Proceed to Payment
          </Text>


          <Ionicons
            name="arrow-forward"
            size={20}
            color={COLORS.onBrand}
          />

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

    header: {
      paddingBottom:
        SPACING.lg,
    },

    headerRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      paddingHorizontal:
        SPACING.lg,
      paddingTop:
        SPACING.sm,
    },

    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.surfaceSecondary,
    },

    title: {
      fontSize: 24,
      fontFamily:
        FONTS.serif,
      color:
        COLORS.onSurface,
    },

    tabs: {
      flexDirection:
        "row",
      marginHorizontal:
        SPACING.lg,
      marginTop:
        SPACING.lg,
      backgroundColor:
        COLORS.surfaceSecondary,
      borderRadius:
        RADIUS.md,
      padding: 4,
    },

    tab: {
      flex: 1,
      flexDirection:
        "row",
      justifyContent:
        "center",
      alignItems:
        "center",
      gap: 8,
      paddingVertical: 13,
      borderRadius: 10,
    },

    tabActive: {
      backgroundColor:
        COLORS.brand,
    },

    tabText: {
      color:
        COLORS.muted,
      fontFamily:
        FONTS.sans,
      fontWeight: "700",
    },

    tabTextActive: {
      color:
        COLORS.onBrand,
    },

    body: {
      padding:
        SPACING.xl,
      paddingBottom: 50,
    },

    sectionTitle: {
      fontSize: 17,
      fontWeight: "700",
      color:
        COLORS.onSurface,
      marginTop: 20,
      marginBottom: 12,
    },

    dateRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 10,
    },

    dateButton: {
      width: 46,
      height: 46,
      borderRadius: 12,
      justifyContent:
        "center",
      alignItems:
        "center",
      backgroundColor:
        COLORS.surfaceSecondary,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    dateBox: {
      flex: 1,
      height: 46,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 10,
      backgroundColor:
        COLORS.surfaceSecondary,
      borderRadius:
        RADIUS.md,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    dateText: {
      color:
        COLORS.onSurface,
      fontWeight: "700",
    },

    categoryRow: {
      flexDirection:
        "row",
      gap: 12,
    },

    categoryButton: {
      flex: 1,
      paddingVertical: 14,
      alignItems:
        "center",
      borderRadius:
        RADIUS.md,
      backgroundColor:
        COLORS.surfaceSecondary,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    categoryActive: {
      backgroundColor:
        COLORS.brand,
      borderColor:
        COLORS.brand,
    },

    categoryText: {
      color:
        COLORS.onSurface,
      fontWeight: "700",
    },

    categoryTextActive: {
      color:
        COLORS.onBrand,
    },

    loading: {
      paddingVertical: 30,
      alignItems:
        "center",
    },

    loadingText: {
      marginTop: 12,
      color:
        COLORS.muted,
    },

slotGroupTitle: {
  fontSize: 18,
  fontFamily: FONTS.serif,
  color: COLORS.onSurface,
  marginTop: 18,
  marginBottom: 12,
},

slotGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: 12,
},

slot: {
  width: "48%",
  minHeight: 100,
  backgroundColor: COLORS.surfaceSecondary,
  borderWidth: 1,
  borderColor: COLORS.border,
  borderRadius: RADIUS.md,
  padding: 16,
  justifyContent: "center",
  position: "relative",
},

slotActive: {
  borderColor: COLORS.brand,
  borderWidth: 2,
  backgroundColor: COLORS.brandTint,
},

slotDisabled: {
  opacity: 0.45,
},

slotTime: {
  fontSize: 17,
  fontWeight: "700",
  color: COLORS.onSurface,
},

slotAvailability: {
  fontSize: 14,
  color: COLORS.muted,
  marginTop: 7,
},

slotDisabledText: {
  color: COLORS.muted,
},

slotCheck: {
  position: "absolute",
  top: 10,
  right: 10,
},

    emptyText: {
      textAlign:
        "center",
      color:
        COLORS.muted,
      marginVertical: 20,
    },

    memberRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      backgroundColor:
        COLORS.surfaceSecondary,
      padding: 12,
      borderRadius:
        RADIUS.lg,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    memberButton: {
      width: 52,
      height: 52,
      borderRadius: 26,
      justifyContent:
        "center",
      alignItems:
        "center",
      backgroundColor:
        COLORS.brandTint,
    },

    memberValue: {
      alignItems:
        "center",
    },

    memberNumber: {
      fontSize: 28,
      fontWeight: "700",
      color:
        COLORS.brand,
    },

    memberLabel: {
      color:
        COLORS.muted,
      fontSize: 12,
    },

    totalCard: {
      marginTop: 28,
      padding: 20,
      borderRadius:
        RADIUS.lg,
      backgroundColor:
        COLORS.surfaceSecondary,
      borderWidth: 1,
      borderColor:
        COLORS.brand,
    },

    totalLabel: {
      color:
        COLORS.muted,
      fontSize: 14,
    },

    totalAmount: {
      color:
        COLORS.brand,
      fontSize: 32,
      fontWeight: "700",
      marginTop: 5,
    },

    totalSub: {
      color:
        COLORS.muted,
      marginTop: 4,
    },

    proceedButton: {
      marginTop: 20,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 10,
      padding: 18,
      borderRadius:
        RADIUS.md,
      backgroundColor:
        COLORS.brand,
    },

    proceedText: {
      color:
        COLORS.onBrand,
      fontWeight: "700",
      fontSize: 17,
    },

  });