-- ═══════════════════════════════════════════════════════════════
-- FLAVIA FLINT — Chapitre 0 — SQL à exécuter dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════
--
-- Ajoute la colonne qui marque le badge "Compagnon d'aventure" comme
-- obtenu, pour que le pacte scellé à la fin du Chapitre 0 ne réattribue
-- jamais deux fois les +30 XP (voir awardChapitre0Badge() dans index.html).
--
-- Aucune nouvelle policy RLS n'est nécessaire : la policy existante
-- "players_update_own" (sprint 3) autorise déjà chaque joueur à modifier
-- sa propre ligne dans players, colonne chapter0_completed incluse.
-- ⚠️ À vérifier de votre côté que cette policy est bien active en prod.

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS chapter0_completed boolean NOT NULL DEFAULT false;

-- ─────────────────────────────────────────────────────────────
-- FIN
-- ─────────────────────────────────────────────────────────────
