import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export function MessagesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { conversationId: routeConversationId } = useParams()

  const [conversations, setConversations] = useState([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [conversationsError, setConversationsError] = useState('')

  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messagesError, setMessagesError] = useState('')

  const [selectedConversationId, setSelectedConversationId] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)

  const effectiveConversationId = useMemo(
    () => routeConversationId || selectedConversationId,
    [routeConversationId, selectedConversationId],
  )

  useEffect(() => {
    if (!supabase || !user?.id) {
      setConversationsLoading(false)
      return
    }
    let cancelled = false
    async function loadConversations() {
      setConversationsLoading(true)
      setConversationsError('')
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select(
            `
              id,
              listing_id,
              last_message_at,
              last_message_preview,
              created_at,
              listings ( title )
            `,
          )
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
          .order('last_message_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })

        if (cancelled) return

        if (error) {
          console.error('[MessagesPage] Supabase query error while loading conversations.', {
            error,
          })
          setConversationsError(error.message || 'Nie udało się wczytać rozmów.')
          setConversations([])
        } else {
          const mapped = (data || []).map((c) => ({
            id: c.id,
            listing_id: c.listing_id,
            listing_title: c.listings?.title || 'Ogłoszenie',
            last_message_at: c.last_message_at || c.created_at,
            last_message_preview: c.last_message_preview || '',
          }))
          setConversations(mapped)
          if (!routeConversationId && !selectedConversationId && mapped.length > 0) {
            setSelectedConversationId(mapped[0].id)
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.error('[MessagesPage] Unexpected error while loading conversations.', {
            error: e,
          })
          setConversationsError('Wystąpił błąd podczas ładowania rozmów.')
          setConversations([])
        }
      } finally {
        if (!cancelled) setConversationsLoading(false)
      }
    }

    loadConversations()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    if (!supabase || !user?.id || !effectiveConversationId) {
      setMessages([])
      return
    }
    let cancelled = false
    async function loadMessages() {
      setMessagesLoading(true)
      setMessagesError('')
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('id, sender_id, content, created_at, read_at')
          .eq('conversation_id', effectiveConversationId)
          .order('created_at', { ascending: true })

        if (cancelled) return

        if (error) {
          console.error('[MessagesPage] Supabase query error while loading messages.', {
            error,
            conversationId: effectiveConversationId,
          })
          setMessagesError(error.message || 'Nie udało się wczytać wiadomości.')
          setMessages([])
        } else {
          setMessages(data || [])
          await markMessagesAsRead(effectiveConversationId, user.id)
        }
      } catch (e) {
        if (!cancelled) {
          console.error('[MessagesPage] Unexpected error while loading messages.', {
            error: e,
            conversationId: effectiveConversationId,
          })
          setMessagesError('Wystąpił błąd podczas ładowania wiadomości.')
          setMessages([])
        }
      } finally {
        if (!cancelled) setMessagesLoading(false)
      }
    }

    loadMessages()

    return () => {
      cancelled = true
    }
  }, [effectiveConversationId, user?.id])

  async function markMessagesAsRead(conversationId, userId) {
    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .is('read_at', null)
    } catch (e) {
      console.error('[MessagesPage] Failed to mark messages as read.', {
        error: e,
        conversationId,
      })
    }
  }

  function handleSelectConversation(id) {
    navigate(`/wiadomosci/${id}`)
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!supabase || !user?.id || !effectiveConversationId || !newMessage.trim()) return
    setSending(true)
    setMessagesError('')
    const content = newMessage.trim()
    try {
      const createdAt = new Date().toISOString()
      const { error } = await supabase.from('messages').insert({
        conversation_id: effectiveConversationId,
        sender_id: user.id,
        content,
        created_at: createdAt,
      })
      if (error) {
        console.error('[MessagesPage] Supabase insert error while sending message.', {
          error,
          conversationId: effectiveConversationId,
        })
        setMessagesError(error.message || 'Nie udało się wysłać wiadomości.')
        return
      }

      const preview = content.length > 200 ? `${content.slice(0, 197)}...` : content
      await supabase
        .from('conversations')
        .update({
          last_message_at: createdAt,
          last_message_preview: preview,
        })
        .eq('id', effectiveConversationId)

      setNewMessage('')
      const { data: refreshed, error: refreshError } = await supabase
        .from('messages')
        .select('id, sender_id, content, created_at, read_at')
        .eq('conversation_id', effectiveConversationId)
        .order('created_at', { ascending: true })

      if (refreshError) {
        console.error('[MessagesPage] Supabase query error while refreshing messages after send.', {
          error: refreshError,
          conversationId: effectiveConversationId,
        })
      } else {
        setMessages(refreshed || [])
      }
    } catch (e) {
      console.error('[MessagesPage] Unexpected error while sending message.', {
        error: e,
        conversationId: effectiveConversationId,
      })
      setMessagesError('Wystąpił błąd podczas wysyłania wiadomości.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="layout layout--wide">
      <header className="page-header">
        <h1>Wiadomości</h1>
        <nav>
          <Link to="/">Strona główna</Link>
          <Link to="/dashboard">Moje konto</Link>
        </nav>
      </header>

      <div className="messages-layout">
        <aside className="messages-sidebar">
          <div className="messages-sidebar__header">
            <h2>Rozmowy</h2>
            <button
              type="button"
              className="btn btn--primary messages-btn-refresh"
              disabled={conversationsLoading}
              onClick={() => {
                // proste odświeżenie – ponowne załadowanie przez zmianę zależności
                setConversationsLoading(true)
                setConversationsError('')
                if (supabase && user?.id) {
                  supabase
                    .from('conversations')
                    .select(
                      `
                        id,
                        listing_id,
                        last_message_at,
                        last_message_preview,
                        created_at,
                        listings ( title )
                      `,
                    )
                    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
                    .order('last_message_at', { ascending: false, nullsFirst: false })
                    .order('created_at', { ascending: false })
                    .then(({ data, error }) => {
                      if (error) {
                        console.error(
                          '[MessagesPage] Supabase query error while refreshing conversations.',
                          { error },
                        )
                        setConversationsError(error.message || 'Nie udało się odświeżyć rozmów.')
                        setConversations([])
                      } else {
                        const mapped = (data || []).map((c) => ({
                          id: c.id,
                          listing_id: c.listing_id,
                          listing_title: c.listings?.title || 'Ogłoszenie',
                          last_message_at: c.last_message_at || c.created_at,
                          last_message_preview: c.last_message_preview || '',
                        }))
                        setConversations(mapped)
                      }
                    })
                    .finally(() => setConversationsLoading(false))
                }
              }}
            >
              Odśwież
            </button>
          </div>
          {conversationsLoading ? (
            <p className="loading">Ładowanie rozmów…</p>
          ) : conversationsError ? (
            <p className="msg--error" style={{ marginTop: 8 }}>
              {conversationsError}
            </p>
          ) : conversations.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>
              Nie masz jeszcze żadnych rozmów.
            </p>
          ) : (
            <ul className="messages-conversations">
              {conversations.map((c) => (
                <li
                  key={c.id}
                  className={
                    c.id === effectiveConversationId
                      ? 'messages-conversations__item messages-conversations__item--active'
                      : 'messages-conversations__item'
                  }
                >
                  <button type="button" onClick={() => handleSelectConversation(c.id)}>
                    <div className="messages-conversations__title">{c.listing_title}</div>
                    {c.last_message_preview && (
                      <div className="messages-conversations__preview">
                        {c.last_message_preview}
                      </div>
                    )}
                    {c.last_message_at && (
                      <div className="messages-conversations__time">
                        {new Date(c.last_message_at).toLocaleString('pl-PL')}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main className="messages-main">
          {!effectiveConversationId ? (
            <div className="empty-state">
              <p>Wybierz konwersację z listy po lewej, aby zobaczyć wiadomości.</p>
            </div>
          ) : (
            <>
              <div className="messages-thread">
                {messagesLoading ? (
                  <p className="loading">Ładowanie wiadomości…</p>
                ) : messagesError ? (
                  <p className="msg--error" style={{ marginBottom: 8 }}>
                    {messagesError}
                  </p>
                ) : messages.length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)' }}>
                    Brak wiadomości w tej rozmowie. Napisz pierwszą wiadomość.
                  </p>
                ) : (
                  <ul className="messages-list">
                    {messages.map((m) => (
                      <li
                        key={m.id}
                        className={
                          m.sender_id === user?.id
                            ? 'messages-list__item messages-list__item--own'
                            : 'messages-list__item'
                        }
                      >
                        <div className="messages-list__bubble">
                          <div className="messages-list__content">{m.content}</div>
                          <div className="messages-list__meta">
                            <span>
                              {new Date(m.created_at).toLocaleString('pl-PL', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <form className="messages-form" onSubmit={handleSend}>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Napisz wiadomość…"
                  rows={3}
                />
                <div className="messages-form__actions">
                  <button type="submit" className="btn btn--primary" disabled={sending || !newMessage.trim()}>
                    Wyślij
                  </button>
                </div>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

