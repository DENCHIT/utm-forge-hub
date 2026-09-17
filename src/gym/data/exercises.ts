import type { Exercise, ExerciseKind, Equipment, MovementPattern, MuscleGroup } from "../types";

const ALL_LEVELS = ["beginner", "intermediate", "advanced"] as const;

function mk(
  id: string,
  name: string,
  kind: ExerciseKind,
  pattern: MovementPattern,
  primary: MuscleGroup[],
  secondary: MuscleGroup[],
  equipment: Equipment[],
  opts: Partial<Exercise> = {},
): Exercise {
  return {
    id,
    name,
    kind,
    pattern,
    primary,
    secondary,
    equipment,
    loadType: "weight",
    unilateral: false,
    fatigue: 3,
    levels: [...ALL_LEVELS],
    cues: [],
    ...opts,
  };
}

export const EXERCISES: Exercise[] = [
  // ---------------------------------------------------------------- horizontal push
  mk("barbell_bench_press", "Barbell bench press", "compound", "horizontal_push", ["chest"], ["triceps", "front_delts"], ["barbell", "bench_flat"], {
    fatigue: 4,
    levels: ["intermediate", "advanced"],
    cues: ["Squeeze the shoulder blades down and back", "Touch the bar to the lower chest, elbows around 45 degrees"],
    contraindications: ["shoulder"],
  }),
  mk("incline_barbell_press", "Incline barbell press", "compound", "horizontal_push", ["chest", "front_delts"], ["triceps"], ["barbell", "bench_adjustable"], {
    fatigue: 4,
    levels: ["intermediate", "advanced"],
    cues: ["Bench at roughly 30 degrees", "Bar path finishes over the collarbone"],
    contraindications: ["shoulder"],
  }),
  mk("dumbbell_bench_press", "Dumbbell bench press", "compound", "horizontal_push", ["chest"], ["triceps", "front_delts"], ["dumbbell", "bench_flat"], {
    fatigue: 3,
    cues: ["Wrists stacked over elbows", "Lower until you feel a stretch, do not bounce"],
  }),
  mk("incline_dumbbell_press", "Incline dumbbell press", "compound", "horizontal_push", ["chest", "front_delts"], ["triceps"], ["dumbbell", "bench_adjustable"], {
    fatigue: 3,
    cues: ["Keep the ribs down", "Press slightly inwards at the top"],
  }),
  mk("machine_chest_press", "Machine chest press", "compound", "horizontal_push", ["chest"], ["triceps", "front_delts"], ["chest_press_machine"], {
    fatigue: 2,
    cues: ["Set the handles level with the mid chest", "Control the return, no clanging"],
  }),
  mk("smith_bench_press", "Smith machine bench press", "compound", "horizontal_push", ["chest"], ["triceps", "front_delts"], ["smith_machine", "bench_flat"], {
    fatigue: 3,
    cues: ["Set the safeties at chest height", "Feet planted, glutes on the bench"],
  }),
  mk("push_up", "Press-up", "compound", "horizontal_push", ["chest"], ["triceps", "front_delts", "abs"], ["bodyweight"], {
    loadType: "bodyweight",
    fatigue: 2,
    cues: ["Body in one straight line", "Elbows tucked to about 45 degrees"],
  }),
  mk("dip", "Dip", "compound", "horizontal_push", ["chest", "triceps"], ["front_delts"], ["dip_station"], {
    loadType: "weighted_bodyweight",
    fatigue: 4,
    levels: ["intermediate", "advanced"],
    cues: ["Lean forward slightly for chest", "Stop when the upper arm is parallel to the floor"],
    contraindications: ["shoulder"],
  }),
  mk("cable_fly", "Cable fly", "isolation", "horizontal_push", ["chest"], ["front_delts"], ["cable_machine"], {
    fatigue: 2,
    cues: ["Soft bend in the elbows throughout", "Think about hugging a barrel"],
  }),
  mk("pec_deck_fly", "Pec deck", "isolation", "horizontal_push", ["chest"], [], ["pec_deck"], {
    fatigue: 2,
    cues: ["Set the seat so the handles sit at chest height", "Pause for a beat at the squeeze"],
  }),
  mk("dumbbell_fly", "Dumbbell fly", "isolation", "horizontal_push", ["chest"], ["front_delts"], ["dumbbell", "bench_flat"], {
    fatigue: 2,
    cues: ["Wide arc, elbows slightly bent", "Stop the stretch before the shoulder complains"],
    contraindications: ["shoulder"],
  }),
  mk("band_chest_press", "Band chest press", "compound", "horizontal_push", ["chest"], ["triceps", "front_delts"], ["resistance_band"], {
    fatigue: 2,
    cues: ["Anchor the band at chest height", "Resist the band on the way back"],
  }),
  mk("suspension_push_up", "Suspension press-up", "compound", "horizontal_push", ["chest"], ["triceps", "abs"], ["suspension_trainer"], {
    loadType: "bodyweight",
    fatigue: 3,
    cues: ["Walk the feet forward to make it harder", "Keep the straps tight to the body"],
  }),
  mk("close_grip_bench", "Close grip bench press", "compound", "elbow_extension", ["triceps"], ["chest", "front_delts"], ["barbell", "bench_flat"], {
    fatigue: 3,
    levels: ["intermediate", "advanced"],
    cues: ["Hands just inside shoulder width", "Tuck the elbows on the way down"],
    contraindications: ["elbow", "wrist"],
  }),
  mk("landmine_press", "Landmine press", "compound", "vertical_push", ["front_delts"], ["chest", "triceps", "abs"], ["landmine", "barbell"], {
    fatigue: 3,
    unilateral: true,
    cues: ["Stagger the stance", "Press up and slightly across the body"],
  }),

  // ---------------------------------------------------------------- vertical push
  mk("overhead_press", "Standing overhead press", "compound", "vertical_push", ["front_delts"], ["triceps", "abs", "side_delts"], ["barbell", "squat_rack"], {
    fatigue: 4,
    levels: ["intermediate", "advanced"],
    cues: ["Squeeze the glutes, ribs down", "Push the head through once the bar passes the forehead"],
    contraindications: ["shoulder", "lower_back"],
  }),
  mk("dumbbell_shoulder_press", "Dumbbell shoulder press", "compound", "vertical_push", ["front_delts"], ["triceps", "side_delts"], ["dumbbell"], {
    fatigue: 3,
    cues: ["Start at ear height", "Do not let the elbows flare behind the body"],
  }),
  mk("machine_shoulder_press", "Machine shoulder press", "compound", "vertical_push", ["front_delts"], ["triceps"], ["shoulder_press_machine"], {
    fatigue: 2,
    cues: ["Back flat against the pad", "Stop just short of locking out"],
  }),
  mk("arnold_press", "Arnold press", "compound", "vertical_push", ["front_delts", "side_delts"], ["triceps"], ["dumbbell", "bench_adjustable"], {
    fatigue: 3,
    levels: ["intermediate", "advanced"],
    cues: ["Rotate the palms as you press", "Keep the movement slow and deliberate"],
  }),
  mk("pike_push_up", "Pike press-up", "compound", "vertical_push", ["front_delts"], ["triceps"], ["bodyweight"], {
    loadType: "bodyweight",
    fatigue: 3,
    cues: ["Hips high, head between the hands", "Crown of the head towards the floor"],
  }),
  mk("band_overhead_press", "Band overhead press", "compound", "vertical_push", ["front_delts"], ["triceps"], ["resistance_band"], {
    fatigue: 2,
    cues: ["Stand on the band with both feet", "Keep the wrists neutral"],
  }),

  // ---------------------------------------------------------------- horizontal pull
  mk("barbell_row", "Barbell row", "compound", "horizontal_pull", ["upper_back", "lats"], ["biceps", "rear_delts", "lower_back"], ["barbell"], {
    fatigue: 4,
    levels: ["intermediate", "advanced"],
    cues: ["Hinge to about 45 degrees and hold it", "Pull to the belly button, not the chest"],
    contraindications: ["lower_back"],
  }),
  mk("dumbbell_row", "Single arm dumbbell row", "compound", "horizontal_pull", ["lats", "upper_back"], ["biceps", "rear_delts"], ["dumbbell", "bench_flat"], {
    fatigue: 3,
    unilateral: true,
    cues: ["Drive the elbow back past the ribs", "Do not twist the torso to finish the rep"],
  }),
  mk("chest_supported_row", "Chest supported row", "compound", "horizontal_pull", ["upper_back", "rear_delts"], ["lats", "biceps"], ["dumbbell", "bench_adjustable"], {
    fatigue: 2,
    cues: ["Chest stays glued to the pad", "Squeeze the shoulder blades at the top"],
  }),
  mk("seated_cable_row", "Seated cable row", "compound", "horizontal_pull", ["upper_back", "lats"], ["biceps", "rear_delts"], ["cable_machine"], {
    fatigue: 2,
    cues: ["Sit tall, no rocking", "Lead with the elbows"],
  }),
  mk("machine_row", "Machine row", "compound", "horizontal_pull", ["upper_back", "lats"], ["biceps"], ["seated_row_machine"], {
    fatigue: 2,
    cues: ["Set the chest pad snug", "Full stretch at the front"],
  }),
  mk("inverted_row", "Inverted row", "compound", "horizontal_pull", ["upper_back", "lats"], ["biceps"], ["squat_rack", "barbell"], {
    loadType: "bodyweight",
    fatigue: 2,
    cues: ["Body rigid from heels to head", "Touch the chest to the bar"],
  }),
  mk("landmine_row", "Landmine row", "compound", "horizontal_pull", ["upper_back", "lats"], ["biceps"], ["landmine", "barbell"], {
    fatigue: 3,
    cues: ["Hinge and brace", "Pull towards the hip"],
    contraindications: ["lower_back"],
  }),
  mk("band_row", "Band row", "compound", "horizontal_pull", ["upper_back", "lats"], ["biceps"], ["resistance_band"], {
    fatigue: 2,
    cues: ["Anchor at chest height", "Pause at full contraction"],
  }),
  mk("suspension_row", "Suspension row", "compound", "horizontal_pull", ["upper_back", "lats"], ["biceps"], ["suspension_trainer"], {
    loadType: "bodyweight",
    fatigue: 2,
    cues: ["Walk the feet forward to increase difficulty", "Keep the hips level with the shoulders"],
  }),
  mk("face_pull", "Face pull", "isolation", "shoulder_raise", ["rear_delts"], ["upper_back", "traps"], ["cable_machine"], {
    fatigue: 1,
    cues: ["Pull to the forehead, elbows high", "Finish with a external rotation"],
  }),
  mk("band_face_pull", "Band face pull", "isolation", "shoulder_raise", ["rear_delts"], ["upper_back"], ["resistance_band"], {
    fatigue: 1,
    cues: ["Anchor at eye level", "Thumbs back at the finish"],
  }),

  // ---------------------------------------------------------------- vertical pull
  mk("pull_up", "Pull-up", "compound", "vertical_pull", ["lats"], ["biceps", "upper_back"], ["pullup_bar"], {
    loadType: "weighted_bodyweight",
    fatigue: 4,
    levels: ["intermediate", "advanced"],
    cues: ["Start from a dead hang", "Pull the chest to the bar, not the chin over it"],
  }),
  mk("chin_up", "Chin-up", "compound", "vertical_pull", ["lats", "biceps"], ["upper_back"], ["pullup_bar"], {
    loadType: "weighted_bodyweight",
    fatigue: 4,
    levels: ["intermediate", "advanced"],
    cues: ["Underhand grip, shoulder width", "Keep the ribs down at the top"],
  }),
  mk("lat_pulldown", "Lat pulldown", "compound", "vertical_pull", ["lats"], ["biceps", "upper_back"], ["lat_pulldown"], {
    fatigue: 2,
    cues: ["Lean back slightly and hold it", "Pull the bar to the collarbone"],
  }),
  mk("neutral_grip_pulldown", "Neutral grip pulldown", "compound", "vertical_pull", ["lats"], ["biceps"], ["lat_pulldown"], {
    fatigue: 2,
    cues: ["Palms facing each other", "Drive the elbows down towards the hips"],
  }),
  mk("band_pulldown", "Band pulldown", "compound", "vertical_pull", ["lats"], ["biceps"], ["resistance_band"], {
    fatigue: 2,
    cues: ["Anchor above head height", "Keep the chest proud"],
  }),
  mk("straight_arm_pulldown", "Straight arm pulldown", "isolation", "vertical_pull", ["lats"], [], ["cable_machine"], {
    fatigue: 1,
    cues: ["Soft elbows, locked in place", "Sweep the bar to the thighs"],
  }),

  // ---------------------------------------------------------------- squat
  mk("back_squat", "Back squat", "compound", "squat", ["quads", "glutes"], ["hamstrings", "abs", "lower_back"], ["barbell", "squat_rack"], {
    fatigue: 5,
    levels: ["intermediate", "advanced"],
    cues: ["Brace as if about to be punched", "Knees track over the middle toes"],
    contraindications: ["knee", "lower_back"],
  }),
  mk("front_squat", "Front squat", "compound", "squat", ["quads"], ["glutes", "abs", "upper_back"], ["barbell", "squat_rack"], {
    fatigue: 5,
    levels: ["advanced"],
    cues: ["Elbows high throughout", "Stay upright, let the knees travel"],
    contraindications: ["knee", "wrist"],
  }),
  mk("goblet_squat", "Goblet squat", "compound", "squat", ["quads", "glutes"], ["abs"], ["dumbbell"], {
    fatigue: 3,
    cues: ["Hold the weight against the chest", "Sit between the hips, chest tall"],
  }),
  mk("leg_press", "Leg press", "compound", "squat", ["quads", "glutes"], ["hamstrings"], ["leg_press"], {
    fatigue: 3,
    cues: ["Feet shoulder width on the platform", "Do not let the lower back round at the bottom"],
  }),
  mk("hack_squat_machine", "Hack squat", "compound", "squat", ["quads"], ["glutes"], ["hack_squat"], {
    fatigue: 4,
    cues: ["Back flat on the pad", "Control the descent for three seconds"],
    contraindications: ["knee"],
  }),
  mk("smith_squat", "Smith machine squat", "compound", "squat", ["quads", "glutes"], ["hamstrings"], ["smith_machine"], {
    fatigue: 4,
    cues: ["Feet slightly in front of the bar", "Set the safeties before you start"],
  }),
  mk("bodyweight_squat", "Bodyweight squat", "compound", "squat", ["quads", "glutes"], ["abs"], ["bodyweight"], {
    loadType: "bodyweight",
    fatigue: 2,
    cues: ["Arms out for balance", "Full depth, controlled tempo"],
  }),

  // ---------------------------------------------------------------- hinge
  mk("deadlift", "Conventional deadlift", "compound", "hinge", ["hamstrings", "glutes", "lower_back"], ["upper_back", "traps", "forearms"], ["barbell"], {
    fatigue: 5,
    levels: ["intermediate", "advanced"],
    cues: ["Bar over mid foot, shins to the bar", "Push the floor away, do not yank"],
    contraindications: ["lower_back"],
  }),
  mk("romanian_deadlift", "Romanian deadlift", "compound", "hinge", ["hamstrings", "glutes"], ["lower_back"], ["barbell"], {
    fatigue: 4,
    levels: ["intermediate", "advanced"],
    cues: ["Push the hips back, soft knees", "Stop when the hamstrings run out of stretch"],
    contraindications: ["lower_back"],
  }),
  mk("dumbbell_rdl", "Dumbbell Romanian deadlift", "compound", "hinge", ["hamstrings", "glutes"], ["lower_back"], ["dumbbell"], {
    fatigue: 3,
    cues: ["Weights stay close to the legs", "Hinge, do not squat"],
    contraindications: ["lower_back"],
  }),
  mk("hip_thrust", "Barbell hip thrust", "compound", "hinge", ["glutes"], ["hamstrings"], ["barbell", "bench_flat"], {
    fatigue: 3,
    cues: ["Chin tucked, ribs down", "Squeeze hard at the top for a second"],
  }),
  mk("machine_hip_thrust", "Machine hip thrust", "compound", "hinge", ["glutes"], ["hamstrings"], ["glute_machine"], {
    fatigue: 2,
    cues: ["Drive through the heels", "Full lockout every rep"],
  }),
  mk("glute_bridge", "Glute bridge", "isolation", "hinge", ["glutes"], ["hamstrings"], ["mat"], {
    loadType: "bodyweight",
    fatigue: 1,
    cues: ["Posterior tilt before you lift", "Hold the top for two seconds"],
  }),
  mk("kettlebell_swing", "Kettlebell swing", "compound", "hinge", ["glutes", "hamstrings"], ["abs", "lower_back"], ["kettlebell"], {
    fatigue: 3,
    levels: ["intermediate", "advanced"],
    cues: ["Hips snap, arms are just rope", "Bell floats to chest height"],
    contraindications: ["lower_back"],
  }),
  mk("back_extension", "Back extension", "isolation", "hinge", ["lower_back", "glutes"], ["hamstrings"], ["bench_adjustable"], {
    loadType: "bodyweight",
    fatigue: 2,
    cues: ["Round then extend under control", "Stop level with the torso, do not hyperextend"],
  }),
  mk("good_morning", "Good morning", "compound", "hinge", ["hamstrings"], ["glutes", "lower_back"], ["barbell", "squat_rack"], {
    fatigue: 4,
    levels: ["advanced"],
    cues: ["Light load, this is not a squat", "Keep the spine neutral"],
    contraindications: ["lower_back"],
  }),
  mk("single_leg_rdl", "Single leg Romanian deadlift", "compound", "hinge", ["hamstrings", "glutes"], ["abs"], ["dumbbell"], {
    fatigue: 2,
    unilateral: true,
    cues: ["Hips square to the floor", "Free leg extends behind as a counterweight"],
  }),
  mk("cable_pull_through", "Cable pull-through", "isolation", "hinge", ["glutes"], ["hamstrings"], ["cable_machine"], {
    fatigue: 2,
    cues: ["Face away from the stack", "Finish with a hard glute squeeze"],
  }),

  // ---------------------------------------------------------------- lunge
  mk("walking_lunge", "Walking lunge", "compound", "lunge", ["quads", "glutes"], ["hamstrings", "abs"], ["dumbbell"], {
    fatigue: 3,
    unilateral: true,
    cues: ["Long step, torso upright", "Back knee lightly kisses the floor"],
    contraindications: ["knee"],
  }),
  mk("reverse_lunge", "Reverse lunge", "compound", "lunge", ["quads", "glutes"], ["hamstrings"], ["dumbbell"], {
    fatigue: 3,
    unilateral: true,
    cues: ["Step back, not forward, to spare the knee", "Front shin stays fairly vertical"],
  }),
  mk("bulgarian_split_squat", "Bulgarian split squat", "compound", "lunge", ["quads", "glutes"], ["hamstrings"], ["dumbbell", "bench_flat"], {
    fatigue: 4,
    unilateral: true,
    levels: ["intermediate", "advanced"],
    cues: ["Rear foot on the bench, laces down", "Lean forward slightly to bias the glute"],
    contraindications: ["knee"],
  }),
  mk("step_up", "Step-up", "compound", "lunge", ["quads", "glutes"], ["calves"], ["plyo_box", "dumbbell"], {
    fatigue: 3,
    unilateral: true,
    cues: ["Drive through the whole front foot", "Do not push off the back leg"],
  }),
  mk("bodyweight_lunge", "Bodyweight lunge", "compound", "lunge", ["quads", "glutes"], ["hamstrings"], ["bodyweight"], {
    loadType: "bodyweight",
    fatigue: 2,
    unilateral: true,
    cues: ["Control the descent", "Chest up throughout"],
  }),

  // ---------------------------------------------------------------- knee and hamstring isolation
  mk("leg_extension", "Leg extension", "isolation", "knee_isolation", ["quads"], [], ["leg_extension_machine"], {
    fatigue: 2,
    cues: ["Pause at the top", "Lower over three seconds"],
    contraindications: ["knee"],
  }),
  mk("lying_leg_curl", "Lying leg curl", "isolation", "knee_isolation", ["hamstrings"], ["calves"], ["leg_curl_machine"], {
    fatigue: 2,
    cues: ["Hips pressed into the pad", "Squeeze at the top"],
  }),
  mk("seated_leg_curl", "Seated leg curl", "isolation", "knee_isolation", ["hamstrings"], [], ["leg_curl_machine"], {
    fatigue: 2,
    cues: ["Strap tight across the thighs", "Full range, no bouncing"],
  }),
  mk("nordic_curl", "Nordic hamstring curl", "isolation", "knee_isolation", ["hamstrings"], ["glutes"], ["mat"], {
    loadType: "bodyweight",
    fatigue: 4,
    levels: ["advanced"],
    cues: ["Anchor the ankles", "Resist all the way down, push back up"],
  }),
  mk("band_leg_curl", "Band leg curl", "isolation", "knee_isolation", ["hamstrings"], [], ["resistance_band", "mat"], {
    fatigue: 1,
    cues: ["Anchor the band low behind you", "Slow eccentric"],
  }),

  // ---------------------------------------------------------------- calves and hips
  mk("standing_calf_raise", "Standing calf raise", "isolation", "calf", ["calves"], [], ["calf_raise_machine"], {
    fatigue: 1,
    cues: ["Full stretch at the bottom", "Pause two seconds at the top"],
  }),
  mk("seated_calf_raise", "Seated calf raise", "isolation", "calf", ["calves"], [], ["calf_raise_machine"], {
    fatigue: 1,
    cues: ["Knees bent to bias the soleus", "Slow and complete range"],
  }),
  mk("dumbbell_calf_raise", "Dumbbell calf raise", "isolation", "calf", ["calves"], [], ["dumbbell"], {
    fatigue: 1,
    cues: ["Stand on a plate or step for range", "Do not bounce out of the bottom"],
  }),
  mk("bodyweight_calf_raise", "Bodyweight calf raise", "isolation", "calf", ["calves"], [], ["bodyweight"], {
    loadType: "bodyweight",
    fatigue: 1,
    cues: ["One leg at a time if it is too easy", "Two seconds up, three seconds down"],
  }),
  mk("hip_abduction", "Hip abduction", "isolation", "hip_isolation", ["abductors", "glutes"], [], ["glute_machine"], {
    fatigue: 1,
    cues: ["Lean forward slightly to hit the upper glute", "Pause at the widest point"],
  }),
  mk("band_hip_abduction", "Band hip abduction", "isolation", "hip_isolation", ["abductors", "glutes"], [], ["resistance_band"], {
    fatigue: 1,
    cues: ["Band just above the knees", "Push the knees out and hold"],
  }),

  // ---------------------------------------------------------------- arms
  mk("barbell_curl", "Barbell curl", "isolation", "elbow_flexion", ["biceps"], ["forearms"], ["barbell"], {
    fatigue: 2,
    cues: ["Elbows pinned to the ribs", "No swinging, keep the torso still"],
    contraindications: ["wrist", "elbow"],
  }),
  mk("ez_bar_curl", "EZ bar curl", "isolation", "elbow_flexion", ["biceps"], ["forearms"], ["ez_bar"], {
    fatigue: 2,
    cues: ["Angled grip is kinder on the wrists", "Squeeze hard at the top"],
  }),
  mk("dumbbell_curl", "Dumbbell curl", "isolation", "elbow_flexion", ["biceps"], ["forearms"], ["dumbbell"], {
    fatigue: 2,
    cues: ["Supinate as you lift", "Lower over three seconds"],
  }),
  mk("hammer_curl", "Hammer curl", "isolation", "elbow_flexion", ["biceps", "forearms"], [], ["dumbbell"], {
    fatigue: 2,
    cues: ["Neutral grip throughout", "Keep the elbow from drifting forward"],
  }),
  mk("incline_curl", "Incline dumbbell curl", "isolation", "elbow_flexion", ["biceps"], [], ["dumbbell", "bench_adjustable"], {
    fatigue: 2,
    cues: ["Let the arms hang behind the body", "Big stretch is the whole point"],
  }),
  mk("cable_curl", "Cable curl", "isolation", "elbow_flexion", ["biceps"], ["forearms"], ["cable_machine"], {
    fatigue: 1,
    cues: ["Constant tension, do not rest at the bottom", "Stand a step back from the stack"],
  }),
  mk("band_curl", "Band curl", "isolation", "elbow_flexion", ["biceps"], ["forearms"], ["resistance_band"], {
    fatigue: 1,
    cues: ["Stand on the band", "Control the return"],
  }),
  mk("tricep_pushdown", "Tricep pushdown", "isolation", "elbow_extension", ["triceps"], [], ["cable_machine"], {
    fatigue: 1,
    cues: ["Elbows locked at the sides", "Full lockout, squeeze"],
  }),
  mk("overhead_tricep_extension", "Overhead tricep extension", "isolation", "elbow_extension", ["triceps"], [], ["dumbbell"], {
    fatigue: 2,
    cues: ["Elbows point forward, not out", "Deep stretch behind the head"],
    contraindications: ["elbow"],
  }),
  mk("skullcrusher", "Skullcrusher", "isolation", "elbow_extension", ["triceps"], [], ["ez_bar", "bench_flat"], {
    fatigue: 2,
    levels: ["intermediate", "advanced"],
    cues: ["Lower to the forehead or just behind", "Upper arms stay still"],
    contraindications: ["elbow"],
  }),
  mk("bench_dip", "Bench dip", "isolation", "elbow_extension", ["triceps"], ["front_delts"], ["bench_flat"], {
    loadType: "bodyweight",
    fatigue: 2,
    cues: ["Hips close to the bench", "Stop when the upper arms are parallel"],
    contraindications: ["shoulder"],
  }),
  mk("band_pushdown", "Band pushdown", "isolation", "elbow_extension", ["triceps"], [], ["resistance_band"], {
    fatigue: 1,
    cues: ["Anchor above head height", "Pause at full extension"],
  }),
  mk("diamond_push_up", "Diamond press-up", "isolation", "elbow_extension", ["triceps"], ["chest"], ["bodyweight"], {
    loadType: "bodyweight",
    fatigue: 2,
    cues: ["Hands form a triangle under the chest", "Elbows brush the ribs"],
    contraindications: ["wrist"],
  }),

  // ---------------------------------------------------------------- delts and traps
  mk("lateral_raise", "Lateral raise", "isolation", "shoulder_raise", ["side_delts"], [], ["dumbbell"], {
    fatigue: 1,
    cues: ["Lead with the elbows", "Stop at shoulder height, no higher"],
  }),
  mk("cable_lateral_raise", "Cable lateral raise", "isolation", "shoulder_raise", ["side_delts"], [], ["cable_machine"], {
    fatigue: 1,
    cues: ["Cable set at the lowest pin", "Tension from the very first inch"],
  }),
  mk("band_lateral_raise", "Band lateral raise", "isolation", "shoulder_raise", ["side_delts"], [], ["resistance_band"], {
    fatigue: 1,
    cues: ["Stand on the band", "Slow on the way down"],
  }),
  mk("rear_delt_fly", "Rear delt fly", "isolation", "shoulder_raise", ["rear_delts"], ["upper_back"], ["dumbbell"], {
    fatigue: 1,
    cues: ["Hinge over, chest towards the floor", "Thumbs turn down at the top"],
  }),
  mk("front_raise", "Front raise", "isolation", "shoulder_raise", ["front_delts"], [], ["dumbbell"], {
    fatigue: 1,
    cues: ["Raise to eye level", "No momentum from the hips"],
  }),
  mk("upright_row", "Upright row", "isolation", "shoulder_raise", ["side_delts", "traps"], ["biceps"], ["ez_bar"], {
    fatigue: 2,
    levels: ["intermediate", "advanced"],
    cues: ["Wide grip is kinder to the shoulder", "Elbows lead, stop at chest height"],
    contraindications: ["shoulder"],
  }),
  mk("shrug", "Shrug", "isolation", "shoulder_raise", ["traps"], ["forearms"], ["dumbbell"], {
    fatigue: 1,
    cues: ["Straight up, not rolling", "Hold the top for a beat"],
  }),

  // ---------------------------------------------------------------- core
  mk("plank", "Plank", "core", "core", ["abs"], ["obliques", "lower_back"], ["mat"], {
    loadType: "time",
    fatigue: 1,
    cues: ["Squeeze the glutes, tuck the ribs", "Hips level with the shoulders"],
  }),
  mk("side_plank", "Side plank", "core", "core", ["obliques"], ["abs"], ["mat"], {
    loadType: "time",
    fatigue: 1,
    unilateral: true,
    cues: ["Stack the feet and the hips", "Push the floor away"],
  }),
  mk("hanging_leg_raise", "Hanging leg raise", "core", "core", ["abs", "hip_flexors"], ["forearms"], ["pullup_bar"], {
    loadType: "bodyweight",
    fatigue: 3,
    levels: ["intermediate", "advanced"],
    cues: ["Posterior tilt, curl the pelvis", "No swinging between reps"],
  }),
  mk("cable_crunch", "Cable crunch", "core", "core", ["abs"], [], ["cable_machine"], {
    fatigue: 2,
    cues: ["Crunch the ribs to the hips", "Hips stay fixed"],
  }),
  mk("ab_wheel_rollout", "Ab wheel rollout", "core", "core", ["abs"], ["lats", "lower_back"], ["ab_wheel", "mat"], {
    loadType: "bodyweight",
    fatigue: 3,
    levels: ["intermediate", "advanced"],
    cues: ["Do not let the lower back arch", "Only roll as far as you can control"],
    contraindications: ["lower_back"],
  }),
  mk("dead_bug", "Dead bug", "core", "core", ["abs"], ["hip_flexors"], ["mat"], {
    loadType: "bodyweight",
    fatigue: 1,
    cues: ["Lower back glued to the floor", "Move slowly, breathe out on the extension"],
  }),
  mk("russian_twist", "Russian twist", "core", "core", ["obliques"], ["abs"], ["mat"], {
    loadType: "bodyweight",
    fatigue: 1,
    cues: ["Rotate from the ribs, not the arms", "Keep the chest tall"],
  }),
  mk("hollow_hold", "Hollow hold", "core", "core", ["abs"], ["hip_flexors"], ["mat"], {
    loadType: "time",
    fatigue: 2,
    cues: ["Press the lower back down", "Lower the limbs until it is hard but stable"],
  }),
  mk("pallof_press", "Pallof press", "core", "core", ["obliques", "abs"], [], ["cable_machine"], {
    fatigue: 1,
    unilateral: true,
    cues: ["Resist the rotation, do not create it", "Press straight out from the sternum"],
  }),
  mk("band_pallof_press", "Band Pallof press", "core", "core", ["obliques", "abs"], [], ["resistance_band"], {
    fatigue: 1,
    unilateral: true,
    cues: ["Anchor at chest height", "Stay square to the front"],
  }),
  mk("crunch", "Crunch", "core", "core", ["abs"], [], ["mat"], {
    loadType: "bodyweight",
    fatigue: 1,
    cues: ["Peel the shoulder blades off the floor", "Do not pull on the neck"],
  }),
  mk("leg_raise", "Lying leg raise", "core", "core", ["abs", "hip_flexors"], [], ["mat"], {
    loadType: "bodyweight",
    fatigue: 2,
    cues: ["Hands under the hips for support", "Lower until just before the back lifts"],
  }),
  mk("bird_dog", "Bird dog", "core", "core", ["lower_back", "abs"], ["glutes"], ["mat"], {
    loadType: "bodyweight",
    fatigue: 1,
    cues: ["Reach long, do not lift high", "Hips stay level"],
  }),

  // ---------------------------------------------------------------- carries
  mk("farmers_carry", "Farmer's carry", "compound", "carry", ["forearms", "traps"], ["abs", "glutes"], ["dumbbell"], {
    loadType: "time",
    fatigue: 3,
    cues: ["Tall posture, shoulders packed", "Short controlled steps"],
  }),
  mk("suitcase_carry", "Suitcase carry", "compound", "carry", ["obliques", "forearms"], ["traps", "abs"], ["kettlebell"], {
    loadType: "time",
    fatigue: 2,
    unilateral: true,
    cues: ["Resist the lean, stay vertical", "Switch hands each set"],
  }),

  // ---------------------------------------------------------------- conditioning
  mk("treadmill_intervals", "Treadmill intervals", "cardio", "conditioning", ["cardio"], ["quads", "calves"], ["treadmill"], {
    loadType: "time",
    fatigue: 3,
    cues: ["Thirty seconds hard, ninety seconds easy", "Build the speed gradually"],
  }),
  mk("incline_walk", "Incline walk", "cardio", "conditioning", ["cardio"], ["glutes", "calves"], ["treadmill"], {
    loadType: "time",
    fatigue: 1,
    cues: ["Ten to fifteen percent incline", "Do not hold the rails"],
  }),
  mk("bike_intervals", "Bike intervals", "cardio", "conditioning", ["cardio"], ["quads"], ["stationary_bike"], {
    loadType: "time",
    fatigue: 2,
    cues: ["Hard effort, then spin easy", "Keep the cadence above eighty"],
  }),
  mk("row_intervals", "Rowing intervals", "cardio", "conditioning", ["cardio"], ["upper_back", "quads"], ["rower"], {
    loadType: "time",
    fatigue: 3,
    cues: ["Legs, then body, then arms", "Damper around five"],
  }),
  mk("ski_erg_intervals", "Ski erg intervals", "cardio", "conditioning", ["cardio"], ["lats", "abs"], ["ski_erg"], {
    loadType: "time",
    fatigue: 3,
    cues: ["Hinge and drive down", "Full extension each stroke"],
  }),
  mk("stair_climber", "Stair climber", "cardio", "conditioning", ["cardio"], ["glutes", "quads"], ["stair_machine"], {
    loadType: "time",
    fatigue: 2,
    cues: ["Stand tall, light grip", "Full step every time"],
  }),
  mk("elliptical_session", "Cross trainer", "cardio", "conditioning", ["cardio"], [], ["elliptical"], {
    loadType: "time",
    fatigue: 1,
    cues: ["Use the arms as well", "Steady breathable pace"],
  }),
  mk("jump_rope_intervals", "Skipping intervals", "cardio", "conditioning", ["cardio"], ["calves"], ["jump_rope"], {
    loadType: "time",
    fatigue: 2,
    cues: ["Small bounces, wrists do the work", "Sixty seconds on, thirty off"],
  }),
  mk("burpee", "Burpee", "cardio", "conditioning", ["cardio", "full_body"], ["chest", "quads"], ["bodyweight"], {
    loadType: "time",
    fatigue: 4,
    cues: ["Chest to the floor, full stand at the top", "Pace it, do not sprint the first set"],
  }),
  mk("mountain_climber", "Mountain climbers", "cardio", "conditioning", ["cardio", "abs"], ["hip_flexors"], ["bodyweight"], {
    loadType: "time",
    fatigue: 2,
    cues: ["Hips stay low", "Quick feet, still shoulders"],
  }),
  mk("battle_rope_waves", "Battle rope waves", "cardio", "conditioning", ["cardio"], ["front_delts", "abs"], ["battle_ropes"], {
    loadType: "time",
    fatigue: 3,
    cues: ["Quarter squat, brace", "Fast alternating waves"],
  }),
  mk("sled_push", "Sled push", "cardio", "conditioning", ["cardio", "quads"], ["glutes", "calves"], ["sled"], {
    loadType: "time",
    fatigue: 4,
    cues: ["Low body angle, arms locked", "Drive through the whole foot"],
  }),
  mk("kb_complex", "Kettlebell complex", "cardio", "conditioning", ["cardio", "full_body"], ["glutes", "front_delts"], ["kettlebell"], {
    loadType: "time",
    fatigue: 4,
    levels: ["intermediate", "advanced"],
    cues: ["Swing, clean, press, squat without putting it down", "Pick a weight you can press ten times fresh"],
  }),

  // ---------------------------------------------------------------- mobility
  mk("cat_cow", "Cat cow", "mobility", "mobility", ["lower_back"], ["abs"], ["mat"], {
    loadType: "time",
    fatigue: 1,
    cues: ["Move one vertebra at a time", "Breathe with the movement"],
  }),
  mk("worlds_greatest_stretch", "World's greatest stretch", "mobility", "mobility", ["hip_flexors"], ["hamstrings", "upper_back"], ["mat"], {
    loadType: "time",
    fatigue: 1,
    unilateral: true,
    cues: ["Lunge, elbow to instep, then rotate open", "Hold each position for two breaths"],
  }),
  mk("thoracic_rotation", "Thoracic rotation", "mobility", "mobility", ["upper_back"], [], ["mat"], {
    loadType: "time",
    fatigue: 1,
    unilateral: true,
    cues: ["Rotate from the ribs", "Follow the hand with the eyes"],
  }),
  mk("hip_flexor_stretch", "Kneeling hip flexor stretch", "mobility", "mobility", ["hip_flexors"], ["quads"], ["mat"], {
    loadType: "time",
    fatigue: 1,
    unilateral: true,
    cues: ["Tuck the pelvis before leaning in", "Squeeze the back glute"],
  }),
];

export const EXERCISE_BY_ID: Record<string, Exercise> = EXERCISES.reduce(
  (acc, exercise) => {
    acc[exercise.id] = exercise;
    return acc;
  },
  {} as Record<string, Exercise>,
);

export function getExercise(id: string): Exercise | undefined {
  return EXERCISE_BY_ID[id];
}

export const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  chest: "Chest",
  upper_back: "Upper back",
  lats: "Lats",
  traps: "Traps",
  front_delts: "Front delts",
  side_delts: "Side delts",
  rear_delts: "Rear delts",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  abs: "Abs",
  obliques: "Obliques",
  lower_back: "Lower back",
  hip_flexors: "Hip flexors",
  adductors: "Adductors",
  abductors: "Abductors",
  full_body: "Full body",
  cardio: "Cardio",
};

export const PATTERN_LABEL: Record<MovementPattern, string> = {
  horizontal_push: "Horizontal push",
  vertical_push: "Vertical push",
  horizontal_pull: "Horizontal pull",
  vertical_pull: "Vertical pull",
  squat: "Squat",
  hinge: "Hinge",
  lunge: "Lunge",
  carry: "Carry",
  core: "Core",
  elbow_flexion: "Biceps",
  elbow_extension: "Triceps",
  shoulder_raise: "Shoulders",
  calf: "Calves",
  hip_isolation: "Hips",
  knee_isolation: "Knees",
  conditioning: "Conditioning",
  mobility: "Mobility",
};
