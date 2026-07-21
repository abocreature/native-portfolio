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
} from 'react-native-reanimated';
import { SkyCanvas, BorderOverlayCanvas } from './SunbeamSkiaCanvas';

// Get the exact package version
const CanvasKit_Version = require('canvaskit-wasm/package.json').version;

interface SunbeamProps {
    currentHour: number; // OpenMeteo time in decimal
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

        if (currentHour < 5) baseColor = NIGHT;
        if (currentHour >= 5 && currentHour < 7) {
            baseColor = lerpColor(NIGHT, SUNRISE, (currentHour - 5) / 2);
        }
        if (currentHour >= 7 && currentHour < 9) {
            baseColor = lerpColor(SUNRISE, DAYLIGHT, (currentHour - 7) / 2);
        }
        if (currentHour >= 9 && currentHour < 16) baseColor = DAYLIGHT;
        if (currentHour >= 16 && currentHour < 18.5) {
            baseColor = lerpColor(DAYLIGHT, SUNSET, (currentHour - 16) / 2.5);
        }
        if (currentHour >= 18.5 && currentHour < 20) {
            baseColor = lerpColor(SUNSET, TWILIGHT, (currentHour - 18.5) / 1.5);
        }
        if (currentHour >= 20) {
            baseColor = lerpColor(TWILIGHT, NIGHT, (currentHour - 20) / 4);
        }

        return lerpColor (baseColor, stormyGray, (cloudFactor * 0.7));
    }, [currentHour, cloudCover]);

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

    const cdnOpts = { locateFile: (file: string): string => `https://cdn.jsdelivr.net/npm/canvaskit-wasm@${CanvasKit_Version}/bin/full/${file}` };

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
                            default: () => <SkyCanvas uniforms={uniforms} /> 
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
                                    uniforms={uniforms}
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