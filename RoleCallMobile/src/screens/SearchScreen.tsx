// SearchScreen - Search and discover shows
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Show } from '../types';
import { searchShows, getRandomShows } from '../db';
import { ShowCard } from '../components';
import { useAppStore } from '../store';

interface SearchScreenProps {
  onShowPress: (show: Show) => void;
}

export function SearchScreen({ onShowPress }: SearchScreenProps) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Show[]>([]);
  const [shufflePicks, setShufflePicks] = useState<Show[]>([]);
  const [loading, setLoading] = useState(false);
  const [shuffleLoading, setShuffleLoading] = useState(false);

  const { likedShowIds, hiddenShowIds, sessionShownIds, markSessionShown } = useAppStore();
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load initial shuffle picks
  useEffect(() => {
    loadShufflePicks();
  }, []);

  const loadShufflePicks = async () => {
    setShuffleLoading(true);
    try {
      const excludeIds = [...likedShowIds, ...hiddenShowIds, ...sessionShownIds];
      const shows = await getRandomShows(6, 7.5, excludeIds);
      setShufflePicks(shows);
      markSessionShown(shows.map((s) => s.id));
    } catch (error) {
      console.error('Error loading shuffle picks:', error);
    } finally {
      setShuffleLoading(false);
    }
  };

  // Debounced search
  const handleSearch = useCallback((text: string) => {
    setQuery(text);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (text.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchShows(text, 20);
        // Filter out hidden shows
        const filtered = results.filter(
          (show) => !hiddenShowIds.has(show.id)
        );
        setSearchResults(filtered);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 150);
  }, [hiddenShowIds]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setSearchResults([]);
  }, []);

  const handleShowPress = useCallback(
    (show: Show) => {
      onShowPress(show);
    },
    [onShowPress]
  );

  const renderSearchResult = useCallback(
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

  const renderShufflePick = useCallback(
    ({ item }: { item: Show }) => (
      <ShowCard
        show={item}
        onPress={handleShowPress}
        showLikeButton
        showHideButton
        size="small"
      />
    ),
    [handleShowPress]
  );

  const keyExtractor = useCallback((item: Show) => item.id, []);

  const isSearching = query.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Search input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search TV shows..."
            placeholderTextColor="#666"
            value={query}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )}

      {/* Search results */}
      {isSearching && !loading && (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={keyExtractor}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No shows found</Text>
            </View>
          }
        />
      )}

      {/* Shuffle section (shown when not searching) */}
      {!isSearching && (
        <View style={styles.shuffleSection}>
          <View style={styles.shuffleHeader}>
            <Text style={styles.shuffleTitle}>Discover something new</Text>
            <TouchableOpacity
              style={styles.shuffleButton}
              onPress={loadShufflePicks}
              disabled={shuffleLoading}
            >
              {shuffleLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="shuffle" size={18} color="#fff" />
                  <Text style={styles.shuffleButtonText}>Show me more</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <FlatList
            data={shufflePicks}
            renderItem={renderShufflePick}
            keyExtractor={keyExtractor}
            numColumns={3}
            contentContainerStyle={styles.shuffleGrid}
            columnWrapperStyle={styles.shuffleRow}
            showsVerticalScrollIndicator={false}
          />
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  gridContainer: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  shuffleSection: {
    flex: 1,
    paddingTop: 8,
  },
  shuffleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  shuffleTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  shuffleButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  shuffleGrid: {
    paddingHorizontal: 12,
  },
  shuffleRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
});
