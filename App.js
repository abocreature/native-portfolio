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
            tabBarIcon: ({ color, size }) => {
              let iconName = route.name === 'About' ? 'person-outline' : 'code-slash-outline';
              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#007AFF',
            tabBarInactiveTintColor: 'gray',
            headerStyle: { backgroundColor: '#121212' },
            headerTintColor: '#fff',
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
});
