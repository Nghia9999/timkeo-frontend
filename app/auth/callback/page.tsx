'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const { refreshUser } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const userData = searchParams.get('user');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      return;
    }

    if (token) {
      localStorage.setItem('access_token', token);
      // Refresh user data
      refreshUser()
        .then(() => {
          router.push('/feed');
        })
        .catch((err) => {
          console.error('Failed to refresh user:', err);
          setError('Đăng nhập thành công nhưng không thể tải thông tin người dùng');
        });
    } else {
      setError('Không nhận được token từ server');
    }
  }, [searchParams, router, refreshUser]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/feed')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-2xl">⏳</div>
        <p className="text-gray-600">Đang đăng nhập...</p>
      </div>
    </div>
  );
}

