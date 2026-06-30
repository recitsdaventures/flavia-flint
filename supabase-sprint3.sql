-- ═══════════════════════════════════════════════════════════════
-- FLAVIA FLINT — Sprint 3 — SQL à exécuter dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1. TRIGGER : créer automatiquement un profil players
--    dès qu'un utilisateur s'inscrit via Supabase Auth
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.players (id, pseudo, email, avatar_emoji, total_xp, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'pseudo',       split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_emoji', '🧒'),
    0,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;   -- évite les doublons si le trigger se déclenche deux fois
  RETURN NEW;
END;
$$;

-- Supprimer l'ancien trigger s'il existe, puis le recréer
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ─────────────────────────────────────────────────────────────
-- 2. ACTIVATION DU ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.players         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_progress ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────
-- 3. POLICIES — TABLE players
-- ─────────────────────────────────────────────────────────────

-- Lecture du classement : tout joueur connecté peut voir tous les profils
DROP POLICY IF EXISTS "players_select_all"    ON public.players;
CREATE POLICY "players_select_all"
  ON public.players
  FOR SELECT
  TO authenticated
  USING (true);

-- Mise à jour : chaque joueur ne peut modifier que son propre profil
DROP POLICY IF EXISTS "players_update_own"    ON public.players;
CREATE POLICY "players_update_own"
  ON public.players
  FOR UPDATE
  TO authenticated
  USING      (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Insertion : le trigger SECURITY DEFINER crée le profil, pas le client
-- (pas de policy INSERT côté client nécessaire)


-- ─────────────────────────────────────────────────────────────
-- 4. POLICIES — TABLE player_progress
-- ─────────────────────────────────────────────────────────────

-- Lecture : chaque joueur ne voit que sa propre progression
DROP POLICY IF EXISTS "progress_select_own"   ON public.player_progress;
CREATE POLICY "progress_select_own"
  ON public.player_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = player_id);

-- Insertion : chaque joueur ne peut créer que ses propres entrées
DROP POLICY IF EXISTS "progress_insert_own"   ON public.player_progress;
CREATE POLICY "progress_insert_own"
  ON public.player_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = player_id);

-- Mise à jour : chaque joueur ne peut modifier que ses propres entrées
DROP POLICY IF EXISTS "progress_update_own"   ON public.player_progress;
CREATE POLICY "progress_update_own"
  ON public.player_progress
  FOR UPDATE
  TO authenticated
  USING      (auth.uid() = player_id)
  WITH CHECK (auth.uid() = player_id);


-- ─────────────────────────────────────────────────────────────
-- 5. CLASSEMENT HEBDOMADAIRE
--    Fonction SECURITY DEFINER pour contourner le RLS de
--    player_progress et calculer les XP de la semaine.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_weekly_ranking()
RETURNS TABLE (
  id           uuid,
  pseudo       text,
  avatar_emoji text,
  weekly_xp    bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.pseudo,
    p.avatar_emoji,
    COALESCE(SUM(s.xp), 0)::bigint AS weekly_xp
  FROM public.players p
  LEFT JOIN public.player_progress pp
         ON pp.player_id   = p.id
        AND pp.completed   = true
        AND pp.completed_at >= NOW() - INTERVAL '7 days'
  LEFT JOIN public.steps s
         ON s.id = pp.step_id
  GROUP BY p.id, p.pseudo, p.avatar_emoji
  ORDER BY weekly_xp DESC
  LIMIT 20;
END;
$$;

-- Autoriser les joueurs connectés à appeler cette fonction
GRANT EXECUTE ON FUNCTION public.get_weekly_ranking() TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- 6. CONTRAINTE UNICITÉ sur player_progress
--    Évite les doublons (un joueur complète une étape une seule fois)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.player_progress
  DROP CONSTRAINT IF EXISTS player_progress_unique_step;

ALTER TABLE public.player_progress
  ADD CONSTRAINT player_progress_unique_step
  UNIQUE (player_id, adventure_id, step_id);


-- ─────────────────────────────────────────────────────────────
-- FIN — Vérifie dans Authentication > Policies que tout est OK
-- ─────────────────────────────────────────────────────────────
