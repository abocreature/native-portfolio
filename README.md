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

---

## 🚀 Key Architectural Features

- **Performance-Optimized Rendering:** Built utilizing native `FlatList` component architectures to ensure smooth scrolling performance over massive arrays of object data.
- **Dynamic SafeArea Tracking:** Incorporates device-specific context hooks (`react-native-safe-area-context`) to safely adapt layout components around physical camera notches and status indicators.
- **Deep Linking Engine:** Integrated system hooks leverage the native phone `Linking` interface to seamlessly route users from the UI straight out into external public GitHub repositories.

---

## 💻 Local Development Setup

Follow these steps to run this codebase locally on your machine:

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org) installed, alongside the **Expo Go** application downloaded onto your physical iOS or Android smart device.

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

Scan the generated terminal **QR code** using your phone's camera app (iOS) or the Expo Go interface (Android) to preview the live build instantly.
