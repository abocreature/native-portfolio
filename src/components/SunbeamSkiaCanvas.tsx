import React, { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { Canvas, Shader, Box, rect, Skia } from '@shopify/react-native-skia';
import { useDerivedValue, SharedValue } from 'react-native-reanimated';

const BACKGROUND_SOURCE = `
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec2 u_sunPos;
    uniform vec3 u_sunColor;
    uniform float u_cloudCover;
    uniform float u_windSpeed;

    // Pseudorandom hash function
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 42758.543123);
    }

    // 2D Noise function
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);

        return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }

    // Fractal Brownian Motion (FBM) to turn noise into cloudlike structures
    float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        for (int i = 0; i < 4; i++) {
            value += amplitude * noise(p * frequency);
            p *= 2.0;
            amplitude *= 0.5;
        }
        return value;
    }

    vec4 main(vec2 pos) {
        float maxScale = max(u_resolution.x, u_resolution.y);
        vec2 uv = pos / maxScale;

        vec2 windOffset = vec2(u_time * u_windSpeed * 0.03, 0.0);

        // Sun Intensity
        float distToSun = length(pos - u_sunPos) / maxScale;
        float gradientSharpness = 2.2;
        float atmosphericGlow = pow(smoothstep(gradientSharpness, 0.0, distToSun), gradientSharpness) * 3;

        // Using this to find the relative height of the sun and turning that into a 0.0 to 1.0 range
        vec2 screenCenter = u_resolution * 0.5;
        float orbitRadius = maxScale * 1.5;
        float relativeSunY = u_sunPos.y - screenCenter.y;
        float dayFactor = (relativeSunY / orbitRadius) * 0.5 + 0.5;
        dayFactor = clamp(dayFactor, 0.0, 1.0);

        // Sky Color
        vec3 clearBg = mix(vec3(0.3, 0.4, 0.55), vec3(0.01, 0.02, 0.05), dayFactor);
        vec3 skyColor = mix(clearBg, u_sunColor, atmosphericGlow);

        // Vignette / Center glow
        vec2 normCenterUV = (pos - u_resolution * 0.5) / maxScale;
        float centerDist = length(normCenterUV);
        skyColor += u_sunColor * (smoothstep(0.8, 0.0, centerDist) * 0.03);

        // Star Generation
        vec2 starUV = uv * 140.0; //Higher = more and smaller stars
        vec2 localUV = fract(starUV);
        float starPattern = hash(floor(starUV));
        float speedPattern = hash(floor(starUV) + vec2(43.12, 89.67));
        float starIntensity = smoothstep(0.90, 1.0, starPattern); // Lower means denser sky
        float distToCellCenter = length(localUV - vec2(0.5));
        float starShape = smoothstep(0.15, 0.0, distToCellCenter);
        float uniqueSpeed = 1.5 + speedPattern * 0.5;
        float uniquePhase = starPattern + speedPattern * 6.28318538718;
        float twinkle = 0.6 + 0.4 * sin(u_time * uniqueSpeed + uniquePhase);
        starIntensity *= twinkle;
        float starNightMask = smoothstep(0.3, 0.8, dayFactor) * (1.0 - clamp(atmosphericGlow, 0.0, 1.0));
        vec3 starColor = vec3(starIntensity * starNightMask * starShape);
        skyColor += starColor;

        // Cloud Generation
        float cloudSize = 3.0;
        vec2 cloudUV = uv * cloudSize + windOffset;
        float cloudNoise = fbm(cloudUV);
        float dynamicCoverage;
        if (u_cloudCover < 0.5) dynamicCoverage = pow(u_cloudCover * 2, 0.4) * 0.5; // Stretches low-end range to avoid threshold drop-off
        else dynamicCoverage = u_cloudCover;
        float cloudThreshold = 1.0 - dynamicCoverage; //Threshold from 1.0 to 0.0, lower means more clouds
        float cloudDensity = smoothstep(cloudThreshold - 0.15, cloudThreshold + 0.15, cloudNoise);

        // Cloud Shadow Generation for fake volume
        vec2 sunDir = normalize((u_sunPos - pos) / maxScale);
        vec2 shadowOffset = sunDir * 0.1;
        float shadowNoise = fbm(cloudUV - shadowOffset);
        float shadowThreshold = mix(cloudThreshold, 0.55, u_cloudCover);
        float deepDensity = smoothstep(shadowThreshold - 0.15, shadowThreshold + 0.15, shadowNoise);

        // Cloud Coloring
        vec3 cloudCoreColor = mix(vec3(0.35, 0.36, 0.4) + u_sunColor*0.4, vec3(0.05, 0.07, 0.12), dayFactor);
        vec3 cloudBaseColor = mix(vec3(0.25, 0.28, 0.35) + u_sunColor*0.4, vec3(0.08, 0.11, 0.18) + u_sunColor * 0.1, dayFactor);
        vec3 cloudHighlight = mix(u_sunColor, vec3(1.5, 1.5, 1.55), 0.3);
        float selfShadow = clamp(cloudDensity - deepDensity, 0.0, 1.0);
        vec3 cloudInternalStructure = mix(cloudBaseColor, cloudCoreColor, cloudDensity);
        float shadowIntensity = mix(0.05, 0.65, u_cloudCover*0.5);
        float nightShadowDampener = mix(1.0, 0.15, dayFactor);
        vec3 minimumNightLuminosity = vec3(0.01, 0.02, 0.06);
        vec3 cloudFinalColor = mix(cloudInternalStructure, cloudHighlight, cloudDensity * atmosphericGlow);
        cloudFinalColor -= vec3(selfShadow * shadowIntensity) * (1.0 - atmosphericGlow * 0.5) * nightShadowDampener;
        cloudFinalColor = max(cloudFinalColor, minimumNightLuminosity);
        cloudFinalColor = clamp(cloudFinalColor, 0.0, 1.5);

        // Final composition, blending sky color with the clouds
        float skyBlendMask = smoothstep(0.0, 0.6, cloudDensity);
        vec3 finalColor = mix(skyColor, cloudFinalColor, skyBlendMask);

        return vec4(finalColor, 1.0);
    }
`;

const FOREGROUND_SOURCE = `
    uniform vec2 u_sunPos;
    uniform vec3 u_sunColor;
    uniform vec4 u_cardRect; 
    uniform float u_borderRadius;
    uniform float u_cloudCover;

    float sdRoundRect(vec2 p, vec2 origin, vec2 size, float rad) {
        vec2 d = abs(p - (origin + size * 0.5)) - (size * 0.5 - rad);
        return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - rad;
    }

    vec4 main(vec2 pos) {
        vec2 cardOrigin = u_cardRect.xy;
        vec2 cardSize = u_cardRect.zw;
        float distanceToCard = sdRoundRect(pos, cardOrigin, cardSize, u_borderRadius);

        // Default to fully transparent alpha everywhere on screen
        vec4 finalColor = vec4(0.0);

        // Isolate calculation strictly to the card perimeter boundary (-15px outside to +6px inside)
        if (distanceToCard > -1 && distanceToCard < 1) {
            vec2 cardCenter = cardOrigin + cardSize * 0.5;
            vec2 lightDir = normalize(u_sunPos - cardCenter);
            vec2 pixelDir = normalize(pos - cardCenter);
            
            float edgeFacingSun = dot(pixelDir, lightDir);

            // Muting the highlight when cloudy
            float spotPower = 4.0 - (u_cloudCover * 2.0);
            float spotlightGlow = pow(max(0.0, edgeFacingSun), spotPower);
            float colorBlendWeight = edgeFacingSun * 0.5 + 0.5 + u_cloudCover;
            float bloomGlowFalloff = smoothstep(-15.0, -1.0, distanceToCard) * smoothstep(6.0, 1.0, distanceToCard);
            
            float dayFactor = clamp(u_sunColor.g, 0.3, 1.0);
            vec3 brilliantWhite = mix(vec3(1.6, 1.6, 1.6), vec3(1.0, 1.0, 1.1), u_cloudCover);

            vec3 cardColorMatch = vec3(0.082, 0.106, 0.137);
            vec3 baseAmbientGlow = mix(cardColorMatch, u_sunColor * 0.4, colorBlendWeight);
            
            vec3 finalGlow = mix(baseAmbientGlow, brilliantWhite, spotlightGlow * 0.95 * dayFactor);
            
            // Assign the color and apply the pixel mask to the alpha channel
            finalColor = vec4(finalGlow, bloomGlowFalloff * (0.95 - u_cloudCover * 0.3));
        }

        return finalColor;
    }
`;

interface SkyCanvasProps {
    
    u_resolution: number[];
    u_sunPos: number[];
    u_sunColor: number[];
    u_cloudCover: SharedValue<number>;
    u_windSpeed: SharedValue<number>;

    animTime: SharedValue<number>;
}

interface BorderOverlayCanvasProps {
    
    u_resolution: number[];
    u_sunPos: number[];
    u_sunColor: number[];
    u_cloudCover: SharedValue<number>;
    u_windSpeed: SharedValue<number>;

    animTime: SharedValue<number>;
    cardX: SharedValue<number>;
    cardY: SharedValue<number>;
    cardWidth: SharedValue<number>;
    cardHeight: SharedValue<number>;
}

const backgroundShader = Skia.RuntimeEffect.Make(BACKGROUND_SOURCE);
if (!backgroundShader) console.error("Background shader compilation failed!");
const borderShader = Skia.RuntimeEffect.Make(FOREGROUND_SOURCE);
if (!borderShader) console.error("Border shader compilation failed!");

export const SkyCanvas: React.FC<SkyCanvasProps> = ({ u_resolution, u_sunPos, u_sunColor, u_cloudCover, u_windSpeed, animTime }) => {
    const { width, height } = useWindowDimensions();
    const [canvasEpoch, setCanvasEpoch] = useState(0);

    /*useEffect(() => {
        const interval = setInterval(() => {
            // Target the underlying CanvasKit WASM engine on the global window context
            if (typeof window !== 'undefined' && (window as any).CanvasKit) {
                try {
                    (window as any).CanvasKit.MallocPool.cleanUp();
                } catch (e) {
                    // Safe catch block if specific browser parameters drop the reference wrapper
                }
            }

            setCanvasEpoch((value) => value + 1);
        }, 200000);

        return () => clearInterval(interval);
    }, []);*/
    const dynamicUniforms = useDerivedValue(() => {
        return {
            u_resolution: u_resolution,
            u_sunPos: u_sunPos,
            u_sunColor: u_sunColor,
            u_cloudCover: u_cloudCover.value,
            u_windSpeed: u_windSpeed.value,
            u_time: animTime.value, 
        };
    }, [u_resolution, u_sunPos, u_sunColor, u_cloudCover, u_windSpeed, animTime]);

    if (!backgroundShader) return null;

    return (
        <Canvas key={`sky-${canvasEpoch}`} style={{ width, height, position: 'absolute' }}>
            <Box box={rect(0, 0, width, height)}>
                <Shader source={backgroundShader} uniforms={dynamicUniforms} />
            </Box>
        </Canvas>
    );
}

export const BorderOverlayCanvas: React.FC<BorderOverlayCanvasProps> = ({ u_resolution, u_sunPos, u_sunColor, u_cloudCover, u_windSpeed, animTime, cardX, cardY, cardWidth, cardHeight }) => {
    const { width, height } = useWindowDimensions();
    const [canvasEpoch, setCanvasEpoch] = useState(0);

    /*useEffect(() => {
        const interval = setInterval(() => {
            // Target the underlying CanvasKit WASM engine on the global window context
            if (typeof window !== 'undefined' && (window as any).CanvasKit) {
                try {
                    (window as any).CanvasKit.MallocPool.cleanUp();
                } catch (e) {
                    // Safe catch block if specific browser parameters drop the reference wrapper
                }
            }

            setCanvasEpoch((value) => value + 1);
        }, 2000000);

        return () => clearInterval(interval);
    }, []);*/

    if (!borderShader) return null;

    const dynamicCompositeUniforms = useDerivedValue(() => {
        return {
            u_resolution: u_resolution,
            u_sunPos: u_sunPos,
            u_sunColor: u_sunColor,
            u_cloudCover: u_cloudCover.value,
            u_windSpeed: u_windSpeed.value,
            u_time: animTime.value, 
            u_cardRect: [cardX.value, (cardY.value - cardHeight.value/2), cardWidth.value, cardHeight.value],
            u_borderRadius: 15.0,
        };
    }, [cardX, cardY, cardWidth, cardHeight, u_resolution, u_sunPos, u_sunColor, u_cloudCover, u_windSpeed, animTime]);

    return (
        <Canvas key={`sky-${canvasEpoch}`} style={{ width, height, position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
            <Box box={rect(0, 0, width, height)}>
                <Shader source={borderShader} uniforms={dynamicCompositeUniforms} />
            </Box>
        </Canvas>
    );
};
