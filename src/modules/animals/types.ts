export type AnimalStatus =
  | "active"
  | "observation"
  | "quarantine"
  | "sick"
  | "transferred"
  | "retired"
  | "deceased"
  | "archived";

export type AnimalSex = "male" | "female" | "unknown";

export interface Animal {
  id: string;
  organization_id: string;
  location_id: string | null;
  location_name: string | null;
  name: string;
  species: string;
  sex: AnimalSex | null;
  status: AnimalStatus;
  estimated_birth_date: string | null;
  arrival_date: string | null;
  microchip_id: string | null;
  notes: string | null;
  last_vaccination_date: string | null;
  next_vaccination_date: string | null;
  vaccination_passport: boolean;
  created_at: string;
  updated_at: string;
  event_count?: number;
}

export const STATUS_LABELS: Record<AnimalStatus, string> = {
  active: "Active",
  observation: "Under observation",
  quarantine: "Quarantine",
  sick: "Sick",
  transferred: "Transferred",
  retired: "Retired",
  deceased: "Deceased",
  archived: "Archived",
};

export const STATUS_CLASSES: Record<AnimalStatus, string> = {
  active:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  observation:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  quarantine:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  sick:
    "bg-[color-mix(in_oklch,var(--destructive)_16%,transparent)] text-[var(--destructive)]",
  transferred:
    "bg-muted text-muted-foreground",
  retired:
    "bg-muted text-muted-foreground",
  deceased:
    "bg-muted text-muted-foreground/60",
  archived:
    "bg-muted text-muted-foreground/50",
};

export const ANIMAL_SPECIES = ["Capybara", "Meerkat"] as const;
export type AnimalSpecies = typeof ANIMAL_SPECIES[number];
