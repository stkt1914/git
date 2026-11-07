import {
  Cpu,
  Globe2,
  Leaf,
  LineChart,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  NEWS_CATEGORIES,
  type NewsCategory,
  type NewsCategoryFilter,
} from "@/types/news";

interface CategoryVisual {
  accent: string;
  soft: string;
  glow: string;
  icon: LucideIcon;
}

export const CATEGORY_FILTERS: readonly NewsCategoryFilter[] = NEWS_CATEGORIES;

export const CATEGORY_VISUALS: Record<NewsCategory, CategoryVisual> = {
  国际: {
    accent: "#7dd3fc",
    soft: "rgba(56, 189, 248, 0.16)",
    glow: "rgba(56, 189, 248, 0.34)",
    icon: Globe2,
  },
  科技: {
    accent: "#9be7c4",
    soft: "rgba(52, 211, 153, 0.15)",
    glow: "rgba(52, 211, 153, 0.32)",
    icon: Cpu,
  },
  经济: {
    accent: "#f6c96b",
    soft: "rgba(245, 185, 66, 0.15)",
    glow: "rgba(245, 185, 66, 0.34)",
    icon: LineChart,
  },
  社会: {
    accent: "#f0a6a0",
    soft: "rgba(244, 114, 116, 0.14)",
    glow: "rgba(244, 114, 116, 0.3)",
    icon: Users,
  },
  环境: {
    accent: "#b4e58d",
    soft: "rgba(163, 230, 53, 0.13)",
    glow: "rgba(163, 230, 53, 0.28)",
    icon: Leaf,
  },
  防务: {
    accent: "#b9c2ff",
    soft: "rgba(129, 140, 248, 0.14)",
    glow: "rgba(129, 140, 248, 0.3)",
    icon: Shield,
  },
};

export function getCategoryVisual(category: NewsCategory): CategoryVisual {
  return CATEGORY_VISUALS[category];
}
