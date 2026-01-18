// DiscoverScreen - Personalized recommendations based on liked shows
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Show, Recommendation } from '../types';
import { getRecommendations, getRandomShows } from '../db';
import { ShowCard } from '../components';
import { useAppStore } from '../store';

interface DiscoverScreenProps {
  onShowPress: (show: Show) => void;
}

export function DiscoverScreen({ onShowPress }: DiscoverScreenProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [fallbackShows, setFallbackShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const {
    likedShowIds,
    hiddenShowIds,
    sessionShownIds,
    markSessionShown,
    clearSessionShown,
  } = useAppStore();

  const likedCount = likedShowIds.size;

  useEffect(() => {
    loadRecommendations();
  }, [likedCount]); // Reload when liked shows change

  const loadRecommendations = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      clearSessionShown();
    } else {
      setLoading(true);
    }

    try {
      const excludeIds = [...hiddenShowIds, ...sessionShownIds];

      if (likedShowIds.size > 0) {
        // User has liked shows - get personalized recommendations
        const recs = await getRecommendations(
          [...likedShowIds],
          excludeIds,
          12
        );
        setRecommendations(recs);
        setFallbackShows([]);
        markSessionShown(recs.map((r) => r.show.id));
      } else {
        // No liked shows - show random high-rated shows
        const shows = await getRandomShows(12, 7.5, excludeIds);
        setFallbackShows(shows);
        setRecommendations([]);
        markSessionShown(shows.map((s) => s.id));
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    loadRecommendations(true);
  }, []);

  const handleShowPress = useCallback(
    (show: Show) => {
      onShowPress(show);
    },
    [onShowPress]
  );

  const renderRecommendation = useCallback(
    ({ item }: { item: Recommendation }) => (
      <View style={styles.recommendationItem}>
        <ShowCard
          show={item.show}
          onPress={handleShowPress}
          showLikeButton
          showHideButton
          size="medium"
        />
        {item.connections.length > 0 && (
          <View style={styles.connectionInfo}>
            <Text style={styles.connectionText} numberOfLines={2}>
              {[...new Set(item.connections.map((c) => c.personName))].slice(0, 2).join(', ')}
            </Text>
          </View>
        )}
      </View>
    ),
    [handleShowPress]
  );

  const renderFallbackShow = useCallback(
    ({ item }: { item: Show }) => (
      <ShowCard
        show={item}
        onPress={handleShowPress}
        showLikeButton
        showHideButton
        size="medium"
      />
    ),
    [handleShowPress]
  );

  const keyExtractor = useCallback(
    (item: Recommendation | Show) => {
      if ('show' in item) {
        return item.show.id;
      }
      return item.id;
    },
    []
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Finding shows for you...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasRecommendations = recommendations.length > 0;
  const hasFallback = fallbackShows.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>For You</Text>
          {likedCount > 0 ? (
            <Text style={styles.subtitle}>
              Based on {likedCount} show{likedCount !== 1 ? 's' : ''} you've liked
            </Text>
          ) : (
            <Text style={styles.subtitle}>
              Like some shows to get personalized recommendations
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.refreshButtonText}>Show different</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Recommendations list */}
      {hasRecommendations && (
        <FlatList
          data={recommendations}
          renderItem={renderRecommendation}
          keyExtractor={keyExtractor}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#fff"
            />
          }
        />
      )}

      {/* Fallback (no liked shows yet) */}
      {hasFallback && (
        <FlatList
          data={fallbackShows}
          renderItem={renderFallbackShow}
          keyExtractor={keyExtractor}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#fff"
            />
          }
          ListHeaderComponent={
            <View style={styles.emptyStateHeader}>
              <Ionicons name="heart-outline" size={48} color="#444" />
              <Text style={styles.emptyStateTitle}>No likes yet</Text>
              <Text style={styles.emptyStateText}>
                Here are some popular shows to get you started.
                Like a few to unlock personalized recommendations!
              </Text>
            </View>
          }
        />
      )}

      {/* Empty state */}
      {!hasRecommendations && !hasFallback && (
        <View style={styles.emptyContainer}>
          <Ionicons name="tv-outline" size={64} color="#444" />
          <Text style={styles.emptyTitle}>No recommendations</Text>
          <Text style={styles.emptyText}>
            Try refreshing or like some shows to get started
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handleRefresh}>
            <Text style={styles.emptyButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#888',
    fontSize: 13,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  gridContainer: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  recommendationItem: {
    marginBottom: 0,
  },
  connectionInfo: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    marginTop: -8,
  },
  connectionText: {
    color: '#666',
    fontSize: 11,
    fontStyle: 'italic',
  },
  emptyStateHeader: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  emptyStateTitle: {
    color: '#888',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    color: '#888',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
});
