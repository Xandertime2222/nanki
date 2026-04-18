const STORAGE_KEY = 'nanki.onboarding.done';

/**
 * Hook to manage onboarding state.
 * @returns {{ showOnboarding: boolean, markOnboardingDone: () => void }}
 */
export function useOnboarding() {
  const showOnboarding = typeof localStorage !== 'undefined'
    ? localStorage.getItem(STORAGE_KEY) !== 'true'
    : true;

  const markOnboardingDone = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
  };

  return { showOnboarding, markOnboardingDone };
}
