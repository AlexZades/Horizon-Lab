"use client";

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function UnlockPage() {
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleUnlock() {
    if (!password || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error('Incorrect password');
      }

      // Full page navigation to ensure the browser sends the new auth cookie
      window.location.href = '/';
    } catch {
      toast.error('Incorrect password');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.28),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.22),_transparent_26%),linear-gradient(180deg,_#050816,_#000000)]" />
      <div className="unlock-orb unlock-orb-one" />
      <div className="unlock-orb unlock-orb-two" />
      <div className="unlock-ring unlock-ring-one" />
      <div className="unlock-ring unlock-ring-two" />

      <div className="relative z-10 flex items-center gap-2">
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void handleUnlock();
            }
          }}
          className="w-64 border-white/10 bg-white/5 text-white placeholder:text-muted-foreground"
          placeholder="Password"
          autoFocus
        />
        <Button
          onClick={() => void handleUnlock()}
          disabled={isSubmitting || !password}
          size="icon"
          className="h-9 w-9 shrink-0"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
