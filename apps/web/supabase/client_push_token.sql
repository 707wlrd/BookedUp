-- Ajoute push_token sur la table profiles pour les clients de l'app BookedUp
-- Permet d'envoyer des notifications push quand un RDV est confirmé/annulé

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_token TEXT DEFAULT NULL;

-- Index pour lookup rapide
CREATE INDEX IF NOT EXISTS profiles_push_token_idx
  ON profiles(push_token)
  WHERE push_token IS NOT NULL;
