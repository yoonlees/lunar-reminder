"use client";

import React, { useState, useEffect } from 'react';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import { signInWithGoogle, signOut, getCurrentUser, supabase } from '@/lib/supabase';
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
    const calendar = new KoreanLunarCalendar();

    useEffect(() => {
        // Reset to today
        const now = new Date();
        if (!currentDate) setCurrentDate(now);

        // Initial Auth Check
        getCurrentUser().then(setUser);

        // Auth Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        renderCalendar(currentDate);
    }, [currentDate]);

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
                isToday,
                fullDateStr
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
            <header className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 gap-4">

                {/* Month Navigation */}
                <div className="flex items-center justify-between w-full sm:w-auto gap-4 order-2 sm:order-1">
                    <button onClick={handlePrevMonth} className="text-2xl text-gray-500 hover:text-gray-900 transition-colors p-2">&lt;</button>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 capitalize min-w-[150px] text-center">{currentMonthDisplay}</h1>
                    <button onClick={handleNextMonth} className="text-2xl text-gray-500 hover:text-gray-900 transition-colors p-2">&gt;</button>
                </div>

                {/* Auth Button */}
                <div className="order-1 sm:order-2 self-end sm:self-auto">
                    {user ? (
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600 hidden sm:inline">{user.email}</span>
                            <button
                                onClick={signOut}
                                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            >
                                Sign Out
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={signInWithGoogle}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                        >
                            Sign in with Google
                        </button>
                    )}
                </div>
            </header>

            <div className="calendar-grid">
                {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                    <div key={day} className={`text-center font-semibold text-sm uppercase tracking-wider pb-2 ${idx === 0 ? 'text-red-500' : 'text-gray-500'}`}>
                        {day}
                    </div>
                ))}

                {days.map(day => (
                    day.type === 'empty' ? (
                        <div key={day.id} className="day-card empty bg-transparent"></div>
                    ) : (
                        <div
                            key={day.id}
                            className={`day-card relative rounded-2xl p-2 sm:p-3 flex flex-col justify-between cursor-pointer 
                        ${day.isToday ? 'today' : ''} 
                    `}
                            onClick={() => console.log('Clicked', day.fullDateStr)}
                        >
                            <span className={`text-xl sm:text-2xl font-bold ${day.isHoliday || new Date(day.fullDateStr).getDay() === 0 ? 'text-red-500' : 'text-gray-800'}`}>
                                {day.day}
                            </span>
                            <div className="flex flex-col items-end text-xs sm:text-sm font-medium text-gray-500">
                                {day.term && <span className="text-green-600 text-[10px] sm:text-xs mb-[1px] text-right font-bold">{day.term}</span>}
                                {day.holidayName && <span className="text-red-500 text-[10px] sm:text-xs mb-[1px] text-right leading-tight">{day.holidayName}</span>}
                                <span className="opacity-80">{day.lunarDateStr}</span>
                            </div>
                        </div>
                    )
                ))}
            </div>
        </div>
    );
}
