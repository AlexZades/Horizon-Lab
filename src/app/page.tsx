"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import Navbar from '@/components/navbar';
import ServicePanel from '@/components/service-panel';
import TimeWidgets from '@/components/time-widgets';
import type { Service, Server, Settings } from '@/lib/database';

const Globe = dynamic(() => import('@/components/globe'), { ssr: false });

type GlobePoint = {
  id: string;
  lat: number;
  lng: number;
  type: 'server' | 'device';
  label: string;
  status?: 'online' | 'offline' | 'unknown';
  isHost?: boolean;
  activeServices?: string[];
  offlineServices?: string[];
  dotColorOnline?: string;
  dotColorOffline?: string;
  dotSizeMultiplier?: number;
};

type TrafficConnection = {
  id: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  kind: 'server' | 'client';
};

const defaultSettings: Settings = {
  siteName: 'HomeLab',
  titleIconPath: null,
  deviceLat: 0,
  deviceLng: 0,
  dashboardHostServerId: null,
  widgetVisibility: { time: true, weekday: true, globeLegend: true },
  dotSize: 'medium',
  dotColorOnline: '#9bd2ff',
  dotColorOffline: '#5a0f16',
  theme: 'dark',
};

export default function Home() {
  const [services, setServices] = useState<Service[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isChecking, setIsChecking] = useState(false);
  const { setTheme } = useTheme();

  const fetchData = useCallback(async () => {
    const [servicesResponse, serversResponse, settingsResponse] = await Promise.all([
      fetch('/api/services', { cache: 'no-store' }),
      fetch('/api/servers', { cache: 'no-store' }),
      fetch('/api/settings', { cache: 'no-store' }),
    ]);

    const [servicesData, serversData, settingsData] = await Promise.all([
      servicesResponse.json() as Promise<Service[]>,
      serversResponse.json() as Promise<Server[]>,
      settingsResponse.json() as Promise<Settings>,
    ]);

    setServices(servicesData);
    setServers(serversData);
    setSettings(settingsData);
  }, []);

  const runHealthCheck = useCallback(async () => {
    setIsChecking(true);

    try {
      await fetch('/api/health-check', { method: 'POST' });
      await fetchData();
    } finally {
      setIsChecking(false);
    }
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    runHealthCheck();
    const interval = setInterval(runHealthCheck, 60000);
    return () => clearInterval(interval);
  }, [runHealthCheck]);

  // Sync theme from settings to next-themes
  useEffect(() => {
    setTheme(settings.theme);
  }, [settings.theme, setTheme]);

  const onlineServices = useMemo(
    () => services.filter((service) => service.status === 'online').length,
    [services]
  );

  const servicesByServerId = useMemo(() => {
    const map = new Map<string, Service[]>();

    for (const service of services) {
      if (!service.serverId) continue;
      const existing = map.get(service.serverId) ?? [];
      existing.push(service);
      map.set(service.serverId, existing);
    }

    return map;
  }, [services]);

  const hostServer = useMemo(
    () => servers.find((server) => server.id === settings.dashboardHostServerId) ?? null,
    [servers, settings.dashboardHostServerId]
  );

  const dotSizeMultiplier = settings.dotSize === 'small' ? 0.7 : settings.dotSize === 'large' ? 1.4 : 1;

  const globePoints = useMemo<GlobePoint[]>(() => {
    const serverPoints = servers.map((server) => {
      const serverServices = servicesByServerId.get(server.id) ?? [];
      return {
        id: server.id,
        lat: server.lat,
        lng: server.lng,
        type: 'server' as const,
        label: server.name,
        status: server.status,
        isHost: server.id === settings.dashboardHostServerId,
        activeServices: serverServices
          .filter((service) => service.status === 'online')
          .map((service) => service.name),
        offlineServices: serverServices
          .filter((service) => service.status !== 'online')
          .map((service) => service.name),
        dotColorOnline: settings.dotColorOnline,
        dotColorOffline: settings.dotColorOffline,
        dotSizeMultiplier,
      };
    });

    const devicePoint =
      settings.deviceLat != null && settings.deviceLng != null
        ? [
            {
              id: 'client-device',
              lat: settings.deviceLat,
              lng: settings.deviceLng,
              type: 'device' as const,
              label: 'Client device',
              dotSizeMultiplier,
            },
          ]
        : [];

    return [...serverPoints, ...devicePoint];
  }, [servers, settings.dashboardHostServerId, settings.deviceLat, settings.deviceLng, servicesByServerId, settings.dotColorOnline, settings.dotColorOffline, dotSizeMultiplier]);

  const trafficConnections = useMemo<TrafficConnection[]>(() => {
    const onlineServers = servers.filter((server) => server.status === 'online');
    const connections: TrafficConnection[] = [];

    for (let index = 0; index < onlineServers.length; index += 1) {
      const current = onlineServers[index];
      for (let otherIndex = index + 1; otherIndex < onlineServers.length; otherIndex += 1) {
        const target = onlineServers[otherIndex];
        connections.push({
          id: `${current.id}-${target.id}`,
          from: { lat: current.lat, lng: current.lng },
          to: { lat: target.lat, lng: target.lng },
          kind: 'server',
        });
      }
    }

    if (
      hostServer &&
      hostServer.status === 'online' &&
      settings.deviceLat != null &&
      settings.deviceLng != null
    ) {
      connections.push({
        id: `${hostServer.id}-client-device`,
        from: { lat: hostServer.lat, lng: hostServer.lng },
        to: { lat: settings.deviceLat, lng: settings.deviceLng },
        kind: 'client',
      });
    }

    return connections;
  }, [hostServer, servers, settings.deviceLat, settings.deviceLng]);

  const showTime = settings.widgetVisibility?.time !== false;
  const showWeekday = settings.widgetVisibility?.weekday !== false;
  const showLegend = settings.widgetVisibility?.globeLegend !== false;

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-slate-50 dark:bg-black animate-page-open">
      <Navbar
        siteName={settings.siteName}
        titleIconPath={settings.titleIconPath}
        totalServices={services.length}
        onlineServices={onlineServices}
      />

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <div className="relative min-h-[50vh] flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_28%),linear-gradient(180deg,_rgba(241,245,249,1),_rgba(226,232,240,1))] dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.16),_transparent_22%),linear-gradient(180deg,_rgba(4,8,20,1),_rgba(0,0,0,1))] md:min-h-0">
          {(showTime || showWeekday) && (
            <TimeWidgets showTime={showTime} showWeekday={showWeekday} />
          )}
          <Globe points={globePoints} connections={trafficConnections} className="h-full w-full" />

          {showLegend && (
            <div className="absolute bottom-4 left-4 z-20 rounded-xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-black/60 px-4 py-3 backdrop-blur-xl">
              <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                Globe legend
              </div>
              <div className="space-y-2 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: settings.dotColorOnline, boxShadow: `0 0 10px ${settings.dotColorOnline}` }}
                  />
                  <span>Online server</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: settings.dotColorOffline, boxShadow: `0 0 10px ${settings.dotColorOffline}` }}
                  />
                  <span>Offline server</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#b794f4] shadow-[0_0_10px_rgba(183,148,244,0.85)]" />
                  <span>Host server</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#86efac] shadow-[0_0_10px_rgba(134,239,172,0.85)]" />
                  <span>Client device</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-[45vh] shrink-0 border-t border-slate-200 bg-white/80 backdrop-blur-2xl dark:border-white/10 dark:bg-black/45 md:h-auto md:w-[380px] md:border-l md:border-t-0 xl:w-[420px]">
          <ServicePanel
            services={services}
            servers={servers}
            settings={settings}
            onRefresh={fetchData}
            onCheck={runHealthCheck}
            isChecking={isChecking}
          />
        </div>
      </div>
    </div>
  );
}
