'use client';
import { useState } from 'react';
export default function ConfirmMobileLogin() {
  const [message, setMessage] = useState('Only confirm if you requested a sign-in email from the Lifting Log app.'), [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  async function confirm() {
    setBusy(true);
    try {
      const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
      const response = await fetch('/api/mobile/v1/magic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'confirm', token }) });
      const reply = await response.json();
      if (!response.ok) throw new Error(reply.error);
      window.history.replaceState(null, '', '/login/mobile');
      setDone(true); setMessage('Confirmed. Return to the app to finish signing in.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to confirm. Try again.'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto mt-16 max-w-sm space-y-6"><h1 className="text-xl font-bold">Sign in to the mobile app</h1><p role="status">{message}</p>{!done && <button className="rounded bg-accent px-4 py-3 text-accent-foreground" disabled={busy} onClick={() => void confirm()}>{busy ? 'Confirming…' : 'Confirm app sign-in'}</button>}</main>;
}
