"use client";

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ImagePlus, MapPin, Moon, Palette, Plus, Save, ServerCog, Sun, Trash2, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { Server, Settings } from '@/lib/database';

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

const emptyNewServer = {
  name: '',
  ipAddress: '',
  lat: '0',
  lng: '0',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [servers, setServers] = useState<Server[]>([]);
  const [newServer, setNewServer] = useState(emptyNewServer);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [iconDialogOpen, setIconDialogOpen] = useState(false);
  const [selectedIconFile, setSelectedIconFile] = useState<File | null>(null);
  const [selectedIconPreview, setSelectedIconPreview] = useState<string | null>(null);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const { setTheme } = useTheme();

  async function loadData() {
    const [settingsResponse, serversResponse] = await Promise.all([
      fetch('/api/settings', { cache: 'no-store' }),
      fetch('/api/servers', { cache: 'no-store' }),
    ]);

    const loadedSettings = (await settingsResponse.json()) as Settings;
    setSettings(loadedSettings);
    setServers((await serversResponse.json()) as Server[]);
    setTheme(loadedSettings.theme);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const saved = (await response.json()) as Settings;
      setSettings(saved);
      setTheme(saved.theme);
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

  function handleIconFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedIconFile(file);

    if (!file) {
      setSelectedIconPreview(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedIconPreview(typeof reader.result === 'string' ? reader.result : null);
    };
    reader.readAsDataURL(file);
  }

  async function uploadTitleIcon() {
    if (!selectedIconFile || !selectedIconPreview) {
      toast.error('Choose an image before uploading');
      return;
    }

    setIsUploadingIcon(true);

    try {
      const response = await fetch('/api/title-icon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: selectedIconFile.name,
          mimeType: selectedIconFile.type,
          dataUrl: selectedIconPreview,
        }),
      });

      const data = (await response.json()) as { titleIconPath?: string | null; message?: string };
      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload icon');
      }

      setSettings((current) => ({ ...current, titleIconPath: data.titleIconPath ?? null }));
      setSelectedIconFile(null);
      setSelectedIconPreview(null);
      setIconDialogOpen(false);
      toast.success('Title icon updated');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to upload icon';
      toast.error(message);
    } finally {
      setIsUploadingIcon(false);
    }
  }

  async function removeTitleIcon() {
    setIsUploadingIcon(true);

    try {
      const response = await fetch('/api/title-icon', { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to remove icon');
      }

      setSettings((current) => ({ ...current, titleIconPath: null }));
      setSelectedIconFile(null);
      setSelectedIconPreview(null);
      setIconDialogOpen(false);
      toast.success('Title icon removed');
    } catch {
      toast.error('Failed to remove icon');
    } finally {
      setIsUploadingIcon(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-foreground dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_28%),linear-gradient(180deg,_rgba(5,8,22,1),_rgba(0,0,0,1))]">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 animate-page-open">
        <div className="mb-8 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Dashboard Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure server locations, the dashboard host, client location, and homepage branding.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-black/40 backdrop-blur-xl">
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
                  className="border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
                />
              </div>

              <div className="space-y-2">
                <Label>Homepage title icon</Label>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5 p-3">
                  {settings.titleIconPath ? (
                    <img
                      src={settings.titleIconPath}
                      alt="Current homepage title icon"
                      className="h-10 w-10 rounded-lg object-cover ring-1 ring-white/10"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-100 dark:border-white/15 dark:bg-black/30 text-muted-foreground">
                      <ImagePlus className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">Homepage title icon</p>
                    <p className="text-xs text-muted-foreground">
                      Upload a PNG, JPG, WEBP, or GIF to replace the icon next to the title.
                    </p>
                  </div>
                  <Dialog
                    open={iconDialogOpen}
                    onOpenChange={(open) => {
                      setIconDialogOpen(open);
                      if (!open) {
                        setSelectedIconFile(null);
                        setSelectedIconPreview(null);
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" className="border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
                        Change icon
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="border-white/10 bg-zinc-950 text-white">
                      <DialogHeader>
                        <DialogTitle>Change homepage title icon</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="title-icon-upload">Upload image</Label>
                          <Input
                            id="title-icon-upload"
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            onChange={handleIconFileChange}
                            className="border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-sm file:text-white"
                          />
                          <p className="text-xs text-muted-foreground">Max size: 2MB.</p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5 p-4">
                          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">Preview</p>
                          <div className="flex items-center gap-3">
                            {selectedIconPreview || settings.titleIconPath ? (
                              <img
                                src={selectedIconPreview ?? settings.titleIconPath ?? ''}
                                alt="Title icon preview"
                                className="h-12 w-12 rounded-xl object-cover ring-1 ring-white/10"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-100 dark:border-white/15 dark:bg-black/40 text-muted-foreground">
                                <ImagePlus className="h-5 w-5" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-white">{settings.siteName}</p>
                              <p className="text-xs text-muted-foreground">Shown next to the homepage title.</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap justify-between gap-2">
                          <Button
                            variant="ghost"
                            className="gap-2 text-muted-foreground hover:text-red-300"
                            onClick={removeTitleIcon}
                            disabled={isUploadingIcon || !settings.titleIconPath}
                          >
                            <X className="h-4 w-4" />
                            Remove icon
                          </Button>
                          <Button onClick={uploadTitleIcon} disabled={isUploadingIcon || !selectedIconFile} className="gap-2">
                            <Upload className="h-4 w-4" />
                            Upload icon
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
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
                  <SelectTrigger className="border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
                    <SelectValue placeholder="Select a host server" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white dark:border-white/10 dark:bg-zinc-950 text-foreground">
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

          <div className="space-y-6">
            <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-black/40 backdrop-blur-xl">
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
                      value={settings.deviceLat ?? 0}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          deviceLat: event.target.value === '' ? 0 : Number(event.target.value),
                        }))
                      }
                      className="border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
                      placeholder="35.6895"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="device-lng">Longitude</Label>
                    <Input
                      id="device-lng"
                      type="number"
                      step="any"
                      value={settings.deviceLng ?? 0}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          deviceLng: event.target.value === '' ? 0 : Number(event.target.value),
                        }))
                      }
                      className="border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
                      placeholder="139.6917"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={detectLocation} variant="outline" className="gap-2 border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
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

            {/* Theme */}
            <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-black/40 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {settings.theme === 'dark' ? <Moon className="h-4 w-4 text-indigo-300" /> : <Sun className="h-4 w-4 text-amber-500" />}
                  Theme
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Dark mode</p>
                    <p className="text-xs text-muted-foreground">Toggle between light and dark themes.</p>
                  </div>
                  <Switch
                    checked={settings.theme === 'dark'}
                    onCheckedChange={(checked) =>
                      setSettings((current) => ({ ...current, theme: checked ? 'dark' : 'light' }))
                    }
                  />
                </div>
                <Button onClick={saveSettings} disabled={isSavingSettings} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save theme
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Widget Visibility & Appearance */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-black/40 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-base">Widget visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Time widget</p>
                  <p className="text-xs text-muted-foreground">Show the time.gov synced clock on the globe.</p>
                </div>
                <Switch
                  checked={settings.widgetVisibility?.time !== false}
                  onCheckedChange={(checked) =>
                    setSettings((current) => ({
                      ...current,
                      widgetVisibility: { ...current.widgetVisibility, time: checked },
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Weekday widget</p>
                  <p className="text-xs text-muted-foreground">Show the weekday and date on the globe.</p>
                </div>
                <Switch
                  checked={settings.widgetVisibility?.weekday !== false}
                  onCheckedChange={(checked) =>
                    setSettings((current) => ({
                      ...current,
                      widgetVisibility: { ...current.widgetVisibility, weekday: checked },
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Globe legend</p>
                  <p className="text-xs text-muted-foreground">Show the color legend on the globe view.</p>
                </div>
                <Switch
                  checked={settings.widgetVisibility?.globeLegend !== false}
                  onCheckedChange={(checked) =>
                    setSettings((current) => ({
                      ...current,
                      widgetVisibility: { ...current.widgetVisibility, globeLegend: checked },
                    }))
                  }
                />
              </div>
              <Button onClick={saveSettings} disabled={isSavingSettings} className="gap-2">
                <Save className="h-4 w-4" />
                Save visibility
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white dark:border-white/10 dark:bg-black/40 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4 text-pink-300" />
                Globe dot appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Dot size</Label>
                <Select
                  value={settings.dotSize}
                  onValueChange={(value: 'small' | 'medium' | 'large') =>
                    setSettings((current) => ({ ...current, dotSize: value }))
                  }
                >
                  <SelectTrigger className="border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white dark:border-white/10 dark:bg-zinc-950 text-foreground">
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dot-color-online">Online color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="dot-color-online"
                      type="color"
                      value={settings.dotColorOnline}
                      onChange={(event) =>
                        setSettings((current) => ({ ...current, dotColorOnline: event.target.value }))
                      }
                      className="h-9 w-12 cursor-pointer rounded-md border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5 p-0.5"
                    />
                    <Input
                      value={settings.dotColorOnline}
                      onChange={(event) =>
                        setSettings((current) => ({ ...current, dotColorOnline: event.target.value }))
                      }
                      className="border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5 font-mono text-sm"
                      placeholder="#9bd2ff"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dot-color-offline">Offline color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="dot-color-offline"
                      type="color"
                      value={settings.dotColorOffline}
                      onChange={(event) =>
                        setSettings((current) => ({ ...current, dotColorOffline: event.target.value }))
                      }
                      className="h-9 w-12 cursor-pointer rounded-md border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5 p-0.5"
                    />
                    <Input
                      value={settings.dotColorOffline}
                      onChange={(event) =>
                        setSettings((current) => ({ ...current, dotColorOffline: event.target.value }))
                      }
                      className="border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5 font-mono text-sm"
                      placeholder="#5a0f16"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/30 p-3">
                <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Preview</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="rounded-full"
                      style={{
                        width: settings.dotSize === 'small' ? 8 : settings.dotSize === 'large' ? 16 : 12,
                        height: settings.dotSize === 'small' ? 8 : settings.dotSize === 'large' ? 16 : 12,
                        backgroundColor: settings.dotColorOnline,
                        boxShadow: `0 0 10px ${settings.dotColorOnline}`,
                      }}
                    />
                    <span className="text-xs text-muted-foreground">Online</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="rounded-full"
                      style={{
                        width: settings.dotSize === 'small' ? 8 : settings.dotSize === 'large' ? 16 : 12,
                        height: settings.dotSize === 'small' ? 8 : settings.dotSize === 'large' ? 16 : 12,
                        backgroundColor: settings.dotColorOffline,
                        boxShadow: `0 0 10px ${settings.dotColorOffline}`,
                      }}
                    />
                    <span className="text-xs text-muted-foreground">Offline</span>
                  </div>
                </div>
              </div>

              <Button onClick={saveSettings} disabled={isSavingSettings} className="gap-2">
                <Save className="h-4 w-4" />
                Save appearance
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 border-slate-200 bg-white dark:border-white/10 dark:bg-black/40 backdrop-blur-xl">
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
                <div key={server.id} className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5 p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{server.name || 'Unnamed server'}</h3>
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
                          className="border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
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
                        className="border-slate-200 bg-white dark:border-white/10 dark:bg-black/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`ip-${server.id}`}>IP / uptime target</Label>
                      <Input
                        id={`ip-${server.id}`}
                        value={server.ipAddress ?? ''}
                        onChange={(event) => updateServerField(server.id, 'ipAddress', event.target.value || null)}
                        className="border-slate-200 bg-white dark:border-white/10 dark:bg-black/30"
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
                        className="border-slate-200 bg-white dark:border-white/10 dark:bg-black/30"
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
                        className="border-slate-200 bg-white dark:border-white/10 dark:bg-black/30"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-4">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
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
                    className="border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
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
                    className="border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
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
                    className="border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
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
                    className="border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
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