// ShowCard component - displays a show thumbnail in grids
import React, { useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Show } from '../types';
import { getThumbnailUrl } from '../db';
import { useAppStore } from '../store';

interface ShowCardProps {
  show: Show;
  onPress: (show: Show) => void;
  showLikeButton?: boolean;
  showHideButton?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CARD_SIZES = {
  small: { width: (SCREEN_WIDTH - 48) / 3, height: 150 },
  medium: { width: (SCREEN_WIDTH - 36) / 2, height: 200 },
  large: { width: SCREEN_WIDTH - 24, height: 280 },
};

export function ShowCard({
  show,
  onPress,
  showLikeButton = true,
  showHideButton = false,
  size = 'medium',
}: ShowCardProps) {
  const { likeShow, unlikeShow, isShowLiked, hideShow } = useAppStore();
  const isLiked = isShowLiked(show.id);

  const cardSize = CARD_SIZES[size];
  const thumbnailUrl = getThumbnailUrl(show.imageUrl, size === 'small' ? 150 : 200);

  const handleLike = useCallback(() => {
    if (isLiked) {
      unlikeShow(show.id);
    } else {
      likeShow(show.id);
    }
  }, [isLiked, show.id, likeShow, unlikeShow]);

  const handleHide = useCallback(() => {
    hideShow(show.id);
  }, [show.id, hideShow]);

  const handlePress = useCallback(() => {
    onPress(show);
  }, [show, onPress]);

  return (
    <TouchableOpacity
      style={[styles.container, { width: cardSize.width }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={[styles.imageContainer, { height: cardSize.height - 50 }]}>
        {thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="tv-outline" size={40} color="#666" />
          </View>
        )}

        {/* Action buttons overlay */}
        <View style={styles.buttonOverlay}>
          {showLikeButton && (
            <TouchableOpacity
              style={[styles.iconButton, isLiked && styles.iconButtonActive]}
              onPress={handleLike}
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={20}
                color={isLiked ? '#ff4444' : '#fff'}
              />
            </TouchableOpacity>
          )}
          {showHideButton && (
            <TouchableOpacity style={styles.iconButton} onPress={handleHide}>
              <Ionicons name="eye-off-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Rating badge */}
        {show.imdbRating && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color="#f5c518" />
            <Text style={styles.ratingText}>{show.imdbRating.toFixed(1)}</Text>
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {show.title}
        </Text>
        {show.yearStart && (
          <Text style={styles.year}>
            {show.yearStart}
            {show.yearEnd && show.yearEnd !== show.yearStart
              ? `–${show.yearEnd}`
              : ''}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    backgroundColor: '#2a2a2a',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
  },
  buttonOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonActive: {
    backgroundColor: 'rgba(255, 68, 68, 0.3)',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  ratingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoContainer: {
    padding: 8,
    height: 50,
  },
  title: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
  },
  year: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
});
