'use client';

import { useEffect, useState } from 'react';
import { userAPI } from '@/lib/api';
import { FiX, FiStar, FiAward, FiMapPin } from 'react-icons/fi';

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  sport?: string;
  trustScore?: number;
  ratingCount?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface UserProfileModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({
  userId,
  isOpen,
  onClose,
}: UserProfileModalProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadUser();
    }
  }, [isOpen, userId]);

  const loadUser = async () => {
    setLoading(true);
    try {
      const response = await userAPI.getOne(userId);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const sports = user?.sport
    ? (() => {
        try {
          const parsed = JSON.parse(user.sport);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })()
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative rounded-t-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 pb-16">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition-all hover:bg-white/30 hover:scale-110"
          >
            <FiX className="h-5 w-5" />
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white"></div>
            </div>
          ) : user ? (
            <div className="text-center">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="mx-auto h-24 w-24 rounded-full border-4 border-white shadow-xl object-cover"
                />
              ) : (
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-white/20 text-3xl font-bold text-white shadow-xl">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <h2 className="mt-4 text-2xl font-bold text-white">{user.name}</h2>
            </div>
          ) : (
            <div className="py-12 text-center text-white">
              <p>Không tìm thấy thông tin người dùng</p>
            </div>
          )}
        </div>

        {/* Content */}
        {user && !loading && (
          <div className="p-6 space-y-4">
            {/* Trust Score & Rating */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 p-4 border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <FiStar className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm font-semibold text-yellow-800">
                    Trust Score
                  </span>
                </div>
                <p className="text-2xl font-bold text-yellow-700">
                  {/* {user.trustScore || 0} */}
                  {Number(user.trustScore ?? 0).toFixed(2)}
                  <span className="text-sm font-normal text-yellow-600">/100</span>
                </p>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <FiAward className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-800">
                    Đánh giá
                  </span>
                </div>
                <p className="text-2xl font-bold text-blue-700">
                  {user.ratingCount || 0}
                </p>
              </div>
            </div>

            {/* Sports */}
            {sports.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-700">
                  Môn thể thao yêu thích
                </h3>
                <div className="flex flex-wrap gap-2">
                  {sports.map((sport, index) => (
                    <span
                      key={index}
                      className="rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200"
                    >
                      {sport}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            {user.location && (
              <div className="rounded-xl bg-gray-50 p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <FiMapPin className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-700">
                    Vị trí
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {user.location.latitude.toFixed(4)},{' '}
                  {user.location.longitude.toFixed(4)}
                </p>
              </div>
            )}

            {/* Email */}
            <div className="rounded-xl bg-gray-50 p-4 border border-gray-200">
              <span className="text-xs font-semibold text-gray-500 uppercase">
                Email
              </span>
              <p className="mt-1 text-sm text-gray-700">{user.email}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-105 active:scale-95"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

