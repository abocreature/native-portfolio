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
import { fetchWeatherApi } from 'openmeteo';
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
    const LATITUDE = '35.82';
    const LONGITUDE = '-82.58';
    const [targetTimezone, setTargetTimezone] = useState('America/New_York'); //fallback to local timezone
    const [currentTime, setCurrentTime] = useState('');
    const [currentHour, setCurrentHour] = useState(new Date().getHours()); //fallback to local time
    const [weatherData, setWeatherData] = useState(null);
    const [sunriseHour, setSunriseHour] = useState(6.5);
    const [sunsetHour, setSunsetHour] = useState(18.5);
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
            const minuteString = now.toLocaleTimeString('en-US', { 
                minute: '2-digit', 
                timeZone: targetTimezone 
            });
            const secondString = now.toLocaleTimeString('en-US', { 
                second: '2-digit', 
                timeZone: targetTimezone 
            });
    
            const decimalHour = parseInt(hourString, 10) + (parseInt(minuteString, 10) / 60) + (parseInt(secondString, 10) / 3600);
            setCurrentHour(decimalHour);
        };

        updateClock(); // Initial call to set the time immediately
        const timerId = setInterval(updateClock, 1000); // Update every second
        return () => clearInterval(timerId);
    }, [targetTimezone]);

    // Grabs weather data using Open-Meteo API
    useEffect(() => {
        let isMounted = true; // To prevent state updates if the component unmounts

        const parseApiTimeToDecimalHours = (value) => {
            if (typeof value === 'number' && Number.isFinite(value)) {
                const asDate = new Date(value * 1000);
                if (!Number.isNaN(asDate.getTime())) {
                    return asDate.getHours() + (asDate.getMinutes() / 60) + (asDate.getSeconds() / 3600);
                }
            }

            if (typeof value === 'string') {
                const match = value.match(/T(\d{2}):(\d{2})(?::(\d{2}))?/);
                if (match) {
                    const [, hours, minutes, seconds = '0'] = match;
                    return Number(hours) + Number(minutes) / 60 + Number(seconds) / 3600;
                }
            }

            return null;
        };

        const fetchWeatherData = async () => {
            const params = {
                latitude: [LATITUDE],
                longitude: [LONGITUDE],
                current: 'temperature_2m,is_day,weather_code,cloud_cover,wind_speed_10m',
                daily: 'sunrise,sunset',
                temperature_unit: 'fahrenheit',
                timezone: 'auto',
                models: 'best_match',
            };

            try {
                const responses = await fetchWeatherApi('https://api.open-meteo.com/v1/forecast', params);
                const response = responses[0];

                if (response && isMounted) {
                    const timezone = response.timezone();
                    if (timezone) {
                        setTargetTimezone(timezone);
                    }

                    const current = response.current();
                    const daily = response.daily();
                    const temperature = current?.variables(0)?.value();
                    const isDay = current?.variables(1)?.value();
                    const weatherCode = current?.variables(2)?.value();
                    const cloudCover = current?.variables(3)?.value();
                    const windSpeed = current?.variables(4)?.value();

                    const parsedSunrise = parseApiTimeToDecimalHours(daily?.variables(0)?.valuesArray()?.[0]);
                    const parsedSunset = parseApiTimeToDecimalHours(daily?.variables(1)?.valuesArray()?.[0]);

                    if (parsedSunrise !== null) {
                        setSunriseHour(parsedSunrise);
                    }
                    if (parsedSunset !== null) {
                        setSunsetHour(parsedSunset);
                    }

                    // Open-Meteo uses WMO Weather Interpretation Codes https://www.nodc.noaa.gov/archive/arc0021/0002199/1.1/data/0-data/HTML/WMO-CODE/WMO4677.HTM
                    const code = weatherCode ?? 0;
                    let conditionText = 'Clear';
                    if (code == 1) conditionText = 'Mainly Clear';
                    else if (code == 2) conditionText = 'Partly Cloudy';
                    else if (code == 3) conditionText = 'Overcast';
                    else if (code >= 45 && code <= 47) conditionText = 'Fog';
                    else if (code >= 48 && code <= 50) conditionText = 'Freezing Fog';
                    else if (code >= 51 && code <= 52) conditionText = 'Light Drizzle';
                    else if (code >= 53 && code <= 54) conditionText = 'Drizzle';
                    else if (code == 55) conditionText = 'Dense Drizzle';
                    else if (code >= 56 && code <= 57) conditionText = 'Freezing Drizzle';
                    else if (code >= 61 && code <= 62) conditionText = 'Light Rain';
                    else if (code >= 63 && code <= 64) conditionText = 'Rain';
                    else if (code == 65) conditionText = 'Heavy Rain';
                    else if (code >= 66 && code <= 67) conditionText = 'Freezing Rain';
                    else if (code >= 70 && code <= 71) conditionText = 'Light Snow';
                    else if (code >= 72 && code <= 73) conditionText = 'Snow';
                    else if (code >= 74 && code <= 75) conditionText = 'Heavy Snow';
                    else if (code == 77) conditionText = 'Snow Grains';
                    else if (code == 80) conditionText = 'Light Showers';
                    else if (code == 81) conditionText = 'Showers';
                    else if (code == 82) conditionText = 'Heavy Showers';
                    else if (code >= 83 && code <= 86) conditionText = 'Snow Showers';
                    else if (code == 95) conditionText = 'Thunderstorm';
                    else if (code >= 96) conditionText = 'Hailstorm';

                    setWeatherData({
                        tempF: Math.round(temperature ?? 0),
                        conditionText,
                        isDay: isDay === 1,
                        cloudCover: Math.round(cloudCover ?? 0),
                        windSpeed: Math.round(windSpeed ?? 5),
                    });
                } else {
                    console.error('Open-Meteo returned no response');
                }
            } catch (error) {
                console.error('Failed to fetch weather data:', error);
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
            
            <DynamicSunbeamBackground
                //currentHour={currentHour}
                currentHour={12}
                sunriseHour={sunriseHour}
                sunsetHour={sunsetHour}
                //cloudCover={weatherData ? weatherData.cloudCover : 0}
                cloudCover={50.0}
                //windSpeed={weatherData ? weatherData.windSpeed : 5}
                windSpeed={5.0}
                cardX={absoluteCardX}
                cardY={absoluteCardY}
                cardWidth={dynamicWidth}
                cardHeight={dynamicHeight}
            >
                <View contentContainerStyle={styles.scrollContainer}>
                    <GestureDetector gesture={panGesture}>
                        <Animated.View style={[styles.card, animatedStyle]}>
                            <Text selectable={false} style={styles.title}>Abigail Sutrich</Text>
                            <Text selectable={false} style={styles.subtitle}>Full-Stack Software Engineer</Text>
                            {/* 2. NEW: Integrated Real-Time OpenMeteo Weather Widget Sub-Grid */}
                            {weatherData ? (
                            <View style={styles.weatherGrid}>
                                <View style={[styles.weatherMetricItem, styles.weatherMetricItemCompact]}>
                                <Text selectable={false} style={styles.metricLabel}>Temp</Text>
                                <Text selectable={false} style={styles.metricValue}>
                                    {weatherData.tempF}°F
                                </Text>
                                </View>

                                <View style={[styles.weatherMetricItem, styles.weatherMetricItemWide]}>
                                <Text selectable={false} style={styles.metricLabel}>Condition</Text>
                                <Text selectable={false} style={styles.metricValue} numberOfLines={1}>
                                    {weatherData.conditionText}
                                </Text>
                                </View>
                                
                                <View style={[styles.weatherMetricItem, styles.weatherMetricItemCompact]}>
                                <Text selectable={false} style={styles.metricLabel}>Clouds</Text>
                                <Text selectable={false} style={styles.metricValue} numberOfLines={1}>
                                    {weatherData.cloudCover ?? 0}%
                                </Text>
                                </View>

                                <View style={[styles.weatherMetricItem, styles.weatherMetricItemWide]}>
                                <Text selectable={false} style={styles.metricLabel}>Local Time</Text>
                                <Text selectable={false} style={styles.metricValue}>
                                    {currentTime.split(' ')[0]} {/* Renders clean HH:MM:SS text layout */}
                                </Text>
                                </View>
                            </View>
                            ) : (
                            <Text selectable={false} style={styles.loadingText}>Fetching forecast metadata...</Text>
                            )}

                            {/* 3. Footer Action Hint */}
                            <Text selectable={false} style={styles.infotitle}>Asheville, NC</Text>
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
        backgroundColor: '#121212',
        width: 320,
        height: 160, 
        padding: 30, 
        borderRadius: 15, 
        shadowColor: '#000', 
        shadowOpacity: 0.1, 
        shadowRadius: 10, 
        elevation: 5,
        zIndex: 1000,
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'grab'
    },
    title: { 
        fontSize: 28, 
        color: '#bbff00',
        textShadowColor: 'rgba(187, 255, 0, 0.85)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
        fontWeight: 'bold', 
        textAlign: 'center',
        justifyContent: 'center' 
    },
    subtitle: { 
        fontSize: 16, 
        color: '#bbff00',
        textShadowColor: 'rgba(187, 255, 0, 0.85)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
        marginTop: 5,
        justifyContent: 'center' 
    },
    infotitle: {
        fontSize: 10,
        color: '#fff',
        marginTop: 5,
        justifyContent: 'center',
        textAlign: 'center'
    },
    weatherGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 0,
        marginTop: 2,
        width: '100%',
        gap: 0,
    },
    weatherMetricItem: {
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        marginHorizontal: 1,
    },
    weatherMetricItemCompact: {
        flexBasis: 0.8,
        flexGrow: 0.8,
        flexShrink: 1,
    },
    weatherMetricItemWide: {
        flexBasis: 1.4,
        flexGrow: 1.4,
        flexShrink: 1,
    },
    metricLabel: {
        fontSize: 10,
        textTransform: 'uppercase',
        color: '#8a99ad',
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    metricValue: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#d7dfe9',
        textAlign: 'center',
    },
    loadingText: {
        fontSize: 12,
        color: '#8a99ad',
        fontStyle: 'italic',
        textAlign: 'center',
    },
    infotitle: {
        fontSize: 11,
        color: '#d1deee',
        textTransform: 'uppercase',
        letterSpacing: 3,
        padding: 2,
        textAlign: 'center',
    },
    scrollContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
        position: 'relative',
    },
});