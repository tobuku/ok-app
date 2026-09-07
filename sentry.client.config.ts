import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://74c2fa24d28931910d0bb527ef946c19@o4512043175313408.ingest.us.sentry.io/4512043189796864",
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  enabled: process.env.NODE_ENV === "production",
});
