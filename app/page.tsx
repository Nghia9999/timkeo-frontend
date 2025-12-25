'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/contexts/OnboardingContext';

export default function Home() {
  const router = useRouter();
  const { isCompleted } = useOnboarding();

  useEffect(() => {
    if (!isCompleted) {
      router.push('/onboarding');
    } else {
      router.push('/feed');
    }
  }, [isCompleted, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-gray-600">Đang tải...</div>
    </div>
  );
}
