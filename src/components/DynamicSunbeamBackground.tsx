import React, { useEffect, useMemo, } from 'react';
import { StyleSheet, View, useWindowDimensions, } from 'react-native';
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
    useFrameCallback,
} from 'react-native-reanimated';

// Get the exact package version
const CanvasKit_Version = require('canvaskit-wasm/package.json').version;

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
    const animTime = useSharedValue(0);
    const sharedCloudCover = useSharedValue(cloudCover / 100);
    const sharedWindSpeed = useSharedValue(windSpeed);

    useEffect(() => {
        sharedCloudCover.value = cloudCover / 100;
        sharedWindSpeed.value = windSpeed;
    }, [cloudCover, windSpeed]);

    useFrameCallback(() => {
        animTime.value += 0.01;
    });

    // adjust color based on time of day
    const sunColor = useMemo(() => {
        const NIGHT = [0.15, 0.25, 0.45];   //Deep Blue
        const SUNRISE = [1.0, 0.55, 0.25];  //Gold
        const DAYLIGHT = [1.4, 1.4, 1.4];   //White
        const SUNSET = [1.1, 0.5, 0.2];     //Orange
        const TWILIGHT = [0.15, 0.25, 0.6]; //Indigo

        let baseColor = DAYLIGHT; //Defaults to daylight

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

    // Pre-calculate sun trajectory on the CPU
    const sunPosValue = useMemo(() => {
        const angle = -((currentHour / 24) * 2 * Math.PI) + Math.PI / 2;
        const orbitRadius = Math.max(width, height) * 1.5;
        const centerX = width * 0.5;
        const centerY = height * 0.5;
        const sunX = centerX + Math.cos(angle) * orbitRadius;
        const sunY = centerY + Math.sin(angle) * orbitRadius;
        return [sunX, sunY];
    }, [width, height, currentHour, sunColor, cloudCover, windSpeed]);

    return (
        <View style={[styles.container, { width, height }]}>
            <View style={styles.backCanvasLayer} pointerEvents="none">
                <WithSkiaWeb 
                    opts={{
                        locateFile: (file) => `https://cdn.jsdelivr.net/npm/canvaskit-wasm@${CanvasKit_Version}/bin/full/${file}`,
                    }} 
                    getComponent={async () => {
                        const { SkyCanvas } = await import('./SunbeamSkiaCanvas');

                        return { 
                            default: () => <SkyCanvas 
                                u_resolution={[width, height]}
                                u_sunPos={sunPosValue}
                                u_sunColor={sunColor}
                                u_cloudCover={sharedCloudCover}
                                u_windSpeed={sharedWindSpeed} 
                                animTime={animTime} 
                            /> 
                        };
                    }} 
                />
            </View>
            <View style={styles.contentOverlay}>
                {children}
            </View>
            <View style={[styles.canvasWrapper, { width, height }]} pointerEvents="none">
                <WithSkiaWeb
                    opts={{
                        locateFile: (file) => `https://cdn.jsdelivr.net/npm/canvaskit-wasm@${CanvasKit_Version}/bin/full/${file}`,
                    }}
                    getComponent={async () => {
                        const { BorderOverlayCanvas } = await import('./SunbeamSkiaCanvas');

                        return {
                            default: () => (
                                <BorderOverlayCanvas
                                    u_resolution={[width, height]}
                                    u_sunPos={sunPosValue}
                                    u_sunColor={sunColor}
                                    u_cloudCover={sharedCloudCover}
                                    u_windSpeed={sharedWindSpeed}
                                    animTime={animTime}
                                    cardX={cardX}
                                    cardY={cardY}
                                    cardWidth={cardWidth}
                                    cardHeight={cardHeight}
                                />
                            ),
                        };
                    }}
                    fallback={null}
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