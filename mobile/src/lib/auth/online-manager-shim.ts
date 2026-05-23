/**
 * Shim to fix @better-auth/expo incompatibility with Expo SDK 53
 * The library expects `addNetworkStateListener` from expo-network which was renamed.
 * We set up our own online manager before the library loads.
 */
import { Platform } from "react-native";

// The symbol used by better-auth to store the online manager globally
const kOnlineManager = Symbol.for("better-auth.online-manager");

class ShimOnlineManager {
  listeners = new Set<(online: boolean) => void>();
  isOnline = true;
  unsubscribe?: () => void;

  subscribe(listener: (online: boolean) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setOnline(online: boolean) {
    if (this.isOnline === online) return;
    this.isOnline = online;
    this.listeners.forEach((listener) => listener(online));
  }

  setup() {
    // Use the correct API for Expo SDK 53
    if (Platform.OS !== "web") {
      import("expo-network").then((Network) => {
        // In SDK 53, we use getNetworkStateAsync for initial state
        // and there's no direct listener, so we just assume online
        Network.getNetworkStateAsync().then((state) => {
          this.setOnline(!!state.isInternetReachable);
        });
      }).catch(() => {
        this.setOnline(true);
      });
    }
    return () => {
      this.unsubscribe?.();
    };
  }
}

// Install our shim before @better-auth/expo loads
if (Platform.OS !== "web" && !(globalThis as any)[kOnlineManager]) {
  (globalThis as any)[kOnlineManager] = new ShimOnlineManager();
}

export {};
