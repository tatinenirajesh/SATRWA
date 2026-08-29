import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Animated,
  Image,
  ImageBackground,
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
  COLORS,
  FONTS,
} from "@/src/theme";


const SLIDES = [

  {
    image:
      require(
        "../assets/images/township-welcome.jpg"
      ),

    title:
      "Welcome Home",

    subtitle:
      "A COMMUNITY BUILT ON TRUST",
  },

  {
    image:
      require(
        "../assets/images/township-garden.jpg"
      ),

    title:
      "Peace. Harmony.",

    subtitle:
      "TOGETHER WE GROW",
  },

  {
    image:
      require(
        "../assets/images/township-entrance.jpg"
      ),

    title:
      "A Place to Belong",

    subtitle:
      "A FAMILY BEYOND WALLS",
  },

];


const AUTO_ADVANCE_TIME =
  4000;


const FINAL_IDLE_TIME =
  15000;


export default function WelcomeScreen() {

  const [
    currentSlide,
    setCurrentSlide,
  ] =
    useState(0);


  const [
    showFinal,
    setShowFinal,
  ] =
    useState(false);


  const fadeAnim =
    useRef(
      new Animated.Value(1)
    ).current;


  const autoTimer =
    useRef<
      ReturnType<typeof setTimeout>
      | null
    >(null);


  const finalTimer =
    useRef<
      ReturnType<typeof setTimeout>
      | null
    >(null);


  const clearTimers =
    useCallback(
      () => {

        if (
          autoTimer.current
        ) {

          clearTimeout(
            autoTimer.current
          );

          autoTimer.current =
            null;

        }


        if (
          finalTimer.current
        ) {

          clearTimeout(
            finalTimer.current
          );

          finalTimer.current =
            null;

        }

      },
      []
    );


  const animateScreen =
    useCallback(
      (
        callback: () => void
      ) => {

        Animated.timing(
          fadeAnim,
          {
            toValue:
              0,

            duration:
              250,

            useNativeDriver:
              true,
          }
        ).start(
          () => {

            callback();


            Animated.timing(
              fadeAnim,
              {
                toValue:
                  1,

                duration:
                  500,

                useNativeDriver:
                  true,
              }
            ).start();

          }
        );

      },
      [
        fadeAnim,
      ]
    );


  const goToNextSlide =
    useCallback(
      () => {

        clearTimers();


        if (
          showFinal
        ) {

          return;

        }


        if (
          currentSlide <
          SLIDES.length - 1
        ) {

          animateScreen(
            () => {

              setCurrentSlide(
                previous =>
                  previous + 1
              );

            }
          );

        } else {

          animateScreen(
            () => {

              setShowFinal(
                true
              );

            }
          );

        }

      },
      [
        animateScreen,
        clearTimers,
        currentSlide,
        showFinal,
      ]
    );


  useEffect(
    () => {

      clearTimers();


      if (
        showFinal
      ) {

        finalTimer.current =
          setTimeout(
            () => {

              animateScreen(
                () => {

                  setCurrentSlide(
                    0
                  );

                  setShowFinal(
                    false
                  );

                }
              );

            },
            FINAL_IDLE_TIME
          );


        return;

      }


      autoTimer.current =
        setTimeout(
          () => {

            goToNextSlide();

          },
          AUTO_ADVANCE_TIME
        );


      return () => {

        clearTimers();

      };

    },
    [
      currentSlide,
      showFinal,
      goToNextSlide,
      clearTimers,
      animateScreen,
    ]
  );


  useEffect(
    () => {

      return () => {

        clearTimers();

      };

    },
    [
      clearTimers,
    ]
  );


  function enterApplication() {

    clearTimers();


    router.replace(
      "/"
    );

  }


  if (
    showFinal
  ) {

    return (

      <View
        style={
          styles.finalContainer
        }
      >

        <LinearGradient
          colors={[
            "#151207",
            "#0A0A0A",
            "#000000",
          ]}
          style={
            styles.finalGradient
          }
        >

          <SafeAreaView
            style={
              styles.safeArea
            }
          >

            <Animated.View
              style={[
                styles.finalContent,
                {
                  opacity:
                    fadeAnim,
                },
              ]}
            >

              <Image
                source={
                  require(
                    "../assets/images/splash-logo.png"
                  )
                }
                style={
                  styles.finalLogo
                }
                resizeMode="contain"
              />


              <Text
                style={
                  styles.finalTitle
                }
              >
                SRI ANJANEYA
              </Text>


              <Text
                style={
                  styles.finalTownship
                }
              >
                TOWNSHIP
              </Text>


              <View
                style={
                  styles.goldLine
                }
              />


              <Text
                style={
                  styles.finalWelcome
                }
              >
                Welcome Home
              </Text>


              <Text
                style={
                  styles.finalSubtitle
                }
              >
                A COMMUNITY BUILT ON TRUST
              </Text>


              <Pressable
                onPress={
                  enterApplication
                }
                style={
                  styles.enterButton
                }
              >

                <Text
                  style={
                    styles.enterButtonText
                  }
                >
                  WELCOME HOME →
                </Text>

              </Pressable>


              <Text
                style={
                  styles.finalHint
                }
              >
                Tap to enter your community
              </Text>

            </Animated.View>

          </SafeAreaView>

        </LinearGradient>

      </View>

    );

  }


  const slide =
    SLIDES[
      currentSlide
    ];


  return (

    <Pressable
      style={
        styles.container
      }
      onPress={
        goToNextSlide
      }
    >

      <ImageBackground
        source={
          slide.image
        }
        style={
          styles.container
        }
        resizeMode="cover"
      >

        <LinearGradient
          colors={[
            "rgba(0,0,0,0.10)",
            "rgba(0,0,0,0.20)",
            "rgba(0,0,0,0.88)",
            "#0A0A0A",
          ]}
          style={
            styles.overlay
          }
        >

          <SafeAreaView
            style={
              styles.safeArea
            }
          >

            <Animated.View
              style={[
                styles.slideContent,
                {
                  opacity:
                    fadeAnim,
                },
              ]}
            >

              <View
                style={
                  styles.topSection
                }
              >

                <Image
                  source={
                    require(
                      "../assets/images/splash-logo.png"
                    )
                  }
                  style={
                    styles.smallLogo
                  }
                  resizeMode="contain"
                />

              </View>


              <View
                style={
                  styles.bottomSection
                }
              >

                <Text
                  style={
                    styles.slideTitle
                  }
                >
                  {
                    slide.title
                  }
                </Text>


                <Text
                  style={
                    styles.slideSubtitle
                  }
                >
                  {
                    slide.subtitle
                  }
                </Text>


                <View
                  style={
                    styles.progressContainer
                  }
                >

                  {
                    SLIDES.map(
                      (
                        _,
                        index
                      ) => (

                        <View
                          key={
                            index
                          }
                          style={[
                            styles.progressBar,

                            index <=
                            currentSlide
                              ?
                              styles.progressActive
                              :
                              styles.progressInactive,
                          ]}
                        />

                      )
                    )
                  }

                </View>


                <Text
                  style={
                    styles.tapHint
                  }
                >
                  Tap anywhere to continue
                </Text>

              </View>

            </Animated.View>

          </SafeAreaView>

        </LinearGradient>

      </ImageBackground>

    </Pressable>

  );

}


const styles =
  StyleSheet.create({

    container: {

      flex:
        1,

      backgroundColor:
        "#0A0A0A",

    },


    overlay: {

      flex:
        1,

    },


    safeArea: {

      flex:
        1,

    },


    slideContent: {

      flex:
        1,

      justifyContent:
        "space-between",

    },


    topSection: {

      alignItems:
        "center",

      paddingTop:
        10,

    },


    smallLogo: {

      width:
        110,

      height:
        110,

    },


    bottomSection: {

      paddingHorizontal:
        28,

      paddingBottom:
        38,

      alignItems:
        "center",

    },


    slideTitle: {

      fontFamily:
        FONTS.serif,

      fontSize:
        34,

      color:
        COLORS.brand,

      textAlign:
        "center",

      marginBottom:
        10,

    },


    slideSubtitle: {

      fontFamily:
        FONTS.sans,

      fontSize:
        12,

      letterSpacing:
        2,

      color:
        "#E5D2A0",

      textAlign:
        "center",

    },


    progressContainer: {

      flexDirection:
        "row",

      width:
        "100%",

      marginTop:
        30,

      gap:
        6,

    },


    progressBar: {

      flex:
        1,

      height:
        3,

      borderRadius:
        10,

    },


    progressActive: {

      backgroundColor:
        COLORS.brand,

    },


    progressInactive: {

      backgroundColor:
        "rgba(255,255,255,0.25)",

    },


    tapHint: {

      marginTop:
        18,

      color:
        "#BDBDBD",

      fontSize:
        12,

      fontFamily:
        FONTS.sans,

    },


    finalContainer: {

      flex:
        1,

      backgroundColor:
        "#0A0A0A",

    },


    finalGradient: {

      flex:
        1,

    },


    finalContent: {

      flex:
        1,

      justifyContent:
        "center",

      alignItems:
        "center",

      paddingHorizontal:
        30,

    },


    finalLogo: {

      width:
        200,

      height:
        200,

      marginBottom:
        12,

    },


    finalTitle: {

      color:
        "#F2F2F2",

      fontFamily:
        FONTS.serif,

      fontSize:
        30,

      letterSpacing:
        2,

    },


    finalTownship: {

      color:
        COLORS.brand,

      fontFamily:
        FONTS.sans,

      fontSize:
        18,

      letterSpacing:
        5,

      marginTop:
        8,

    },


    goldLine: {

      width:
        110,

      height:
        1,

      backgroundColor:
        COLORS.brand,

      marginVertical:
        28,

    },


    finalWelcome: {

      color:
        COLORS.brand,

      fontFamily:
        FONTS.serif,

      fontSize:
        36,

    },


    finalSubtitle: {

      color:
        "#D8D8D8",

      fontFamily:
        FONTS.sans,

      fontSize:
        11,

      letterSpacing:
        2,

      marginTop:
        14,

      textAlign:
        "center",

    },


    enterButton: {

      marginTop:
        55,

      borderWidth:
        1,

      borderColor:
        COLORS.brand,

      borderRadius:
        28,

      paddingVertical:
        16,

      paddingHorizontal:
        42,

      backgroundColor:
        "rgba(212,175,55,0.12)",

    },


    enterButtonText: {

      color:
        COLORS.brand,

      fontFamily:
        FONTS.sans,

      fontSize:
        14,

      letterSpacing:
        2,

      fontWeight:
        "600",

    },


    finalHint: {

      color:
        COLORS.muted,

      fontFamily:
        FONTS.sans,

      fontSize:
        12,

      marginTop:
        18,

    },

  });