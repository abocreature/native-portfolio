import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Image, useWindowDimensions, Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useDerivedValue,
    useAnimatedStyle,
    withSpring,
    useFrameCallback,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { fetchWeatherApi } from 'openmeteo';
import { DynamicSunbeamBackground } from '../components/DynamicSunbeamBackground';

export default function AboutScreen() {
    // Grabbing the realtime screen dimensions
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    // Aligning card dimensions to the style sheet
    const CARD_WIDTH = styles.card.width;
    const BASE_CARD_HEIGHT = 180;
    const EXPANDED_CARD_HEIGHT = 220;

    // Calculating boundary limits for the screen edges
    const headerHeight = useHeaderHeight();
    const insets = useSafeAreaInsets();
    const bottomBarHeight = insets.bottom > 0 ? insets.bottom + 49 : 50;

    const [isWeatherDetailsOpen, setIsWeatherDetailsOpen] = useState(false);
    const detailsHeight = useSharedValue(0);
    const detailsOpacity = useSharedValue(0);
    const currentCardHeight = isWeatherDetailsOpen ? EXPANDED_CARD_HEIGHT : BASE_CARD_HEIGHT;

    const minX = -screenWidth / 2 + CARD_WIDTH / 2;
    const maxX = screenWidth /2 - CARD_WIDTH / 2;
    const minY = -screenHeight / 2 + currentCardHeight / 2 + headerHeight;
    const maxY = screenHeight / 2 - currentCardHeight / 2 - bottomBarHeight;

    const VISUAL_Y_OFFSET = isWeatherDetailsOpen ? headerHeight - bottomBarHeight + 32 : headerHeight - bottomBarHeight + 12; // Calculating the collision offset for the card
    //current issue: Still identifying where the extra 12 and 32 pixels are coming from
    //prior to adding the drop down, there was still ahn extra 2 pixel offset

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

    // Flip animation
    const flip = useSharedValue(0); // 0 = front, 180 = back

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
    const [userIP, setUserIP] = useState('Fetching IP...');
    const [userCity, setUserCity] = useState('Fetching City...');
    const [userRegion, setUserRegion] = useState('Fetching Region...');
    const [frontWeatherData, setFrontWeatherData] = useState(null);
    const [backWeatherData, setBackWeatherData] = useState(null);
    const [isFlipped, setIsFlipped] = useState(false);
    const flipTimeoutRef = useRef(null);
    const [currentTime, setCurrentTime] = useState('');
    const [currentHour, setCurrentHour] = useState(new Date().getHours()); //fallback to local time
    const [weatherData, setWeatherData] = useState(null);
    const [isWeatherLoading, setIsWeatherLoading] = useState(true);

    useEffect(() => {
        detailsHeight.value = withTiming(isWeatherDetailsOpen ? 40 : 0, {
            duration: 220,
            easing: Easing.out(Easing.cubic),
        });
        detailsOpacity.value = withTiming(isWeatherDetailsOpen ? 1 : 0, {
            duration: 220,
            easing: Easing.out(Easing.cubic),
        });
    }, [detailsHeight, detailsOpacity, isWeatherDetailsOpen]);

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
                    timeZone: isFlipped ? (backWeatherData ? backWeatherData.timezone : 'America/New_York') : (frontWeatherData ? frontWeatherData.timezone : 'America/New_York'),
                })
            );

            const hourString = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                hour12: false, // Forces 24-hour calculation
                timeZone: isFlipped ? (backWeatherData ? backWeatherData.timezone : 'America/New_York') : (frontWeatherData ? frontWeatherData.timezone : 'America/New_York'),
            });
            const minuteString = now.toLocaleTimeString('en-US', { 
                minute: '2-digit', 
                timeZone: isFlipped ? (backWeatherData ? backWeatherData.timezone : 'America/New_York') : (frontWeatherData ? frontWeatherData.timezone : 'America/New_York')
            });
            const secondString = now.toLocaleTimeString('en-US', { 
                second: '2-digit', 
                timeZone: isFlipped ? (backWeatherData ? backWeatherData.timezone : 'America/New_York') : (frontWeatherData ? frontWeatherData.timezone : 'America/New_York')
            });
    
            const decimalHour = parseInt(hourString, 10) + (parseInt(minuteString, 10) / 60) + (parseInt(secondString, 10) / 3600);
            setCurrentHour(decimalHour);
        };

        updateClock(); // Initial call to set the time immediately
        const timerId = setInterval(updateClock, 1000); // Update every second
        return () => clearInterval(timerId);
    }, [isFlipped, frontWeatherData, backWeatherData]);

    // Grabs weather data using Open-Meteo API
    useEffect(() => {
        let isMounted = true; // To prevent state updates if the component unmounts

        const parseApiTimeToDecimalHours = (value, utcOffsetSeconds = 0) => {
            if (value === null || value === undefined) return null;

            // Convert BigInt instances coming from valuesInt64 safely to a standard number
            let rawSeconds = typeof value === 'bigint' ? Number(value) : Number(value);

            if (Number.isFinite(rawSeconds)) {
                const adjustedSeconds = rawSeconds + utcOffsetSeconds;
                
                const asDate = new Date(adjustedSeconds * 1000);
                
                if (!Number.isNaN(asDate.getTime())) {
                    return asDate.getUTCHours() + (asDate.getUTCMinutes() / 60) + (asDate.getUTCSeconds() / 3600);
                }
            }

            return null;
        };

        const fetchWeatherData = async (useIP = false) => {
            let targetLat = LATITUDE;
            let targetLong = LONGITUDE;

            /*if (useIP) {
                try {
                    const controller = new AbortController();
                    const timeoutID = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

                    const geoResponse = await fetch('https://ipapi.co/json/', { signal: controller.signal });
                    clearTimeout(timeoutID);
                    if (geoResponse.ok) {
                        const geoData = await geoResponse.json();
                        if (geoData.ip && isMounted) setUserIP(geoData.ip);
                        if (geoData.city && isMounted) setUserCity(geoData.city);
                        if (geoData.region && isMounted) setUserRegion(geoData.region);
                        if (typeof geoData.latitude === 'number' && typeof geoData.longitude === 'number') {
                            targetLat = geoData.latitude;
                            targetLong = geoData.longitude;
                            console.log('IP lat:', targetLat, 'IP long:', targetLong);
                        }
                    }
                } catch (geoError) {
                    console.error('IP lookup blocked or failed, falling back to static boundaries:', geoError);
                }
            }*/
            /*if (useIP && typeof navigator !== 'undefined' && navigator.geolocation) {
                try {
                    const position = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                    });
                    targetLat = position.coords.latitude;
                    targetLong = position.coords.longitude;
                    
                    if (isMounted) {
                        setUserIP('GPS Enabled');
                        setUserRegion('Current Location');
                    }
                } catch (geoError) {
                    console.error('Geolocation declined or timed out:', geoError);
                    if (isMounted) {
                        setUserIP('GPS Disabled');
                        setUserRegion('Default Location');
                    }
                }
            }*/
            if (useIP) {
                try {
                    const geoResponse = await fetch('/api/geo');
                    
                    if (geoResponse.ok) {
                        const geoData = await geoResponse.json();
                        
                        if (geoData && isMounted) {
                            // Read the keys directly from your fresh, custom local endpoint schema
                            if (geoData.ip) {
                                setUserIP(geoData.ip);
                            }
                            
                            const city = geoData.city || '';
                            const region = geoData.region || '';
                            setUserCity(city ?? 'Current View');
                            setUserRegion(region ?? '');

                            const parsedLat = geoData.latitude;
                            const parsedLong = geoData.longitude;

                            if (!Number.isNaN(parsedLat) && Number.isFinite(parsedLat) &&
                                !Number.isNaN(parsedLong) && Number.isFinite(parsedLong)) {
                                targetLat = parsedLat;
                                targetLong = parsedLong;
                            }
                        }

                        console.log("Geo Repsonse OK!");
                        console.log(geoData.ip);
                    } else {
                        console.warn('Local location endpoint returned non-OK status code:', geoResponse.status);
                    }
                } catch (geoError) {
                    console.warn('Local API network lookup failed, routing static coordinates:', geoError);
                    if (isMounted) {
                        setUserIP('Offline / Unavailable');
                        setUserCity('Static View');
                        setUserRegion('');
                    }
                }
            }

            const params = {
                latitude: [targetLat],
                longitude: [targetLong],
                current: 'temperature_2m,is_day,weather_code,cloud_cover,wind_speed_10m',
                daily: ['sunrise','sunset'],
                temperature_unit: 'fahrenheit',
                wind_speed_unit: 'mph',
                timezone: 'auto',
                models: 'best_match',
            };

            try {
                const responses = await fetchWeatherApi('https://api.open-meteo.com/v1/forecast', params);
                const response = responses[0];

                if (response && isMounted) {
                    const timezone = response.timezone();

                    const current = response.current();
                    const daily = response.daily();

                    const temperature = current?.variables(0)?.value();
                    const isDay = current?.variables(1)?.value();
                    const weatherCode = current?.variables(2)?.value();
                    const cloudCover = current?.variables(3)?.value();
                    const windSpeed = current?.variables(4)?.value();

                    const utcOffsetSeconds = response.utcOffsetSeconds();
                    const parsedSunrise = parseApiTimeToDecimalHours(daily?.variables(0)?.valuesInt64(0), utcOffsetSeconds);
                    const parsedSunset = parseApiTimeToDecimalHours(daily?.variables(1)?.valuesInt64(0), utcOffsetSeconds);

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

                    const payload = {
                        tempF: Math.round(temperature ?? 0),
                        conditionText,
                        isDay: isDay === 1,
                        cloudCover: Math.round(cloudCover ?? 0),
                        windSpeed: Math.round(windSpeed ?? 5),
                        sunrise: parsedSunrise ?? 6.5,
                        sunset: parsedSunset ?? 18.5,
                        timezone: timezone ?? 'America/New_York',
                    };

                    if (useIP) {
                        setBackWeatherData(payload);
                    } else {
                        setFrontWeatherData(payload);
                    }

                    console.log(`Open-Meteo API completed successfully for useIP=${useIP}`);
                    if (useIP) console.log("Back Weather Paylod:", payload);
                    else console.log("Front Weather Payload:", payload);
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

        fetchWeatherData(false);
        fetchWeatherData(true);
        const weatherInterval = setInterval(() => {
            fetchWeatherData(false);
            fetchWeatherData(true);
        }, 5 * 60 * 1000); // Refresh every five minutes
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
        return ((screenHeight - currentCardHeight) / 2) + translateY.value + VISUAL_Y_OFFSET;
    }, [screenHeight, currentCardHeight]);
    
    // Mapping the shared values into the standard UI transform styles
    const animatedStyle = useAnimatedStyle(() => {
        return {
            position: 'absolute',
            left: absoluteCardX.value,
            top: absoluteCardY.value - (currentCardHeight / 2),
            transform: [
                { scaleX: scaleX.value },
                { scaleY: scaleY.value }
                , { perspective: 1000 }
            ]
        };
    });

    // Individual face rotations so text stays readable (not mirrored)
    const frontAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { perspective: 1000 },
            { rotateY: `${flip.value}deg` }
        ]
    }));

    const backAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { perspective: 1000 },
            { rotateY: `${flip.value - 180}deg` }
        ]
    }));

    // Track size deformations for bloom
    const dynamicWidth = useDerivedValue(() => CARD_WIDTH * scaleX.value);
    const dynamicHeight = useDerivedValue(() => currentCardHeight * scaleY.value);

    // Visible width should reflect 3D flip (narrow at 90deg). Keep a small minimum.
    const visibleCardWidth = useDerivedValue(() => {
        const angleRad = (flip.value * Math.PI) / 180;
        const factor = Math.abs(Math.cos(angleRad));
        return Math.max(1, CARD_WIDTH * factor * scaleX.value);
    });

    // Visible X computed so width changes are centered: left = center - visibleWidth/2
    const visibleCardX = useDerivedValue(() => {
        // center of the card based on unscaled CARD_WIDTH and translate
        const centerX = absoluteCardX.value + CARD_WIDTH / 2;
        const width = visibleCardWidth.value; // current visible width
        return centerX - (width / 2);
    });

    const detailsAnimatedStyle = useAnimatedStyle(() => ({
        height: detailsHeight.value,
        opacity: detailsOpacity.value,
    }));

    // Toggle flip and update the isFlipped flag halfway through the animation.
    const toggleFlip = () => {
        const DURATION = 600;
        const to = flip.value === 0 ? 180 : 0;
        const nextFlipped = to === 180;

        if (flipTimeoutRef.current) {
            clearTimeout(flipTimeoutRef.current);
            flipTimeoutRef.current = null;
        }

        flip.value = withTiming(to, { duration: DURATION, easing: Easing.out(Easing.cubic) });
        flipTimeoutRef.current = setTimeout(() => {
            setIsFlipped(nextFlipped);
            flipTimeoutRef.current = null;
        }, DURATION / 2);
    };

    const formatHourLabel = (decimalHour) => {
        if (decimalHour == null || Number.isNaN(decimalHour)) {
            return '--:--';
        }

        const normalizedHour = ((decimalHour % 24) + 24) % 24;
        const hour = Math.floor(normalizedHour);
        const minute = Math.round((normalizedHour - hour) * 60);
        const safeMinute = Math.min(59, Math.max(0, minute));
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        const displayMinute = safeMinute.toString().padStart(2, '0');

        return `${displayHour}:${displayMinute} ${period}`;
    };

    return (
        <View style={styles.container}>
            
            <DynamicSunbeamBackground
                targetTimezone={isFlipped ? (backWeatherData ? backWeatherData.timezone : 'America/New_York') : (frontWeatherData ? frontWeatherData.timezone : 'America/New_York')}
                sunriseHour={isFlipped ? (backWeatherData ? backWeatherData.sunrise : 6.5) : (frontWeatherData ? frontWeatherData.sunrise : 6.5)}
                sunsetHour={isFlipped ? (backWeatherData ? backWeatherData.sunset : 18.5) : (frontWeatherData ? frontWeatherData.sunset : 18.5)}
                cloudCover={isFlipped ? (backWeatherData ? backWeatherData.cloudCover : 0.0) : (frontWeatherData ? frontWeatherData.cloudCover : 0.0)}
                //cloudCover={50.0}
                windSpeed={isFlipped ? (backWeatherData ? backWeatherData.windSpeed : 5.0) : (frontWeatherData ? frontWeatherData.windSpeed : 5.0)}
                //windSpeed={5.0}
                cardX={visibleCardX}
                cardY={absoluteCardY}
                cardWidth={visibleCardWidth}
                cardHeight={dynamicHeight}
            >
                <View contentContainerStyle={styles.scrollContainer}>
                    <GestureDetector gesture={panGesture}>
                        <Animated.View style={[styles.card, { height: currentCardHeight }, animatedStyle]}>
                            <Pressable accessibilityRole="button" onPress={toggleFlip} style={styles.flipButton}>
                                <Animated.View style={styles.flipButtonCircle}>
                                    <Text selectable={false} style={styles.arrowText}>↻</Text>
                                </Animated.View>
                            </Pressable>

                            <Animated.View style={[styles.cardFace, styles.cardFront, frontAnimatedStyle]}>
                                <Text selectable={false} style={styles.title}>Abigail Sutrich</Text>
                                <Text selectable={false} style={styles.subtitle}>Full-Stack Software Engineer</Text>
                            {/* 2. NEW: Integrated Real-Time OpenMeteo Weather Widget Sub-Grid */}
                            {frontWeatherData ? (
                            <View style={styles.weatherSection}>
                                <View style={styles.weatherGrid}>
                                    <View style={[styles.weatherMetricItem, styles.weatherMetricItemCompact]}>
                                        <Text selectable={false} style={styles.metricLabel}>Temp</Text>
                                        <Text selectable={false} style={styles.metricValue}>{frontWeatherData.tempF}°F</Text>
                                    </View>

                                    <View style={[styles.weatherMetricItem, styles.weatherMetricItemWide]}>
                                        <Text selectable={false} style={styles.metricLabel}>Condition</Text>
                                        <Text selectable={false} style={styles.metricValue} numberOfLines={1}>{frontWeatherData.conditionText}</Text>
                                    </View>

                                    <View style={[styles.weatherMetricItem, styles.weatherMetricItemWide]}>
                                        <Text selectable={false} style={styles.metricLabel}>Local Time</Text>
                                        <Text selectable={false} style={styles.metricValue}>{currentTime.split(' ')[0]}</Text>
                                    </View>

                                    <Pressable
                                        accessibilityRole="button"
                                        onPress={() => setIsWeatherDetailsOpen((prev) => !prev)}
                                        style={styles.weatherChevronButton}
                                    >
                                        <Text selectable={false} style={styles.weatherChevronText}>
                                            {isWeatherDetailsOpen ? '⌃' : '⌄'}
                                        </Text>
                                    </Pressable>
                                </View>

                                <Animated.View style={[styles.weatherDetailsPanel, detailsAnimatedStyle]}>
                                    <View style={styles.weatherDetailsGrid}>
                                        <View style={styles.weatherDetailsColumn}>
                                            <Text selectable={false} style={styles.detailLabel}>Clouds</Text>
                                            <Text selectable={false} style={styles.detailValue}>{frontWeatherData.cloudCover ?? 0}%</Text>
                                        </View>
                                        <View style={styles.weatherDetailsColumn}>
                                            <Text selectable={false} style={styles.detailLabel}>Wind</Text>
                                            <Text selectable={false} style={styles.detailValue}>{frontWeatherData.windSpeed ?? 0} mph</Text>
                                        </View>
                                        <View style={styles.weatherDetailsColumn}>
                                            <Text selectable={false} style={styles.detailLabel}>Sunrise</Text>
                                            <Text selectable={false} style={styles.detailValue}>{formatHourLabel(frontWeatherData.sunrise)}</Text>
                                        </View>
                                        <View style={styles.weatherDetailsColumn}>
                                            <Text selectable={false} style={styles.detailLabel}>Sunset</Text>
                                            <Text selectable={false} style={styles.detailValue}>{formatHourLabel(frontWeatherData.sunset)}</Text>
                                        </View>
                                    </View>
                                </Animated.View>
                            </View>
                            ) : (
                            <Text selectable={false} style={styles.loadingText}>Fetching forecast metadata...</Text>
                            )}

                            <Text selectable={false} style={styles.infotitle}>Asheville, NC</Text>
                            </Animated.View>

                            <Animated.View style={[styles.cardFace, styles.cardBack, backAnimatedStyle]}>
                                <Text selectable={false} style={styles.title}>Dearest Visitor</Text>
                                <Text selectable={false} style={styles.subtitle}>{userIP}</Text>
                                {/* Mirror the weather section on the back face */}
                                {backWeatherData ? (
                                <View style={styles.weatherSection}>
                                    <View style={styles.weatherGrid}>
                                        <View style={[styles.weatherMetricItem, styles.weatherMetricItemCompact]}>
                                            <Text selectable={false} style={styles.metricLabel}>Temp</Text>
                                            <Text selectable={false} style={styles.metricValue}>{backWeatherData.tempF}°F</Text>
                                        </View>

                                        <View style={[styles.weatherMetricItem, styles.weatherMetricItemWide]}>
                                            <Text selectable={false} style={styles.metricLabel}>Condition</Text>
                                            <Text selectable={false} style={styles.metricValue} numberOfLines={1}>{backWeatherData.conditionText}</Text>
                                        </View>

                                        <View style={[styles.weatherMetricItem, styles.weatherMetricItemWide]}>
                                            <Text selectable={false} style={styles.metricLabel}>Local Time</Text>
                                            <Text selectable={false} style={styles.metricValue}>{currentTime.split(' ')[0]}</Text>
                                        </View>

                                        <Pressable
                                            accessibilityRole="button"
                                            onPress={() => setIsWeatherDetailsOpen((prev) => !prev)}
                                            style={styles.weatherChevronButton}
                                        >
                                            <Text selectable={false} style={styles.weatherChevronText}>
                                                {isWeatherDetailsOpen ? '⌃' : '⌄'}
                                            </Text>
                                        </Pressable>
                                    </View>

                                    <Animated.View style={[styles.weatherDetailsPanel, detailsAnimatedStyle]}>
                                        <View style={styles.weatherDetailsGrid}>
                                            <View style={styles.weatherDetailsColumn}>
                                                <Text selectable={false} style={styles.detailLabel}>Clouds</Text>
                                                <Text selectable={false} style={styles.detailValue}>{backWeatherData.cloudCover ?? 0}%</Text>
                                            </View>
                                            <View style={styles.weatherDetailsColumn}>
                                                <Text selectable={false} style={styles.detailLabel}>Wind</Text>
                                                <Text selectable={false} style={styles.detailValue}>{backWeatherData.windSpeed ?? 0} mph</Text>
                                            </View>
                                            <View style={styles.weatherDetailsColumn}>
                                                <Text selectable={false} style={styles.detailLabel}>Sunrise</Text>
                                                <Text selectable={false} style={styles.detailValue}>{formatHourLabel(backWeatherData.sunrise)}</Text>
                                            </View>
                                            <View style={styles.weatherDetailsColumn}>
                                                <Text selectable={false} style={styles.detailLabel}>Sunset</Text>
                                                <Text selectable={false} style={styles.detailValue}>{formatHourLabel(backWeatherData.sunset)}</Text>
                                            </View>
                                        </View>
                                    </Animated.View>
                                </View>
                                ) : (
                                <Text selectable={false} style={styles.loadingText}>Fetching forecast metadata...</Text>
                                )}

                                <Text selectable={false} style={styles.infotitle}>{userCity}, {userRegion}</Text>
                            </Animated.View>
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
        backgroundColor: 'transparent',
        width: 320,
        minHeight: 180, 
        padding: 0, 
        borderRadius: 15, 
        shadowColor: '#000', 
        shadowOpacity: 0.1, 
        shadowRadius: 10, 
        elevation: 5,
        zIndex: 1000,
        justifyContent: 'flex-start',
        alignItems: 'center',
        cursor: 'grab',
        overflow: 'hidden',
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
        marginTop: 4,
        justifyContent: 'center',
        textAlign: 'center'
    },
    weatherSection: {
        width: '100%',
        marginTop: 8,
        marginBottom: 0,
    },
    weatherGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 0,
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
        flexGrow: 1.2,
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
    weatherChevronButton: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
    weatherChevronText: {
        fontSize: 16,
        color: '#8a99ad',
        fontWeight: '700',
        lineHeight: 16,
    },
    weatherDetailsPanel: {
        overflow: 'hidden',
        marginTop: 4,
        paddingTop: 4,
        paddingBottom: 2,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.12)',
    },
    weatherDetailsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 2,
    },
    weatherDetailsColumn: {
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        paddingHorizontal: 2,
    },
    detailLabel: {
        fontSize: 9,
        textTransform: 'uppercase',
        color: '#8a99ad',
        fontWeight: '600',
        letterSpacing: 0.4,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 11,
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
    cardFace: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        padding: 30,
        alignItems: 'center',
        justifyContent: 'flex-start',
        backfaceVisibility: 'hidden',
        backgroundColor: '#121212',
        borderRadius: 15,
    },
    cardFront: {
        zIndex: 2,
    },
    cardBack: {
        zIndex: 1,
    },
    flipButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 10,
    },
    flipButtonCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    arrowText: {
        color: '#8a99ad',
        fontSize: 16,
        fontWeight: '700',
    },
});