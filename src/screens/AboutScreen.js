import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, useWindowDimensions, ActivityIndicator, ScrollView } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useDerivedValue,
    useAnimatedStyle,
    withDecay,
    withClamp,
    withSpring,
    useFrameCallback
} from 'react-native-reanimated';
import { DynamicSunbeamBackground } from '../components/DynamicSunbeamBackground';

export default function AboutScreen() {
    // Grabbing the realtime screen dimensions
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    // Aligning card dimensions to the style sheet
    const CARD_WIDTH = styles.card.width;
    const CARD_HEIGHT = styles.card.height;

    // Calculating boundary limits for the screen edges
    const headerHeight = useHeaderHeight();
    const insets = useSafeAreaInsets();
    const bottomBarHeight = insets.bottom > 0 ? insets.bottom + 49 : 50;

    const minX = -screenWidth / 2 + CARD_WIDTH / 2;
    const maxX = screenWidth /2 - CARD_WIDTH / 2;
    const minY = -screenHeight / 2 + CARD_HEIGHT / 2 + headerHeight;
    const maxY = screenHeight / 2 - CARD_HEIGHT / 2 - bottomBarHeight;

    const VISUAL_Y_OFFSET = headerHeight - bottomBarHeight; // Calculating the collision offset for the card

    // Tracking the position, velocity, and if it's being dragged
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const velocityX = useSharedValue(0);
    const velocityY = useSharedValue(0);
    const isDragging = useSharedValue(false);

    // Squish and stretch
    const scaleX = useSharedValue(1);
    const scaleY = useSharedValue(1);

    // Track deformation velocities
    const scaleVelocityX = useSharedValue(0);
    const scaleVelocityY = useSharedValue(0);

    const contextX = useSharedValue(0);
    const contextY = useSharedValue(0);

    // Physics tweaking
    const FRICTION = 0.96;
    const BOUNCE_RESTITUTION = -0.65; //bounciness (-0.1 is a thud, -0.9 is one of those super bouncy balls you used to get as a kid)

    const SQUISH_STIFFNESS = 0.2;
    const SQUISH_DAMPING = 0.70;

    // There's no out of the box way to bounce so we're doing it manually. This runs every frame, which might be overboard
    useFrameCallback((frameInfo) => {
        'worklet';
        // Only calculates when you stop dragging
        if (!isDragging.value) {
            // Air friction
            velocityX.value *= FRICTION;
            velocityY.value *= FRICTION;

            // Position update based on velocity
            let nextX = translateX.value + velocityX.value * (frameInfo.timeSincePreviousFrame / 16);
            let nextY = translateY.value + velocityY.value * (frameInfo.timeSincePreviousFrame / 16);

            // Wall bouncing!
            if (nextX <= minX || nextX >= maxX) {
                // Squash force scales with speed of impact
                const impactForce = Math.min(Math.abs(velocityX.value) / 15, 0.35);

                if (impactForce > 0.05) {
                    // Squish along X, bulge along Y
                    scaleVelocityX.value = -impactForce * 0.8;
                    scaleVelocityY.value = impactForce * 0.8;
                }

                nextX = nextX <= minX ? minX : maxX;
                velocityX.value *= BOUNCE_RESTITUTION;
            }

            if (nextY <= minY || nextY >= maxY) {
                const impactForce = Math.min(Math.abs(velocityY.value) / 15, 0.35);

                if (impactForce > 0.03) {
                    // Squish along Y, bulge along X
                    scaleVelocityY.value = -impactForce * 0.8;
                    scaleVelocityX.value = impactForce * 0.8;
                }
            
                nextY = nextY <= minY ? minY : maxY;
                velocityY.value *= BOUNCE_RESTITUTION;
            }

            // Near-stop stabilization
            if (Math.abs(velocityX.value) < 0.1) velocityX.value = 0;
            if (Math.abs(velocityY.value) < 0.1) velocityY.value = 0;

            translateX.value = nextX;
            translateY.value = nextY;
        }

        // We're making this manual instead of using withSpring to avoid an overcorrection issue
        const dt = frameInfo.timeSincePreviousFrame / 16;

        // Hooke's Law of Spring Force! F = -kx
        const forceX = -SQUISH_STIFFNESS * (scaleX.value - 1);
        scaleVelocityX.value = (scaleVelocityX.value + forceX * dt) * SQUISH_DAMPING;
        scaleX.value += scaleVelocityX.value * dt;

        const forceY = -SQUISH_STIFFNESS * (scaleY.value - 1);
        scaleVelocityY.value = (scaleVelocityY.value + forceY * dt) * SQUISH_DAMPING;
        scaleY.value += scaleVelocityY.value * dt;

        // Preventing micro-vibrations
        if (Math.abs(scaleX.value - 1) < 0.005 && Math.abs(scaleVelocityX.value) < 0.005) {
            scaleX.value = 1;
            scaleVelocityX.value = 0;
        }
        if (Math.abs(scaleY.value - 1) < 0.005 && Math.abs(scaleVelocityY.value) < 0.005) {
            scaleY.value = 1;
            scaleVelocityY.value = 0;
        }
    });

    // Configuring the mouse gesture to drag the card
    const panGesture = Gesture.Pan()
        .onStart(() => {
            isDragging.value = true;
            contextX.value = translateX.value;
            contextY.value = translateY.value;
            velocityX.value = 0;
            velocityY.value = 0;

            // Picking it up squeezes slightly
            scaleX.value = withSpring(0.95, { damping: 12, stiffness: 100 });
            scaleY.value = withSpring(0.95, { damping: 12, stiffness: 100 });
        })
        .onUpdate((event) => {
            // Clamped so you can't drag it outside the wall
            translateX.value = Math.max(minX, Math.min(contextX.value + event.translationX, maxX));
            translateY.value = Math.max(minY, Math.min(contextY.value + event.translationY, maxY));
        })
        .onEnd((event) => {
            isDragging.value = false;
            velocityX.value = event.velocityX / 60;
            velocityY.value = event.velocityY / 60;
        });

    // State for the current time and weather data    
    const LATITUDE = '35.8212';
    const LONGITUDE = '-82.6027';
    const [targetTimezone, setTargetTimezone] = useState('America/New_York'); //fallback to local timezone
    const [currentTime, setCurrentTime] = useState('');
    const [currentHour, setCurrentHour] = useState(new Date().getHours()); //fallback to local time
    const [weatherData, setWeatherData] = useState(null);
    const [isWeatherLoading, setIsWeatherLoading] = useState(true);

    // Make clock work
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setCurrentTime(
                now.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                    timeZone: targetTimezone,
                })
            );

            const hourString = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                hour12: false, // Forces 24-hour calculation
                timeZone: targetTimezone,
            });
            setCurrentHour(parseInt(hourString, 10));
        };

        updateClock(); // Initial call to set the time immediately
        const timerId = setInterval(updateClock, 1000); // Update every second
        return () => clearInterval(timerId);
    }, [targetTimezone]);

    // Grabs weather data using Open-Meteo API
    useEffect(() => {
        let isMounted = true; // To prevent state updates if the component unmounts

        const fetchWeatherData = async () => {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,is_day,weather_code&temperature_unit=fahrenheit&timezone=America%2FNew_York`;

            try {
                const response = await fetch(url);
                if (response.ok && isMounted) {
                    const json = await response.json();
                    const current = json.current;

                    // Grabbing the timezone
                    if (json.timezone) {
                        setTargetTimezone(json.timezone);
                    }

                    // Open-Meteo uses WMO Weather Interpretation Codes (0 = Clear, 1 = Mainly Clear, 2 = Partly Cloudy, 3 = Overcast, 45 = Fog, 48 = Depositing Rime Fog, 51 = Drizzle Light, 53 = Drizzle Moderate, 55 = Drizzle Dense, 56 = Freezing Drizzle Light, 57 = Freezing Drizzle Dense, 61 = Rain Slight, 63 = Rain Moderate, 65 = Rain Heavy, 66 = Freezing Rain Light, 67 = Freezing Rain Heavy, 71 = Snow Fall Slight, 73 = Snow Fall Moderate, 75 = Snow Fall Heavy, 77 = Snow Grains, 80 = Rain Showers Slight, 81 = Rain Showers Moderate, 82 = Rain Showers Violent, 85 = Snow Showers Slight, 86 = Snow Showers Heavy)
                    const code = current.weather_code;
                    let conditionText = 'Clear';
                    if (code >= 1 && code <= 3) conditionText = 'Cloudy';
                    else if (code >= 45 && code <= 48) conditionText = 'Foggy';
                    else if (code >= 49 && code <= 50) conditionText = 'Freezing Fog';
                    else if (code >= 51 && code <= 57) conditionText = 'Drizzle';
                    else if (code >= 61 && code <= 67) conditionText = 'Rainy';
                    else if (code >= 71 && code <= 77) conditionText = 'Snowy';
                    else if (code >= 80 && code <= 86) conditionText = 'Showers';
                    else if (code >= 95 && code <= 99) conditionText = 'Thunderstorm';

                    setWeatherData({
                        tempF: Math.round(current.temperature_2m),
                        conditionText: conditionText,
                        isDay: current.is_day === 1,
                    });
                } else {
                    console.error('Open-Meteo server error code:', response.status);
                }
            } catch (error) {
                console.error('Failed to parse stream:', error);
            } finally {
                if (isMounted) {
                    setIsWeatherLoading(false);
                }
            }
        };

        fetchWeatherData();
        const weatherInterval = setInterval(fetchWeatherData, 5*60*1000); // Refresh every five minutes
        return () => {
            isMounted = false; // Prevent state updates if the component unmounts
            clearInterval(weatherInterval);
        };
    }, []);
    
    // Map physics translations to absolute canvas coords
    const absoluteCardX = useDerivedValue(() => {
        return ((screenWidth - CARD_WIDTH) / 2) + translateX.value;
    }, [screenWidth]);
    const absoluteCardY = useDerivedValue(() => {
        return ((screenHeight - CARD_HEIGHT) / 2) + translateY.value + VISUAL_Y_OFFSET;
    }, [screenHeight]);
    
    // Mapping the shared values into the standard UI transform styles
    const animatedStyle = useAnimatedStyle(() => {
        return {
            position: 'absolute',
            left: absoluteCardX.value,
            top: absoluteCardY.value - (CARD_HEIGHT / 2),
            transform: [
                { scaleX: scaleX.value },
                { scaleY: scaleY.value }
            ]
        };
    });

    // Track size deformations for bloom
    const dynamicWidth = useDerivedValue(() => CARD_WIDTH * scaleX.value);
    const dynamicHeight = useDerivedValue(() => CARD_HEIGHT * scaleY.value);

    return (
        <View style={styles.container}>
            <View style={styles.backgroundWeatherWidget}>
                <Text selectable={false} style={styles.bgTitle}> Asheville, NC </Text>
                <Text selectable={false} style={styles.bgClock}> {currentTime || '--:--:--'} </Text>

                <View style={styles.bgWeatherWrapper}>
                    {isWeatherLoading ? (
                        <ActivityIndicator size="small" color="#58a6ff" />
                    ) : weatherData ? (
                        <Text selectable={false} style={styles.bgWeatherText}>
                            {weatherData.isDay ? '☀️' : '🌙'} {weatherData.tempF}°F • {weatherData.conditionText}
                        </Text>
                    ) : (
                        <Text selectable={false} style={styles.bgErrorText}>⚠️ Weather Offline</Text>
                    )}
                </View>
            </View>
            <DynamicSunbeamBackground
                currentHour={currentHour}
                cardX={absoluteCardX}
                cardY={absoluteCardY}
                cardWidth={dynamicWidth}
                cardHeight={dynamicHeight}
            >
                <View contentContainerStyle={styles.scrollContainer}>
                    <GestureDetector gesture={panGesture}>
                        <Animated.View style={[styles.card, animatedStyle]}>
                            <Text selectable={false} style={styles.title}>Abigail Sutrich</Text>
                            <Text selectable={false} style={styles.subtitle}>Cross-Platform Software Engineer</Text>
                            <Text selectable={false} style={styles.infotitle}>drag me!</Text>
                        </Animated.View>
                    </GestureDetector>
                </View>
            </DynamicSunbeamBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#a1a1a1', 
        justifyContent: 'center', 
        alignItems: 'center',
        userSelect: 'none'
    },
    card: { 
        backgroundColor: '#2b2a2a',
        width: 320,
        height: 160, 
        padding: 30, 
        borderRadius: 15, 
        shadowColor: '#000', 
        shadowOpacity: 0.1, 
        shadowRadius: 10, 
        elevation: 5,
        zIndex: 1000,
        cursor: 'grab'
    },
    title: { 
        fontSize: 28, 
        color: '#999', 
        fontWeight: 'bold', 
        textAlign: 'center',
        justifyContent: 'center' 
    },
    subtitle: { 
        fontSize: 16, 
        color: '#999', 
        marginTop: 5,
        justifyContent: 'center' 
    },
    infotitle: {
        fontSize: 10,
        color: '#999',
        marginTop: 5,
        justifyContent: 'center',
        textAlign: 'center'
    },
    backgroundWeatherWidget: {
        position: 'absolute',
        top: 24,
        left: 24,
        zIndex: 1,
        backgroundColor: 'rgba(22, 27, 34, 0.4)',
        padding: 14,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#30363d',
        minWidth: 180,
    },
    bgTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#c9d1d9',
        fontFamily: 'monospace',
    },
    bgClock: {
        fontSize: 16,
        fontWeight: '600',
        color: '#c9d1d9',
        marginVertical: 4, fontFamily: 'monospace',
    },
    bgWeatherWrapper: {
        marginTop: 2, alignItems: 'flex-start' ,
    },
    bgWeatherText: {
        fontSize: 13,
        color: '#c9d1d9',
        fontFamily: 'monospace',
    },
    bgErrorText: {
        fontSize: 11,
        color: '#f85149',
        fontFamily: 'monospace',
    },
    scrollContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
        position: 'relative',
    },
});