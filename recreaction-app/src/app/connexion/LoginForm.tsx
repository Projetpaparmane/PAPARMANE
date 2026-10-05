"use client";

import { useActionState } from "react";
import { type LoginState, sendMagicLink } from "./actions";

export default function LoginForm({ defaultEmail, next }: { defaultEmail?: string; next?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(sendMagicLink, {});

  if (state.sentTo) {
    return (
      <div className="notice notice-success stack-sm" role="status">
        <p>
          <strong>Vérifie tes courriels.</strong> Un lien de connexion vient de partir vers {state.sentTo}.
        </p>
        <p className="small">Ouvre-le sur cet appareil. Il est valide une heure. Pense à regarder dans les courriels indésirables.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="stack">
      <input type="hidden" name="next" value={next ?? "/moi"} />
      <div className="field">
        <label htmlFor="email">Ton courriel</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email ?? defaultEmail}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "email-error" : "email-hint"}
        />
        {state.error ? (
          <p className="field-error" id="email-error">
            {state.error}
          </p>
        ) : (
          <p className="hint" id="email-hint">
            Celui utilisé à l’inscription. Pas de mot de passe : on t’envoie un lien.
          </p>
        )}
      </div>
      <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Envoi…" : "Recevoir mon lien de connexion"}
      </button>
    </form>
  );
}
