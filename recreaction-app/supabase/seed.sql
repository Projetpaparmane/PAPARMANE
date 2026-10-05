-- Données de départ : une organisation et un événement de démonstration.
-- À exécuter après 0001_init.sql (SQL Editor > New query > Run).
-- Remplacez les noms, dates et prix par ceux de votre premier événement.

with org as (
  insert into public.organizations (name)
  values ('Organisation démo')
  returning id
), ev as (
  insert into public.events (organization_id, slug, name, tagline, location, starts_on, registration_closes_at, service_fee_cents, taxable, waiver_text, published)
  select
    org.id,
    'trail-des-cretes-2026',
    'Trail des Crêtes 2026',
    'Quatre distances en sentier, du 5 km découverte au 50 km.',
    'Val-des-Crêtes, QC',
    date '2026-10-17',
    timestamptz '2026-10-14 23:59:00-04',
    250,
    true,
    'Je reconnais que la course en sentier comporte des risques (chutes, blessures, conditions météo). Je déclare être en condition physique pour participer et je dégage l''organisation de toute responsabilité, sauf en cas de faute lourde. J''accepte le règlement de la course.',
    true
  from org
  returning id
)
insert into public.races (event_id, name, description, price_cents, capacity, bib_start, sort)
select ev.id, r.name, r.description, r.price_cents, r.capacity, r.bib_start, r.sort
from ev, (values
  ('5 km', 'Découverte · 120 m D+', 3500, 300, 1, 1),
  ('12 km', '380 m D+', 5500, 300, 401, 2),
  ('25 km', '1 050 m D+ · barrière horaire à 13 h', 7500, 250, 1001, 3),
  ('50 km', '2 300 m D+ · départ à 6 h', 11000, 120, 2001, 4)
) as r(name, description, price_cents, capacity, bib_start, sort);

-- Pour donner l'accès organisateur à quelqu'un, après sa première connexion :
--
-- insert into public.organization_members (organization_id, user_id, role)
-- select o.id, u.id, 'admin'
-- from public.organizations o, auth.users u
-- where o.name = 'Organisation démo' and u.email = 'votre-courriel@exemple.com';
