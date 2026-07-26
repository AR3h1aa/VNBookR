"use client";

import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FastForward,
  LayoutPanelLeft,
  List,
  Pause,
  Play,
  Save,
  Settings as SettingsIcon,
  History,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VNMode } from "@/lib/vn-store";

interface VNToolbarProps {
  mode: VNMode;
  autoMode: boolean;
  skipMode: boolean;
  onToggleAuto: () => void;
  onToggleSkip: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSave: () => void;
  onOpenChapters: () => void;
  onOpenSettings: () => void;
  onOpenSaveLoad: (mode: "save" | "load") => void;
  onOpenBacklog: () => void;
  onOpenStats: () => void;
  onCycleMode: () => void;
}

/**
 * Small, unobtrusive bottom toolbar — per "The Magic of Buttons" article:
 * "small buttons along the bottom of the screen" for load/save/skip/settings.
 */
export function VNToolbar({
  mode,
  autoMode,
  skipMode,
  onToggleAuto,
  onToggleSkip,
  onPrev,
  onNext,
  onSave,
  onOpenChapters,
  onOpenSettings,
  onOpenSaveLoad,
  onOpenBacklog,
  onOpenStats,
  onCycleMode,
}: VNToolbarProps) {
  return (
    <div
      className="flex items-center justify-center gap-1.5 pb-4 pt-2 px-4"
      onClick={(e) => e.stopPropagation()}
    >
      <ToolButton icon={<ChevronLeft className="w-3.5 h-3.5" />} label="Prev" onClick={onPrev} />
      <ToolButton icon={<ChevronRight className="w-3.5 h-3.5" />} label="Next" onClick={onNext} />

      <Divider />

      <ToolButton
        icon={autoMode ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        label="Auto"
        onClick={onToggleAuto}
        active={autoMode}
      />
      <ToolButton
        icon={<FastForward className="w-3.5 h-3.5" />}
        label="Skip"
        onClick={onToggleSkip}
        active={skipMode}
      />
      <ToolButton
        icon={<History className="w-3.5 h-3.5" />}
        label="Log"
        onClick={onOpenBacklog}
      />

      <Divider />

      <ToolButton
        icon={<Save className="w-3.5 h-3.5" />}
        label="Save"
        onClick={onSave}
      />
      <ToolButton
        icon={<BookOpen className="w-3.5 h-3.5" />}
        label="Load"
        onClick={() => onOpenSaveLoad("load")}
      />
      <ToolButton
        icon={<List className="w-3.5 h-3.5" />}
        label="Chapters"
        onClick={onOpenChapters}
      />
      <ToolButton
        icon={<BarChart3 className="w-3.5 h-3.5" />}
        label="Stats"
        onClick={onOpenStats}
      />
      <ToolButton
        icon={<SettingsIcon className="w-3.5 h-3.5" />}
        label="Config"
        onClick={onOpenSettings}
      />

      <Divider />

      <ToolButton
        icon={
          <span className="flex items-center gap-1">
            <LayoutPanelLeft className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase">{mode}</span>
          </span>
        }
        label="UI"
        onClick={onCycleMode}
        title="Cycle UI mode (ADV → NVL → Frame)"
      />
    </div>
  );
}

function ToolButton({
  icon,
  label,
  onClick,
  active,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title || label}
      className={cn(
        "vn-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs",
        active && "vn-btn active"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-white/10 mx-1" />;
}
