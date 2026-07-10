"use client";

import { useTheme } from "@/hooks/useTheme";

interface LandingHeroImageProps {
  alt: string;
  width: number;
  height: number;
  className?: string;
}

const DARK_SRC = "/landing/ui-dark.webp";
const LIGHT_SRC = "/landing/ui-light.webp";

export function LandingHeroImage({ alt, width, height, className }: LandingHeroImageProps) {
  const { theme } = useTheme();
  const src = theme === "light" ? LIGHT_SRC : DARK_SRC;

  // Plain <img> on purpose: this is a fixed, pre-optimized WebP served from
  // /public. Next/Image would only re-encode it (lossy) and pick a resized
  // variant — here we want the exact original bytes, downscaled by the browser
  // into the slot with no extra processing.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      fetchPriority="high"
    />
  );
}
