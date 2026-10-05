export type RegistrationStatus = "pending" | "paid" | "cancelled" | "refunded";

export type Race = {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  capacity: number | null;
  bib_start: number;
  sort: number;
};

export type EventRow = {
  id: string;
  organization_id: string;
  slug: string;
  name: string;
  tagline: string | null;
  location: string | null;
  starts_on: string;
  registration_closes_at: string | null;
  service_fee_cents: number;
  taxable: boolean;
  waiver_text: string;
  published: boolean;
};

export type EventWithRaces = EventRow & { races: Race[] };

export type Registration = {
  id: string;
  event_id: string;
  race_id: string;
  email: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: "F" | "M" | "X" | null;
  phone: string | null;
  city: string | null;
  tshirt_size: string | null;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  newsletter_opt_in: boolean;
  status: RegistrationStatus;
  bib_number: number | null;
  total_cents: number;
  qr_token: string;
  picked_up_at: string | null;
  created_at: string;
  paid_at: string | null;
};

export type MedicalCard = {
  registration_id: string;
  allergies: string;
  conditions: string;
  medications: string;
  notes: string;
  updated_at: string;
  delete_after: string;
};
