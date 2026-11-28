"use client";

import { useId, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import {
  DashboardFilters,
  type DashboardFiltersState,
  type LocationOption,
  type RatingFilterValue,
} from "@/components/dashboard-filters";

const RATING_ORDER: RatingFilterValue[] = ["five", "four", "three", "two", "one"];

const RATING_LABELS: Record<RatingFilterValue, string> = {
  five: "5★",
  four: "4★",
  three: "3★",
  two: "2★",
  one: "1★",
};

interface ReviewsFilterPanelProps {
  filters: DashboardFiltersState;
  onChange: (filters: DashboardFiltersState) => void;
  locations: LocationOption[];
}

/**
 * Reviews filter rail. On desktop it is always open; below 900px it collapses
 * behind a disclosure so the review list starts higher, while the active
 * filters stay visible as a text summary.
 */
export function ReviewsFilterPanel({ filters, onChange, locations }: ReviewsFilterPanelProps) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  const allLocationsSelected =
    locations.length > 0 && filters.locations.size === locations.length;
  const selectedLocations = locations
    .filter((location) => filters.locations.has(location.id))
    .map((location) => location.title);
  const selectedRatings = RATING_ORDER.filter((rating) => filters.ratings.has(rating));

  const locationChips = allLocationsSelected
    ? [{ label: "All locations", tone: "muted" as const }]
    : selectedLocations.length === 0
      ? [{ label: "No locations", tone: "warn" as const }]
      : selectedLocations.map((label) => ({ label, tone: "active" as const }));

  const ratingChips =
    selectedRatings.length === 0
      ? [{ label: "No ratings", tone: "warn" as const }]
      : selectedRatings.length === RATING_ORDER.length
        ? [{ label: "All ratings", tone: "muted" as const }]
        : selectedRatings.map((rating) => ({
            label: RATING_LABELS[rating],
            tone: "active" as const,
          }));

  return (
    <aside
      className="revs-filter-panel"
      aria-label="Review filters"
      data-open={open ? "true" : "false"}
    >
      <div className="revs-filter-head">
        <h2 className="revs-filter-title">Filters</h2>
        <button
          type="button"
          className="revs-filter-toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          aria-label={open ? "Hide filters" : "Show filters"}
          onClick={() => setOpen((value) => !value)}
        >
          <span>{open ? "Hide" : "Show"}</span>
          <ChevronDownIcon aria-hidden />
        </button>
      </div>

      <div className="revs-filter-active" role="group" aria-label="Active filters">
        {[...locationChips, ...ratingChips].map((chip, index) => (
          <span
            key={`${chip.label}-${index}`}
            className="revs-filter-chip"
            data-tone={chip.tone}
          >
            {chip.label}
          </span>
        ))}
      </div>

      <div className="revs-filter-body" id={bodyId}>
        <DashboardFilters filters={filters} onChange={onChange} locations={locations} />
      </div>
    </aside>
  );
}
