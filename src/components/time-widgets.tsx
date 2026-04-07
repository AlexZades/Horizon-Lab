"use client";

import { useEffect, useMemo, useState } from 'react';
import { Clock3, CalendarDays } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface TimeGovResponse {
  epochMs: number;
  source: string;
}

export default function TimeWidgets() {
  const [epochMs, setEpochMs] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function syncTime() {
      try {
        const response = await fetch('/api/time-gov', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to sync time');
        }

        const data = (await response.json()) as TimeGovResponse;
        if (mounted) {
          setEpochMs(data.epochMs);
          setError(false);
        }
      } catch {
        if (mounted) {
          setError(true);
        }
      }
    }

    syncTime();
    const syncInterval = setInterval(syncTime, 60000);
    const tickInterval = setInterval(() => {
      setEpochMs((current) => (current == null ? current : current + 1000));
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(syncInterval);
      clearInterval(tickInterval);
    };
  }, []);

  const timeLabel = useMemo(() => {
    if (epochMs == null) return '--:--:--';
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(epochMs));
  }, [epochMs]);

  const weekdayLabel = useMemo(() => {
    if (epochMs == null) return 'Waiting for sync';
    return new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(new Date(epochMs));
  }, [epochMs]);

  return (
    <div className="absolute right-4 top-4 z-20 flex w-[220px] flex-col gap-3">
      <Card className="border-white/10 bg-black/55 shadow-[0_0_40px_rgba(91,33,182,0.18)] backdrop-blur-xl">
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-cyan-200/70">
            <Clock3 className="h-3.5 w-3.5" />
            time.gov sync
          </div>
          <div className="text-2xl font-semibold tracking-[0.12em] text-white">
            {timeLabel}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {error ? 'Unable to refresh from time.gov right now.' : 'Time Synced to atomic clock server'}
          </p>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-black/55 shadow-[0_0_40px_rgba(34,197,94,0.12)] backdrop-blur-xl">
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-emerald-200/70">
            <CalendarDays className="h-3.5 w-3.5" />
            weekday
          </div>
          <div className="text-xl font-semibold text-white">{weekdayLabel}</div>
          <p className="mt-1 text-xs text-muted-foreground">Derived from the synced clock feed.</p>
        </CardContent>
      </Card>
    </div>
  );
}
