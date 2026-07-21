# 📱 React Native Cross-Platform Portfolio

A high-performance, cross-platform portfolio application engineered with React Native, Expo, and React Native for Web. This project features custom gesture-driven physics engines, and a real-time Markdown document reader across iOS, Android, and Desktop Browser layouts.

---

# Live at: [AbigailSutrich.com](https://AbigailSutrich.com)

---

## 🛠️ Built With

- **Core Framework:** [React Native](https://reactnative.dev) & [React Native for Web](https://github.io) (Single codebase compilation for Mobile + Desktop browsers)
- **Workflow & Build Tool:** [Expo Workflow](https://expo.dev) (SDK 51+)
- **High-Performance Physics & Animation:** 
  - [React Native Reanimated](https://swmansion.com) (Damped harmonic spring oscillators and native-thread `useFrameCallback` loops)
  - [React Native Gesture Handler](https://swmansion.com) (Low-latency native `Pan` and `Tap` tracking)
- **Routing & Navigation:** [@react-navigation/bottom-tabs](https://reactnavigation.org)
- **Document Rendering:** [React Native Markdown Display](https://github.com) (Native node primitive layout engine)
- **AI Chat Engine:** [Google Gemini](https://ai.google.dev)
- **Graphics Engine:** [@shopify/react-native-skia](https://shopify.github.io/react-native-skia/) for hardware-accelerated 2D canvas drawing.

---

## 🚀 Key Architectural Features

- **Performance-Optimized Rendering:** Built utilizing native `FlatList` component architectures to ensure smooth scrolling performance over massive arrays of object data.
- **Dynamic SafeArea Tracking:** Incorporates device-specific context hooks (`react-native-safe-area-context`) to safely adapt layout components around physical camera notches and status indicators.
- **Deep Linking Engine:** Integrated system hooks leverage the native phone `Linking` interface to seamlessly route users from the UI straight out into external public GitHub repositories.
- **Gemini AI Virtual Assistant:** Embeds an interactive conversational guide layer (ProjectChatBot.js) directly integrated with Google's Gemini API to chat dynamically using structured data logs.
- **AGSL Runtime Shaders:** Implements mathematically calculated fragment shaders running on the GPU to render real-time atmospheric sky conditions and volumetric card edge highlights.

---

## 🔬 Custom Shader Implementation Details

The visual environment is driven by two custom Skia fragment shaders that compute lighting dynamics on every pixel at runtime:

### 1. Atmospheric Background Shader (BACKGROUND_SOURCE)
Computes real-time daylight progression, cloud cover density, and light dispersion based on the relative position of a virtual celestial body:
- **Solar Math:** Normalizes the sun's coordinates relative to the viewport resolution to scale distance and power.
- **Atmospheric Dispersion:** Utilizes a high-power exponential smoothstep curve (pow(..., gradientSharpness) * 3) to calculate ambient glow falloff.
- **Dynamic Day/Night Horizon Cycle:** Blends the clear-sky backdrop array between light scattering values (vec3(0.1, 0.2, 0.3)) and deep night wavelengths (vec3(0.01, 0.02, 0.05)) using a computed orbit radius factor.

### 2. Volumetric Highlight Card Shader (FOREGROUND_SOURCE)
Applies specialized directional lighting and localized bloom highlights strictly within a specified sub-region, reducing unnecessary pixel iteration:
- **Symmetric Signed Distance Field (SDF):** Computes exact physical distance boundaries for rounded rectangles using a standard vector boundary box check (sdRoundRect).
- **Dynamic Highlight Realignment:** Checks the vector dot product of pixel angles (dot(pixelDir, lightDir)) against the sun's live tracking system to cast brilliant white reflection blooms (vec3(1.6)) onto card edges facing the light source.
- **Localized Alpha Gradients:** Masks the output visibility between -15px outside and +6px inside the object perimeter, rendering complex alpha highlights (bloomGlowFalloff) strictly around targeted elements while remaining transparent elsewhere.

---

## 💻 Local Development Setup

Follow these steps to run this codebase locally on your machine:

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org) installed.

### 2. Installation
Clone the repository and install all associated node module dependencies:
\`\`\`bash
# Clone the repository
git clone https://github.com

# Move into the project workspace
cd YOUR_REPO_NAME

# Install dependencies
npm install
\`\`\`

### 3. Launching the Application
Boot up the local Metro bundler engine:
\`\`\`bash
npx expo start
\`\`\`