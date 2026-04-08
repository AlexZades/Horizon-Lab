"use client";

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function UnlockPage() {
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  async function handleUnlock() {
    if (!password || isSubmitting || isExiting) return;
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

      // Trigger exit animation, then navigate
      setIsExiting(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 700);
    } catch {
      toast.error('Incorrect password');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 animate-unlock-scene-in">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.28),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.22),_transparent_26%),linear-gradient(180deg,_#050816,_#000000)]" />

      {/* Orbs — entrance + exit burst */}
      <div
        className={`unlock-orb unlock-orb-one ${isExiting ? 'animate-unlock-exit-orbs-burst' : 'animate-unlock-orbs-in'}`}
      />
      <div
        className={`unlock-orb unlock-orb-two ${isExiting ? 'animate-unlock-exit-orbs-burst' : 'animate-unlock-orbs-in'}`}
        style={!isExiting ? { animationDelay: '350ms' } : undefined}
      />

      {/* Rings — entrance */}
      <div
        className={`unlock-ring unlock-ring-one ${isExiting ? 'animate-unlock-exit-orbs-burst' : 'animate-unlock-rings-in'}`}
      />
      <div
        className={`unlock-ring unlock-ring-two ${isExiting ? 'animate-unlock-exit-orbs-burst' : 'animate-unlock-rings-in'}`}
        style={!isExiting ? { animationDelay: '200ms' } : undefined}
      />

      {/* Exit flash overlay */}
      {isExiting && (
        <div className="fixed inset-0 z-[200] bg-white animate-unlock-exit-flash" />
      )}

      {/* Input — materialize in / collapse out */}
      <div
        className={`relative z-10 flex items-center gap-2 ${
          isExiting ? 'animate-unlock-exit-collapse' : 'animate-unlock-input-materialize'
        }`}
      >
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
          disabled={isExiting}
        />
        <Button
          onClick={() => void handleUnlock()}
          disabled={isSubmitting || !password || isExiting}
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
