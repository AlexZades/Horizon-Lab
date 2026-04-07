"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/navbar";
import ServicePanel from "@/components/service-panel";
import type { Service, Server, Settings } from "@/lib/database";

const Globe = dynamic(() => import("@/components/globe"), { ssr: false });

export default function Home() {
  const [services, setServices] = useState<Service[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [settings, setSettings] = useState<Settings>({
    siteName: "HomeLab",
    deviceLat: null,
    deviceLng: null,
  });
  const [isChecking, setIsChecking] = useState(false);

  const fetchData = useCallback(async () => {
    const [svcRes, srvRes, setRes] = await Promise.all([
      fetch("/api/services"),
      fetch("/api/servers"),
      fetch("/api/settings"),
    ]);
    setServices(await svcRes.json());
    setServers(await srvRes.json());
    setSettings(await setRes.json());
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Periodic health check every 60 seconds
  useEffect(() => {
    async function check() {
      setIsChecking(true);
      try {
        await fetch("/api/health-check", { method: "POST" });
        const res = await fetch("/api/services");
        setServices(await res.json());
      } catch {
        // silently fail
      }
      setIsChecking(false);
    }

    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  async function handleRefresh() {
    setIsChecking(true);
    try {
      await fetch("/api/health-check", { method: "POST" });
      const res = await fetch("/api/services");
      setServices(await res.json());
    } catch {
      // silently fail
    }
    setIsChecking(false);
  }

  const onlineCount = services.filter((s) => s.status === "online").length;

  const globePoints = [
    ...servers.map((s) => ({
      lat: s.lat,
      lng: s.lng,
      type: "server" as const,
      label: s.name,
    })),
    ...(settings.deviceLat != null && settings.deviceLng != null
      ? [{ lat: settings.deviceLat, lng: settings.deviceLng, type: "device" as const, label: "You" }]
      : []),
  ];

  return (
    <div className="flex h-screen flex-col bg-black">
      <Navbar
        siteName={settings.siteName}
        totalServices={services.length}
        onlineServices={onlineCount}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Globe Section */}
        <div className="relative flex-1 overflow-hidden">
          <Globe points={globePoints} className="h-full w-full" />

          {/* Legend overlay */}
          <div className="absolute bottom-4 left-4 flex flex-col gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-2 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#BAE1FF] shadow-[0_0_6px_#BAE1FF]" />
              <span className="text-[10px] text-muted-foreground">Server</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#BAFFC9] shadow-[0_0_6px_#BAFFC9]" />
              <span className="text-[10px] text-muted-foreground">Your Device</span>
            </div>
          </div>
        </div>

        {/* Services Panel */}
        <div className="w-80 shrink-0 border-l border-white/10 bg-black/40 backdrop-blur-xl lg:w-96">
          <ServicePanel
            services={services}
            onRefresh={handleRefresh}
            isChecking={isChecking}
          />
        </div>
      </div>
    </div>
  );
}
