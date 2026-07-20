import React, { use } from 'react';
import { useWindowDimensions } from 'react-native';
import { Canvas, Shader, Box, Group, Blur, rect, rrect, Skia } from '@shopify/react-native-skia';
import { useDerivedValue, SharedValue } from 'react-native-reanimated';

const BACKGROUND_SOURCE = `
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec2 u_sunPos;
    uniform vec3 u_sunColor;

    vec4 main(vec2 pos) {
        float maxScale = max(u_resolution.x, u_resolution.y);
        float distToSun = length(pos - u_sunPos) / maxScale;

        float atmosphericGlow = pow(smoothstep(2.2, 0.0, distToSun), 2.2) * 3;
        float ambientWave = sin(u_time * 0.02) * 0.02;
        float finalGlowIntensity = clamp(atmosphericGlow + ambientWave, 0.0, 1.0);

        vec3 bgColor = vec3(0.02, 0.04, 0.1); 
        vec3 finalColor = mix(bgColor, u_sunColor, finalGlowIntensity);

        // Center vignette
        vec2 normCenterUV = (pos - u_resolution * 0.5) / maxScale;
        float centerDist = length(normCenterUV);
        finalColor += u_sunColor * (smoothstep(0.8, 0.0, centerDist) * 0.03);

        return vec4(finalColor, 1.0);
    }
`;

const FOREGROUND_SOURCE = `
    uniform vec2 u_sunPos;
    uniform vec3 u_sunColor;
    uniform vec4 u_cardRect; 
    uniform float u_borderRadius;

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
        if (distanceToCard > -1.0 && distanceToCard < 1.0) {
            vec2 cardCenter = cardOrigin + cardSize * 0.5;
            vec2 lightDir = normalize(u_sunPos - cardCenter);
            vec2 pixelDir = normalize(pos - cardCenter);
            
            float edgeFacingSun = dot(pixelDir, lightDir);
            float spotlightGlow = pow(max(0.0, edgeFacingSun), 4.0);
            float colorBlendWeight = edgeFacingSun * 0.5 + 0.5;
            float bloomGlowFalloff = smoothstep(-15.0, -1.0, distanceToCard) * smoothstep(6.0, 1.0, distanceToCard);
            
            float dayFactor = clamp(u_sunColor.g, 0.3, 1.0);
            vec3 brilliantWhite = vec3(1.6, 1.6, 1.6);

            vec3 cardColorMatch = vec3(0.082, 0.106, 0.137);
            vec3 baseAmbientGlow = mix(cardColorMatch, u_sunColor * 0.4, colorBlendWeight);
            
            vec3 finalGlow = mix(baseAmbientGlow, brilliantWhite, spotlightGlow * 0.95 * dayFactor);
            
            // Assign the color and apply the pixel mask to the alpha channel
            finalColor = vec4(finalGlow, bloomGlowFalloff * 0.95);
        }

        return finalColor;
    }
`;

interface SkyCanvasProps {
    uniforms: SharedValue<{
        u_resolution: number[];
        u_time: number;
        u_sunPos: number[];
        u_sunColor: number[];
    }>;
}

interface BorderOverlayCanvasProps {
    uniforms: SharedValue<{
        u_resolution: number[];
        u_time: number;
        u_sunPos: number[];
        u_sunColor: number[];
    }>;
    cardX: SharedValue<number>;
    cardY: SharedValue<number>;
    cardWidth: SharedValue<number>;
    cardHeight: SharedValue<number>;
}

export const SkyCanvas: React.FC<SkyCanvasProps> = ({ uniforms }) => {
    const { width, height } = useWindowDimensions();

    const skiaShader = React.useMemo(() => Skia.RuntimeEffect.Make(BACKGROUND_SOURCE), []);

    if (!skiaShader) return null;

    return (
        <Canvas style={{ width, height, position: 'absolute' }}>
            <Box box={rect(0, 0, width, height)}>
                <Shader source={skiaShader} uniforms={uniforms} />
            </Box>
        </Canvas>
    );
}

export const BorderOverlayCanvas: React.FC<BorderOverlayCanvasProps> = ({ uniforms, cardX, cardY, cardWidth, cardHeight }) => {
  const { width, height } = useWindowDimensions();

  const skiaShader = React.useMemo(() => Skia.RuntimeEffect.Make(FOREGROUND_SOURCE), []);

  if (!skiaShader) {
    return null;
  }

  const dynamicCompositeUniforms = useDerivedValue(() => {
    return {
        ...uniforms.value,
        u_cardRect: [cardX.value, (cardY.value - cardHeight.value/2), cardWidth.value, cardHeight.value],
        u_borderRadius: 15.0,
    };
  }, [cardX, cardY, cardWidth, cardHeight, uniforms]);

  return (
    <Canvas style={{ width, height, position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
        <Box box={rect(0, 0, width, height)}>
            <Shader source={skiaShader} uniforms={dynamicCompositeUniforms} />
        </Box>
    </Canvas>
  );
};
