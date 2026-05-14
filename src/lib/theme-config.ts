export type AppTheme = "capybara" | "forest";

export const THEMES: { id: AppTheme; label: string; description: string }[] = [
  {
    id: "capybara",
    label: "Capybara Coffee",
    description: "Brand palette — cream, espresso, amber & sage",
  },
  {
    id: "forest",
    label: "Forest",
    description: "Original green theme",
  },
];
