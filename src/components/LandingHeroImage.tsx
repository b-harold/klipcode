"use client";

import Image from "next/image";

import { useTheme } from "@/hooks/useTheme";

interface LandingHeroImageProps {
  alt: string;
  width: number;
  height: number;
  className?: string;
}

const DARK_SRC = "/landing/ui-dark-mode.webp";
const LIGHT_SRC = "/landing/ui-light-mode.webp";

export function LandingHeroImage({ alt, width, height, className }: LandingHeroImageProps) {
  const { theme } = useTheme();
  const src = theme === "light" ? LIGHT_SRC : DARK_SRC;

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
