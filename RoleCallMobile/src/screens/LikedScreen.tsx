// LikedScreen - User's liked shows and quick recommendations
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Show, Recommendation } from '../types';
import { getShowsByIds, getRecommendations, searchShows } from '../db';
import { ShowCard } from '../components';
import { useAppStore } from '../store';

interface LikedScreenProps {
  onShowPress: (show: Show) => void;
}

export function LikedScreen({ onShowPress }: LikedScreenProps) {
  const [likedShows, setLikedShows] = useState<Show[]>([]);
  const [forYouShows, setForYouShows] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [forYouLoading, setForYouLoading] = useState(false);

  // Search for adding shows
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Show[]>([]);
  const [searching, setSearching] = useState(false);

  const { likedShowIds, hiddenShowIds, clearAllData, unlikeShow } = useAppStore();

  const likedCount = likedShowIds.size;

  useEffect(() => {
    loadLikedShows();
  }, [likedCount]);

  const loadLikedShows = async () => {
    setLoading(true);
    try {
      if (likedShowIds.size > 0) {
        const shows = await getShowsByIds([...likedShowIds]);
        // Sort by title
        shows.sort((a, b) => a.title.localeCompare(b.title));
        setLikedShows(shows);

        // Also load "for you" recommendations
        loadForYouShows();
      } else {
        setLikedShows([]);
        setForYouShows([]);
      }
    } catch (error) {
      console.error('Error loading liked shows:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadForYouShows = async () => {
    setForYouLoading(true);
    try {
      const recs = await getRecommendations(
        [...likedShowIds],
        [...hiddenShowIds],
        6
      );
      setForYouShows(recs);
    } catch (error) {
      console.error('Error loading for you shows:', error);
    } finally {
      setForYouLoading(false);
    }
  };

  const handleSearch = useCallback(async (text: string) => {
    setSearchQuery(text);

    if (text.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchShows(text, 10);
      // Filter out already liked and hidden shows
      const filtered = results.filter(
        (show) => !likedShowIds.has(show.id) && !hiddenShowIds.has(show.id)
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  }, [likedShowIds, hiddenShowIds]);

  const handleShowPress = useCallback(
    (show: Show) => {
      onShowPress(show);
    },
    [onShowPress]
  );

  const handleUnlike = useCallback(
    (showId: string) => {
      unlikeShow(showId);
    },
    [unlikeShow]
  );

  const handleStartFresh = useCallback(() => {
    Alert.alert(
      'Start Fresh',
      'This will remove all your liked shows and reset your recommendations. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            clearAllData();
            setLikedShows([]);
            setForYouShows([]);
          },
        },
      ]
    );
  }, [clearAllData]);

  const renderLikedShow = useCallback(
    ({ item }: { item: Show }) => (
      <View style={styles.likedShowItem}>
        <ShowCard
          show={item}
          onPress={handleShowPress}
          showLikeButton={false}
          size="small"
        />
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleUnlike(item.id)}
        >
          <Ionicons name="close" size={16} color="#888" />
        </TouchableOpacity>
      </View>
    ),
    [handleShowPress, handleUnlike]
  );

  const renderForYouShow = useCallback(
    ({ item }: { item: Recommendation }) => (
      <ShowCard
        show={item.show}
        onPress={handleShowPress}
        showLikeButton
        size="small"
      />
    ),
    [handleShowPress]
  );

  const renderSearchResult = useCallback(
    ({ item }: { item: Show }) => (
      <ShowCard
        show={item}
        onPress={handleShowPress}
        showLikeButton
        size="small"
      />
    ),
    [handleShowPress]
  );

  const keyExtractor = useCallback((item: Show | Recommendation) => {
    if ('show' in item) {
      return item.show.id;
    }
    return item.id;
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Your Shows</Text>
              <Text style={styles.subtitle}>
                {likedCount} show{likedCount !== 1 ? 's' : ''} liked
              </Text>
            </View>

            {/* Add shows search */}
            <View style={styles.searchSection}>
              <Text style={styles.sectionTitle}>Add Shows</Text>
              <View style={styles.searchInputWrapper}>
                <Ionicons name="add" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search to add shows..."
                  placeholderTextColor="#666"
                  value={searchQuery}
                  onChangeText={handleSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color="#666" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Search results */}
              {searchQuery.length > 0 && (
                <View style={styles.searchResults}>
                  {searching ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : searchResults.length > 0 ? (
                    <FlatList
                      data={searchResults}
                      renderItem={renderSearchResult}
                      keyExtractor={keyExtractor}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.horizontalList}
                    />
                  ) : (
                    <Text style={styles.noResultsText}>No shows found</Text>
                  )}
                </View>
              )}
            </View>

            {/* For You section */}
            {likedCount > 0 && (
              <View style={styles.forYouSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recommended For You</Text>
                  <TouchableOpacity onPress={loadForYouShows} disabled={forYouLoading}>
                    {forYouLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="refresh" size={20} color="#888" />
                    )}
                  </TouchableOpacity>
                </View>
                {forYouShows.length > 0 ? (
                  <FlatList
                    data={forYouShows}
                    renderItem={renderForYouShow}
                    keyExtractor={keyExtractor}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalList}
                  />
                ) : (
                  <Text style={styles.emptyText}>
                    We'll show recommendations based on your liked shows
                  </Text>
                )}
              </View>
            )}

            {/* Liked shows header */}
            {likedCount > 0 && (
              <View style={styles.likedHeader}>
                <Text style={styles.sectionTitle}>Liked Shows</Text>
                <TouchableOpacity onPress={handleStartFresh}>
                  <Text style={styles.startFreshText}>Start fresh</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        }
        data={likedShows}
        renderItem={renderLikedShow}
        keyExtractor={keyExtractor}
        numColumns={3}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={likedShows.length > 0 ? styles.gridRow : undefined}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={64} color="#444" />
            <Text style={styles.emptyTitle}>No liked shows yet</Text>
            <Text style={styles.emptySubtitle}>
              Search for shows you love to get personalized recommendations
            </Text>
          </View>
        }
      />
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
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#888',
    fontSize: 14,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  searchResults: {
    marginTop: 12,
    minHeight: 170,
  },
  noResultsText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  forYouSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  horizontalList: {
    gap: 8,
  },
  likedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  startFreshText: {
    color: '#ff4444',
    fontSize: 14,
  },
  gridContainer: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  gridRow: {
    justifyContent: 'flex-start',
    gap: 8,
    paddingHorizontal: 4,
  },
  likedShowItem: {
    position: 'relative',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: {
    color: '#888',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyText: {
    color: '#666',
    fontSize: 13,
    fontStyle: 'italic',
  },
});
