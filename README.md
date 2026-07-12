# 📱 React Native Cross-Platform Portfolio

A sleek, responsive mobile portfolio application built with React Native and Expo. This project showcases my mobile development capabilities, custom navigation structures, and fluid component layouts across iOS and Android device screen sizes.

---

## 📸 Project Previews

| iOS Layout | Android Layout |
|:---:|:---:|
| <img src="./assets/screenshots/ios-preview.png" width="280" alt="iOS Home Screen"/> | <img src="./assets/screenshots/android-preview.png" width="280" alt="Android Projects Screen"/> |

---

## 🛠️ Built With

- **Framework:** [React Native](https://reactnative.dev) (Component-driven architecture)
- **Workflow Tool:** [Expo Workflow](https://expo.dev) (SDK 51+)
- **Navigation:** [@react-navigation/bottom-tabs](https://reactnavigation.org)
- **Design System:** StyleSheet API (Flexible box models)
- **Icons:** [@expo/vector-icons](https://expo.fyi)

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
