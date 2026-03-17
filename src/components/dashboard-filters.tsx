"use client";

import { cn } from "@/lib/utils";

const RATING_OPTIONS = [
  { id: "5", label: "5 stars", value: "five" as const },
  { id: "4", label: "4 stars", value: "four" as const },
  { id: "1-3", label: "Needs attention (1–3★)", value: "attention" as const },
] as const;

export type RatingFilterValue = "five" | "four" | "attention";

export interface DashboardFiltersState {
  locations: Set<string>;
  ratings: Set<RatingFilterValue>;
}

export interface LocationOption {
  id: string;
  title: string;
}

interface DashboardFiltersProps {
  filters: DashboardFiltersState;
  onChange: (f: DashboardFiltersState) => void;
  locations: LocationOption[];
  className?: string;
}

export function DashboardFilters({ filters, onChange, locations, className }: DashboardFiltersProps) {
  const locationChecked = (id: string) => filters.locations.has(id);
  const ratingChecked = (v: RatingFilterValue) => filters.ratings.has(v);

  const toggleLocation = (id: string) => {
    // Act like tabs: selecting a location focuses that single location
    onChange({ ...filters, locations: new Set([id]) });
  };

  const toggleRating = (v: RatingFilterValue) => {
    // Act like tabs: selecting a rating focuses that single rating
    onChange({ ...filters, ratings: new Set([v]) });
  };

  const locationIds = locations.map((l) => l.id);
  const selectAllLocations = () => {
    onChange({ ...filters, locations: new Set(locationIds) });
  };
  const clearAllLocations = () => {
    onChange({ ...filters, locations: new Set() });
  };

  const selectAllRatings = () => {
    onChange({ ...filters, ratings: new Set(RATING_OPTIONS.map((o) => o.value)) });
  };
  const clearAllRatings = () => {
    onChange({ ...filters, ratings: new Set() });
  };

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {locations.length > 0 && (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Location</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={selectAllLocations}
              className="text-muted-foreground hover:text-foreground text-xs underline"
            >
              All
            </button>
            <span className="text-muted-foreground text-xs">/</span>
            <button
              type="button"
              onClick={clearAllLocations}
              className="text-muted-foreground hover:text-foreground text-xs underline"
            >
              None
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          {locations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => toggleLocation(loc.id)}
              aria-pressed={locationChecked(loc.id)}
              aria-label={loc.title}
              className={cn(
                "filter-item w-full rounded-md border px-2.5 py-2 text-left text-sm transition-colors",
                locationChecked(loc.id)
                  ? "border-transparent bg-muted text-foreground"
                  : "border-border/40 text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {loc.title}
            </button>
          ))}
        </div>
      </div>
      )}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Rating</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={selectAllRatings}
              className="text-muted-foreground hover:text-foreground text-xs underline"
            >
              All
            </button>
            <span className="text-muted-foreground text-xs">/</span>
            <button
              type="button"
              onClick={clearAllRatings}
              className="text-muted-foreground hover:text-foreground text-xs underline"
            >
              None
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          {RATING_OPTIONS.map(({ id, label, value }) => (
            <button
              key={id}
              type="button"
              onClick={() => toggleRating(value)}
              aria-pressed={ratingChecked(value)}
              aria-label={label}
              className={cn(
                "filter-item w-full rounded-md border px-2.5 py-2 text-left text-sm transition-colors",
                ratingChecked(value)
                  ? "border-transparent bg-muted text-foreground"
                  : "border-border/40 text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function getDefaultFilters(locationIds: string[] = []): DashboardFiltersState {
  return {
    locations: new Set(locationIds),
    ratings: new Set(RATING_OPTIONS.map((o) => o.value)),
  };
}

export function filterReviewsByLocationAndRating<T extends { locationName: string; starRating: string }>(
  reviews: T[],
  filters: DashboardFiltersState,
  starNum: (r: T) => number
): T[] {
  return reviews.filter((r) => {
    const locationMatch = filters.locations.size === 0 || filters.locations.has(r.locationName);
    if (!locationMatch) return false;
    const n = starNum(r);
    if (filters.ratings.size === 0) return true;
    if (n === 5 && filters.ratings.has("five")) return true;
    if (n === 4 && filters.ratings.has("four")) return true;
    if (n >= 1 && n <= 3 && filters.ratings.has("attention")) return true;
    return false;
  });
}
