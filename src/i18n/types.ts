export type Language = "es" | "en" | "fr";

export const languageOptions = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
] as const;
