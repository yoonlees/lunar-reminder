"use client";

import React, { useState, useEffect } from 'react';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import { signInWithGoogle, signOut, getCurrentUser, hasActiveSubscription, createReminder, getReminders, createOrUpdateProfile, supabase } from '@/lib/supabase';
import AddEventModal from './AddEventModal';
import { Solar } from 'lunar-javascript';

// Solar Terms Mapping (Chinese -> Korean)
const SOLAR_TERMS_KR = {
    "立春": "입춘", "雨水": "우수", "惊蛰": "경칩", "春分": "춘분", "清明": "청명", "谷雨": "곡우",
    "立夏": "입하", "小满": "소만", "芒种": "망종", "夏至": "하지", "小暑": "소서", "大暑": "대서",
    "立秋": "입추", "处暑": "처서", "白露": "백로", "秋分": "추분", "寒露": "한로", "霜降": "상강",
    "立冬": "입동", "小雪": "소설", "大雪": "대설", "冬至": "동지", "小寒": "소한", "大寒": "대한"
};

export default function Calendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [days, setDays] = useState([]);
    const [user, setUser] = useState(null);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [reminders, setReminders] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [checkoutMessage, setCheckoutMessage] = useState(null);
    const [checkoutMessageType, setCheckoutMessageType] = useState('success'); // 'success' | 'cancel' | 'error'
    const calendar = new KoreanLunarCalendar();

    useEffect(() => {
        // Reset to today
        const now = new Date();
        if (!currentDate) setCurrentDate(now);

        // Initial Auth & Subscription Check
        async function initAuth() {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
            if (currentUser) {
                const subscribed = await hasActiveSubscription(currentUser.id);
                setIsSubscribed(subscribed);
            }
        }
        initAuth();

        // Auth Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                const subscribed = await hasActiveSubscription(currentUser.id);
                setIsSubscribed(subscribed);

                // Ensure profile exists
                await createOrUpdateProfile(currentUser);

                fetchReminders(currentUser.id);
            } else {
                setIsSubscribed(false);
                setReminders([]);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
        const status = params.get('checkout');
        if (status === 'success') {
            setCheckoutMessage('결제가 완료되었습니다. 감사합니다.');
            setCheckoutMessageType('success');

            // Poll for subscription status update (webhook might be slow)
            if (user) {
                let attempts = 0;
                const maxAttempts = 10;
                const intervalId = setInterval(async () => {
                    attempts++;
                    const subscribed = await hasActiveSubscription(user.id);
                    if (subscribed) {
                        setIsSubscribed(true);
                        clearInterval(intervalId);
                    } else if (attempts >= maxAttempts) {
                        clearInterval(intervalId);
                    }
                }, 2000); // Check every 2 seconds
                return () => clearInterval(intervalId);
            }
        }
        if (status === 'cancel') {
            setCheckoutMessage('결제가 취소되었습니다.');
            setCheckoutMessageType('cancel');
        }
        if (status) {
            window.history.replaceState({}, '', window.location.pathname);
            const t = setTimeout(() => setCheckoutMessage(null), 10000); // Increased to 10s to ensure message is seen
            return () => clearTimeout(t);
        }
    }, [user]); // user dependency added to ensure we have user ID for polling

    useEffect(() => {
        renderCalendar(currentDate);
    }, [currentDate]);

    const handleCheckout = async () => {
        if (!user || !user.email) {
            setCheckoutMessage('로그인이 필요합니다.');
            setCheckoutMessageType('error');
            return;
        }

        setCheckoutLoading(true);
        setCheckoutMessage(null);
        try {
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user.email,
                    user_id: user.id
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Checkout failed');
            if (data.url) window.location.href = data.url;
            else throw new Error('No checkout URL');
        } catch (err) {
            setCheckoutMessage(err.message || '결제 시작에 실패했습니다.');
            setCheckoutMessageType('error');
        } finally {
            setCheckoutLoading(false);
        }
    };

    const fetchReminders = async (userId) => {
        if (!userId) return;
        console.log('Fetching reminders (API) for user:', userId);

        try {
            const res = await fetch(`/api/reminders?userId=${userId}`);
            if (!res.ok) {
                console.error('Failed to fetch reminders via API');
                return;
            }
            const data = await res.json();
            console.log('Fetched Reminders (API):', data);
            setReminders(data);
        } catch (e) {
            console.error('Exception fetching reminders:', e);
        }
    };

    const handleDateClick = (dateStr) => {
        if (!user) {
            alert('일정을 추가하려면 로그인이 필요합니다.');
            return;
        }
        setSelectedDate(dateStr);
        setModalOpen(true);
    };

    const handleSaveEvent = async (eventData) => {
        if (!user) {
            console.error('Save attempted without user');
            return;
        }

        console.log('Saving event with data:', eventData);

        try {
            // Calculate lunar date for the event (simplified for now, ideally strictly calculated)
            const [year, month, day] = eventData.solar_date.split('-').map(Number);
            calendar.setSolarDate(year, month, day);
            const lunar = calendar.getLunarCalendar();

            const reminderPayload = {
                title: eventData.title,
                recurrence: eventData.recurrence,
                notificationEnabled: eventData.notification_enabled,
                solarDate: eventData.solar_date,
                lunarDate: { month: lunar.month, day: lunar.day }
            };

            console.log('Sending payload to Supabase:', reminderPayload);
            console.log('Sending payload to API:', reminderPayload);
            const response = await fetch('/api/reminders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, ...reminderPayload })
            });

            const result = await response.json();

            if (response.ok) {
                console.log('Event saved successfully via API:', result);
                fetchReminders(user.id);
                return { success: true };
            } else {
                console.error('Failed to create reminder via API:', result.error);
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('Exception in handleSaveEvent:', error);
            return { success: false, error: error.message };
        }
    };

    const renderCalendar = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfWeek = new Date(year, month, 1).getDay();

        const newDays = [];

        // Padding for empty days
        for (let i = 0; i < firstDayOfWeek; i++) {
            newDays.push({ type: 'empty', id: `empty-${i}` });
        }

        const now = new Date();

        for (let d = 1; d <= daysInMonth; d++) {
            // Korean Lunar Calendar Conversion
            calendar.setSolarDate(year, month + 1, d);
            const lunar = calendar.getLunarCalendar();
            const lunarDateStr = `${lunar.month}.${lunar.day}`;

            // Solar Term Calculation using lunar-javascript
            const solarObj = Solar.fromYmd(year, month + 1, d);
            const termChinese = solarObj.getLunar().getJieQi();
            const termKorean = termChinese ? SOLAR_TERMS_KR[termChinese] || termChinese : '';

            // Solar string for storage
            const monthStr = (month + 1).toString().padStart(2, '0');
            const dayStr = d.toString().padStart(2, '0');
            const fullDateStr = `${year}-${monthStr}-${dayStr}`;

            const isToday = d === now.getDate() && month === now.getMonth() && year === now.getFullYear();

            let holidayName = '';
            let isHoliday = false;

            // Basic simplified Holiday Logic (Example)
            // Seollal (Lunar 1.1)
            if (lunar.month === 1 && lunar.day === 1) {
                holidayName = '설날';
                isHoliday = true;
            }
            // Chuseok (Lunar 8.15)
            if (lunar.month === 8 && lunar.day === 15) {
                holidayName = '추석';
                isHoliday = true;
            }
            // Buddha's Birthday (Lunar 4.8)
            if (lunar.month === 4 && lunar.day === 8) {
                holidayName = '석가탄신일';
                isHoliday = true;
            }

            // Solar Holidays
            if ((month + 1) === 1 && d === 1) { holidayName = '신정'; isHoliday = true; }
            if ((month + 1) === 3 && d === 1) { holidayName = '삼일절'; isHoliday = true; }
            if ((month + 1) === 5 && d === 5) { holidayName = '어린이날'; isHoliday = true; }
            if ((month + 1) === 6 && d === 6) { holidayName = '현충일'; isHoliday = true; }
            if ((month + 1) === 8 && d === 15) { holidayName = '광복절'; isHoliday = true; }
            if ((month + 1) === 10 && d === 3) { holidayName = '개천절'; isHoliday = true; }
            if ((month + 1) === 10 && d === 9) { holidayName = '한글날'; isHoliday = true; }
            if ((month + 1) === 12 && d === 25) { holidayName = '성탄절'; isHoliday = true; }

            newDays.push({
                type: 'day',
                id: `day-${d}`,
                day: d,
                lunarDateStr,
                term: termKorean,
                holidayName,
                isHoliday,
                fullDateStr,
                dayOfWeek: new Date(year, month, d).getDay()
            });
        }
        setDays(newDays);
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const currentMonthDisplay = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;

    return (
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl p-4 sm:p-8 overflow-hidden select-none">
            <header className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-8 gap-3 sm:gap-4">

                {/* Month Navigation */}
                <div className="flex items-center justify-between w-full sm:w-auto gap-4 order-2 sm:order-1">
                    <button onClick={handlePrevMonth} className="text-2xl text-gray-500 hover:text-gray-900 transition-colors p-2">&lt;</button>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 capitalize min-w-[150px] text-center">{currentMonthDisplay}</h1>
                    <button onClick={handleNextMonth} className="text-2xl text-gray-500 hover:text-gray-900 transition-colors p-2">&gt;</button>
                </div>

                {/* Auth + Stripe */}
                <div className="order-1 sm:order-2 self-end sm:self-auto flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3">
                    {checkoutMessage && (
                        <span className={`text-sm sm:order-3 ${checkoutMessageType === 'success' ? 'text-green-600' : checkoutMessageType === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
                            {checkoutMessage}
                        </span>
                    )}
                    {user ? (
                        <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-3">
                                {!isSubscribed && (
                                    <button
                                        onClick={handleCheckout}
                                        disabled={checkoutLoading}
                                        className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
                                    >
                                        {checkoutLoading ? '이동 중…' : '구독하기'}
                                    </button>
                                )}
                                <button
                                    onClick={signOut}
                                    className="px-5 py-2.5 text-sm font-medium text-red-600 bg-transparent hover:bg-red-50 border border-transparent hover:border-red-100 rounded-full transition-all duration-200"
                                >
                                    로그아웃
                                </button>
                            </div>
                            <span className="text-sm text-gray-500 font-medium whitespace-nowrap mr-1">
                                안녕하세요 {user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]}님!
                            </span>
                        </div>
                    ) : (
                        <>

                            <button
                                onClick={signInWithGoogle}
                                className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-full transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
                            >
                                Google로 로그인
                            </button>
                        </>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-7 gap-1 sm:gap-4">
                {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => {
                    const colorClass = idx === 0 ? 'text-red-600' : idx === 6 ? 'text-blue-600' : 'text-gray-500';
                    return (
                        <div key={day} className={`text-center font-semibold text-sm uppercase tracking-wider pb-2 ${colorClass}`}>
                            {day}
                        </div>
                    );
                })}

                {days.map(day => {
                    const dayReminder = reminders.find(r => r.solar_date === day.fullDateStr);
                    return day.type === 'empty' ? (
                        <div key={day.id} className="day-card empty bg-transparent"></div>
                    ) : (
                        <div
                            key={day.id}
                            className={`day-card relative rounded-xl sm:rounded-2xl p-1 sm:p-3 flex flex-col justify-between cursor-pointer  
                        ${day.isToday ? 'today' : ''} 
                    `}
                            onClick={() => handleDateClick(day.fullDateStr)}
                        >
                            <span className={`text-xl sm:text-2xl font-bold ${day.isHoliday || day.dayOfWeek === 0 ? 'text-red-600' :
                                day.dayOfWeek === 6 ? 'text-blue-600' : 'text-gray-800'
                                }`}>
                                {day.day}
                            </span>
                            <div className="flex flex-col items-end text-xs sm:text-sm font-medium text-gray-500">
                                {day.term && <span className="text-green-600 text-[10px] sm:text-xs mb-[1px] text-right font-bold">{day.term}</span>}
                                {day.holidayName && <span className="text-red-600 text-[10px] sm:text-xs mb-[1px] text-right leading-tight">{day.holidayName}</span>}
                                {dayReminder && <span className="text-blue-600 text-[10px] sm:text-xs mb-[1px] text-right leading-tight truncate w-full">{dayReminder.title}</span>}
                                <span className="opacity-80">{day.lunarDateStr}</span>
                            </div>
                        </div>
                    );
                })}
            </div>


            <AddEventModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSaveEvent}
                selectedDate={selectedDate}
            />
        </div >
    );
}
