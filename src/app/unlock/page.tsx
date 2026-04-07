"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function UnlockPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleUnlock() {
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

      router.push('/');
      router.refresh();
    } catch {
      toast.error('Incorrect password');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.28),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.22),_transparent_26%),linear-gradient(180deg,_#050816,_#000000)]" />
      <div className="unlock-orb unlock-orb-one" />
      <div className="unlock-orb unlock-orb-two" />
      <div className="unlock-ring unlock-ring-one" />
      <div className="unlock-ring unlock-ring-two" />

      <Card className="relative z-10 w-full max-w-md border-white/10 bg-black/55 shadow-[0_0_80px_rgba(76,29,149,0.28)] backdrop-blur-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.22)]">
            <Shield className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl text-white">Dashboard Locked</CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter the dashboard password to access your home lab overview.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dashboard-password">Password</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="dashboard-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !isSubmitting) {
                    handleUnlock();
                  }
                }}
                className="border-white/10 bg-white/5 pl-9"
                placeholder="Enter dashboard password"
              />
            </div>
          </div>
          <Button onClick={handleUnlock} disabled={isSubmitting || !password} className="w-full gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            Unlock Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
