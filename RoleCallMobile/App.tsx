// Role Call - TV Show Recommendation App
// Discover shows through the writers you love
import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { initDatabase } from './src/db';
import { useAppStore } from './src/store';
import { SearchScreen, DiscoverScreen, LikedScreen } from './src/screens';
import { ShowModal } from './src/components';
import type { Show } from './src/types';

const Tab = createBottomTabNavigator();

// Dark theme for navigation
const DarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#fff',
    background: '#0a0a0a',
    card: '#1a1a1a',
    text: '#fff',
    border: '#333',
    notification: '#ff4444',
  },
};

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { selectedShowId, setSelectedShow, setDbInitialized } = useAppStore();

  // Initialize database on app start
  useEffect(() => {
    async function init() {
      try {
        await initDatabase();
        setDbInitialized(true);
        setDbReady(true);
      } catch (err) {
        console.error('Failed to initialize database:', err);
        setError('Failed to load database. Please restart the app.');
      }
    }
    init();
  }, [setDbInitialized]);

  // Handle show selection for modal
  const handleShowPress = useCallback(
    (show: Show) => {
      setSelectedShow(show.id);
    },
    [setSelectedShow]
  );

  const handleModalClose = useCallback(() => {
    setSelectedShow(null);
  }, [setSelectedShow]);

  const handleModalShowPress = useCallback(
    (showId: string) => {
      setSelectedShow(showId);
    },
    [setSelectedShow]
  );

  // Loading state
  if (!dbReady) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        {error ? (
          <>
            <Ionicons name="alert-circle" size={48} color="#ff4444" />
            <Text style={styles.errorText}>{error}</Text>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading Role Call...</Text>
          </>
        )}
      </View>
    );
  }

  return (
    <NavigationContainer theme={DarkTheme}>
      <StatusBar style="light" />

      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'Search') {
              iconName = focused ? 'search' : 'search-outline';
            } else if (route.name === 'Discover') {
              iconName = focused ? 'compass' : 'compass-outline';
            } else if (route.name === 'Liked') {
              iconName = focused ? 'heart' : 'heart-outline';
            } else {
              iconName = 'help-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#fff',
          tabBarInactiveTintColor: '#666',
          tabBarStyle: {
            backgroundColor: '#1a1a1a',
            borderTopColor: '#333',
            paddingBottom: 4,
            height: 84,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
          },
          headerShown: false,
        })}
      >
        <Tab.Screen name="Search">
          {() => <SearchScreen onShowPress={handleShowPress} />}
        </Tab.Screen>
        <Tab.Screen name="Discover">
          {() => <DiscoverScreen onShowPress={handleShowPress} />}
        </Tab.Screen>
        <Tab.Screen name="Liked">
          {() => <LikedScreen onShowPress={handleShowPress} />}
        </Tab.Screen>
      </Tab.Navigator>

      {/* Show detail modal */}
      <ShowModal
        showId={selectedShowId}
        visible={selectedShowId !== null}
        onClose={handleModalClose}
        onShowPress={handleModalShowPress}
      />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginTop: 8,
  },
});
