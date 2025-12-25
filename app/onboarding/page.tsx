'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/contexts/OnboardingContext';

const slides = [
  {
    title: 'Chào mừng đến với TimKeo',
    description: 'Nền tảng kết nối người chơi thể thao, tìm đối thủ và tạo đội tuyệt vời',
    icon: '⚽',
  },
  {
    title: 'Tìm đối thủ phù hợp',
    description: 'Kết nối với những người chơi cùng môn thể thao yêu thích của bạn',
    icon: '🤝',
  },
  {
    title: 'Tạo và tham gia trận đấu',
    description: 'Đăng bài tìm đối hoặc tham gia các trận đấu đã có sẵn',
    icon: '🏆',
  },
  {
    title: 'Đánh giá và xây dựng uy tín',
    description: 'Xây dựng trust score thông qua các đánh giá từ người chơi khác',
    icon: '⭐',
  },
];

export default function OnboardingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();
  const { completeOnboarding } = useOnboarding();

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      completeOnboarding();
      router.push('/sport-selection');
    }
  };

  const skip = () => {
    completeOnboarding();
    router.push('/sport-selection');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Skip button */}
        <button
          onClick={skip}
          className="mb-8 ml-auto block text-sm text-gray-600 hover:text-gray-800"
        >
          Bỏ qua
        </button>

        {/* Slides */}
        <div className="relative h-96 overflow-hidden rounded-2xl bg-white shadow-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
              className="flex h-full flex-col items-center justify-center p-8 text-center"
            >
              <div className="mb-6 text-6xl">{slides[currentSlide].icon}</div>
              <h1 className="mb-4 text-2xl font-bold text-gray-800">
                {slides[currentSlide].title}
              </h1>
              <p className="text-gray-600">
                {slides[currentSlide].description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Indicators */}
        <div className="mt-6 flex justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? 'w-8 bg-blue-600'
                  : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Next button */}
        <button
          onClick={nextSlide}
          className="mt-8 w-full rounded-full bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
        >
          {currentSlide === slides.length - 1 ? 'Bắt đầu' : 'Tiếp theo'}
        </button>
      </div>
    </div>
  );
}

