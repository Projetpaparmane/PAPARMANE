"use client";

import { useActionState } from "react";
import type { MedicalCard } from "@/lib/types";
import { type MedicalState, saveMedicalCard } from "./actions";

const FIELDS = [
  { name: "allergies", label: "Allergies", hint: "Ex. : pénicilline, arachides, piqûres d’abeille" },
  { name: "conditions", label: "Conditions médicales", hint: "Ex. : asthme à l’effort, diabète, épilepsie" },
  { name: "medications", label: "Médicaments et où les trouver", hint: "Ex. : pompe dans la veste, poche gauche" },
  { name: "notes", label: "Autre information utile aux secouristes", hint: "" },
] as const;

export default function MedicalCardForm({ registrationId, card }: { registrationId: string; card: MedicalCard | null }) {
  const [state, formAction, pending] = useActionState<MedicalState, FormData>(saveMedicalCard, {});

  return (
    <form action={formAction} className="stack">
      <input type="hidden" name="registrationId" value={registrationId} />
      {FIELDS.map((f) => (
        <div className="field" key={f.name}>
          <label htmlFor={f.name}>{f.label}</label>
          <textarea id={f.name} name={f.name} rows={2} maxLength={500} defaultValue={card?.[f.name] ?? ""} aria-describedby={f.hint ? `${f.name}-hint` : undefined} />
          {f.hint ? (
            <p className="hint" id={`${f.name}-hint`}>
              {f.hint}
            </p>
          ) : null}
        </div>
      ))}
      {state.error ? (
        <p className="notice notice-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p className="notice notice-success" role="status">
          Fiche enregistrée.
        </p>
      ) : null}
      <button type="submit" className="btn btn-dark" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer ma fiche"}
      </button>
    </form>
  );
}
