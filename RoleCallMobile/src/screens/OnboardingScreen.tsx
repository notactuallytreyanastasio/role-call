// OnboardingScreen - First-time user introduction
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function OnboardingScreen() {
  const { completeOnboarding } = useAppStore();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Icon area */}
        <View style={styles.iconContainer}>
          <Ionicons name="star" size={80} color="#FFD700" />
        </View>

        {/* Title */}
        <Text style={styles.title}>Role Call</Text>
        <Text style={styles.subtitle}>Find your next favorite show</Text>

        {/* Explanation cards */}
        <View style={styles.cards}>
          <View style={styles.card}>
            <Ionicons name="tv-outline" size={28} color="#7B2FF7" />
            <Text style={styles.cardText}>
              Role Call is an app to find new TV
            </Text>
          </View>

          <View style={styles.card}>
            <Ionicons name="people-outline" size={28} color="#7B2FF7" />
            <Text style={styles.cardText}>
              We work by linking writers that you love
            </Text>
          </View>

          <View style={styles.card}>
            <Ionicons name="heart-outline" size={28} color="#7B2FF7" />
            <Text style={styles.cardText}>
              Start by selecting some shows you like and hiding ones you don't
            </Text>
          </View>

          <View style={styles.card}>
            <Ionicons name="sparkles-outline" size={28} color="#7B2FF7" />
            <Text style={styles.cardText}>
              Our algorithm will build you a list of new TV you might enjoy using the{' '}
              <Text style={styles.emphasis}>writers</Text> over actors or directors
            </Text>
          </View>
        </View>
      </View>

      {/* Get Started button */}
      <TouchableOpacity style={styles.button} onPress={completeOnboarding}>
        <Text style={styles.buttonText}>Get Started</Text>
        <Ionicons name="arrow-forward" size={20} color="#000" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 40,
  },
  cards: {
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  cardText: {
    flex: 1,
    fontSize: 15,
    color: '#ccc',
    lineHeight: 22,
  },
  emphasis: {
    color: '#7B2FF7',
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 24,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
});
