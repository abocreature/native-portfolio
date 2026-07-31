import React from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Analytics } from '@vercel/analytics/react';
import { loadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

import AboutScreen from './src/screens/AboutScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';

const CanvasKit_Version = require('canvaskit-wasm/package.json').version;
loadSkiaWeb({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/canvaskit-wasm@${CanvasKit_Version}/bin/full/${file}`
});

const Tab = createBottomTabNavigator();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#121212',
    card: '#121212',
    border: '#1f1f1f',
    text: '#ffffff',
    primary: '#bbff00',
  },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{flex:1, backgroundColor:'#121212'}}>
      <NavigationContainer
        theme={navigationTheme}
        documentTitle={{
          formatter: (options, route) =>
            route ? `Abigail Sutrich | ${route.name}` : `Abigail Sutrich`,
        }}
      >
        <Tab.Navigator
          screenOptions={({ route }) => ({
            animation: 'shift',
            gestureEnabled: true,
            sceneContainerStyle: { backgroundColor: '#121212' },
             tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              if  (route.name === 'About') {
                iconName = 'person-outline';
              } else if (route.name === 'Projects') {
                iconName = 'code-slash-outline';
              }
              return (
                <Ionicons 
                  name={iconName} 
                  size={size} 
                  style={focused ? styles.activeGlow : styles.inactiveColor}
                />
              );
            },
            tabBarLabel: ({ focused, children }) => {
              return (
                <Text style={[styles.baseLabelText, focused ? styles.activeGlow : styles.inactiveColor]}>
                  {children}
                </Text>
              );
            },
            tabBarStyle: {
              backgroundColor: '#121212'
            },
            tabBarActiveTintColor: '#bbff00',
            tabBarInactiveTintColor: '#fff',
            headerStyle: { backgroundColor: '#121212' },
            headerTitleStyle: styles.activeGlow,
          })}
          >
          <Tab.Screen name="About" component={AboutScreen} />
          <Tab.Screen name="Projects" component={ProjectsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
      <Analytics />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    backgroundColor: '#121212',
    color: '#bbff00',
    textShadowColor: 'rgba(187, 255, 0, 0.85)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  activeGlow: {
    color: '#bbff00',
    textShadowColor: 'rgba(187, 255, 0, 0.85)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  inactiveColor: {
    color: '#fff',
    opacity: 0.65,
  },
});
