"use client";

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Satellite } from 'lucide-react';
import {
  INCLINATION_COLORS,
  INCLINATION_LABELS,
  SATELLITE_STATS,
  ZOOM_SHOW_SATELLITES,
  type InclinationCategory,
} from '@/components/globe';

interface SatelliteOverlayProps {
  cameraDistance: number;
  zoomLevel: number;
}

const categories: InclinationCategory[] = ['equatorial', 'low', 'medium', 'high', 'retrograde'];

export default function SatelliteOverlay({ cameraDistance, zoomLevel }: SatelliteOverlayProps) {
  const [panelPage, setPanelPage] = useState(0);
  const showSatellites = cameraDistance < ZOOM_SHOW_SATELLITES;

  return (
    <>
      {/* Zoom indicator - top left */}
      <div className="absolute left-4 top-4 z-30 flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 backdrop-blur-xl">
          <Satellite className="h-3.5 w-3.5 text-cyan-400" />
          <div className="text-[10px] text-white/70">
            Zoom: <span className="font-mono font-medium text-white">{(zoomLevel * 100).toFixed(0)}%</span>
          </div>
          {showSatellites && (
            <div className="ml-1 flex items-center gap-1">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-[9px] text-emerald-400">SAT DATA</span>
            </div>
          )}
        </div>
      </div>

      {/* Zoom hint - center bottom, fades out when zoomed */}
      {!showSatellites && (
        <div className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2 animate-pulse">
          <div className="rounded-full border border-white/10 bg-black/50 px-4 py-1.5 text-[10px] text-white/50 backdrop-blur-xl">
            Scroll to zoom • Pinch on mobile • Zoom in to see satellite data
          </div>
        </div>
      )}

      {/* Inclination legend panel - bottom right (like satellitemap.space) */}
      {showSatellites && (
        <div className="absolute bottom-4 right-4 z-30 w-[200px] animate-boot-legend">
          <div className="rounded-xl border border-white/10 bg-black/70 backdrop-blur-xl">
            {/* Panel header */}
            <div className="border-b border-white/10 px-3 py-2 text-center">
              <span className="text-[11px] font-semibold tracking-wide text-white">
                Inclination
              </span>
            </div>

            {/* Inclination categories */}
            <div className="space-y-1 px-3 py-2">
              {categories.map((cat) => (
                <div key={cat} className="flex items-center gap-2">
                  <div
                    className="h-3 w-4 rounded-sm"
                    style={{ backgroundColor: INCLINATION_COLORS[cat] }}
                  />
                  <div className="flex-1">
                    <div className="text-[10px] font-medium text-white">
                      {INCLINATION_LABELS[cat].label}
                    </div>
                    <div className="text-[8px] text-white/40">
                      {INCLINATION_LABELS[cat].range}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Distribution stats */}
            <div className="border-t border-white/10 px-3 py-2">
              <div className="mb-1 text-[9px] font-medium text-white/60">
                Distribution ({SATELLITE_STATS.total.toLocaleString()} satellites)
              </div>
              <div className="space-y-0.5">
                {(['low', 'medium', 'high'] as InclinationCategory[]).map((cat) => {
                  const count = SATELLITE_STATS.counts[cat];
                  const pct = ((count / SATELLITE_STATS.total) * 100).toFixed(1);
                  return (
                    <div key={cat} className="flex items-center justify-between text-[9px]">
                      <span className="capitalize text-white/50">{cat}</span>
                      <span className="font-mono text-white/70">
                        {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-center gap-1 border-t border-white/10 px-3 py-1.5">
              <button
                onClick={() => setPanelPage(Math.max(0, panelPage - 1))}
                className="rounded p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button className="rounded bg-white/10 p-1 text-white/60">
                <Pause className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setPanelPage(panelPage + 1)}
                className="rounded p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Satellite count when zoomed in - top right area */}
      {showSatellites && (
        <div className="absolute right-4 top-4 z-30">
          <div className="rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-right backdrop-blur-xl">
            <div className="font-mono text-[14px] font-bold text-white/90">
              {SATELLITE_STATS.total.toLocaleString()}
            </div>
            <div className="text-[8px] uppercase tracking-widest text-white/40">
              tracked satellites
            </div>
          </div>
        </div>
      )}
    </>
  );
}
