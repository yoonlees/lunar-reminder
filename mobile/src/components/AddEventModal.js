import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

export default function AddEventModal({ isOpen, onClose, onSave, onDelete, selectedDate, existingEvent }) {
  const [title, setTitle] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [isLunar, setIsLunar] = useState(true);
  const [enableAlert, setEnableAlert] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (existingEvent) {
        setTitle(existingEvent.title);
        setIsRecurring(existingEvent.recurrence === 'yearly');
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

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('오류', '내용을 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const result = await onSave({
        id: existingEvent?.id,
        title: title.trim(),
        recurrence: isRecurring ? 'yearly' : 'none',
        isLunar,
        notification_enabled: enableAlert,
        solar_date: selectedDate,
      });
      if (!result?.success) throw new Error(result?.error || '저장 실패');
      onClose();
    } catch (err) {
      Alert.alert('오류', `저장 실패: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('삭제', '정말로 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => onDelete(existingEvent.id) },
    ]);
  };

  return (
    <Modal visible={isOpen} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.heading}>
            {existingEvent ? `일정 수정` : `일정 추가`}
          </Text>
          <Text style={styles.dateLabel}>{selectedDate}</Text>

          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="일정 내용 (예: 아내 생일)"
            placeholderTextColor="#bbb"
            autoFocus
            returnKeyType="done"
          />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>매년 반복</Text>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: '#ddd', true: '#3b82f6' }}
              thumbColor="#fff"
            />
          </View>

          {isRecurring && (
            <View style={styles.radioRow}>
              <TouchableOpacity onPress={() => setIsLunar(true)} style={styles.radioOpt}>
                <View style={[styles.radio, isLunar && styles.radioOn]} />
                <Text style={styles.radioLabel}>음력 (Lunar)</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsLunar(false)} style={styles.radioOpt}>
                <View style={[styles.radio, !isLunar && styles.radioOn]} />
                <Text style={styles.radioLabel}>양력 (Solar)</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.rowLabel}>알림 받기</Text>
            <Switch
              value={enableAlert}
              onValueChange={setEnableAlert}
              trackColor={{ false: '#ddd', true: '#3b82f6' }}
              thumbColor="#fff"
            />
          </View>

          <Text style={styles.hint}>* 매년 반복 시 음력/양력 기준으로 매년 자동 갱신됩니다.</Text>

          <View style={styles.btnRow}>
            {existingEvent && (
              <TouchableOpacity onPress={handleDelete} style={styles.delBtn}>
                <Text style={styles.delBtnText}>삭제</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              style={[styles.saveBtn, loading && { opacity: 0.5 }]}
            >
              <Text style={styles.saveBtnText}>
                {loading ? '저장 중...' : existingEvent ? '수정' : '저장'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 48,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 2,
  },
  dateLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  radioRow: {
    flexDirection: 'row',
    gap: 20,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  radioOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#3b82f6',
    backgroundColor: '#fff',
  },
  radioOn: {
    backgroundColor: '#3b82f6',
  },
  radioLabel: {
    fontSize: 14,
    color: '#333',
  },
  hint: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 4,
    marginBottom: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  delBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    justifyContent: 'center',
  },
  delBtnText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#555',
    fontWeight: '600',
    fontSize: 15,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
