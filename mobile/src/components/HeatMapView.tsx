import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MapView, { Marker, Circle, Region } from 'react-native-maps';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import {
  X,
  Flame,
  Clock,
  Home,
  Utensils,
  Trees,
  Dumbbell,
  PartyPopper,
  HelpCircle,
  MapPin,
  List,
  Map as MapIcon,
  Zap,
  ChevronDown,
  ChevronUp,
  CheckCircle,
} from 'lucide-react-native';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';
import { api, type HeatmapData, type CampusVenue, type VenueCategory } from '@/lib/api';
import { useAuthStore } from '@/lib/state/auth-store';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CATEGORY_ICONS: Record<VenueCategory, React.ElementType> = {
  dorm: Home,
  dining: Utensils,
  quad: Trees,
  gym: Dumbbell,
  party: PartyPopper,
  other: HelpCircle,
};

const CATEGORY_LABELS: Record<VenueCategory, string> = {
  dorm: 'Dorm',
  dining: 'Dining',
  quad: 'Quad',
  gym: 'Gym',
  party: 'Party',
  other: 'Other',
};

const CATEGORY_COLORS: Record<VenueCategory, string> = {
  dorm: '#60A5FA',
  dining: '#FB923C',
  quad: '#4ADE80',
  gym: '#F472B6',
  party: '#4F7CFF',
  other: '#94A3B8',
};

// Heat colors for intensity levels
const getHeatColor = (intensity: number) => {
  if (intensity >= 0.8) return { fill: 'rgba(255, 65, 54, 0.35)', stroke: '#FF4136' };
  if (intensity >= 0.6) return { fill: 'rgba(255, 133, 27, 0.30)', stroke: '#FF851B' };
  if (intensity >= 0.4) return { fill: 'rgba(255, 220, 0, 0.25)', stroke: '#FFDC00' };
  return { fill: 'rgba(46, 204, 64, 0.20)', stroke: '#2ECC40' };
};

// Default campus region (Stanford as fallback)
const DEFAULT_REGION: Region = {
  latitude: 37.4275,
  longitude: -122.1697,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

interface HeatMapViewProps {
  visible: boolean;
  onClose: () => void;
  collegeId: string;
}

export function HeatMapView({ visible, onClose, collegeId }: HeatMapViewProps) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const [hours, setHours] = useState(2);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [submitPanelOpen, setSubmitPanelOpen] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const submitPanelAnim = useSharedValue(0);

  // Fetch heatmap data
  const {
    data: heatmapData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['heatmap', collegeId, hours],
    queryFn: () => api.heatmap.getHeatmap(collegeId, hours),
    enabled: visible && !!collegeId,
    refetchInterval: 60000,
  });

  // Fetch all venues (for submission picker)
  const { data: venuesData } = useQuery({
    queryKey: ['heatmap-venues', collegeId],
    queryFn: () => api.heatmap.getVenues(collegeId),
    enabled: visible && !!collegeId,
  });

  // Check if user can submit
  const { data: canSubmitData } = useQuery({
    queryKey: ['heatmap-can-submit', profile?.id],
    queryFn: () => api.heatmap.canSubmit(profile!.id),
    enabled: visible && !!profile?.id,
    refetchInterval: 30000,
  });

  // Auto-seed venues if none exist
  useEffect(() => {
    if (visible && venuesData && venuesData.length === 0 && collegeId) {
      api.heatmap.seedVenues(collegeId).then(() => {
        queryClient.invalidateQueries({ queryKey: ['heatmap-venues', collegeId] });
      }).catch(() => {});
    }
  }, [visible, venuesData, collegeId, queryClient]);

  // Submit vibe mutation
  const submitMutation = useMutation({
    mutationFn: ({ venueId }: { venueId: string }) =>
      api.heatmap.submitVibe(profile!.id, venueId),
    onSuccess: () => {
      Haptics.success();
      setSubmitSuccess(true);
      setSubmitPanelOpen(false);
      queryClient.invalidateQueries({ queryKey: ['heatmap', collegeId] });
      setTimeout(() => setSubmitSuccess(false), 3000);
    },
    onError: (err: Error) => {
      Haptics.error();
      const msg = err.message?.includes('Already contributed')
        ? "You already dropped a vibe here this hour."
        : err.message?.includes('live mixer')
        ? "You need to be at a live mixer to drop vibes."
        : "Couldn't submit. Try again.";
      Alert.alert('Oops', msg);
    },
  });

  // Panel animation
  const toggleSubmitPanel = () => {
    Haptics.tap();
    const next = !submitPanelOpen;
    setSubmitPanelOpen(next);
    submitPanelAnim.value = withSpring(next ? 1 : 0, { damping: 20, stiffness: 200 });
  };

  const panelStyle = useAnimatedStyle(() => ({
    opacity: submitPanelAnim.value,
    transform: [{ translateY: (1 - submitPanelAnim.value) * 20 }],
  }));

  // Calculate map region
  const mapRegion = useMemo((): Region => {
    if (!heatmapData?.heatmap?.length) return DEFAULT_REGION;
    const venuesWithCoords = heatmapData.heatmap.filter(v => v.lat && v.lon);
    if (venuesWithCoords.length === 0) return DEFAULT_REGION;
    const lats = venuesWithCoords.map(v => v.lat!);
    const lons = venuesWithCoords.map(v => v.lon!);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max(0.01, (maxLat - minLat) * 1.5),
      longitudeDelta: Math.max(0.01, (maxLon - minLon) * 1.5),
    };
  }, [heatmapData]);

  const handleClose = useCallback(() => {
    Haptics.tap();
    setSubmitPanelOpen(false);
    onClose();
  }, [onClose]);

  const formatLastUpdated = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const venues = venuesData ?? [];
  const canSubmit = canSubmitData?.canSubmit ?? false;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={[DS.Color.bg, 'rgba(10, 15, 26, 0.98)']}
          style={StyleSheet.absoluteFill}
        />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.flameBadge}>
              <Flame size={20} color="#FF6B35" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Campus Heat</Text>
              <Text style={styles.headerSubtitle}>Where the vibes are at</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable onPress={() => { Haptics.tap(); setViewMode(v => v === 'map' ? 'list' : 'map'); }} style={styles.viewToggle}>
              {viewMode === 'map' ? <List size={18} color={DS.Color.text} /> : <MapIcon size={18} color={DS.Color.text} />}
            </Pressable>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <X size={22} color={DS.Color.text} />
            </Pressable>
          </View>
        </View>

        {/* Time Filter + Last Updated */}
        <View style={styles.filterRow}>
          {[1, 2, 3].map((h) => (
            <Pressable
              key={h}
              style={[styles.filterPill, hours === h && styles.filterPillActive]}
              onPress={() => { Haptics.tap(); setHours(h); }}
            >
              <Text style={[styles.filterText, hours === h && styles.filterTextActive]}>
                Last {h}h
              </Text>
            </Pressable>
          ))}
          {heatmapData && (
            <View style={styles.lastUpdatedPill}>
              <Clock size={11} color={DS.Color.text2} />
              <Text style={styles.lastUpdatedText}>{formatLastUpdated(heatmapData.lastUpdated)}</Text>
            </View>
          )}
          {isRefetching && <ActivityIndicator size="small" color="#FF6B35" />}
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color="#FF6B35" />
              <Text style={styles.loadingText}>Loading vibes...</Text>
            </View>
          ) : !heatmapData || heatmapData.heatmap.length === 0 ? (
            <View style={styles.centerState}>
              <Flame size={48} color={DS.Color.text3} />
              <Text style={styles.emptyTitle}>No vibes yet</Text>
              <Text style={styles.emptySubtitle}>
                Vibes show up here once {heatmapData?.privacyThreshold ?? 8}+ people check in at the same spot during a live mixer.
              </Text>
            </View>
          ) : viewMode === 'map' ? (
            <Animated.View style={styles.mapContainer} entering={FadeIn.duration(300)}>
              <MapView
                style={styles.map}
                initialRegion={mapRegion}
                region={mapRegion}
                showsUserLocation
                showsCompass
                showsScale
                mapType="mutedStandard"
              >
                {heatmapData.heatmap.map((venue) => {
                  if (!venue.lat || !venue.lon) return null;
                  const colors = getHeatColor(venue.normalizedIntensity);
                  return (
                    <React.Fragment key={venue.venueId}>
                      <Circle
                        center={{ latitude: venue.lat, longitude: venue.lon }}
                        radius={80 + venue.normalizedIntensity * 120}
                        fillColor={colors.fill}
                        strokeColor={colors.stroke}
                        strokeWidth={2}
                      />
                      <Marker
                        coordinate={{ latitude: venue.lat, longitude: venue.lon }}
                        title={venue.venueName}
                        description={`${CATEGORY_LABELS[venue.category]} · ${venue.maxContributors}+ people`}
                        onPress={() => { Haptics.tap(); setSelectedVenueId(venue.venueId); }}
                      >
                        <View style={styles.markerContainer}>
                          <View style={[styles.markerInner, { backgroundColor: colors.stroke }]}>
                            <Flame size={14} color="#FFF" />
                          </View>
                          <View style={[styles.markerArrow, { borderTopColor: colors.stroke }]} />
                        </View>
                      </Marker>
                    </React.Fragment>
                  );
                })}
              </MapView>

              {/* Legend */}
              <View style={[styles.legendContainer, { bottom: insets.bottom + 16 }]}>
                <BlurView intensity={80} tint="dark" style={styles.legendBlur}>
                  <View style={styles.legendContent}>
                    {[
                      { color: '#FF4136', label: 'Hot' },
                      { color: '#FF851B', label: 'Warm' },
                      { color: '#FFDC00', label: 'Active' },
                      { color: '#2ECC40', label: 'Chill' },
                    ].map(({ color, label }) => (
                      <View key={label} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: color }]} />
                        <Text style={styles.legendLabel}>{label}</Text>
                      </View>
                    ))}
                  </View>
                </BlurView>
              </View>
            </Animated.View>
          ) : (
            <Animated.ScrollView
              style={styles.listContainer}
              contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
              showsVerticalScrollIndicator={false}
              entering={FadeIn.duration(300)}
            >
              {heatmapData.heatmap.map((venue, index) => {
                const Icon = CATEGORY_ICONS[venue.category] ?? HelpCircle;
                const colors = getHeatColor(venue.normalizedIntensity);
                const catColor = CATEGORY_COLORS[venue.category] ?? '#94A3B8';
                return (
                  <Pressable
                    key={venue.venueId}
                    onPress={() => { Haptics.tap(); setSelectedVenueId(venue.venueId); setViewMode('map'); }}
                  >
                    <View style={[styles.venueCard, index === 0 && styles.venueCardTop, selectedVenueId === venue.venueId && styles.venueCardSelected]}>
                      {/* Rank */}
                      <View style={[styles.rankBadge, index === 0 && { backgroundColor: colors.stroke }]}>
                        {index === 0
                          ? <Flame size={14} color="#FFF" />
                          : <Text style={[styles.rankText, index === 0 && { color: '#000' }]}>{index + 1}</Text>
                        }
                      </View>

                      {/* Icon */}
                      <View style={[styles.venueIconWrap, { backgroundColor: `${catColor}18` }]}>
                        <Icon size={18} color={catColor} />
                      </View>

                      {/* Info */}
                      <View style={styles.venueInfo}>
                        <Text style={styles.venueName} numberOfLines={1}>{venue.venueName}</Text>
                        <View style={styles.venueMeta}>
                          <Text style={[styles.categoryLabel, { color: catColor }]}>{CATEGORY_LABELS[venue.category]}</Text>
                          <Text style={styles.dotSep}>·</Text>
                          <Text style={styles.peopleCount}>{venue.maxContributors}+ people</Text>
                        </View>
                      </View>

                      {/* Heat bar */}
                      <View style={styles.heatBarWrap}>
                        <View style={styles.heatBarBg}>
                          <LinearGradient
                            colors={['#2ECC40', '#FFDC00', '#FF851B', '#FF4136']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.heatBarFill, { width: `${Math.max(12, venue.normalizedIntensity * 100)}%` }]}
                          />
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </Animated.ScrollView>
          )}
        </View>

        {/* Success toast */}
        {submitSuccess && (
          <Animated.View
            style={styles.successToast}
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
          >
            <CheckCircle size={16} color="#4ADE80" />
            <Text style={styles.successToastText}>Vibe dropped!</Text>
          </Animated.View>
        )}

        {/* Drop Vibe Panel */}
        <View style={[styles.vibePanel, { paddingBottom: insets.bottom + 8 }]}>
          {/* Toggle button */}
          <Pressable
            style={[styles.vibePanelToggle, !canSubmit && styles.vibePanelToggleDisabled]}
            onPress={canSubmit ? toggleSubmitPanel : () => {
              Alert.alert(
                'Not Available',
                'You can drop vibes during a live mixer. Join a mixer and check in!',
              );
            }}
          >
            <LinearGradient
              colors={canSubmit ? ['#FF6B35', '#FF4136'] : [DS.Color.panel, DS.Color.panel]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.vibePanelToggleGrad}
            >
              <Flame size={18} color={canSubmit ? '#FFF' : DS.Color.text3} />
              <Text style={[styles.vibePanelToggleText, !canSubmit && { color: DS.Color.text3 }]}>
                {canSubmit ? 'Drop Your Vibe' : 'Vibes open during live mixers'}
              </Text>
              {canSubmit && (
                submitPanelOpen ? <ChevronDown size={16} color="#FFF" /> : <ChevronUp size={16} color="#FFF" />
              )}
            </LinearGradient>
          </Pressable>

          {/* Venue picker */}
          {submitPanelOpen && canSubmit && (
            <Animated.View style={[styles.venuePicker, panelStyle]}>
              <Text style={styles.venuePickerLabel}>Where are you?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.venuePickerScroll}>
                {venues.map((venue) => {
                  const Icon = CATEGORY_ICONS[venue.category] ?? HelpCircle;
                  const catColor = CATEGORY_COLORS[venue.category] ?? '#94A3B8';
                  const isSelected = selectedVenueId === venue.id;
                  const isSubmitting = submitMutation.isPending && submitMutation.variables?.venueId === venue.id;
                  return (
                    <Pressable
                      key={venue.id}
                      onPress={() => {
                        Haptics.tap();
                        setSelectedVenueId(venue.id);
                        submitMutation.mutate({ venueId: venue.id });
                      }}
                      disabled={submitMutation.isPending}
                      style={[styles.venueChip, isSelected && { borderColor: catColor, backgroundColor: `${catColor}18` }]}
                    >
                      {isSubmitting
                        ? <ActivityIndicator size="small" color={catColor} />
                        : <Icon size={14} color={isSelected ? catColor : DS.Color.text2} />
                      }
                      <Text style={[styles.venueChipText, isSelected && { color: catColor }]}>
                        {venue.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Animated.View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DS.Color.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.Spacing.lg,
    paddingVertical: DS.Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DS.Color.stroke,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: DS.Spacing.md },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: DS.Spacing.sm },
  flameBadge: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: DS.Color.text },
  headerSubtitle: { fontSize: 12, color: DS.Color.text2 },
  viewToggle: {
    padding: 9,
    backgroundColor: DS.Color.panel,
    borderRadius: DS.Radius.sm,
    borderWidth: 1,
    borderColor: DS.Color.stroke,
  },
  closeButton: { padding: 8 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.Spacing.lg,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: DS.Color.stroke,
  },
  filterPill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: DS.Color.panel,
    borderWidth: 1,
    borderColor: DS.Color.stroke,
  },
  filterPillActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderColor: '#FF6B35',
  },
  filterText: { fontSize: 13, fontWeight: '600', color: DS.Color.text2 },
  filterTextActive: { color: '#FF6B35' },
  lastUpdatedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginLeft: 'auto',
    paddingVertical: 5, paddingHorizontal: 9,
    backgroundColor: DS.Color.panel, borderRadius: 12,
  },
  lastUpdatedText: { fontSize: 11, color: DS.Color.text2 },
  contentContainer: { flex: 1 },
  centerState: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: DS.Spacing.md, paddingHorizontal: DS.Spacing.xxl,
  },
  loadingText: { fontSize: 14, color: DS.Color.text2 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: DS.Color.text },
  emptySubtitle: { fontSize: 14, color: DS.Color.text2, textAlign: 'center', lineHeight: 20 },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  markerContainer: { alignItems: 'center' },
  markerInner: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  markerArrow: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    marginTop: -1,
  },
  legendContainer: { position: 'absolute', left: 12, right: 12 },
  legendBlur: { borderRadius: DS.Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  legendContent: { flexDirection: 'row', justifyContent: 'space-around', padding: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendLabel: { fontSize: 11, color: DS.Color.text2 },
  listContainer: { flex: 1 },
  listContent: { padding: DS.Spacing.lg, gap: 8 },
  venueCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: DS.Color.panel,
    borderRadius: DS.Radius.md,
    borderWidth: 1, borderColor: DS.Color.stroke,
    padding: DS.Spacing.md, gap: DS.Spacing.sm,
  },
  venueCardTop: {
    borderColor: 'rgba(255, 107, 53, 0.4)',
    backgroundColor: 'rgba(255, 107, 53, 0.05)',
  },
  venueCardSelected: { borderColor: '#FF6B35' },
  rankBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: DS.Color.stroke,
    alignItems: 'center', justifyContent: 'center',
  },
  rankText: { fontSize: 13, fontWeight: '700', color: DS.Color.text },
  venueIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  venueInfo: { flex: 1 },
  venueName: { fontSize: 14, fontWeight: '600', color: DS.Color.text, marginBottom: 3 },
  venueMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  categoryLabel: { fontSize: 11, fontWeight: '600' },
  dotSep: { fontSize: 11, color: DS.Color.text3 },
  peopleCount: { fontSize: 11, color: DS.Color.text3 },
  heatBarWrap: { width: 60 },
  heatBarBg: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  heatBarFill: { height: '100%', borderRadius: 3 },
  successToast: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4ADE8040',
  },
  successToastText: { fontSize: 14, fontWeight: '600', color: '#4ADE80' },
  vibePanel: {
    borderTopWidth: 1,
    borderTopColor: DS.Color.stroke,
    paddingHorizontal: DS.Spacing.lg,
    paddingTop: DS.Spacing.md,
    gap: DS.Spacing.md,
    backgroundColor: DS.Color.bg,
  },
  vibePanelToggle: { borderRadius: 14, overflow: 'hidden' },
  vibePanelToggleDisabled: { opacity: 0.7 },
  vibePanelToggleGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  vibePanelToggleText: {
    flex: 1, fontSize: 15, fontWeight: '700', color: '#FFF',
  },
  venuePicker: { gap: 10, paddingBottom: 4 },
  venuePickerLabel: { fontSize: 12, fontWeight: '700', color: DS.Color.text3, textTransform: 'uppercase', letterSpacing: 0.6 },
  venuePickerScroll: { gap: 8, paddingVertical: 2 },
  venueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: DS.Color.stroke,
    backgroundColor: DS.Color.panel,
  },
  venueChipText: { fontSize: 13, fontWeight: '600', color: DS.Color.text2 },
});
