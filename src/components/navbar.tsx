"use client";

import { Server, Settings, Activity } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  siteName: string;
  totalServices: number;
  onlineServices: number;
}

export default function Navbar({ siteName, totalServices, onlineServices }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Server className="h-5 w-5 text-purple-400" />
          <span className="text-lg font-semibold tracking-tight text-white">
            {siteName}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-emerald-400">{onlineServices}</span>
              <span className="mx-1">/</span>
              <span className="font-medium text-white">{totalServices}</span>
              <span className="ml-1 hidden sm:inline">services online</span>
            </span>
          </div>

          <Link href="/settings">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
