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

export type EventType =
  | "health_check"
  | "vet_visit"
  | "vaccine"
  | "transfer"
  | "feeding_note"
  | "incident"
  | "note"
  | "other";

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
  created_at: string;
  updated_at: string;
  event_count?: number;
}

export interface AnimalEvent {
  id: string;
  animal_id: string;
  event_type: EventType;
  event_date: string;
  title: string;
  notes: string | null;
  created_at: string;
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
    "bg-[color-mix(in_oklch,var(--success)_15%,transparent)] text-[var(--success)]",
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

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  health_check: "Health check",
  vet_visit: "Vet visit",
  vaccine: "Vaccine",
  transfer: "Transfer",
  feeding_note: "Feeding note",
  incident: "Incident",
  note: "Note",
  other: "Other",
};

export const EVENT_TYPE_CLASSES: Record<EventType, string> = {
  health_check: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  vet_visit: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  vaccine: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  transfer: "bg-muted text-muted-foreground",
  feeding_note: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  incident: "bg-[color-mix(in_oklch,var(--destructive)_16%,transparent)] text-[var(--destructive)]",
  note: "bg-muted text-muted-foreground",
  other: "bg-muted text-muted-foreground",
};
