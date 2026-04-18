import { useState, useCallback, useEffect } from "react";
import { en } from "./en";
import { de } from "./de";

const translations = { en, de };

function interpolate(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`);
}

export function useI18n() {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem("nanki-lang") || "en";
    } catch {
      return "en";
    }
  });

  const t = useCallback(
    (key, values = {}) => {
      const dict = translations[lang] || translations.en;
      const template = dict[key];
      if (!template) {
        // Fallback to English
        const fallback = translations.en[key];
        if (!fallback) return key;
        return interpolate(fallback, values);
      }
      return interpolate(template, values);
    },
    [lang],
  );

  const setLanguage = useCallback((newLang) => {
    setLang(newLang);
    try {
      localStorage.setItem("nanki-lang", newLang);
    } catch {
      // ignore
    }
  }, []);

  return { t, lang, setLanguage };
}

// Default export for convenience
export function createT(lang) {
  return function t(key, values = {}) {
    const dict = translations[lang] || translations.en;
    const template = dict[key];
    if (!template) {
      const fallback = translations.en[key];
      if (!fallback) return key;
      return interpolate(fallback, values);
    }
    return interpolate(template, values);
  };
}
