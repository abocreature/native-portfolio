import React from 'react';
import { StyleSheet, Text, View, Image, useWindowDimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withDecay,
    withClamp,
    withSpring,
    useFrameCallback
} from 'react-native-reanimated';

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
    
    // Mapping the shared values into the standard UI transform styles
    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { scaleX: scaleX.value },
                { scaleY: scaleY.value }
            ]
        };
    });

    return (
        <View style={styles.container}>
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.card, animatedStyle]}>
                    <Text selectable={false} style={styles.title}>Abigail Sutrich</Text>
                    <Text selectable={false} style={styles.subtitle}>Cross-Platform Software Engineer</Text>
                    <Text selectable={false} style={styles.infotitle}>drag me!</Text>
                </Animated.View>
            </GestureDetector>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#f0f2f5', 
        justifyContent: 'center', 
        alignItems: 'center',
        userSelect: 'none'
    },
    card: { 
        backgroundColor: '#fff',
        width: 320,
        height: 160, 
        padding: 30, 
        borderRadius: 15, 
        shadowColor: '#000', 
        shadowOpacity: 0.1, 
        shadowRadius: 10, 
        elevation: 5,
        justifyContent: 'center',
        cursor: 'grab'
    },
    title: { 
        fontSize: 28, 
        fontWeight: 'bold', 
        textAlign: 'center',
        justifyContent: 'center' 
    },
    subtitle: { 
        fontSize: 16, 
        color: '#666', 
        marginTop: 5,
        justifyContent: 'center' 
    },
    infotitle: {
        fontSize: 10,
        color: '#999',
        marginTop: 5,
        justifyContent: 'center',
        textAlign: 'center'
    }
});