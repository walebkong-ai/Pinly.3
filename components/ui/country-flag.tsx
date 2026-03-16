import React, { type CSSProperties } from "react";
import { resolveCountry } from "@/lib/country-flags";
import { cn } from "@/lib/utils";

const FLAG_STYLE: CSSProperties = {
  fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
};

type CountryFlagProps = {
  country: string | null | undefined;
  className?: string;
  flagClassName?: string;
  textClassName?: string;
  showText?: boolean;
};

export function CountryFlag({
  country,
  className,
  flagClassName,
  textClassName,
  showText = true
}: CountryFlagProps) {
  const resolvedCountry = resolveCountry(country);

  if (!resolvedCountry.name && !resolvedCountry.flag) {
    return null;
  }

  if (!showText && !resolvedCountry.flag) {
    return null;
  }

  return (
    <span className={cn("inline-flex min-w-0 max-w-full items-center gap-1 align-baseline", className)}>
      {resolvedCountry.flag ? (
        <span
          aria-hidden="true"
          className={cn("shrink-0 text-[0.95em] leading-none", flagClassName)}
          style={FLAG_STYLE}
        >
          {resolvedCountry.flag}
        </span>
      ) : null}
      {showText ? <span className={cn("truncate", textClassName)}>{resolvedCountry.name}</span> : null}
    </span>
  );
}

type LocationCountryTextProps = {
  city?: string | null;
  country: string | null | undefined;
  className?: string;
  cityClassName?: string;
  countryClassName?: string;
  separatorClassName?: string;
};

export function LocationCountryText({
  city,
  country,
  className,
  cityClassName,
  countryClassName,
  separatorClassName
}: LocationCountryTextProps) {
  const normalizedCity = city?.trim() ?? "";
  const resolvedCountry = resolveCountry(country);

  if (!normalizedCity && !resolvedCountry.name) {
    return null;
  }

  return (
    <span className={cn("inline-flex min-w-0 max-w-full items-center gap-1 align-baseline", className)}>
      {normalizedCity ? <span className={cn("truncate", cityClassName)}>{normalizedCity}</span> : null}
      {normalizedCity && resolvedCountry.name ? (
        <span className={cn("shrink-0 opacity-60", separatorClassName)}>,</span>
      ) : null}
      {resolvedCountry.name ? (
        <CountryFlag
          country={country}
          className="min-w-0 max-w-full"
          textClassName={cn("truncate", countryClassName)}
        />
      ) : null}
    </span>
  );
}
