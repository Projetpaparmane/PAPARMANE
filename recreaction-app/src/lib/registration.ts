import { z } from "zod";

export const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum.`)
    .optional()
    .transform((value) => value || undefined);

const requiredText = (message: string, max = 80) => z.string().trim().min(1, message).max(max, `${max} caractères maximum.`);

function isPlausibleBirthDate(value: string): boolean {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  const year = date.getUTCFullYear();
  return year >= 1920 && year <= new Date().getUTCFullYear() - 4;
}

export const registrationSchema = z.object({
  eventSlug: z.string().min(1),
  raceId: z.uuid({ error: "Choisis une distance." }),
  firstName: requiredText("Indique ton prénom."),
  lastName: requiredText("Indique ton nom."),
  email: z.email({ error: "Indique un courriel valide." }).transform((value) => value.toLowerCase()),
  birthDate: z
    .string({ error: "Indique ta date de naissance." })
    .refine(isPlausibleBirthDate, "Indique une date de naissance valide."),
  gender: z
    .enum(["F", "M", "X", ""])
    .optional()
    .transform((value) => value || undefined),
  phone: optionalText(30),
  city: optionalText(80),
  tshirtSize: z.enum(TSHIRT_SIZES, { error: "Choisis une taille de t-shirt." }),
  emergencyContactName: requiredText("Indique une personne à joindre en cas d’urgence."),
  emergencyContactPhone: requiredText("Indique son numéro de téléphone.", 30),
  waiver: z.literal("on", { error: "Tu dois accepter la décharge pour t’inscrire." }),
  newsletter: z.literal("on").optional(),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export type FieldErrors = Partial<Record<keyof RegistrationInput, string[]>>;

export function parseRegistration(formData: FormData) {
  const raw: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") raw[key] = value;
  }
  const result = registrationSchema.safeParse(raw);
  if (result.success) return { ok: true as const, data: result.data };
  return { ok: false as const, errors: z.flattenError(result.error).fieldErrors as FieldErrors };
}
