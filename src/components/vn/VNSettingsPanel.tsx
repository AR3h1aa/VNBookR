"use client";

import { motion } from "framer-motion";
import { X, Type, Gauge, Eye, MousePointerClick, Palette } from "lucide-react";
import type { VNSettings, VNMode, VNTheme } from "@/lib/vn-store";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

interface VNSettingsPanelProps {
  settings: VNSettings;
  onUpdate: (patch: Partial<VNSettings>) => void;
  onClose: () => void;
}

export function VNSettingsPanel({ settings, onUpdate, onClose }: VNSettingsPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        className="vn-panel rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto vn-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-[rgba(30,20,25,0.95)] backdrop-blur z-10">
          <h3 className="font-semibold flex items-center gap-2">
            <Palette className="w-4 h-4" /> Settings
          </h3>
          <button onClick={onClose} className="vn-btn p-1.5 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* UI Mode */}
          <Section icon={<LayoutPanelIcon />} title="UI Mode" description="Per 'The Magic of Buttons' — choose between ADV (standard), NVL (immersive, no buttons), or Frame (full-frame UI).">
            <div className="grid grid-cols-3 gap-2">
              {(["adv", "nvl", "frame"] as VNMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => onUpdate({ mode: m })}
                  className={cn(
                    "vn-btn p-3 rounded-lg text-sm flex flex-col items-center gap-1",
                    settings.mode === m && "vn-btn active"
                  )}
                >
                  <span className="uppercase font-semibold tracking-wider">{m}</span>
                  <span className="text-[10px] opacity-70">
                    {m === "adv" && "Bottom textbox"}
                    {m === "nvl" && "Full panel"}
                    {m === "frame" && "Side buttons"}
                  </span>
                </button>
              ))}
            </div>
          </Section>

          {/* Theme */}
          <Section icon={<Palette className="w-4 h-4" />} title="Visual Theme">
            <div className="grid grid-cols-4 gap-2">
              {(["sakura", "night", "paper", "ocean"] as VNTheme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => onUpdate({ theme: t })}
                  className={cn(
                    "vn-btn p-2 rounded-lg text-xs capitalize",
                    settings.theme === t && "vn-btn active"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </Section>

          {/* Text speed */}
          <Section icon={<Type className="w-4 h-4" />} title="Text Speed" description="Characters per second for the typewriter effect. Set to 0 for instant display.">
            <div className="flex items-center gap-4">
              <Slider
                value={[settings.textSpeed]}
                onValueChange={(v) => onUpdate({ textSpeed: v[0] })}
                min={0}
                max={200}
                step={5}
                className="flex-1"
              />
              <span className="text-sm tabular-nums w-20 text-right">
                {settings.textSpeed === 0 ? "instant" : `${settings.textSpeed} cps`}
              </span>
            </div>
          </Section>

          {/* Font scale */}
          <Section icon={<Gauge className="w-4 h-4" />} title="Font Size">
            <div className="flex items-center gap-4">
              <Slider
                value={[Math.round(settings.fontScale * 100)]}
                onValueChange={(v) => onUpdate({ fontScale: v[0] / 100 })}
                min={70}
                max={160}
                step={5}
                className="flex-1"
              />
              <span className="text-sm tabular-nums w-20 text-right">
                {Math.round(settings.fontScale * 100)}%
              </span>
            </div>
          </Section>

          {/* Auto delay */}
          <Section icon={<MousePointerClick className="w-4 h-4" />} title="Auto Mode Delay" description="How long to wait before advancing to the next segment in auto mode.">
            <div className="flex items-center gap-4">
              <Slider
                value={[settings.autoDelay]}
                onValueChange={(v) => onUpdate({ autoDelay: v[0] })}
                min={500}
                max={5000}
                step={100}
                className="flex-1"
              />
              <span className="text-sm tabular-nums w-20 text-right">
                {(settings.autoDelay / 1000).toFixed(1)}s
              </span>
            </div>
          </Section>

          {/* Toggles */}
          <Section icon={<Eye className="w-4 h-4" />} title="Display Options">
            <div className="space-y-3">
              <ToggleRow
                label="Show speaker name plate"
                description="Display the speaker name above the textbox."
                checked={settings.showSpeaker}
                onChange={(v) => onUpdate({ showSpeaker: v })}
              />
              <ToggleRow
                label="Auto-hide toolbar"
                description="Hide the bottom toolbar after a few seconds of inactivity."
                checked={settings.autoHideToolbar}
                onChange={(v) => onUpdate({ autoHideToolbar: v })}
              />
            </div>
          </Section>

          {/* Keyboard shortcuts */}
          <Section title="Keyboard Shortcuts">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Shortcut keys="Space / →" desc="Advance text" />
              <Shortcut keys="←" desc="Previous segment" />
              <Shortcut keys="A" desc="Toggle auto mode" />
              <Shortcut keys="S" desc="Toggle skip mode" />
              <Shortcut keys="L" desc="Open backlog" />
              <Shortcut keys="Esc" desc="Back / exit" />
            </div>
          </Section>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="opacity-70">{icon}</span>}
        <h4 className="text-sm font-semibold uppercase tracking-wider">{title}</h4>
      </div>
      {description && (
        <p className="text-xs opacity-60 mb-3 leading-relaxed">{description}</p>
      )}
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <div className="text-sm">{label}</div>
        {description && <div className="text-xs opacity-60">{description}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Shortcut({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="flex items-center gap-2 bg-white/5 rounded px-2 py-1.5">
      <kbd className="vn-btn px-1.5 py-0.5 rounded text-[10px] font-mono">{keys}</kbd>
      <span className="opacity-70">{desc}</span>
    </div>
  );
}

function LayoutPanelIcon() {
  return <span className="text-xs font-mono opacity-70">▦</span>;
}
