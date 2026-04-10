CREATE TABLE IF NOT EXISTS public.reaction_round_claims (
  room_code TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  claimed_by TEXT NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (room_code, round_number)
);

ALTER TABLE public.reaction_round_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reaction claims"
ON public.reaction_round_claims
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert reaction claims"
ON public.reaction_round_claims
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can delete reaction claims"
ON public.reaction_round_claims
FOR DELETE
USING (true);

CREATE OR REPLACE FUNCTION public.claim_reaction_round(
  p_room_code TEXT,
  p_round_number INTEGER,
  p_player_id TEXT
)
RETURNS TABLE (won BOOLEAN, claimed_by TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.reaction_round_claims (room_code, round_number, claimed_by)
  VALUES (p_room_code, p_round_number, p_player_id)
  ON CONFLICT (room_code, round_number) DO NOTHING;

  RETURN QUERY
  SELECT
    (rrc.claimed_by = p_player_id) AS won,
    rrc.claimed_by
  FROM public.reaction_round_claims rrc
  WHERE rrc.room_code = p_room_code
    AND rrc.round_number = p_round_number;
END;
$$;
