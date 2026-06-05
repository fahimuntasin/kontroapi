'use client';

export function SignOutButton() {
  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <button
      onClick={handleSignOut}
      className="text-[12px] text-muted-foreground hover:text-foreground transition-colors duration-200"
    >
      Sign out
    </button>
  );
}
