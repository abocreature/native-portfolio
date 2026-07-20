import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Analytics } from '@vercel/analytics/react';

import AboutScreen from './src/screens/AboutScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{flex:1}}>
      <NavigationContainer
        documentTitle={{
          formatter: (options, route) =>
            route ? `Abigail Sutrich | ${route.name}` : `Abigail Sutrich`,
        }}
      >
        <Tab.Navigator
          screenOptions={({ route }) => ({
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
