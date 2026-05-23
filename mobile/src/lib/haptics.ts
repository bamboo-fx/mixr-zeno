import * as ExpoHaptics from 'expo-haptics';

/**
 * Haptics utility - matches SwiftUI Haptics API
 */
export const Haptics = {
  /** Light tap feedback */
  tap: () => {
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light);
  },

  /** Medium impact feedback */
  medium: () => {
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium);
  },

  /** Heavy impact feedback */
  heavy: () => {
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Heavy);
  },

  /** Success notification feedback */
  success: () => {
    ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success);
  },

  /** Warning notification feedback */
  warning: () => {
    ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Warning);
  },

  /** Error notification feedback */
  error: () => {
    ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Error);
  },

  /** Selection changed feedback */
  selection: () => {
    ExpoHaptics.selectionAsync();
  },
};
