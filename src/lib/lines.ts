import type { Mode } from "@/lib/vvo/types";

/**
 * How each mode of transport looks. Colour alone is never the only signal:
 * trams get square badges, buses round ones, and every badge has a text label for screen readers.
 */
export const MODE_STYLES: Record<Mode, { label: string; background: string; text: string; shape: string }> = {
  tram: { label: "Tram", background: "#b3122e", text: "#ffffff", shape: "rounded-[3px]" },
  bus: { label: "Bus", background: "#1d5aa6", text: "#ffffff", shape: "rounded-full" },
  suburban: { label: "S-Bahn", background: "#0a7d4e", text: "#ffffff", shape: "rounded-md" },
  train: { label: "Train", background: "#4b5562", text: "#ffffff", shape: "rounded-[3px]" },
  ferry: { label: "Ferry", background: "#0b7a8a", text: "#ffffff", shape: "rounded-md" },
  cableway: { label: "Cable car", background: "#6a3d9e", text: "#ffffff", shape: "rounded-md" },
  taxi: { label: "Shared taxi", background: "#9a5b00", text: "#ffffff", shape: "rounded-full" },
  other: { label: "Line", background: "#566273", text: "#ffffff", shape: "rounded-md" },
};
