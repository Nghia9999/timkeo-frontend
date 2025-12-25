'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface OnboardingContextType {
  isCompleted: boolean;
  completeOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined,
);

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCompleted, setIsCompleted] = useState(true);

  useEffect(() => {
    // Kiểm tra xem user đã hoàn thành onboarding chưa
    const completed = localStorage.getItem('onboarding_completed');
    setIsCompleted(completed === 'true');
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem('onboarding_completed', 'true');
    setIsCompleted(true);
  };

  return (
    <OnboardingContext.Provider value={{ isCompleted, completeOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}

