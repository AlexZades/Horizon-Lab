"use client";

import { useMemo, useState } from 'react';
import {
  CircleDot,
  Cloud,
  Cpu,
  Database,
  ExternalLink,
  FileText,
  Globe,
  HardDrive,
  Lock,
  Mail,
  MessageSquare,
  Monitor,
  Music,
  Pencil,
  Plus,
  Radio,
  RefreshCw,
  Rss,
  Shield,
  Terminal,
  Trash2,
  Video,
  Wifi,
  Zap,
  Camera,
  Server,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Service, Server as ServerType, Settings } from '@/lib/database';

const ICON_MAP: Record<string, LucideIcon> = {
  Globe,
  Shield,
  Database,
  Monitor,
  Cloud,
  Wifi,
  HardDrive,
  Mail,
  MessageSquare,
  Camera,
  Music,
  Video,
  FileText,
  Lock,
  Cpu,
  Terminal,
  Radio,
  Rss,
  Zap,
  Server,
};

const ICON_NAMES = Object.keys(ICON_MAP);

function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || Globe;
  return <Icon className={className} />;
}

interface ServicePanelProps {
  services: Service[];
  servers: ServerType[];
  settings: Settings;
  onRefresh: () => Promise<void> | void;
  onCheck: () => Promise<void> | void;
  isChecking: boolean;
}

type ServiceFormState = {
  name: string;
  url: string;
  icon: string;
  serverId: string;
};

type ServiceGroup = {
  key: string;
  title: string;
  server: ServerType | null;
  services: Service[];
};

const emptyForm: ServiceFormState = {
  name: '',
  url: '',
  icon: 'Globe',
  serverId: 'unassigned',
};

function statusDot(status: Service['status']) {
  if (status === 'online') return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.85)]';
  if (status === 'offline') return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.75)]';
  return 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.75)]';
}

function serverStatusBadge(status: ServerType['status']) {
  if (status === 'online') return 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20';
  if (status === 'offline') return 'bg-red-500/10 text-red-300 border-red-400/20';
  return 'bg-amber-500/10 text-amber-200 border-amber-400/20';
}

function ServiceForm({
  form,
  setForm,
  servers,
  onSubmit,
  submitLabel,
}: {
  form: ServiceFormState;
  setForm: React.Dispatch<React.SetStateAction<ServiceFormState>>;
  servers: ServerType[];
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="service-name">Name</Label>
        <Input
          id="service-name"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="Grafana"
          className="border-white/10 bg-white/5"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="service-url">URL</Label>
        <Input
          id="service-url"
          value={form.url}
          onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
          placeholder="https://grafana.local"
          className="border-white/10 bg-white/5"
        />
      </div>

      <div className="space-y-2">
        <Label>Server host</Label>
        <Select
          value={form.serverId}
          onValueChange={(value) => setForm((current) => ({ ...current, serverId: value }))}
        >
          <SelectTrigger className="border-white/10 bg-white/5">
            <SelectValue placeholder="Select a server" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-zinc-950 text-white">
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {servers.map((server) => (
              <SelectItem key={server.id} value={server.id}>
                {server.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Icon</Label>
        <div className="grid grid-cols-6 gap-2">
          {ICON_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setForm((current) => ({ ...current, icon: name }))}
              className={`flex h-10 items-center justify-center rounded-md border transition-colors ${
                form.icon === name
                  ? 'border-purple-400/50 bg-purple-500/15 text-purple-200'
                  : 'border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-white'
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
}

export default function ServicePanel({
  services,
  servers,
  settings,
  onRefresh,
  onCheck,
  isChecking,
}: ServicePanelProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceFormState>(emptyForm);

  const serverMap = useMemo(() => new Map(servers.map((server) => [server.id, server])), [servers]);

  const groupedServices = useMemo<ServiceGroup[]>(() => {
    const grouped: ServiceGroup[] = servers.map((server) => ({
      key: server.id,
      title: server.name,
      server,
      services: services.filter((service) => service.serverId === server.id),
    }));

    const unassignedServices = services.filter((service) => !service.serverId);
    if (unassignedServices.length > 0) {
      grouped.push({
        key: 'unassigned',
        title: 'Unassigned',
        server: null,
        services: unassignedServices,
      });
    }

    return grouped;
  }, [servers, services]);

  async function handleAdd() {
    if (!form.name || !form.url) {
      toast.error('Name and URL are required');
      return;
    }

    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          serverId: form.serverId === 'unassigned' ? null : form.serverId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add service');
      }

      setForm(emptyForm);
      setAddOpen(false);
      toast.success('Service added');
      await onRefresh();
    } catch {
      toast.error('Failed to add service');
    }
  }

  async function handleEdit() {
    if (!editingService) {
      return;
    }

    try {
      const response = await fetch('/api/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingService.id,
          ...form,
          serverId: form.serverId === 'unassigned' ? null : form.serverId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update service');
      }

      setEditingService(null);
      setEditOpen(false);
      setForm(emptyForm);
      toast.success('Service updated');
      await onRefresh();
    } catch {
      toast.error('Failed to update service');
    }
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch('/api/services', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete service');
      }

      toast.success('Service deleted');
      await onRefresh();
    } catch {
      toast.error('Failed to delete service');
    }
  }

  function openEdit(service: Service) {
    setEditingService(service);
    setForm({
      name: service.name,
      url: service.url,
      icon: service.icon,
      serverId: service.serverId ?? 'unassigned',
    });
    setEditOpen(true);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Services by host</h2>
          <p className="text-xs text-muted-foreground">Assign services to servers and monitor grouped uptime.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-white"
            onClick={() => void onCheck()}
            disabled={isChecking}
          >
            <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
          </Button>

          <Dialog
            open={addOpen}
            onOpenChange={(open) => {
              setAddOpen(open);
              if (!open) setForm(emptyForm);
            }}
          >
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="border-white/10 bg-zinc-950 text-white">
              <DialogHeader>
                <DialogTitle>Add service</DialogTitle>
              </DialogHeader>
              <ServiceForm
                form={form}
                setForm={setForm}
                servers={servers}
                onSubmit={handleAdd}
                submitLabel="Add service"
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {services.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
              <CircleDot className="mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No services configured yet</p>
              <p className="text-xs text-muted-foreground/70">Use the + button to add your first one.</p>
            </div>
          ) : null}

          {groupedServices.map((group) => {
            const onlineCount = group.services.filter((service) => service.status === 'online').length;
            const isHost = group.server?.id === settings.dashboardHostServerId;

            return (
              <section key={group.key} className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
                      {isHost ? (
                        <Badge className="border-purple-400/20 bg-purple-500/10 text-purple-200 hover:bg-purple-500/10">
                          Dashboard host
                        </Badge>
                      ) : null}
                      {group.server ? (
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${serverStatusBadge(group.server.status)}`}>
                          {group.server.status}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {group.server?.ipAddress
                        ? `Uptime target ${group.server.ipAddress} · ${onlineCount}/${group.services.length} active services`
                        : `${onlineCount}/${group.services.length} active services`}
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-white/5">
                  {group.services.length === 0 ? (
                    <div className="px-4 py-5 text-sm text-muted-foreground">No services assigned to this server yet.</div>
                  ) : (
                    group.services.map((service) => {
                      const assignedServer = service.serverId ? serverMap.get(service.serverId) : null;

                      return (
                        <div key={service.id} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-100 dark:hover:bg-white/5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-black/30">
                            <ServiceIcon name={service.icon} className="h-4 w-4 text-cyan-200" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium text-foreground">{service.name}</span>
                              <span className={`h-2 w-2 rounded-full ${statusDot(service.status)}`} />
                            </div>
                            <p className="truncate text-xs text-muted-foreground">{service.url}</p>
                            {assignedServer ? (
                              <p className="mt-1 text-[11px] text-muted-foreground">Hosted on {assignedServer.name}</p>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
                              onClick={() => void handleDelete(service.id)}
                              className="rounded p-1 text-muted-foreground hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </ScrollArea>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditingService(null);
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent className="border-white/10 bg-zinc-950 text-white">
          <DialogHeader>
            <DialogTitle>Edit service</DialogTitle>
          </DialogHeader>
          <ServiceForm
            form={form}
            setForm={setForm}
            servers={servers}
            onSubmit={handleEdit}
            submitLabel="Save changes"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}