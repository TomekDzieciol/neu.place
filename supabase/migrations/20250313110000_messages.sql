-- Tabele do systemu wiadomości prywatnych między użytkownikami

-- Tabela wątków konwersacji powiązanych z ogłoszeniami
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prosty indeks przyspieszający wyszukiwanie wątków po ogłoszeniu i parach użytkowników
CREATE INDEX IF NOT EXISTS conversations_listing_users_idx
  ON public.conversations (listing_id, user_a, user_b);

-- Indeks do sortowania listy rozmów po czasie ostatniej wiadomości
CREATE INDEX IF NOT EXISTS conversations_participants_last_message_idx
  ON public.conversations (last_message_at DESC, user_a, user_b);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Użytkownik widzi tylko konwersacje, w których uczestniczy jako user_a lub user_b
DROP POLICY IF EXISTS "conversations_select_own" ON public.conversations;
CREATE POLICY "conversations_select_own" ON public.conversations
  FOR SELECT
  USING (
    auth.uid() = user_a
    OR auth.uid() = user_b
  );

-- Tworzenie konwersacji – użytkownik może być tylko jednym z uczestników
DROP POLICY IF EXISTS "conversations_insert_own" ON public.conversations;
CREATE POLICY "conversations_insert_own" ON public.conversations
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_a
    OR auth.uid() = user_b
  );

-- (opcjonalnie) aktualizacje – np. last_message_at/preview może zmieniać tylko uczestnik
DROP POLICY IF EXISTS "conversations_update_own" ON public.conversations;
CREATE POLICY "conversations_update_own" ON public.conversations
  FOR UPDATE
  USING (
    auth.uid() = user_a
    OR auth.uid() = user_b
  )
  WITH CHECK (
    auth.uid() = user_a
    OR auth.uid() = user_b
  );

-- Tabela pojedynczych wiadomości w ramach konwersacji
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON public.messages (conversation_id, created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Użytkownik widzi tylko wiadomości z konwersacji, w których uczestniczy
DROP POLICY IF EXISTS "messages_select_own" ON public.messages;
CREATE POLICY "messages_select_own" ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

-- Wstawianie wiadomości – tylko uczestnik konwersacji może wysłać
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
CREATE POLICY "messages_insert_own" ON public.messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

-- Aktualizacja (np. oznaczenie jako przeczytane) – tylko uczestnik
DROP POLICY IF EXISTS "messages_update_own" ON public.messages;
CREATE POLICY "messages_update_own" ON public.messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );

