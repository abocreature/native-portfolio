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
    targetTimezone: string; // Timezone for the location, e.g., "America/New_York"
    sunriseHour: number; // OpenMeteo sunrise time in decimal hours
    sunsetHour: number; // OpenMeteo sunset time in decimal hours
    cloudCover: number; // OpenMeteo cloud cover percentage
    windSpeed: number; // OpenMeteo wind speed
    cardX: SharedValue<number>;
    cardY: SharedValue<number>;
    cardWidth: SharedValue<number>;
    cardHeight: SharedValue<number>;
    children: React.ReactNode;
}

export const DynamicSunbeamBackground: React.FC<SunbeamProps> = ({ 
    targetTimezone,
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
    const sharedSunsetHour = useSharedValue(sunsetHour);
    const sharedSunriseHour = useSharedValue(sunriseHour);
    const sharedTimezone = useSharedValue(targetTimezone);

    useEffect(() => {
        sharedCloudCover.value = cloudCover / 100;
        sharedWindSpeed.value = windSpeed;
        sharedSunsetHour.value = sunsetHour;
        sharedSunriseHour.value = sunriseHour;
    }, [cloudCover, windSpeed, sunsetHour, sunriseHour]);

    useFrameCallback(() => {
        animTime.value += 0.01;
    });

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
                                targetTimezone={sharedTimezone}
                                sunriseHour={sharedSunriseHour}
                                sunsetHour={sharedSunsetHour}
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
                                    targetTimezone={sharedTimezone}
                                    sunriseHour={sharedSunriseHour}
                                    sunsetHour={sharedSunsetHour}
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