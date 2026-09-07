import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.2"],
};

export default withSentryConfig(nextConfig, {
  org: "tobuku",
  project: "junkmint",
  silent: true,
});
