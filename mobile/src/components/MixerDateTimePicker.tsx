import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react-native';
import { DS } from '@/lib/ds';
import { Haptics } from '@/lib/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_CELL_SIZE = Math.floor((SCREEN_WIDTH - 48 - 12) / 7);

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// Generate all 15-min time slots
const TIME_SLOTS: { label: string; hours: number; minutes: number }[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    const period = h < 12 ? 'AM' : 'PM';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const label = `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
    TIME_SLOTS.push({ label, hours: h, minutes: m });
  }
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function isBeforeDay(a: Date, b: Date) {
  const ad = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bd = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return ad < bd;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  title?: string;
  mode: 'date' | 'time';
}

export function MixerDateTimePicker({ visible, onClose, value, onChange, minimumDate, title, mode }: Props) {
  const insets = useSafeAreaInsets();
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const [selectedDate, setSelectedDate] = useState(new Date(value));
  const timeScrollRef = useRef<ScrollView>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setViewYear(value.getFullYear());
      setViewMonth(value.getMonth());
      setSelectedDate(new Date(value));
    }
  }, [visible]);

  // Scroll time list to selected slot when time mode opens
  useEffect(() => {
    if (visible && mode === 'time') {
      const idx = TIME_SLOTS.findIndex(
        (s) => s.hours === value.getHours() &&
               s.minutes === Math.floor(value.getMinutes() / 15) * 15
      );
      const target = Math.max(0, idx);
      setTimeout(() => {
        timeScrollRef.current?.scrollTo({ y: target * 56, animated: false });
      }, 150);
    }
  }, [visible, mode]);

  const handlePrevMonth = () => {
    Haptics.tap();
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const handleNextMonth = () => {
    Haptics.tap();
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDayPress = (day: number) => {
    Haptics.tap();
    const next = new Date(selectedDate);
    next.setFullYear(viewYear, viewMonth, day);
    setSelectedDate(next);
  };

  const handleTimePress = (slot: typeof TIME_SLOTS[0]) => {
    Haptics.tap();
    const next = new Date(selectedDate);
    next.setHours(slot.hours, slot.minutes, 0, 0);
    setSelectedDate(next);
    // Auto-confirm and close for time mode
    onChange(next);
    onClose();
  };

  const handleDone = () => {
    onChange(selectedDate);
    onClose();
  };

  // Build calendar grid
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = new Date();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedSlotIdx = TIME_SLOTS.findIndex(
    (s) => s.hours === selectedDate.getHours() &&
           s.minutes === Math.floor(selectedDate.getMinutes() / 15) * 15
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {/* Header */}
        <View style={styles.sheetHeader}>
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          {title && <Text style={styles.sheetTitle}>{title}</Text>}
          {mode === 'date' ? (
            <Pressable onPress={handleDone} style={styles.doneBtn}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          ) : (
            <View style={styles.doneBtn} />
          )}
        </View>

        {mode === 'date' ? (
          <View style={styles.calendarContainer}>
            {/* Month nav */}
            <View style={styles.monthNav}>
              <Pressable onPress={handlePrevMonth} style={styles.navBtn}>
                <ChevronLeft size={20} color={DS.Color.text} />
              </Pressable>
              <Text style={styles.monthTitle}>{MONTHS[viewMonth]} {viewYear}</Text>
              <Pressable onPress={handleNextMonth} style={styles.navBtn}>
                <ChevronRight size={20} color={DS.Color.text} />
              </Pressable>
            </View>

            {/* Day headers */}
            <View style={styles.dayHeaders}>
              {DAYS.map((d) => (
                <View key={d} style={[styles.dayCell, { width: DAY_CELL_SIZE }]}>
                  <Text style={styles.dayHeaderText}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Day grid */}
            <View style={styles.grid}>
              {cells.map((day, idx) => {
                if (!day) return <View key={`empty-${idx}`} style={[styles.dayCell, { width: DAY_CELL_SIZE, height: DAY_CELL_SIZE }]} />;
                const cellDate = new Date(viewYear, viewMonth, day);
                const isSelected = isSameDay(cellDate, selectedDate);
                const isToday = isSameDay(cellDate, today);
                const isDisabled = minimumDate ? isBeforeDay(cellDate, minimumDate) : false;
                return (
                  <Pressable
                    key={day}
                    onPress={() => !isDisabled && handleDayPress(day)}
                    style={[
                      styles.dayCell,
                      { width: DAY_CELL_SIZE, height: DAY_CELL_SIZE },
                      isSelected && styles.dayCellSelected,
                    ]}
                  >
                    <Text style={[
                      styles.dayText,
                      isToday && !isSelected && styles.dayTextToday,
                      isSelected && styles.dayTextSelected,
                      isDisabled && styles.dayTextDisabled,
                    ]}>
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.timeContainer}>
            <ScrollView
              ref={timeScrollRef}
              style={styles.timeList}
              contentContainerStyle={styles.timeListContent}
              showsVerticalScrollIndicator={false}
            >
              {TIME_SLOTS.map((slot, idx) => {
                const isSelected = idx === selectedSlotIdx;
                return (
                  <Pressable
                    key={slot.label}
                    onPress={() => handleTimePress(slot)}
                    style={[styles.timeRow, isSelected && styles.timeRowSelected]}
                  >
                    <Text style={[styles.timeText, isSelected && styles.timeTextSelected]}>
                      {slot.label}
                    </Text>
                    {isSelected && <Check size={16} color={DS.Color.gelPurple} strokeWidth={2.5} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#111218',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: DS.Color.stroke,
    height: '70%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: DS.Color.stroke,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.Color.text,
  },
  cancelBtn: { padding: 4 },
  cancelText: { fontSize: 15, color: DS.Color.text2, fontWeight: '500' },
  doneBtn: { padding: 4, minWidth: 50, alignItems: 'flex-end' },
  doneText: { fontSize: 15, color: DS.Color.gelPurple, fontWeight: '700' },
  calendarContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DS.Color.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DS.Color.text,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DAY_CELL_SIZE / 2,
  },
  dayCellSelected: {
    backgroundColor: DS.Color.gelPurple,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: DS.Color.text3,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: DS.Color.text,
  },
  dayTextToday: {
    color: DS.Color.gelPurple,
    fontWeight: '700',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dayTextDisabled: {
    color: DS.Color.text3,
    opacity: 0.4,
  },
  timeContainer: {
    flex: 1,
  },
  timeList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  timeListContent: {
    paddingVertical: 8,
  },
  timeRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 2,
  },
  timeRowSelected: {
    backgroundColor: DS.Color.gelPurple + '20',
  },
  timeText: {
    fontSize: 17,
    color: DS.Color.text,
    fontWeight: '500',
  },
  timeTextSelected: {
    color: DS.Color.gelPurple,
    fontWeight: '700',
  },
});
