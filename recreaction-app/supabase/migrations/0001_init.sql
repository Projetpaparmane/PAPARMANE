-- Récréaction : schéma initial (organisations, événements, distances, inscriptions, fiches médicales).
-- À exécuter une fois dans Supabase : SQL Editor > New query > coller ce fichier > Run.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Organisations et membres (organisateurs, équipe médicale, responsables de bénévoles)
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'medical', 'volunteer_lead')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Événements et distances
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  tagline text,
  location text,
  starts_on date not null,
  registration_closes_at timestamptz,
  service_fee_cents integer not null default 250 check (service_fee_cents >= 0),
  taxable boolean not null default true,
  waiver_text text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.races (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  capacity integer check (capacity is null or capacity > 0),
  bib_start integer not null default 1 check (bib_start > 0),
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create index races_event_idx on public.races (event_id, sort);

-- ---------------------------------------------------------------------------
-- Inscriptions
-- ---------------------------------------------------------------------------
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete restrict,
  race_id uuid not null references public.races (id) on delete restrict,
  email text not null,
  first_name text not null,
  last_name text not null,
  birth_date date not null,
  gender text check (gender in ('F', 'M', 'X')),
  phone text,
  city text,
  tshirt_size text check (tshirt_size in ('XS', 'S', 'M', 'L', 'XL', 'XXL')),
  emergency_contact_name text not null,
  emergency_contact_phone text not null,
  waiver_accepted_at timestamptz not null,
  newsletter_opt_in boolean not null default false,
  newsletter_opt_in_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'refunded')),
  bib_number integer,
  price_cents integer not null,
  fee_cents integer not null,
  gst_cents integer not null,
  qst_cents integer not null,
  total_cents integer not null,
  stripe_session_id text unique,
  stripe_payment_intent text,
  qr_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  picked_up_at timestamptz,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (event_id, bib_number),
  check (newsletter_opt_in = false or newsletter_opt_in_at is not null)
);

create index registrations_race_idx on public.registrations (race_id, status);
create index registrations_email_idx on public.registrations (lower(email));

-- ---------------------------------------------------------------------------
-- Fiche médicale d'urgence : séparée, visible par le participant seulement.
-- L'accès de l'équipe médicale passera par le serveur, avec journalisation.
-- ---------------------------------------------------------------------------
create table public.medical_cards (
  registration_id uuid primary key references public.registrations (id) on delete cascade,
  allergies text not null default '',
  conditions text not null default '',
  medications text not null default '',
  notes text not null default '',
  updated_at timestamptz not null default now(),
  delete_after date not null default current_date
);

-- La date de suppression est toujours calculée par la base : 30 jours après l'événement.
create or replace function public.medical_cards_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select e.starts_on + 30 into new.delete_after
    from public.registrations r
    join public.events e on e.id = r.event_id
   where r.id = new.registration_id;
  new.updated_at := now();
  return new;
end;
$$;

create trigger medical_cards_before_write
  before insert or update on public.medical_cards
  for each row execute function public.medical_cards_before_write();

create table public.medical_access_log (
  id bigint generated always as identity primary key,
  registration_id uuid not null references public.registrations (id) on delete cascade,
  accessed_by uuid references auth.users (id) on delete set null,
  reason text not null,
  accessed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Fonctions d'accès
-- ---------------------------------------------------------------------------
create or replace function public.is_event_staff(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    join public.organization_members m on m.organization_id = e.organization_id
    where e.id = p_event_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.owns_registration(p_registration_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.registrations r
    where r.id = p_registration_id
      and lower(r.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Confirme une inscription payée et lui attribue le prochain dossard libre.
-- Appelée par le webhook Stripe (clé secrète). Sans effet si déjà confirmée.
create or replace function public.confirm_registration(
  p_registration_id uuid,
  p_session_id text,
  p_payment_intent text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.registrations%rowtype;
  next_bib integer;
begin
  select * into r from public.registrations where id = p_registration_id for update;
  if not found then
    raise exception 'Inscription % introuvable', p_registration_id;
  end if;
  if r.status = 'paid' then
    return r.bib_number;
  end if;

  -- Un seul dossard attribué à la fois par événement.
  perform 1 from public.events where id = r.event_id for update;

  select greatest(coalesce(max(bib_number) + 1, 0), (select bib_start from public.races where id = r.race_id))
    into next_bib
    from public.registrations
   where race_id = r.race_id and bib_number is not null;

  while exists (select 1 from public.registrations where event_id = r.event_id and bib_number = next_bib) loop
    next_bib := next_bib + 1;
  end loop;

  update public.registrations
     set status = 'paid',
         bib_number = next_bib,
         paid_at = now(),
         stripe_session_id = coalesce(stripe_session_id, p_session_id),
         stripe_payment_intent = p_payment_intent
   where id = r.id;

  return next_bib;
end;
$$;

-- Supprime les fiches médicales dont la date de conservation est passée (Loi 25).
create or replace function public.purge_medical_cards()
returns integer
language sql
security definer
set search_path = public
as $$
  with deleted as (
    delete from public.medical_cards where delete_after < current_date returning 1
  )
  select count(*)::integer from deleted;
$$;

revoke all on function public.confirm_registration(uuid, text, text) from public, anon, authenticated;
revoke all on function public.purge_medical_cards() from public, anon, authenticated;
grant execute on function public.confirm_registration(uuid, text, text) to service_role;
grant execute on function public.purge_medical_cards() to service_role;

-- ---------------------------------------------------------------------------
-- Sécurité au niveau des lignes (RLS)
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.events enable row level security;
alter table public.races enable row level security;
alter table public.registrations enable row level security;
alter table public.medical_cards enable row level security;
alter table public.medical_access_log enable row level security;

create policy "membres : voir son organisation" on public.organizations
  for select to authenticated
  using (exists (select 1 from public.organization_members m where m.organization_id = id and m.user_id = auth.uid()));

create policy "membres : voir ses adhésions" on public.organization_members
  for select to authenticated
  using (user_id = auth.uid());

create policy "événements publiés visibles par tous" on public.events
  for select to anon, authenticated
  using (published or public.is_event_staff(id));

create policy "distances des événements visibles" on public.races
  for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = event_id and (e.published or public.is_event_staff(e.id))));

create policy "inscriptions : le participant et l'organisation" on public.registrations
  for select to authenticated
  using (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.is_event_staff(event_id)
  );

-- L'organisation peut seulement marquer la remise du dossard.
create policy "inscriptions : remise du dossard par l'organisation" on public.registrations
  for update to authenticated
  using (public.is_event_staff(event_id))
  with check (public.is_event_staff(event_id));

revoke update on public.registrations from authenticated;
grant update (picked_up_at) on public.registrations to authenticated;

create policy "fiche médicale : lecture par le participant" on public.medical_cards
  for select to authenticated
  using (public.owns_registration(registration_id));

create policy "fiche médicale : création par le participant" on public.medical_cards
  for insert to authenticated
  with check (public.owns_registration(registration_id));

create policy "fiche médicale : modification par le participant" on public.medical_cards
  for update to authenticated
  using (public.owns_registration(registration_id))
  with check (public.owns_registration(registration_id));

create policy "fiche médicale : suppression par le participant" on public.medical_cards
  for delete to authenticated
  using (public.owns_registration(registration_id));
