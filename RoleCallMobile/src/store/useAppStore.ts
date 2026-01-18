// Zustand store for app state management
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Show } from '../types';

interface AppState {
  // Liked shows (user has marked as liked)
  likedShowIds: Set<string>;

  // Hidden shows (won't appear in recommendations)
  hiddenShowIds: Set<string>;

  // Shows shown this session (to avoid repeats)
  sessionShownIds: Set<string>;

  // Database initialization status
  isDbInitialized: boolean;

  // Currently selected show for modal
  selectedShowId: string | null;

  // Onboarding completed flag
  onboardingCompleted: boolean;

  // Actions
  likeShow: (showId: string) => void;
  unlikeShow: (showId: string) => void;
  isShowLiked: (showId: string) => boolean;

  hideShow: (showId: string) => void;
  unhideShow: (showId: string) => void;
  isShowHidden: (showId: string) => boolean;

  markSessionShown: (showIds: string[]) => void;
  clearSessionShown: () => void;

  setDbInitialized: (initialized: boolean) => void;

  setSelectedShow: (showId: string | null) => void;

  completeOnboarding: () => void;
  resetOnboarding: () => void;

  // Get all excluded IDs (liked + hidden) for recommendations
  getExcludedIds: () => string[];

  // Clear all user data
  clearAllData: () => void;
}

// Custom storage that handles Set serialization
const storage = createJSONStorage<Partial<AppState>>(() => AsyncStorage, {
  reviver: (key, value) => {
    if (key === 'likedShowIds' || key === 'hiddenShowIds') {
      return new Set(value as string[]);
    }
    return value;
  },
  replacer: (key, value) => {
    if (value instanceof Set) {
      return [...value];
    }
    return value;
  },
});

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      likedShowIds: new Set<string>(),
      hiddenShowIds: new Set<string>(),
      sessionShownIds: new Set<string>(),
      isDbInitialized: false,
      selectedShowId: null,
      onboardingCompleted: false,

      likeShow: (showId) =>
        set((state) => {
          const newLiked = new Set(state.likedShowIds);
          newLiked.add(showId);
          return { likedShowIds: newLiked };
        }),

      unlikeShow: (showId) =>
        set((state) => {
          const newLiked = new Set(state.likedShowIds);
          newLiked.delete(showId);
          return { likedShowIds: newLiked };
        }),

      isShowLiked: (showId) => get().likedShowIds.has(showId),

      hideShow: (showId) =>
        set((state) => {
          const newHidden = new Set(state.hiddenShowIds);
          newHidden.add(showId);
          return { hiddenShowIds: newHidden };
        }),

      unhideShow: (showId) =>
        set((state) => {
          const newHidden = new Set(state.hiddenShowIds);
          newHidden.delete(showId);
          return { hiddenShowIds: newHidden };
        }),

      isShowHidden: (showId) => get().hiddenShowIds.has(showId),

      markSessionShown: (showIds) =>
        set((state) => {
          const newShown = new Set(state.sessionShownIds);
          showIds.forEach((id) => newShown.add(id));
          return { sessionShownIds: newShown };
        }),

      clearSessionShown: () => set({ sessionShownIds: new Set<string>() }),

      setDbInitialized: (initialized) => set({ isDbInitialized: initialized }),

      setSelectedShow: (showId) => set({ selectedShowId: showId }),

      completeOnboarding: () => set({ onboardingCompleted: true }),

      resetOnboarding: () => set({ onboardingCompleted: false }),

      getExcludedIds: () => {
        const state = get();
        return [
          ...state.likedShowIds,
          ...state.hiddenShowIds,
          ...state.sessionShownIds,
        ];
      },

      clearAllData: () =>
        set({
          likedShowIds: new Set<string>(),
          hiddenShowIds: new Set<string>(),
          sessionShownIds: new Set<string>(),
          onboardingCompleted: false,
        }),
    }),
    {
      name: 'role-call-storage',
      storage,
      partialize: (state) => ({
        likedShowIds: state.likedShowIds,
        hiddenShowIds: state.hiddenShowIds,
        onboardingCompleted: state.onboardingCompleted,
      }),
    }
  )
);

// Selector hooks for performance
export const useLikedShowIds = () => useAppStore((s) => s.likedShowIds);
export const useHiddenShowIds = () => useAppStore((s) => s.hiddenShowIds);
export const useIsDbInitialized = () => useAppStore((s) => s.isDbInitialized);
export const useSelectedShowId = () => useAppStore((s) => s.selectedShowId);
export const useOnboardingCompleted = () => useAppStore((s) => s.onboardingCompleted);
