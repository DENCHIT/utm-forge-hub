export interface TrainingWebinar {
  id: string;
  title: string;
  description: string | null;
  meet_link: string;
  starts_at: string;
  duration_minutes: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebinarSignup {
  id: string;
  webinar_id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface WebinarFormData {
  title: string;
  description: string;
  meet_link: string;
  starts_at: string;
  duration_minutes: number;
  active: boolean;
}

export interface WebinarWithSignupCount extends TrainingWebinar {
  signup_count: number;
}
