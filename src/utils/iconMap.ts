import React from 'react';
import {
  Layout,
  Gauge,
  Code2,
  Sparkles,
  ShieldCheck,
  Layers,
  Search,
  Target,
  FileCode,
  MapPin,
  BookOpen,
  BarChart3,
  Video,
  Box,
  Mic,
  Share2,
  Film,
  Zap,
  Megaphone,
  TrendingUp,
  Filter,
  PieChart,
  Users,
  CheckCircle2
} from 'lucide-react';

export const ICON_MAP: Record<string, React.FC<any>> = {
  Layout,
  Gauge,
  Code2,
  Sparkles,
  ShieldCheck,
  Layers,
  Search,
  Target,
  FileCode,
  MapPin,
  BookOpen,
  BarChart3,
  Video,
  Box,
  Mic,
  Share2,
  Film,
  Zap,
  Megaphone,
  TrendingUp,
  Filter,
  PieChart,
  Users,
  CheckCircle2
};

export function getIconComponent(name: string, fallback = CheckCircle2): React.FC<any> {
  return ICON_MAP[name] || fallback;
}

