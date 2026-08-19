"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function LogoutButton() {
  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-gray-500 hover:text-gray-900"
    >
      Sign out
    </button>
  );
}
