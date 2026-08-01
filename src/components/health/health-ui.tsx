/**
 * Puente entre el dominio de salud y su representación visual.
 *
 * El dominio devuelve claves (`"alert"`, `"syringe"`) y nunca componentes ni
 * clases de CSS: así se puede testear sin React y cambiar de librería de
 * iconos tocando sólo este archivo.
 */

import {
  Activity,
  Cake,
  Heart,
  Hourglass,
  Pill,
  Scale,
  Shield,
  Stethoscope,
  Syringe,
  type LucideIcon,
} from "lucide-react";

import type { HealthLevel } from "@/domain/enums";
import type { HealthIndicatorIcon } from "@/domain/health/indicators";

export const HEALTH_ICONS: Record<HealthIndicatorIcon, LucideIcon> = {
  cake: Cake,
  scale: Scale,
  activity: Activity,
  syringe: Syringe,
  shield: Shield,
  pill: Pill,
  heart: Heart,
  stethoscope: Stethoscope,
  hourglass: Hourglass,
};

/** Clases de color por nivel. Se apoyan en los tokens de globals.css. */
export const HEALTH_LEVEL_STYLES: Record<
  HealthLevel,
  { text: string; bg: string; border: string; dot: string }
> = {
  good: {
    text: "text-health-good",
    bg: "bg-health-good/10",
    border: "border-health-good/30",
    dot: "bg-health-good",
  },
  watch: {
    text: "text-health-watch",
    bg: "bg-health-watch/10",
    border: "border-health-watch/30",
    dot: "bg-health-watch",
  },
  alert: {
    text: "text-health-alert",
    bg: "bg-health-alert/10",
    border: "border-health-alert/30",
    dot: "bg-health-alert",
  },
  unknown: {
    text: "text-health-unknown",
    bg: "bg-health-unknown/10",
    border: "border-health-unknown/30",
    dot: "bg-health-unknown",
  },
};
