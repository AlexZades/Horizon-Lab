"use client";

import { useState } from "react";
import {
  Globe, Shield, Database, Monitor, Cloud, Wifi, HardDrive,
  Mail, MessageSquare, Camera, Music, Video, FileText, Lock,
  Cpu, Terminal, Radio, Rss, Zap, ExternalLink, Plus, Trash2,
  Pencil, RefreshCw, CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Service } from "@/lib/database";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Globe, Shield, Database, Monitor, Cloud, Wifi, HardDrive,
  Mail, MessageSquare, Camera, Music, Video, FileText, Lock,
  Cpu, Terminal, Radio, Rss, Zap,
};

const ICON_NAMES = Object.keys(ICON_MAP);

function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || Globe;
  return <Icon className={className} />;
}

interface ServicePanelProps {
  services: Service[];
  onRefresh: () => void;
  isChecking: boolean;
}

export default function ServicePanel({ services, onRefresh, isChecking }: ServicePanelProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState({ name: "", url: "", icon: "Globe" });

  async function handleAdd() {
    if (!form.name || !form.url) {
      toast.error("Name and URL are required");
      return;
    }
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to add service");
      toast.success("Service added");
      setForm({ name: "", url: "", icon: "Globe" });
      setAddOpen(false);
      onRefresh();
    } catch {
      toast.error("Failed to add service");
    }
  }

  async function handleEdit() {
    if (!editingService) return;
    try {
      const res = await fetch("/api/services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingService.id, ...form }),
      });
      if (!res.ok) throw new Error("Failed to update service");
      toast.success("Service updated");
      setEditOpen(false);
      setEditingService(null);
      onRefresh();
    } catch {
      toast.error("Failed to update service");
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch("/api/services", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete service");
      toast.success("Service deleted");
      onRefresh();
    } catch {
      toast.error("Failed to delete service");
    }
  }

  function openEdit(service: Service) {
    setEditingService(service);
    setForm({ name: service.name, url: service.url, icon: service.icon });
    setEditOpen(true);
  }

  function statusColor(status: string) {
    if (status === "online") return "bg-emerald-500";
    if (status === "offline") return "bg-red-500";
    return "bg-yellow-500";
  }

  function statusBadge(status: string) {
    if (status === "online") return "default";
    if (status === "offline") return "destructive";
    return "secondary";
  }

  const ServiceForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Plex, Grafana, etc."
        />
      </div>
      <div className="space-y-2">
        <Label>URL</Label>
        <Input
          value={form.url}
          onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          placeholder="https://my-service.local:8080"
        />
      </div>
      <div className="space-y-2">
        <Label>Icon</Label>
        <div className="grid grid-cols-6 gap-2">
          {ICON_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setForm((f) => ({ ...f, icon: name }))}
              className={`flex items-center justify-center rounded-md border p-2 transition-colors ${
                form.icon === name
                  ? "border-purple-500 bg-purple-500/20 text-purple-300"
                  : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20"
              }`}
            >
              <ServiceIcon name={name} className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
      <Button onClick={onSubmit} className="w-full">
        {submitLabel}
      </Button>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Services</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-white"
            onClick={onRefresh}
            disabled={isChecking}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? "animate-spin" : ""}`} />
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-white"
                onClick={() => setForm({ name: "", url: "", icon: "Globe" })}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="border-white/10 bg-zinc-900">
              <DialogHeader>
                <DialogTitle>Add Service</DialogTitle>
              </DialogHeader>
              <ServiceForm onSubmit={handleAdd} submitLabel="Add Service" />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {services.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CircleDot className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No services yet</p>
              <p className="text-xs text-muted-foreground/60">Click + to add one</p>
            </div>
          )}
          {services.map((service) => (
            <div
              key={service.id}
              className="group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:border-white/10 hover:bg-white/5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                <ServiceIcon name={service.icon} className="h-4 w-4 text-purple-300" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-white">
                    {service.name}
                  </span>
                  <div className={`h-1.5 w-1.5 rounded-full ${statusColor(service.status)}`} />
                </div>
                <p className="truncate text-xs text-muted-foreground">{service.url}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <a
                  href={service.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1 text-muted-foreground hover:text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  onClick={() => openEdit(service)}
                  className="rounded p-1 text-muted-foreground hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="rounded p-1 text-muted-foreground hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-white/10 bg-zinc-900">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>
          <ServiceForm onSubmit={handleEdit} submitLabel="Save Changes" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
