'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { userAPI } from '@/lib/api';
import { FiEdit2, FiLogOut, FiArrowLeft } from 'react-icons/fi';

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

export default function ProfilePage() {
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push('/feed');
      return;
    }
    // Parse sports từ user.sport (có thể là JSON string hoặc string đơn)
    if (user.sport) {
      try {
        const parsed = JSON.parse(user.sport);
        if (Array.isArray(parsed)) {
          setSelectedSports(parsed);
        }
      } catch {
        // Nếu không phải JSON, giữ nguyên
      }
    }
  }, [user, router]);

  const toggleSport = (sportId: string) => {
    if (!editing) return;
    setSelectedSports((prev) =>
      prev.includes(sportId)
        ? prev.filter((id) => id !== sportId)
        : [...prev, sportId],
    );
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const sportsString = JSON.stringify(selectedSports);
      await userAPI.update(user.id, { sport: sportsString });
      await refreshUser();
      setEditing(false);
    } catch (error) {
      console.error('Failed to update sports:', error);
      alert('Có lỗi xảy ra khi cập nhật');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }
  // console.log(user);
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                title="Quay lại"
              >
                <FiArrowLeft className="h-5 w-5 text-gray-700" />
              </button>
              <h1 className="text-xl font-bold text-gray-800">Hồ sơ</h1>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <FiLogOut className="h-5 w-5" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* User Info */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            {user.avatar ? (
              // console.log(user.avatar),
              <img
                src={user.avatar}
                alt={user.name}
                className="h-20 w-20 rounded-full"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800">{user.name}</h2>
              <p className="text-gray-600">{user.email}</p>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <span className="text-gray-600">
                  ⭐ Trust Score: {user.trustScore || 0}/100
                </span>
                <span className="text-gray-600">
                  📊 Đánh giá: {user.ratingCount || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sports */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              Môn thể thao yêu thích
            </h3>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <FiEdit2 className="h-4 w-4" />
                <span>Chỉnh sửa</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    // Reset về giá trị ban đầu
                    if (user.sport) {
                      try {
                        const parsed = JSON.parse(user.sport);
                        if (Array.isArray(parsed)) {
                          setSelectedSports(parsed);
                        }
                      } catch {}
                    }
                  }}
                  className="px-4 py-1 text-gray-600 hover:text-gray-800"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-4 py-1 text-white hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {sports.map((sport) => (
              <button
                key={sport.id}
                onClick={() => toggleSport(sport.id)}
                disabled={!editing}
                className={`flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all ${
                  selectedSports.includes(sport.id)
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white'
                } ${!editing ? 'cursor-default' : 'hover:border-gray-300'}`}
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
        </div>
      </div>
    </div>
  );
}

