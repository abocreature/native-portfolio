import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions, ActivityIndicator } from 'react-native';
import {
    WithSkiaWeb
} from '@shopify/react-native-skia/lib/module/web';
import {
    useDerivedValue,
    useSharedValue,
    withRepeat,
    withTiming,
    Easing,
    SharedValue,
    cancelAnimation,
} from 'react-native-reanimated';
import { SkyCanvas, BorderOverlayCanvas } from './SunbeamSkiaCanvas';

interface SunbeamProps {
    currentHour: number; // OpenMeteo time in decimal
    sunriseHour?: number; // OpenMeteo sunrise time in decimal hours
    sunsetHour?: number; // OpenMeteo sunset time in decimal hours
    cloudCover: number; // OpenMeteo cloud cover percentage
    windSpeed: number; // OpenMeteo wind speed
    cardX: SharedValue<number>;
    cardY: SharedValue<number>;
    cardWidth: SharedValue<number>;
    cardHeight: SharedValue<number>;
    children: React.ReactNode;
}

// Vector math helper
function lerpColor(c1: number[], c2: number[], factor: number): number[] {
    return [
        c1[0] + (c2[0] - c1[0]) * factor,
        c1[1] + (c2[1] - c1[1]) * factor,
        c1[2] + (c2[2] - c1[2]) * factor,
    ];
}

export const DynamicSunbeamBackground: React.FC<SunbeamProps> = ({ 
    currentHour, 
    sunriseHour = 6.5,
    sunsetHour = 18.5,
    cloudCover = 0, 
    windSpeed = 5, 
    cardX, 
    cardY, 
    cardWidth, 
    cardHeight, 
    children 
}) => {
    const { width, height } = useWindowDimensions();
    // continuous shimmer animation
    const animTime = useSharedValue(0);

    useEffect(() => {
        animTime.value = withRepeat(
            withTiming(20, {
                duration: 20000,
                easing: Easing.linear,
            }),
            -1,
            false,
        );

        return () => cancelAnimation(animTime);
    }, [animTime]);

    // mapping the OpenMeteo data to the rotation
    const rotationAngle = useMemo(() => {
        return (currentHour / 24) * 2 * Math.PI;
    }, [currentHour]);

    function mixScalar(start: number, end: number, amt: number): number { return start + (end - start) * amt; }

    // adjust color based on time of day
    const sunColor = useMemo(() => {
        const NIGHT = [0.15, 0.25, 0.45];   //Deep Blue
        const SUNRISE = [1.0, 0.55, 0.25];  //Gold
        const DAYLIGHT = [1.4, 1.4, 1.4];   //White
        const SUNSET = [1.1, 0.5, 0.2];     //Orange
        const TWILIGHT = [0.15, 0.25, 0.6]; //Indigo

        let baseColor = DAYLIGHT; //Defaults to daylight
        const cloudFactor = cloudCover / 100;
        const stormyGray = [0.45, 0.5, 0.6];

        const sunriseStart = Math.max(0, sunriseHour - 1.5);
        const sunriseEnd = Math.min(24, sunriseHour + 1.5);
        const sunsetStart = Math.max(0, sunsetHour - 1.5);
        const sunsetEnd = Math.min(24, sunsetHour + 1.5);

        if (currentHour < sunriseStart) baseColor = NIGHT;
        if (currentHour >= sunriseStart && currentHour < sunriseHour) {
            const span = Math.max(0.01, sunriseHour - sunriseStart);
            baseColor = lerpColor(NIGHT, SUNRISE, (currentHour - sunriseStart) / span);
        }
        if (currentHour >= sunriseHour && currentHour < sunriseEnd) {
            const span = Math.max(0.01, sunriseEnd - sunriseHour);
            baseColor = lerpColor(SUNRISE, DAYLIGHT, (currentHour - sunriseHour) / span);
        }
        if (currentHour >= sunriseEnd && currentHour < sunsetStart) baseColor = DAYLIGHT;
        if (currentHour >= sunsetStart && currentHour < sunsetHour) {
            const span = Math.max(0.01, sunsetHour - sunsetStart);
            baseColor = lerpColor(DAYLIGHT, SUNSET, (currentHour - sunsetStart) / span);
        }
        if (currentHour >= sunsetHour && currentHour < sunsetEnd) {
            const span = Math.max(0.01, sunsetEnd - sunsetHour);
            baseColor = lerpColor(SUNSET, TWILIGHT, (currentHour - sunsetHour) / span);
        }
        if (currentHour >= sunsetEnd) {
            const span = Math.max(0.01, 24 - sunsetEnd);
            baseColor = lerpColor(TWILIGHT, NIGHT, (currentHour - sunsetEnd) / span);
        }

        //return lerpColor(baseColor, stormyGray, (cloudFactor * 0.7));
        return baseColor;
    }, [currentHour, sunriseHour, sunsetHour, cloudCover]);

    // pack uniforms for the GPU pipeline
    const uniforms = useDerivedValue(() => {
        const angle = -((currentHour / 24) * 2 * Math.PI) + Math.PI / 2;
        const orbitRadius = Math.max(width, height) * 1.5;
        const centerX = width * 0.5;
        const centerY = height * 0.5;
        const sunX = centerX + Math.cos(angle) * orbitRadius;
        const sunY = centerY + Math.sin(angle) * orbitRadius;
        return {
            u_resolution: [width, height],
            u_time: animTime.value,
            u_sunPos: [sunX, sunY],
            u_sunColor: sunColor,
            u_cloudCover: cloudCover / 100,
            u_windSpeed: windSpeed,
        };
    }, [width, height, currentHour, sunColor, cloudCover, windSpeed]);

    return (
        <View style={[styles.container, { width, height }]}>
            <View style={styles.backCanvasLayer} pointerEvents="none">
                {/* 2. Render the component directly. It will never unmount or leak. */}
                <SkyCanvas uniforms={uniforms} />
            </View>
            <View style={styles.contentOverlay}>
                {children}
            </View>
            <View style={[styles.canvasWrapper, { width, height }]} pointerEvents="none">
                {/* 3. Render the overlay component directly */}
                <BorderOverlayCanvas
                    uniforms={uniforms}
                    cardX={cardX}
                    cardY={cardY}
                    cardWidth={cardWidth}
                    cardHeight={cardHeight}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0c111a',
        position: 'relative',
    },
    backCanvasLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0
    },
    contentOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
        zIndex: 1,
    },
    canvasWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 10,
    },
    fallback: {
        backgroundColor: '#0c111a',
        justifyContent: 'center',
        alignItems: 'center',
    }
});