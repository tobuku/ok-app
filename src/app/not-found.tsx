import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 px-6">
        <h1 className="text-6xl font-bold text-foreground">404</h1>
        <p className="text-lg text-muted-foreground">Page not found</p>
        <Link
          href="/login"
          className="inline-block mt-4 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}
