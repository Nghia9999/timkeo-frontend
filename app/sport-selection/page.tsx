'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { userAPI } from '@/lib/api';
import { useOnboarding } from '@/contexts/OnboardingContext';

const sports = [
  { id: 'football', name: 'Bóng đá', icon: '⚽' },
  { id: 'basketball', name: 'Bóng rổ', icon: '🏀' },
  { id: 'tennis', name: 'Tennis', icon: '🎾' },
  { id: 'badminton', name: 'Cầu lông', icon: '🏸' },
  { id: 'volleyball', name: 'Bóng chuyền', icon: '🏐' },
  { id: 'table-tennis', name: 'Bóng bàn', icon: '🏓' },
  { id: 'swimming', name: 'Bơi lội', icon: '🏊' },
  { id: 'running', name: 'Chạy bộ', icon: '🏃' },
  { id: 'cycling', name: 'Đạp xe', icon: '🚴' },
  { id: 'gym', name: 'Gym', icon: '💪' },
];

export default function SportSelectionPage() {
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, updateUser, refreshUser } = useAuth();
  const { completeOnboarding } = useOnboarding();

  const toggleSport = (sportId: string) => {
    setSelectedSports((prev) =>
      prev.includes(sportId)
        ? prev.filter((id) => id !== sportId)
        : [...prev, sportId],
    );
  };

  const handleContinue = async () => {
    if (selectedSports.length === 0) {
      alert('Vui lòng chọn ít nhất một môn thể thao');
      return;
    }

    setLoading(true);
    try {
      if (user?.id) {
        // Lưu sports dưới dạng JSON string (có thể cập nhật backend sau để hỗ trợ array)
        const sportsString = JSON.stringify(selectedSports);
        await userAPI.update(user.id, { sport: sportsString });
        await refreshUser();
      }
      completeOnboarding();
      router.push('/feed');
    } catch (error) {
      console.error('Failed to save sports:', error);
      alert('Có lỗi xảy ra khi lưu môn thể thao');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-800">
            Chọn môn thể thao yêu thích
          </h1>
          <p className="text-gray-600">
            Bạn có thể chọn nhiều môn thể thao và chỉnh sửa sau trong hồ sơ
          </p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {sports.map((sport) => (
            <button
              key={sport.id}
              onClick={() => toggleSport(sport.id)}
              className={`flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all ${
                selectedSports.includes(sport.id)
                  ? 'border-blue-600 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className="mb-2 text-4xl">{sport.icon}</span>
              <span
                className={`text-sm font-medium ${
                  selectedSports.includes(sport.id)
                    ? 'text-blue-600'
                    : 'text-gray-700'
                }`}
              >
                {sport.name}
              </span>
            </button>
          ))}
        </div>

        <div className="text-center">
          <p className="mb-4 text-sm text-gray-600">
            Đã chọn: {selectedSports.length} môn thể thao
          </p>
          <button
            onClick={handleContinue}
            disabled={loading || selectedSports.length === 0}
            className="w-full rounded-full bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang lưu...' : 'Tiếp tục'}
          </button>
        </div>
      </div>
    </div>
  );
}

