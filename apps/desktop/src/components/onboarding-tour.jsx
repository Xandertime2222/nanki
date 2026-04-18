import React, { useState, useCallback, useMemo, createContext, useContext } from 'react';

const STORAGE_KEY = 'nanki.onboarding.done';

const steps = [
  {
    title: 'Welcome to Nanki!',
    description: 'Nanki helps you create and manage study notes and flashcards.',
    placement: 'center',
  },
  {
    title: 'Create your first note',
    description: "Click this button to create a new note.",
    placement: 'bottom',
    target: '[data-onboarding-target="new-note"]',
  },
  {
    title: 'Add flashcards',
    description: "Select text and click 'Basic' or 'Cloze' to create flashcards.",
    placement: 'bottom',
    target: '[data-onboarding-target="add-card"]',
  },
  {
    title: 'Analyze coverage',
    description: "Use the Analysis view to check your learning progress.",
    placement: 'bottom',
    target: '[data-onboarding-target="analysis"]',
  },
  {
    title: 'Sync to Anki',
    description: "Connect to Anki via AnkiConnect to sync your cards.",
    placement: 'bottom',
    target: '[data-onboarding-target="sync"]',
  },
];

const OnboardingContext = createContext(null);

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    const [showTourState, setShowTourState] = useState(false);
    return {
      showTour: showTourState,
      seenOnboarding: localStorage.getItem(STORAGE_KEY) === 'true',
      setShowTour: setShowTourState,
      markOnboardingDone: () => {
        localStorage.setItem(STORAGE_KEY, 'true');
        setShowTourState(false);
      },
    };
  }
  return ctx;
}

function TourStep({ step, index, total, onBack, onNext, onFinish, onSkip }) {
  const isLast = index === total - 1;
  const isFirst = index === 0;

  return (
    <div className="relative z-[100] max-w-sm rounded-lg bg-white p-6 shadow-2xl dark:bg-gray-800">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
          {index + 1}
        </span>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{step.title}</h3>
      </div>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">{step.description}</p>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-gray-400 underline hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="Skip onboarding tour"
        >
          Skip
        </button>
        <div className="flex items-center gap-2">
          {!isFirst && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Back
            </button>
          )}
          {!isLast && (
            <button
              type="button"
              onClick={onNext}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Next
            </button>
          )}
          {isLast && (
            <button
              type="button"
              onClick={onFinish}
              className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
            >
              Finish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Spotlight({ placement, containerRect }) {
  if (placement === 'center') return null;

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background: 'rgba(0, 0, 0, 0.55)',
        mask: `linear-gradient(#000 0 0) content-box exclude, radial-gradient(circle 80px at 50% 30%, transparent 79px, #000 80px)`,
        WebkitMask: `linear-gradient(#000 0 0) content-box exclude, radial-gradient(circle 100px at 50% 30%, transparent 99px, #000 100px)`,
      }}
    />
  );
}

export function OnboardingTourProvider({ children }) {
  const [showTourState, setShowTourState] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const seenOnboarding = useMemo(
    () => localStorage.getItem(STORAGE_KEY) === 'true',
    [],
  );

  const showTour = useCallback(() => {
    setCurrentStep(0);
    setShowTourState(true);
  }, []);

  const markOnboardingDone = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShowTourState(false);
  }, []);

  const handleNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  }, []);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleFinish = useCallback(() => {
    markOnboardingDone();
  }, [markOnboardingDone]);

  const handleSkip = useCallback(() => {
    markOnboardingDone();
  }, [markOnboardingDone]);

  const ctx = useMemo(
    () => ({
      showTour: showTourState,
      seenOnboarding,
      setShowTour: showTour,
      markOnboardingDone,
    }),
    [showTourState, seenOnboarding, showTour, markOnboardingDone],
  );

  const currentTourStep = steps[currentStep];

  return (
    <OnboardingContext.Provider value={ctx}>
      {children}

      {showTourState && currentTourStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <Spotlight placement={currentTourStep.placement} />
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleSkip}
          />
          <div className="relative z-10">
            <TourStep
              step={currentTourStep}
              index={currentStep}
              total={steps.length}
              onBack={handleBack}
              onNext={handleNext}
              onFinish={handleFinish}
              onSkip={handleSkip}
            />
          </div>
        </div>
      )}
    </OnboardingContext.Provider>
  );
}

export default OnboardingTourProvider;
