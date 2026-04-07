"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, MapPin, Save } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type { Server, Settings } from "@/lib/database";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    siteName: "HomeLab",
    deviceLat: null,
    deviceLng: null,
  });
  const [servers, setServers] = useState<Server[]>([]);
  const [newServer, setNewServer] = useState({ name: "", lat: "", lng: "" });

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setSettings);
    fetch("/api/servers").then((r) => r.json()).then(setServers);
  }, []);

  async function saveSettings() {
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error();
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    }
  }

  async function addServer() {
    if (!newServer.name || !newServer.lat || !newServer.lng) {
      toast.error("All fields are required");
      return;
    }
    try {
      const res = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newServer.name,
          lat: parseFloat(newServer.lat),
          lng: parseFloat(newServer.lng),
        }),
      });
      if (!res.ok) throw new Error();
      const server = await res.json();
      setServers((s) => [...s, server]);
      setNewServer({ name: "", lat: "", lng: "" });
      toast.success("Server added");
    } catch {
      toast.error("Failed to add server");
    }
  }

  async function deleteServer(id: string) {
    try {
      const res = await fetch("/api/servers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setServers((s) => s.filter((sv) => sv.id !== id));
      toast.success("Server removed");
    } catch {
      toast.error("Failed to delete server");
    }
  }

  function detectLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSettings((s) => ({
          ...s,
          deviceLat: parseFloat(pos.coords.latitude.toFixed(4)),
          deviceLng: parseFloat(pos.coords.longitude.toFixed(4)),
        }));
        toast.success("Location detected");
      },
      () => toast.error("Failed to get location")
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>

        {/* General Settings */}
        <Card className="mb-6 border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Site Name</Label>
              <Input
                value={settings.siteName}
                onChange={(e) => setSettings((s) => ({ ...s, siteName: e.target.value }))}
                className="border-white/10 bg-white/5"
              />
            </div>
            <Button onClick={saveSettings} size="sm" className="gap-2">
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
          </CardContent>
        </Card>

        {/* Device Location */}
        <Card className="mb-6 border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-base">Device Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={settings.deviceLat ?? ""}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      deviceLat: e.target.value ? parseFloat(e.target.value) : null,
                    }))
                  }
                  className="border-white/10 bg-white/5"
                  placeholder="40.7128"
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={settings.deviceLng ?? ""}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      deviceLng: e.target.value ? parseFloat(e.target.value) : null,
                    }))
                  }
                  className="border-white/10 bg-white/5"
                  placeholder="-74.0060"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={detectLocation} variant="outline" size="sm" className="gap-2 border-white/10">
                <MapPin className="h-3.5 w-3.5" />
                Detect Location
              </Button>
              <Button onClick={saveSettings} size="sm" className="gap-2">
                <Save className="h-3.5 w-3.5" />
                Save
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Server Locations */}
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-base">Server Locations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {servers.map((server) => (
              <div
                key={server.id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{server.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {server.lat}, {server.lng}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-red-400"
                  onClick={() => deleteServer(server.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}

            <div className="space-y-3 rounded-lg border border-dashed border-white/10 p-4">
              <div className="space-y-2">
                <Label>Server Name</Label>
                <Input
                  value={newServer.name}
                  onChange={(e) => setNewServer((s) => ({ ...s, name: e.target.value }))}
                  className="border-white/10 bg-white/5"
                  placeholder="US East Server"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={newServer.lat}
                    onChange={(e) => setNewServer((s) => ({ ...s, lat: e.target.value }))}
                    className="border-white/10 bg-white/5"
                    placeholder="39.0438"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    value={newServer.lng}
                    onChange={(e) => setNewServer((s) => ({ ...s, lng: e.target.value }))}
                    className="border-white/10 bg-white/5"
                    placeholder="-77.4874"
                  />
                </div>
              </div>
              <Button onClick={addServer} size="sm" className="gap-2">
                <Plus className="h-3.5 w-3.5" />
                Add Server
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
