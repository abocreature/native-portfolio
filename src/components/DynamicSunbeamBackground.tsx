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
    currentHour: number; // Passing OpenMeteo time
    cardX: SharedValue<number>;
    cardY: SharedValue<number>;
    cardWidth: SharedValue<number>;
    cardHeight: SharedValue<number>;
    children: React.ReactNode;
}

export const DynamicSunbeamBackground: React.FC<SunbeamProps> = ({ currentHour, cardX, cardY, cardWidth, cardHeight, children }) => {
    const { width, height } = useWindowDimensions();

    // continuous shimmer animation
    const animTime = useSharedValue(0);

    useEffect(() => {
        animTime.value = withRepeat(
            withTiming(100, { duration: 50000, easing: Easing.linear }),
            -1,
            false
        );
    }, []);

    // mapping the OpenMeteo data to the rotation
    const rotationAngle = useMemo(() => {
        return (currentHour / 24) * 2 * Math.PI;
    }, [currentHour]);

    function mixScalar(start: number, end: number, amt: number): number { return start + (end - start) * amt; }

    // adjust color based on time of day
    const sunColor = useMemo(() => {
        if (currentHour < 5) return [0.25, 0.45, 0.95];                         // Early Morning - Blue
        if (currentHour >= 5 && currentHour <= 8) {
            const t = (currentHour - 5) / 3;
            return [1.0, mixScalar(0.55, 0.85, t), mixScalar(0.25, 0.5, t)];    // Sunrise - Orange
        }
        if (currentHour > 8 && currentHour < 17) return [1.4, 1.4, 1.4];       // Day - White
        if (currentHour >= 17 && currentHour <= 19){
            const t = (currentHour - 16) / 3;
            return [mixScalar(1.4, 0.95, t), mixScalar(1.4, 0.35, t), mixScalar(1.4, 0.15, t)]; // Sunset - Red/Orange
        }
        return [0.4, 0.6, 1.0];                                                 // Night - Blue
    }, [currentHour]);

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
        };
    }, [width, height, currentHour, sunColor]);

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