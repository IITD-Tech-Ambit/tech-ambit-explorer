import {
    Cpu, HeartPulse, Zap, Factory, Atom, Radio, Gem, Building2, Users,
    type LucideIcon,
} from "lucide-react";

/**
 * Visual identity for the 9 fixed Thematic Areas: a validated categorical
 * palette (CVD-checked, see dataviz skill) assigned in FIXED ORDER by the
 * theme's stable display_order index — never re-cycled or picked ad hoc.
 * Icon and short label are matched by keyword for a semantic pairing, with
 * an index-based color fallback and a truncation fallback so a future theme
 * rename never breaks the assignment.
 */
const CATEGORICAL_HUES = [
    "#2a78d6", // blue
    "#1baf7a", // aqua
    "#eda100", // yellow
    "#008300", // green
    "#4a3aa7", // violet
    "#e34948", // red
    "#e87ba4", // magenta
    "#eb6834", // orange
    "#0891b2", // cyan
];

const ACCENT_RULES: [RegExp, LucideIcon, string][] = [
    [/health|medtech|medical/i, HeartPulse, "Healthcare"],
    [/infrastructure|smart/i, Building2, "Infrastructure"],
    [/energy|climate/i, Zap, "Energy & Climate"],
    [/manufactur|industry/i, Factory, "Manufacturing"],
    [/semiconductor/i, Atom, "Quantum Tech"],
    [/communication/i, Radio, "Communication"],
    [/material|device/i, Gem, "Materials"],
    [/social|humanit|management/i, Users, "Social Sciences"],
    [/supercomput|artificial intelligence|machine learning|\bai\b/i, Cpu, "AI/ML"],
];

export interface ThemeAccent {
    color: string;
    icon: LucideIcon;
    shortLabel: string;
}

export function getThemeAccent(name: string, index: number): ThemeAccent {
    const color = CATEGORICAL_HUES[index % CATEGORICAL_HUES.length];
    const match = ACCENT_RULES.find(([pattern]) => pattern.test(name));
    return {
        color,
        icon: match?.[1] ?? Atom,
        shortLabel: match?.[2] ?? (name.length > 20 ? `${name.slice(0, 18)}…` : name),
    };
}
