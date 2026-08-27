"use client";

import { useEffect, useCallback } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import type { DriveStep } from "driver.js";

interface OnboardingTourProps {
  tourId: "app" | "mobile" | "platform";
  steps: DriveStep[];
}

export function OnboardingTour({ tourId, steps }: OnboardingTourProps) {
  const storageKey = `tour_completed_${tourId}`;

  const startTour = useCallback(() => {
    const d = driver({
      showProgress: true,
      steps,
      onDestroyStarted: () => {
        localStorage.setItem(storageKey, "1");
        d.destroy();
      },
    });
    d.drive();
  }, [steps, storageKey]);

  useEffect(() => {
    // Auto-start on first visit
    if (!localStorage.getItem(storageKey)) {
      const timeout = setTimeout(startTour, 500);
      return () => clearTimeout(timeout);
    }
  }, [storageKey, startTour]);

  useEffect(() => {
    // Listen for manual re-trigger
    const handler = () => startTour();
    window.addEventListener("start-tour", handler);
    return () => window.removeEventListener("start-tour", handler);
  }, [startTour]);

  return null;
}
