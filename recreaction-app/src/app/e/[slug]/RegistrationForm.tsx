"use client";

import { useActionState, useState } from "react";
import { computeTotals, formatMoney } from "@/lib/pricing";
import { TSHIRT_SIZES } from "@/lib/registration";
import type { Race } from "@/lib/types";
import { register, type RegisterState } from "./actions";

type Props = {
  eventSlug: string;
  races: Race[];
  feeCents: number;
  taxable: boolean;
  waiverText: string;
  eventName: string;
};

export default function RegistrationForm({ eventSlug, races, feeCents, taxable, waiverText, eventName }: Props) {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(register, {});
  const values = state.values ?? {};
  const errors = state.errors ?? {};
  const [raceId, setRaceId] = useState<string>(values.raceId ?? races[0]?.id ?? "");
  const race = races.find((r) => r.id === raceId);
  const totals = race ? computeTotals({ priceCents: race.price_cents, feeCents, taxable }) : null;

  const errorFor = (name: keyof typeof errors) =>
    errors[name]?.[0] ? (
      <p className="field-error" id={`${name}-error`}>
        {errors[name]?.[0]}
      </p>
    ) : null;
  const invalid = (name: keyof typeof errors) =>
    errors[name] ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {};

  return (
    <form action={formAction} className="stack-lg" noValidate>
      <input type="hidden" name="eventSlug" value={eventSlug} />

      {state.message ? (
        <p className="notice notice-error" role="alert">
          {state.message}
        </p>
      ) : null}

      <fieldset className="stack-sm">
        <legend className="h3">Choisis ta distance</legend>
        {races.map((r) => (
          <label key={r.id} className={`choice${r.id === raceId ? " choice-selected" : ""}`}>
            <input
              type="radio"
              name="raceId"
              value={r.id}
              checked={r.id === raceId}
              onChange={() => setRaceId(r.id)}
            />
            <span className="choice-body">
              <span className="choice-title">{r.name}</span>
              {r.description ? <span className="muted small">{r.description}</span> : null}
            </span>
            <span className="choice-price">{formatMoney(r.price_cents)}</span>
          </label>
        ))}
        {errorFor("raceId")}
      </fieldset>

      <fieldset className="stack-sm">
        <legend className="h3">Tes coordonnées</legend>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="firstName">Prénom</label>
            <input id="firstName" name="firstName" autoComplete="given-name" defaultValue={values.firstName} required {...invalid("firstName")} />
            {errorFor("firstName")}
          </div>
          <div className="field">
            <label htmlFor="lastName">Nom</label>
            <input id="lastName" name="lastName" autoComplete="family-name" defaultValue={values.lastName} required {...invalid("lastName")} />
            {errorFor("lastName")}
          </div>
        </div>
        <div className="field">
          <label htmlFor="email">Courriel</label>
          <input id="email" name="email" type="email" autoComplete="email" defaultValue={values.email} required {...invalid("email")} />
          <p className="hint">Ton dossard et ton reçu seront liés à ce courriel.</p>
          {errorFor("email")}
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="birthDate">Date de naissance</label>
            <input id="birthDate" name="birthDate" type="date" autoComplete="bday" defaultValue={values.birthDate} required {...invalid("birthDate")} />
            {errorFor("birthDate")}
          </div>
          <div className="field">
            <label htmlFor="gender">Catégorie (facultatif)</label>
            <select id="gender" name="gender" defaultValue={values.gender ?? ""}>
              <option value="">Je préfère ne pas répondre</option>
              <option value="F">Femme</option>
              <option value="M">Homme</option>
              <option value="X">Non binaire</option>
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="phone">Téléphone (facultatif)</label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={values.phone} {...invalid("phone")} />
            {errorFor("phone")}
          </div>
          <div className="field">
            <label htmlFor="city">Ville (facultatif)</label>
            <input id="city" name="city" autoComplete="address-level2" defaultValue={values.city} {...invalid("city")} />
            {errorFor("city")}
          </div>
        </div>
      </fieldset>

      <fieldset className="stack-sm">
        <legend className="h3">Taille du t-shirt technique</legend>
        <div className="pills">
          {TSHIRT_SIZES.map((size) => (
            <label key={size} className="pill">
              <input type="radio" name="tshirtSize" value={size} defaultChecked={(values.tshirtSize ?? "M") === size} />
              <span>{size}</span>
            </label>
          ))}
        </div>
        {errorFor("tshirtSize")}
      </fieldset>

      <fieldset className="stack-sm">
        <legend className="h3">Personne à joindre en cas d’urgence</legend>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="emergencyContactName">Nom</label>
            <input id="emergencyContactName" name="emergencyContactName" defaultValue={values.emergencyContactName} required {...invalid("emergencyContactName")} />
            {errorFor("emergencyContactName")}
          </div>
          <div className="field">
            <label htmlFor="emergencyContactPhone">Téléphone</label>
            <input id="emergencyContactPhone" name="emergencyContactPhone" type="tel" defaultValue={values.emergencyContactPhone} required {...invalid("emergencyContactPhone")} />
            {errorFor("emergencyContactPhone")}
          </div>
        </div>
        <p className="hint">Ta fiche médicale (allergies, médicaments) se remplit dans ton compte après le paiement. Seule toi la vois.</p>
      </fieldset>

      <fieldset className="stack-sm">
        <legend className="h3">Décharge et communications</legend>
        {waiverText ? <p className="waiver">{waiverText}</p> : null}
        <label className="check">
          <input type="checkbox" name="waiver" defaultChecked={values.waiver === "on"} {...invalid("waiver")} />
          <span>J’accepte la décharge de responsabilité et le règlement de la course.</span>
        </label>
        {errorFor("waiver")}
        <label className="check">
          <input type="checkbox" name="newsletter" defaultChecked={values.newsletter === "on"} />
          <span>
            Je veux recevoir l’infolettre de {eventName}. <span className="muted">Désabonnement en un clic.</span>
          </span>
        </label>
      </fieldset>

      {totals ? (
        <section className="summary" aria-label="Résumé du paiement">
          <div className="summary-row">
            <span>Inscription {race?.name}</span>
            <span>{formatMoney(totals.priceCents)}</span>
          </div>
          {totals.feeCents > 0 ? (
            <div className="summary-row">
              <span>Frais de service</span>
              <span>{formatMoney(totals.feeCents)}</span>
            </div>
          ) : null}
          <div className="summary-row">
            <span>TPS (5 %)</span>
            <span>{formatMoney(totals.gstCents)}</span>
          </div>
          <div className="summary-row">
            <span>TVQ (9,975 %)</span>
            <span>{formatMoney(totals.qstCents)}</span>
          </div>
          <div className="summary-row summary-total">
            <span>Total</span>
            <span>{formatMoney(totals.totalCents)}</span>
          </div>
        </section>
      ) : null}

      <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Un instant…" : totals ? `Payer ${formatMoney(totals.totalCents)}` : "Continuer"}
      </button>
      <p className="hint center">Paiement sécurisé : tu passeras par la page de paiement de Stripe.</p>
    </form>
  );
}
