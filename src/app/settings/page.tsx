"use client";

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MapPin, Plus, Save, ServerCog, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Server, Settings } from '@/lib/database';

const defaultSettings: Settings = {
  siteName: 'HomeLab',
  deviceLat: null,
  deviceLng: null,
  dashboardHostServerId: null,
};

const emptyNewServer = {
  name: '',
  ipAddress: '',
  lat: '',
  lng: '',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [servers, setServers] = useState<Server[]>([]);
  const [newServer, setNewServer] = useState(emptyNewServer);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  async function loadData() {
    const [settingsResponse, serversResponse] = await Promise.all([
      fetch('/api/settings', { cache: 'no-store' }),
      fetch('/api/servers', { cache: 'no-store' }),
    ]);

    setSettings((await settingsResponse.json()) as Settings);
    setServers((await serversResponse.json()) as Server[]);
  }

  useEffect(() => {
    loadData();
  }, []);

  const hostServer = useMemo(
    () => servers.find((server) => server.id === settings.dashboardHostServerId) ?? null,
    [servers, settings.dashboardHostServerId]
  );

  async function saveSettings() {
    setIsSavingSettings(true);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setSettings((await response.json()) as Settings);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function addServer() {
    if (!newServer.name || !newServer.lat || !newServer.lng) {
      toast.error('Name, latitude, and longitude are required');
      return;
    }

    try {
      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newServer.name,
          ipAddress: newServer.ipAddress,
          lat: Number(newServer.lat),
          lng: Number(newServer.lng),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add server');
      }

      setNewServer(emptyNewServer);
      toast.success('Server added');
      await loadData();
    } catch {
      toast.error('Failed to add server');
    }
  }

  async function saveServer(server: Server) {
    try {
      const response = await fetch('/api/servers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(server),
      });

      if (!response.ok) {
        throw new Error('Failed to save server');
      }

      const updatedServer = (await response.json()) as Server;
      setServers((current) => current.map((item) => (item.id === updatedServer.id ? updatedServer : item)));
      toast.success('Server saved');
    } catch {
      toast.error('Failed to save server');
    }
  }

  async function deleteServer(id: string) {
    try {
      const response = await fetch('/api/servers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete server');
      }

      toast.success('Server removed');
      await loadData();
    } catch {
      toast.error('Failed to delete server');
    }
  }

  function detectLocation() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported in this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSettings((current) => ({
          ...current,
          deviceLat: Number(position.coords.latitude.toFixed(4)),
          deviceLng: Number(position.coords.longitude.toFixed(4)),
        }));
        toast.success('Device location detected');
      },
      () => {
        toast.error('Failed to read your device location');
      }
    );
  }

  function updateServerField<K extends keyof Server>(id: string, key: K, value: Server[K]) {
    setServers((current) =>
      current.map((server) => (server.id === id ? { ...server, [key]: value } : server))
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_28%),linear-gradient(180deg,_rgba(5,8,22,1),_rgba(0,0,0,1))] text-white">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 animate-page-open">
        <div className="mb-8 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Dashboard Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure server locations, the dashboard host, and the client device position.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-base">General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="site-name">Site name</Label>
                <Input
                  id="site-name"
                  value={settings.siteName}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, siteName: event.target.value }))
                  }
                  className="border-white/10 bg-white/5"
                />
              </div>

              <div className="space-y-2">
                <Label>Dashboard host server</Label>
                <Select
                  value={settings.dashboardHostServerId ?? 'none'}
                  onValueChange={(value) =>
                    setSettings((current) => ({
                      ...current,
                      dashboardHostServerId: value === 'none' ? null : value,
                    }))
                  }
                >
                  <SelectTrigger className="border-white/10 bg-white/5">
                    <SelectValue placeholder="Select a host server" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-zinc-950 text-white">
                    <SelectItem value="none">No host selected</SelectItem>
                    {servers.map((server) => (
                      <SelectItem key={server.id} value={server.id}>
                        {server.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {hostServer
                    ? `Traffic to the client device will animate from ${hostServer.name}.`
                    : 'Choose which server is hosting this dashboard.'}
                </p>
              </div>

              <Button onClick={saveSettings} disabled={isSavingSettings} className="gap-2">
                <Save className="h-4 w-4" />
                Save settings
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-base">Client device location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="device-lat">Latitude</Label>
                  <Input
                    id="device-lat"
                    type="number"
                    step="any"
                    value={settings.deviceLat ?? ''}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        deviceLat: event.target.value ? Number(event.target.value) : null,
                      }))
                    }
                    className="border-white/10 bg-white/5"
                    placeholder="35.6895"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="device-lng">Longitude</Label>
                  <Input
                    id="device-lng"
                    type="number"
                    step="any"
                    value={settings.deviceLng ?? ''}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        deviceLng: event.target.value ? Number(event.target.value) : null,
                      }))
                    }
                    className="border-white/10 bg-white/5"
                    placeholder="139.6917"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={detectLocation} variant="outline" className="gap-2 border-white/10 bg-white/5">
                  <MapPin className="h-4 w-4" />
                  Detect device location
                </Button>
                <Button onClick={saveSettings} disabled={isSavingSettings} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save location
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 border-white/10 bg-black/40 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ServerCog className="h-4 w-4 text-cyan-300" />
              Servers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {servers.map((server) => {
              const isHost = server.id === settings.dashboardHostServerId;

              return (
                <div key={server.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">{server.name || 'Unnamed server'}</h3>
                        {isHost ? (
                          <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-purple-200">
                            Dashboard host
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Status: {server.status} · Last checked: {server.lastChecked ? new Date(server.lastChecked).toLocaleString() : 'Never'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!isHost ? (
                        <Button
                          variant="outline"
                          className="border-white/10 bg-white/5"
                          onClick={() =>
                            setSettings((current) => ({ ...current, dashboardHostServerId: server.id }))
                          }
                        >
                          Set as host
                        </Button>
                      ) : null}
                      <Button onClick={() => saveServer(server)} className="gap-2">
                        <Save className="h-4 w-4" />
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-muted-foreground hover:text-red-400"
                        onClick={() => deleteServer(server.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor={`name-${server.id}`}>Name</Label>
                      <Input
                        id={`name-${server.id}`}
                        value={server.name}
                        onChange={(event) => updateServerField(server.id, 'name', event.target.value)}
                        className="border-white/10 bg-black/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`ip-${server.id}`}>IP / uptime target</Label>
                      <Input
                        id={`ip-${server.id}`}
                        value={server.ipAddress ?? ''}
                        onChange={(event) => updateServerField(server.id, 'ipAddress', event.target.value || null)}
                        className="border-white/10 bg-black/30"
                        placeholder="192.168.1.10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`lat-${server.id}`}>Latitude</Label>
                      <Input
                        id={`lat-${server.id}`}
                        type="number"
                        step="any"
                        value={server.lat}
                        onChange={(event) => updateServerField(server.id, 'lat', Number(event.target.value))}
                        className="border-white/10 bg-black/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`lng-${server.id}`}>Longitude</Label>
                      <Input
                        id={`lng-${server.id}`}
                        type="number"
                        step="any"
                        value={server.lng}
                        onChange={(event) => updateServerField(server.id, 'lng', Number(event.target.value))}
                        className="border-white/10 bg-black/30"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="rounded-2xl border border-dashed border-white/10 p-4">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white">
                <Plus className="h-4 w-4 text-cyan-300" />
                Add server
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="new-server-name">Name</Label>
                  <Input
                    id="new-server-name"
                    value={newServer.name}
                    onChange={(event) => setNewServer((current) => ({ ...current, name: event.target.value }))}
                    className="border-white/10 bg-white/5"
                    placeholder="Tower East"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-server-ip">IP / uptime target</Label>
                  <Input
                    id="new-server-ip"
                    value={newServer.ipAddress}
                    onChange={(event) =>
                      setNewServer((current) => ({ ...current, ipAddress: event.target.value }))
                    }
                    className="border-white/10 bg-white/5"
                    placeholder="192.168.1.10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-server-lat">Latitude</Label>
                  <Input
                    id="new-server-lat"
                    type="number"
                    step="any"
                    value={newServer.lat}
                    onChange={(event) => setNewServer((current) => ({ ...current, lat: event.target.value }))}
                    className="border-white/10 bg-white/5"
                    placeholder="35.647"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-server-lng">Longitude</Label>
                  <Input
                    id="new-server-lng"
                    type="number"
                    step="any"
                    value={newServer.lng}
                    onChange={(event) => setNewServer((current) => ({ ...current, lng: event.target.value }))}
                    className="border-white/10 bg-white/5"
                    placeholder="139.8885"
                  />
                </div>
              </div>
              <Button onClick={addServer} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Add server
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
