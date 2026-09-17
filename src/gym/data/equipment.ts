import type { Equipment } from "../types";

export interface EquipmentInfo {
  id: Equipment;
  label: string;
  group: "free_weights" | "machines" | "rigs" | "accessories" | "cardio";
}

export const EQUIPMENT: EquipmentInfo[] = [
  { id: "bodyweight", label: "Bodyweight", group: "free_weights" },
  { id: "barbell", label: "Barbell", group: "free_weights" },
  { id: "ez_bar", label: "EZ bar", group: "free_weights" },
  { id: "dumbbell", label: "Dumbbells", group: "free_weights" },
  { id: "kettlebell", label: "Kettlebells", group: "free_weights" },
  { id: "plate", label: "Weight plates", group: "free_weights" },
  { id: "squat_rack", label: "Squat rack", group: "rigs" },
  { id: "bench_flat", label: "Flat bench", group: "rigs" },
  { id: "bench_adjustable", label: "Adjustable bench", group: "rigs" },
  { id: "smith_machine", label: "Smith machine", group: "machines" },
  { id: "cable_machine", label: "Cable machine", group: "machines" },
  { id: "lat_pulldown", label: "Lat pulldown", group: "machines" },
  { id: "seated_row_machine", label: "Seated row machine", group: "machines" },
  { id: "chest_press_machine", label: "Chest press machine", group: "machines" },
  { id: "shoulder_press_machine", label: "Shoulder press machine", group: "machines" },
  { id: "pec_deck", label: "Pec deck", group: "machines" },
  { id: "leg_press", label: "Leg press", group: "machines" },
  { id: "hack_squat", label: "Hack squat", group: "machines" },
  { id: "leg_curl_machine", label: "Leg curl machine", group: "machines" },
  { id: "leg_extension_machine", label: "Leg extension machine", group: "machines" },
  { id: "calf_raise_machine", label: "Calf raise machine", group: "machines" },
  { id: "glute_machine", label: "Hip thrust / glute machine", group: "machines" },
  { id: "pullup_bar", label: "Pull-up bar", group: "rigs" },
  { id: "dip_station", label: "Dip bars", group: "rigs" },
  { id: "landmine", label: "Landmine", group: "rigs" },
  { id: "resistance_band", label: "Resistance bands", group: "accessories" },
  { id: "suspension_trainer", label: "Suspension trainer (TRX)", group: "accessories" },
  { id: "medicine_ball", label: "Medicine ball", group: "accessories" },
  { id: "ab_wheel", label: "Ab wheel", group: "accessories" },
  { id: "plyo_box", label: "Plyo box / step", group: "accessories" },
  { id: "sled", label: "Prowler / sled", group: "accessories" },
  { id: "battle_ropes", label: "Battle ropes", group: "accessories" },
  { id: "jump_rope", label: "Skipping rope", group: "accessories" },
  { id: "mat", label: "Exercise mat", group: "accessories" },
  { id: "treadmill", label: "Treadmill", group: "cardio" },
  { id: "stationary_bike", label: "Exercise bike", group: "cardio" },
  { id: "rower", label: "Rowing machine", group: "cardio" },
  { id: "ski_erg", label: "Ski erg", group: "cardio" },
  { id: "stair_machine", label: "Stair climber", group: "cardio" },
  { id: "elliptical", label: "Cross trainer", group: "cardio" },
];

export const EQUIPMENT_LABEL: Record<Equipment, string> = EQUIPMENT.reduce(
  (acc, item) => {
    acc[item.id] = item.label;
    return acc;
  },
  {} as Record<Equipment, string>,
);

export const EQUIPMENT_GROUPS: { id: EquipmentInfo["group"]; label: string }[] = [
  { id: "free_weights", label: "Free weights" },
  { id: "rigs", label: "Racks & benches" },
  { id: "machines", label: "Machines" },
  { id: "accessories", label: "Accessories" },
  { id: "cardio", label: "Cardio" },
];

/** A typical commercial gym: everything. */
export const FULL_GYM: Equipment[] = EQUIPMENT.map((e) => e.id);

/** A garage or hotel setup. */
export const HOME_BASIC: Equipment[] = [
  "bodyweight",
  "dumbbell",
  "resistance_band",
  "mat",
  "bench_flat",
  "bench_adjustable",
  "pullup_bar",
  "jump_rope",
];

export const BODYWEIGHT_ONLY: Equipment[] = ["bodyweight", "mat", "pullup_bar"];

export const PRESETS: { id: string; label: string; description: string; equipment: Equipment[] }[] = [
  {
    id: "full_gym",
    label: "Full gym",
    description: "Commercial gym with racks, machines and cardio",
    equipment: FULL_GYM,
  },
  {
    id: "free_weights",
    label: "Free weights gym",
    description: "Barbells, dumbbells, racks and benches, no machines",
    equipment: [
      "bodyweight",
      "barbell",
      "ez_bar",
      "dumbbell",
      "kettlebell",
      "plate",
      "squat_rack",
      "bench_flat",
      "bench_adjustable",
      "pullup_bar",
      "dip_station",
      "cable_machine",
      "mat",
    ],
  },
  {
    id: "home",
    label: "Home setup",
    description: "Dumbbells, a bench, bands and a pull-up bar",
    equipment: HOME_BASIC,
  },
  {
    id: "bodyweight",
    label: "Bodyweight",
    description: "You, a mat and a doorway pull-up bar",
    equipment: BODYWEIGHT_ONLY,
  },
];
