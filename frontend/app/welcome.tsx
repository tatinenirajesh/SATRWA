import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  LinearGradient,
} from "expo-linear-gradient";

import {
  router,
} from "expo-router";

import {
  BrandLogo,
} from "@/src/components/BrandLogo";

import {
  COLORS,
  SPACING,
  RADIUS,
  FONTS,
} from "@/src/theme";

import {
  getSession,
} from "@/src/services/session";


/* =================================
   INTRO SETTINGS
================================= */

const INTRO_DURATION = 4000;


const INTRO_SLIDES = [
  require(
    "../assets/images/township-entrance.jpg"
  ),

  require(
    "../assets/images/township-garden.jpg"
  ),

  require(
    "../assets/images/township-welcome.jpg"
  ),
];



/* =================================
   MAIN SCREEN
================================= */

export default function LandingScreen() {

  const [
    showIntro,
    setShowIntro,
  ] = useState(true);


  if (
    showIntro
  ) {

    return (

      <TownshipIntro
        onFinish={() =>
          setShowIntro(false)
        }
      />

    );

  }


  return (

    <WelcomeScreen />

  );

}



/* =================================
   TOWNSHIP INTRO
================================= */

function TownshipIntro({
  onFinish,
}: {
  onFinish: () => void;
}) {

  const [
    currentSlide,
    setCurrentSlide,
  ] = useState(0);


  const progress =
    useRef(
      new Animated.Value(0)
    ).current;


  useEffect(() => {

    progress.setValue(0);


    const animation =
      Animated.timing(
        progress,
        {
          toValue: 1,

          duration:
            INTRO_DURATION,

          useNativeDriver:
            false,
        }
      );


    animation.start(
      ({
        finished,
      }) => {

        if (
          finished
        ) {

          goToNextSlide();

        }

      }
    );


    return () => {

      animation.stop();

    };

  }, [
    currentSlide,
  ]);


  function goToNextSlide() {

    if (
      currentSlide <
      INTRO_SLIDES.length - 1
    ) {

      setCurrentSlide(
        previous =>
          previous + 1
      );

    } else {

      onFinish();

    }

  }


  return (

    <Pressable
      style={
        styles.introContainer
      }
      onPress={
        goToNextSlide
      }
    >

      <Image
        source={
          INTRO_SLIDES[
            currentSlide
          ]
        }
        style={
          styles.introImage
        }
        resizeMode="cover"
      />


      {/* DARK OVERLAY */}

      <LinearGradient
        colors={[
          "rgba(0,0,0,0.10)",
          "rgba(0,0,0,0.25)",
          "rgba(0,0,0,0.80)",
        ]}
        style={
          styles.introOverlay
        }
      />


      {/* BRAND LOGO */}

      <SafeAreaView
        style={
          styles.introContent
        }
      >

        <Image
          source={
            require(
              "../assets/images/splash-logo.png"
            )
          }
          style={
            styles.splashLogo
          }
          resizeMode="contain"
        />


        <View
          style={
            styles.introBottom
          }
        >

          <Text
            style={
              styles.tapText
            }
          >
            Tap to continue
          </Text>


          {/* PROGRESS BARS */}

          <View
            style={
              styles.progressContainer
            }
          >

            {
              INTRO_SLIDES.map(
                (
                  _,
                  index
                ) => {

                  const isCompleted =
                    index <
                    currentSlide;


                  const isCurrent =
                    index ===
                    currentSlide;


                  return (

                    <View
                      key={
                        index
                      }
                      style={
                        styles.progressTrack
                      }
                    >

                      {
                        isCompleted && (

                          <View
                            style={
                              styles.progressComplete
                            }
                          />

                        )
                      }


                      {
                        isCurrent && (

                          <Animated.View
                            style={[
                              styles.progressActive,

                              {
                                width:
                                  progress.interpolate(
                                    {
                                      inputRange:
                                        [
                                          0,
                                          1,
                                        ],

                                      outputRange:
                                        [
                                          "0%",
                                          "100%",
                                        ],
                                    }
                                  ),
                              },

                            ]}
                          />

                        )
                      }

                    </View>

                  );

                }
              )
            }

          </View>


          <Text
            style={
              styles.slideText
            }
          >
            {
              currentSlide +
              1
            }
            {" / "}
            {
              INTRO_SLIDES.length
            }
          </Text>

        </View>

      </SafeAreaView>

    </Pressable>

  );

}



/* =================================
   EXISTING WELCOME SCREEN
================================= */

function WelcomeScreen() {

  const timer =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(
      null
    );


  useEffect(() => {

    let isMounted =
      true;


    async function loadSession() {

      try {

        const session =
          await getSession();


        if (
          !isMounted ||
          !session
        ) {

          return;

        }


        /* ==============================
           RESIDENT
        ============================== */

        if (
          session.role ===
            "OWNER" ||
          session.role ===
            "TENANT"
        ) {

          router.replace(
            "/resident-home"
          );

          return;

        }


        /* ==============================
           COMMERCIAL
        ============================== */

        if (
          session.role ===
          "COMMERCIAL"
        ) {

          if (
            session.account_type ===
            "CANTEEN"
          ) {

            router.replace(
              "/commercial-canteen-dashboard"
            );

            return;

          }


          if (
            session.account_type ===
            "SUPERMARKET"
          ) {

            router.push({
              pathname:
                "/commercial-signin",

              params: {
                type:
                  "SUPERMARKET",
              },
            });

            return;

          }

        }


        /* ==============================
           CORPORATE
        ============================== */

        if (
          session.role ===
          "CORPORATE"
        ) {

          router.replace(
            "/corporate-account"
          );

          return;

        }


        /* ==============================
           ADMIN
        ============================== */

        if (
          session.role ===
          "ADMIN"
        ) {

          router.replace(
            "/admin"
          );

          return;

        }

      } catch (
        error
      ) {

        console.log(
          "SESSION LOAD ERROR:",
          error
        );

      }

    }


    loadSession();


    return () => {

      isMounted =
        false;


      if (
        timer.current
      ) {

        clearTimeout(
          timer.current
        );

      }

    };

  }, []);


  function startAdminTimer() {

    if (
      timer.current
    ) {

      clearTimeout(
        timer.current
      );

    }


    timer.current =
      setTimeout(
        () => {

          router.push(
            "/admin"
          );

        },
        5000
      );

  }


  function stopAdminTimer() {

    if (
      timer.current
    ) {

      clearTimeout(
        timer.current
      );

      timer.current =
        null;

    }

  }


  return (

    <View
      style={
        styles.container
      }
    >

      <LinearGradient
        colors={[
          "#1a1508",
          "#0A0A0A",
        ]}
        style={
          styles.header
        }
      >

        <SafeAreaView>

          <Pressable
            onPressIn={
              startAdminTimer
            }
            onPressOut={
              stopAdminTimer
            }
            style={
              styles.logoArea
            }
          >

            <BrandLogo
              size={96}
            />


            <Text
              style={
                styles.title
              }
            >
              SATRWA
            </Text>


            <Text
              style={
                styles.subtitle
              }
            >
              Sri Anjaneya Township
            </Text>

          </Pressable>

        </SafeAreaView>

      </LinearGradient>


      <View
        style={
          styles.body
        }
      >

        <Text
          style={
            styles.welcome
          }
        >
          Welcome Home
        </Text>


        {/* INDIVIDUAL */}

        <Pressable
          style={
            styles.card
          }
          onPress={() =>
            router.push(
              "/individual"
            )
          }
        >

          <Text
            style={
              styles.cardIcon
            }
          >
            🏠
          </Text>


          <Text
            style={
              styles.cardTitle
            }
          >
            Individual
          </Text>


          <Text
            style={
              styles.cardSub
            }
          >
            Owners & Tenants
          </Text>

        </Pressable>


        {/* CORPORATE */}

        <Pressable
          style={
            styles.card
          }
          onPress={() =>
            router.push(
              "/corporate"
            )
          }
        >

          <Text
            style={
              styles.cardIcon
            }
          >
            🏢
          </Text>


          <Text
            style={
              styles.cardTitle
            }
          >
            Corporate
          </Text>


          <Text
            style={
              styles.cardSub
            }
          >
            Schools, Companies & Commercial
          </Text>

        </Pressable>


        <Text
          style={
            styles.version
          }
        >
          Version 1.0.0
        </Text>

      </View>

    </View>

  );

}



/* =================================
   STYLES
================================= */

const styles =
  StyleSheet.create({

    /* INTRO */

    introContainer: {

      flex: 1,

      backgroundColor:
        "#000000",

    },


    introImage: {

      position:
        "absolute",

      width:
        "100%",

      height:
        "100%",

    },


    introOverlay: {

      position:
        "absolute",

      width:
        "100%",

      height:
        "100%",

    },


    introContent: {

      flex: 1,

      justifyContent:
        "space-between",

      alignItems:
        "center",

    },


    splashLogo: {

      width:
        180,

      height:
        180,

      marginTop:
        20,

    },


    introBottom: {

      width:
        "100%",

      paddingHorizontal:
        24,

      paddingBottom:
        30,

      alignItems:
        "center",

    },


    tapText: {

      color:
        "rgba(255,255,255,0.85)",

      fontSize:
        14,

      marginBottom:
        14,

    },


    progressContainer: {

      flexDirection:
        "row",

      width:
        "100%",

      gap:
        6,

    },


    progressTrack: {

      flex: 1,

      height:
        4,

      backgroundColor:
        "rgba(255,255,255,0.30)",

      borderRadius:
        10,

      overflow:
        "hidden",

    },


    progressComplete: {

      width:
        "100%",

      height:
        "100%",

      backgroundColor:
        "#D4AF37",

    },


    progressActive: {

      height:
        "100%",

      backgroundColor:
        "#D4AF37",

    },


    slideText: {

      color:
        "rgba(255,255,255,0.70)",

      marginTop:
        12,

      fontSize:
        12,

    },


    /* WELCOME SCREEN */

    container: {

      flex: 1,

      backgroundColor:
        COLORS.surface,

    },


    header: {

      paddingBottom:
        SPACING.xxxl,

    },


    logoArea: {

      alignItems:
        "center",

      paddingTop:
        SPACING.xxxl,

    },


    title: {

      fontFamily:
        FONTS.serif,

      fontSize:
        34,

      color:
        COLORS.brand,

      marginTop:
        SPACING.lg,

    },


    subtitle: {

      fontFamily:
        FONTS.sans,

      color:
        COLORS.onSurface,

      fontSize:
        14,

      marginTop:
        4,

    },


    body: {

      flex: 1,

      backgroundColor:
        COLORS.surface,

      marginTop:
        -18,

      borderTopLeftRadius:
        28,

      borderTopRightRadius:
        28,

      padding:
        SPACING.xl,

    },


    welcome: {

      fontFamily:
        FONTS.serif,

      fontSize:
        28,

      color:
        COLORS.onSurface,

      textAlign:
        "center",

      marginBottom:
        SPACING.xxl,

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
        SPACING.xl,

      marginBottom:
        SPACING.lg,

      alignItems:
        "center",

    },


    cardIcon: {

      fontSize:
        42,

    },


    cardTitle: {

      fontFamily:
        FONTS.serif,

      fontSize:
        24,

      color:
        COLORS.brand,

      marginTop:
        12,

    },


    cardSub: {

      fontFamily:
        FONTS.sans,

      color:
        COLORS.muted,

      marginTop:
        4,

      textAlign:
        "center",

    },


    version: {

      textAlign:
        "center",

      marginTop:
        "auto",

      marginBottom:
        SPACING.lg,

      color:
        COLORS.muted,

      fontFamily:
        FONTS.sans,

    },

  });