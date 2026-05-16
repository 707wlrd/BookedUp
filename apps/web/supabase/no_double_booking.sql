-- ─── Protection anti-double réservation au niveau DB ───────────────────────
-- Empêche deux RDV actifs du même coiffeur qui se chevauchent temporellement.
-- Nécessite l'extension btree_gist (activée par défaut sur Supabase).

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Contrainte d'exclusion : pour le même barber_id, aucune paire de RDV
-- dont l'intervalle [starts_at, ends_at) se chevauche (sauf si annulé/no_show).
-- La contrainte est définie sur les RDV actifs uniquement via un index partiel.

ALTER TABLE appointments
  ADD CONSTRAINT no_overlapping_appointments
  EXCLUDE USING gist (
    barber_id   WITH =,
    tsrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (status NOT IN ('cancelled', 'no_show'));
