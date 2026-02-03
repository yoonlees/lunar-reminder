"use client";

import React, { useState } from 'react';

export default function AddEventModal({ isOpen, onClose, onSave, onDelete, selectedDate, existingEvent }) {
    const [title, setTitle] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [isLunar, setIsLunar] = useState(true); // Default to Lunar
    const [enableAlert, setEnableAlert] = useState(true);
    const [loading, setLoading] = useState(false);

    // Effect to reset or pre-fill form when modal opens
    React.useEffect(() => {
        if (isOpen) {
            if (existingEvent) {
                setTitle(existingEvent.title);
                setIsRecurring(existingEvent.recurrence === 'yearly');
                // Check if isLunar is stored in lunar_date JSONB, default to true if boolean check fails/missing
                setIsLunar(existingEvent.lunar_date?.isLunar !== false);
                setEnableAlert(existingEvent.notification_enabled);
            } else {
                setTitle('');
                setIsRecurring(false);
                setIsLunar(true);
                setEnableAlert(true);
            }
        }
    }, [isOpen, existingEvent]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await onSave({
                id: existingEvent?.id, // Pass ID if updating
                title,
                recurrence: isRecurring ? 'yearly' : 'none',
                isLunar, // Pass recurrence type
                notification_enabled: enableAlert,
                solar_date: selectedDate
            });

            if (!result.success) {
                throw new Error(result.error || 'Save failed');
            }

            onClose();
            setTitle('');
            setIsRecurring(false);
            setEnableAlert(true);
        } catch (error) {
            console.error(error);
            alert(`Failed to save event: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                    {existingEvent ? `일정 수정 (${selectedDate})` : `일정 추가 (${selectedDate})`}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Note / Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            내용 (예: 아내 생일)
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="일정 내용을 입력하세요"
                            required
                        />
                    </div>

                    {/* Recurrence */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">매년 반복</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isRecurring}
                                onChange={(e) => setIsRecurring(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {/* Lunar/Solar Toggle for Recurrence */}
                    {isRecurring && (
                        <div className="flex gap-4 px-3 py-2 bg-blue-50/50 rounded-lg border border-blue-100">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="calendarType"
                                    checked={isLunar}
                                    onChange={() => setIsLunar(true)}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">음력 (Lunar)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="calendarType"
                                    checked={!isLunar}
                                    onChange={() => setIsLunar(false)}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">양력 (Solar)</span>
                            </label>
                        </div>
                    )}

                    {/* Alert */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">알림 받기</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={enableAlert}
                                onChange={(e) => setEnableAlert(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {/* Frequency info */}
                    <p className="text-xs text-gray-500 mt-2">
                        * 매년 반복 선택 시 음력/양력 기준에 따라 매년 자동으로 갱신됩니다.
                    </p>

                    <div className="flex gap-3 mt-6">
                        {existingEvent && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (confirm('정말로 삭제하시겠습니까?')) {
                                        onDelete(existingEvent.id);
                                    }
                                }}
                                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            >
                                삭제
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-all disabled:opacity-50"
                        >
                            {loading ? '저장 중...' : (existingEvent ? '수정' : '저장')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
