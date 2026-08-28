-- ═══════════════════════════════════════════════════════════════
-- FLAVIA FLINT — Chapitres à scènes — SQL à exécuter dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════
--
-- La table public.flavia_chapters existe déjà et sert au module payant
-- "L'Histoire de Flavia Flint" (voir loadFlaviaStory()/readChapter() dans
-- index.html). Elle a déjà les colonnes : id, title, order_index,
-- unlock_cost, is_published, content.
--
-- ⚠️ Le message initial mentionnait des colonnes order_num, compass_cost et
-- is_published à ajouter — order_num et compass_cost sont en fait déjà là
-- sous les noms order_index et unlock_cost, et is_published existe déjà.
-- Les recréer sous un autre nom aurait dédoublé les colonnes sans rien
-- brancher de réel (l'app continue de lire order_index/unlock_cost). Le SQL
-- ci-dessous n'ajoute donc que ce qui manque vraiment : scenes et description.
--
-- Aucune nouvelle policy RLS : si l'admin (admin.html) écrit déjà dans
-- flavia_chapters avec la clé anon, la policy existante couvre aussi ces
-- deux nouvelles colonnes. ⚠️ À vérifier de votre côté.

ALTER TABLE public.flavia_chapters
  ADD COLUMN IF NOT EXISTS scenes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS description text;

-- scenes : tableau de { image_url, text, button_label }, ex. :
--   [{"image_url":"https://...","text":"...","button_label":"Continuer"}, ...]
-- Si "scenes" contient au moins un élément, index.html affiche le chapitre
-- avec le lecteur à scènes (image + carnet manuscrit) au lieu du texte brut
-- de la colonne "content" (conservée pour les chapitres déjà écrits en texte
-- simple — voir le repli "legacy" dans readChapter()).
--
-- Chapitre 0 : pour le piloter depuis l'admin plutôt que depuis le repli
-- local codé en dur (CHAPTER0_SCENES dans index.html), créez une ligne avec
-- order_index = 0, is_published = true, et jusqu'à 4 scenes — le texte/image
-- de chaque scène sera utilisé, mais le choix de dialogue (scène 3) et le
-- tampon final (scène 4) restent gérés par le code, pas par cette colonne.

-- ─────────────────────────────────────────────────────────────
-- FIN
-- ─────────────────────────────────────────────────────────────
