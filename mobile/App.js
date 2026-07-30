import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  ActivityIndicator,
  PanResponder,
} from 'react-native';
import { generateCalendarDays, matchesReminder, getLunarDate } from './src/lib/calendar';
import {
  supabase,
  signInWithGoogle,
  signOut,
  getReminders,
  saveReminder,
  deleteReminder,
  savePushToken,
} from './src/lib/supabase';
import { registerForPushNotifications } from './src/lib/notifications';
import AddEventModal from './src/components/AddEventModal';

const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [user, setUser] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const days = useMemo(() => generateCalendarDays(currentDate), [currentDate]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user?.id) {
      getReminders(user.id).then(setReminders);
      registerForPushNotifications().then(token => {
        if (token) savePushToken(user.id, token);
      });
    } else {
      setReminders([]);
    }
  }, [user?.id]);

  const refreshReminders = useCallback(() => {
    if (user?.id) getReminders(user.id).then(setReminders);
  }, [user?.id]);

  const handlePrevMonth = () =>
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));

  const handleNextMonth = () =>
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const handleToday = () => setCurrentDate(new Date());

  const handleDatePress = useCallback((day) => {
    if (!user) {
      Alert.alert('로그인 필요', '일정을 추가하려면 로그인이 필요합니다.');
      return;
    }
    const existing = reminders.find(r => matchesReminder(r, day));
    setSelectedEvent(existing || null);
    setSelectedDate(day.fullDateStr);
    setModalOpen(true);
  }, [user, reminders]);

  const handleSaveEvent = useCallback(async (eventData) => {
    if (!user) return { success: false, error: 'Not logged in' };
    const lunar = getLunarDate(eventData.solar_date);
    const result = await saveReminder(user.id, { ...eventData, lunarDate: lunar });
    if (result.success) refreshReminders();
    return result;
  }, [user, refreshReminders]);

  const handleDeleteEvent = useCallback(async (eventId) => {
    await deleteReminder(eventId);
    refreshReminders();
    setModalOpen(false);
  }, [refreshReminders]);

  const swipeResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 10,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) handleNextMonth();
        else if (g.dx > 50) handlePrevMonth();
      },
    })
  ).current;

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      Alert.alert('로그인 오류', err.message);
    }
  };

  const monthDisplay = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;
  const userName = user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.user_metadata?.name?.split(' ')[0] ||
    user?.email?.split('@')[0];

  const renderDay = useCallback(({ item: day }) => {
    const reminder = reminders.find(r => matchesReminder(r, day));
    const isRed = !day.isOtherMonth && (day.dayOfWeek === 0 || day.isHoliday);
    const isBlue = !day.isOtherMonth && day.dayOfWeek === 6;

    return (
      <TouchableOpacity
        style={[styles.cell, day.isToday && styles.todayCell]}
        onPress={() => handleDatePress(day)}
        activeOpacity={0.65}
      >
        <Text style={[
          styles.dayNum,
          day.isOtherMonth ? styles.otherMonth : isRed ? styles.red : isBlue ? styles.blue : styles.dark,
          day.isToday && styles.todayNum,
        ]}>
          {day.day}
        </Text>
        {day.holidayName
          ? <Text style={[styles.lunar, styles.red]} numberOfLines={1}>{day.holidayName}</Text>
          : <Text style={[styles.lunar, day.isOtherMonth && styles.otherMonth]}>{day.lunarDateStr}</Text>
        }
        {day.term ? <Text style={styles.term}>{day.term}</Text> : null}
        {reminder ? <Text style={styles.reminder} numberOfLines={1}>{reminder.title}</Text> : null}
      </TouchableOpacity>
    );
  }, [reminders, handleDatePress]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.navRow}>
          <View style={styles.navSide}>
            <TouchableOpacity onPress={handleToday} style={styles.todayBtn}>
              <Text style={styles.todayBtnText}>오늘</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
              <Text style={styles.navArrow}>‹</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.monthLabel}>{monthDisplay}</Text>
          <View style={[styles.navSide, styles.navSideRight]}>
            <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
              <Text style={styles.navArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.authRow}>
          {authLoading ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : user ? (
            <TouchableOpacity onPress={signOut}>
              <Text style={styles.signOutText}>{userName} 로그아웃</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleSignIn} style={styles.signInBtn}>
              <Text style={styles.signInText}>Google 로그인</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Week day headers */}
      <View style={styles.weekRow}>
        {WEEK_DAYS.map((d, i) => (
          <Text key={d} style={[
            styles.weekDay,
            i === 0 ? styles.red : i === 6 ? styles.blue : styles.grayMid,
          ]}>
            {d}
          </Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid} {...swipeResponder.panHandlers}>
        <FlatList
          data={days}
          renderItem={renderDay}
          keyExtractor={item => item.id}
          numColumns={7}
          scrollEnabled={false}
          contentContainerStyle={styles.gridContent}
        />
      </View>

      <AddEventModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        selectedDate={selectedDate}
        existingEvent={selectedEvent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navSideRight: {
    justifyContent: 'flex-end',
  },
  todayBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  todayBtnText: {
    fontSize: 15,
    color: '#555',
    fontWeight: '500',
  },
  navBtn: {
    padding: 4,
  },
  navArrow: {
    fontSize: 26,
    color: '#9ca3af',
    lineHeight: 30,
  },
  monthLabel: {
    textAlign: 'center',
    fontSize: 19,
    fontWeight: '700',
    color: '#111',
  },
  authRow: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  signInBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  signInText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '500',
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  grid: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: 2,
    paddingTop: 2,
  },
  cell: {
    flex: 1,
    minHeight: 68,
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 4,
    paddingHorizontal: 1,
    margin: 1,
    borderRadius: 10,
  },
  todayCell: {
    backgroundColor: '#fef9c3',
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  dayNum: {
    fontSize: 19,
    fontWeight: '700',
  },
  todayNum: {
    color: '#92400e',
  },
  term: {
    fontSize: 9,
    color: '#16a34a',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 1,
  },
  holiday: {
    fontSize: 10,
    color: '#dc2626',
    textAlign: 'center',
    marginTop: 1,
    lineHeight: 12,
  },
  reminder: {
    fontSize: 9,
    color: '#2563eb',
    textAlign: 'center',
    marginTop: 1,
    lineHeight: 11,
  },
  lunar: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  red: { color: '#dc2626' },
  blue: { color: '#2563eb' },
  dark: { color: '#111827' },
  grayMid: { color: '#6b7280' },
  otherMonth: { color: '#d1d5db' },
});
