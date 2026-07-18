import { Platform } from "react-native";

export const COLORS = {
  surface: "#0A0A0A",
  onSurface: "#F2F2F2",
  surfaceSecondary: "#1A1A1A",
  onSurfaceSecondary: "#E5E5E5",
  surfaceTertiary: "#262626",
  onSurfaceTertiary: "#CCCCCC",
  brand: "#D4AF37",
  brandDim: "#B5952F",
  brandTint: "#332A0D",
  onBrand: "#0A0A0A",
  success: "#82D9AA",
  successBg: "#1E422F",
  warning: "#F2C94C",
  warningBg: "#4D3A11",
  error: "#E07070",
  errorBg: "#4A1C1C",
  border: "#2A2A2A",
  borderStrong: "#D4AF37",
  divider: "#1F1F1F",
  muted: "#8A8A8A",
};

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const RADIUS = { sm: 6, md: 12, lg: 20, pill: 999 };

export const FONTS = {
  serif: Platform.select({ ios: "Georgia", android: "serif", default: "Georgia" }),
  sans: Platform.select({ ios: "System", android: "sans-serif", default: "System" }),
};

export const BLOCKS = ["A", "B", "C", "D", "F"];

export const API = process.env.EXPO_PUBLIC_BACKEND_URL!;
