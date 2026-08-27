import type { DriveStep } from "driver.js";

export const appTourSteps: DriveStep[] = [
  {
    element: 'a[href="/app"]',
    popover: {
      title: "Your Job Board",
      description: "View and manage all active jobs.",
      side: "right",
    },
  },
  {
    element: 'a[href="/app/calendar"]',
    popover: {
      title: "Calendar",
      description: "Calendar view of scheduled jobs.",
      side: "right",
    },
  },
  {
    element: 'a[href="/app/customers"]',
    popover: {
      title: "Customers",
      description: "Your customer database.",
      side: "right",
    },
  },
  {
    element: 'a[href="/app/map"]',
    popover: {
      title: "Dispatch Map",
      description: "Map with route optimization.",
      side: "right",
    },
  },
  {
    element: 'a[href="/app/reports"]',
    popover: {
      title: "Reports",
      description: "Revenue, quotes, and performance reports.",
      side: "right",
    },
  },
  {
    element: "[data-search-trigger]",
    popover: {
      title: "Quick Search",
      description: "Press Ctrl+K to search jobs and customers.",
      side: "bottom",
    },
  },
  {
    element: "[data-new-job]",
    popover: {
      title: "New Job",
      description: "Create a new job from here.",
      side: "bottom",
    },
  },
];

export const mobileTourSteps: DriveStep[] = [
  {
    element: "[data-tour-job-list]",
    popover: {
      title: "Today's Jobs",
      description: "Your assigned jobs for today.",
      side: "bottom",
    },
  },
  {
    element: "[data-tour-job-card]",
    popover: {
      title: "Job Card",
      description: "Tap a job to view details, take photos, build quotes.",
      side: "bottom",
    },
  },
  {
    element: "nav.fixed",
    popover: {
      title: "Navigation",
      description: "Switch between Today's jobs and your Profile.",
      side: "top",
    },
  },
];

export const platformTourSteps: DriveStep[] = [
  {
    element: 'a[href="/platform"]',
    popover: {
      title: "Metrics",
      description: "Platform-wide KPIs and MRR.",
      side: "right",
    },
  },
  {
    element: 'a[href="/platform/orgs"]',
    popover: {
      title: "Organizations",
      description: "Manage tenant organizations.",
      side: "right",
    },
  },
  {
    element: 'a[href="/platform/plans"]',
    popover: {
      title: "Plans",
      description: "Configure subscription plans.",
      side: "right",
    },
  },
];
