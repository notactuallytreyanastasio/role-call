// ShowModal component - displays detailed show information
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ShowWithCredits, RelatedShow, CreditRole } from '../types';
import { getShowWithCredits, getRelatedShows, getThumbnailUrl } from '../db';
import { useAppStore } from '../store';

interface ShowModalProps {
  showId: string | null;
  visible: boolean;
  onClose: () => void;
  onShowPress: (showId: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function ShowModal({ showId, visible, onClose, onShowPress }: ShowModalProps) {
  const [showData, setShowData] = useState<ShowWithCredits | null>(null);
  const [relatedShows, setRelatedShows] = useState<RelatedShow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hideSeen, setHideSeen] = useState(false);

  const { likeShow, unlikeShow, isShowLiked, likedShowIds, hiddenShowIds, hideShow, isShowHidden } =
    useAppStore();

  useEffect(() => {
    if (showId && visible) {
      loadShowData(showId);
    }
  }, [showId, visible]);

  const loadShowData = async (id: string) => {
    setLoading(true);
    try {
      const data = await getShowWithCredits(id);
      setShowData(data);

      if (data) {
        const excludeIds = [...likedShowIds, ...hiddenShowIds];
        const related = await getRelatedShows(id, excludeIds);
        setRelatedShows(related);
      }
    } catch (error) {
      console.error('Error loading show data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isLiked = showId ? isShowLiked(showId) : false;
  const isHidden = showId ? isShowHidden(showId) : false;

  const handleLike = useCallback(() => {
    if (!showId) return;
    if (isLiked) {
      unlikeShow(showId);
    } else {
      likeShow(showId);
    }
  }, [isLiked, showId, likeShow, unlikeShow]);

  const handleImdbLink = useCallback(() => {
    if (showId) {
      Linking.openURL(`https://www.imdb.com/title/${showId}/`);
    }
  }, [showId]);

  const handleHideShow = useCallback(() => {
    if (showId) {
      hideShow(showId);
      onClose();
    }
  }, [showId, hideShow, onClose]);

  const handleRelatedShowPress = useCallback(
    (relatedShowId: string) => {
      onShowPress(relatedShowId);
    },
    [onShowPress]
  );

  const handleHideRelated = useCallback(
    (relatedShowId: string) => {
      hideShow(relatedShowId);
      setRelatedShows((prev) => prev.filter((r) => r.show.id !== relatedShowId));
    },
    [hideShow]
  );

  const groupCreditsByRole = (credits: ShowWithCredits['credits']) => {
    const grouped: Record<CreditRole, typeof credits> = {
      creator: [],
      writer: [],
      director: [],
      actor: [],
    };
    credits.forEach((credit) => {
      grouped[credit.role].push(credit);
    });
    return grouped;
  };

  const filteredRelatedShows = hideSeen
    ? relatedShows.filter((r) => !isShowLiked(r.show.id))
    : relatedShows;

  const strongConnections = filteredRelatedShows.filter((r) => r.sharedCrewCount >= 3);
  const weakConnections = filteredRelatedShows.filter((r) => r.sharedCrewCount < 3);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleHideShow} style={styles.hideShowButton}>
              <Ionicons
                name={isHidden ? 'eye-off' : 'eye-off-outline'}
                size={26}
                color={isHidden ? '#ff4444' : '#fff'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleLike}
              style={[styles.likeButton, isLiked && styles.likeButtonActive]}
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={24}
                color={isLiked ? '#ff4444' : '#fff'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : showData ? (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Poster and basic info */}
            <View style={styles.heroSection}>
              {showData.imageUrl && (
                <Image
                  source={{ uri: getThumbnailUrl(showData.imageUrl, 300) || undefined }}
                  style={styles.poster}
                  resizeMode="cover"
                />
              )}
              <View style={styles.basicInfo}>
                <Text style={styles.title}>{showData.title}</Text>
                <View style={styles.metaRow}>
                  {showData.yearStart && (
                    <Text style={styles.year}>
                      {showData.yearStart}
                      {showData.yearEnd && showData.yearEnd !== showData.yearStart
                        ? `–${showData.yearEnd}`
                        : ''}
                    </Text>
                  )}
                  {showData.imdbRating && (
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={14} color="#f5c518" />
                      <Text style={styles.ratingText}>
                        {showData.imdbRating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
                {showData.genres.length > 0 && (
                  <View style={styles.genreRow}>
                    {showData.genres.slice(0, 3).map((genre, i) => (
                      <View key={i} style={styles.genreTag}>
                        <Text style={styles.genreText}>{genre}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Description */}
            {showData.description && (
              <View style={styles.section}>
                <Text style={styles.description}>{showData.description}</Text>
              </View>
            )}

            {/* IMDB Link */}
            <TouchableOpacity style={styles.imdbButton} onPress={handleImdbLink}>
              <Text style={styles.imdbButtonText}>View on IMDB</Text>
              <Ionicons name="open-outline" size={16} color="#f5c518" />
            </TouchableOpacity>

            {/* Credits */}
            {showData.credits.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Crew</Text>
                {(() => {
                  const grouped = groupCreditsByRole(showData.credits);
                  return (
                    <>
                      {grouped.creator.length > 0 && (
                        <CreditList title="Creators" credits={grouped.creator} />
                      )}
                      {grouped.writer.length > 0 && (
                        <CreditList title="Writers" credits={grouped.writer} />
                      )}
                      {grouped.director.length > 0 && (
                        <CreditList title="Directors" credits={grouped.director} />
                      )}
                    </>
                  );
                })()}
              </View>
            )}

            {/* Related shows */}
            {filteredRelatedShows.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Other work by these writers</Text>
                  <TouchableOpacity
                    style={styles.hideSeenToggle}
                    onPress={() => setHideSeen(!hideSeen)}
                  >
                    <Ionicons
                      name={hideSeen ? 'checkbox' : 'square-outline'}
                      size={18}
                      color="#888"
                    />
                    <Text style={styles.hideSeenText}>Hide seen</Text>
                  </TouchableOpacity>
                </View>

                {strongConnections.length > 0 && (
                  <View style={styles.connectionGroup}>
                    <Text style={styles.connectionLabel}>Strong connections</Text>
                    {strongConnections.map((related) => (
                      <RelatedShowItem
                        key={related.show.id}
                        related={related}
                        onPress={handleRelatedShowPress}
                        onHide={handleHideRelated}
                      />
                    ))}
                  </View>
                )}

                {weakConnections.length > 0 && (
                  <View style={styles.connectionGroup}>
                    <Text style={styles.connectionLabel}>More connections</Text>
                    {weakConnections.slice(0, 10).map((related) => (
                      <RelatedShowItem
                        key={related.show.id}
                        related={related}
                        onPress={handleRelatedShowPress}
                        onHide={handleHideRelated}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={styles.bottomPadding} />
          </ScrollView>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Show not found</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

// Credit list sub-component
function CreditList({
  title,
  credits,
}: {
  title: string;
  credits: ShowWithCredits['credits'];
}) {
  return (
    <View style={styles.creditGroup}>
      <Text style={styles.creditGroupTitle}>{title}</Text>
      <View style={styles.creditList}>
        {credits.slice(0, 10).map((credit, i) => (
          <View key={`${credit.personId}-${i}`} style={styles.creditItem}>
            <Text style={styles.creditName}>{credit.personName}</Text>
            {credit.details && (
              <Text style={styles.creditDetails}>{credit.details}</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

// Related show item sub-component
function RelatedShowItem({
  related,
  onPress,
  onHide,
}: {
  related: RelatedShow;
  onPress: (id: string) => void;
  onHide: (id: string) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.relatedItem}
      onPress={() => onPress(related.show.id)}
      activeOpacity={0.7}
    >
      {related.show.imageUrl && (
        <Image
          source={{ uri: getThumbnailUrl(related.show.imageUrl, 100) || undefined }}
          style={styles.relatedImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.relatedInfo}>
        <Text style={styles.relatedTitle} numberOfLines={1}>
          {related.show.title}
        </Text>
        <Text style={styles.relatedMeta}>
          {related.show.yearStart}
          {related.show.imdbRating ? ` · ${related.show.imdbRating.toFixed(1)}` : ''}
        </Text>
        <Text style={styles.relatedCrew} numberOfLines={2}>
          {related.sharedCrew.map((c) => c.personName).join(', ')}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.hideRelatedButton}
        onPress={() => onHide(related.show.id)}
      >
        <Ionicons name="eye-off-outline" size={18} color="#666" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeButton: {
    padding: 4,
  },
  hideShowButton: {
    padding: 4,
  },
  likeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  likeButtonActive: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#888',
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  poster: {
    width: 120,
    height: 180,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  basicInfo: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  year: {
    color: '#888',
    fontSize: 14,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#f5c518',
    fontSize: 14,
    fontWeight: '600',
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  genreTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  genreText: {
    color: '#aaa',
    fontSize: 12,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  description: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 22,
  },
  imdbButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(245, 197, 24, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f5c518',
  },
  imdbButtonText: {
    color: '#f5c518',
    fontSize: 14,
    fontWeight: '600',
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
  hideSeenToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hideSeenText: {
    color: '#888',
    fontSize: 13,
  },
  creditGroup: {
    marginBottom: 16,
  },
  creditGroupTitle: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  creditList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  creditItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  creditName: {
    color: '#fff',
    fontSize: 13,
  },
  creditDetails: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  connectionGroup: {
    marginBottom: 16,
  },
  connectionLabel: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  relatedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  relatedImage: {
    width: 50,
    height: 75,
    backgroundColor: '#2a2a2a',
  },
  relatedInfo: {
    flex: 1,
    padding: 10,
  },
  relatedTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  relatedMeta: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  relatedCrew: {
    color: '#666',
    fontSize: 11,
    marginTop: 4,
  },
  hideRelatedButton: {
    padding: 12,
  },
  bottomPadding: {
    height: 40,
  },
});
