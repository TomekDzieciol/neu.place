import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const API_BASE = import.meta.env.VITE_API_URL || ''

export function UserList() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    setError('')
    if (!supabase) {
      setError('Brak połączenia z bazą. Skonfiguruj client/.env.')
      setLoading(false)
      return
    }
    const { data, error: err } = await supabase.from('profiles').select('id, email, display_name, role, is_blocked, created_at').order('created_at', { ascending: false })
    if (err) {
      setError(err.message)
      setUsers([])
    } else {
      setUsers(data || [])
    }
    setLoading(false)
  }

  async function toggleBlock(profile) {
    if (!supabase) return
    const { error: err } = await supabase.from('profiles').update({ is_blocked: !profile.is_blocked }).eq('id', profile.id)
    if (err) setError(err.message)
    else loadUsers()
  }

  async function deleteUser(profile) {
    if (profile.id === user?.id) {
      setError('Nie możesz usunąć własnego konta.')
      return
    }
    if (!window.confirm(`Czy na pewno chcesz trwale usunąć konto użytkownika ${profile.email || profile.id}? Wszystkie powiązane dane (ogłoszenia, ulubione) zostaną usunięte.`)) return
    setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      setError('Brak sesji. Zaloguj się ponownie.')
      return
    }
    const res = await fetch(`${API_BASE}/api/admin/users/${profile.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.status === 204) {
      loadUsers()
      return
    }
    const body = await res.json().catch(() => ({}))
    setError(body.error || `Błąd ${res.status}. Nie udało się usunąć konta.`)
  }

  if (loading) return <p className="loading">Ładowanie użytkowników…</p>
  if (error) return <p className="msg--error" style={{ marginBottom: 16 }}>{error}</p>

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Nazwa</th>
            <th>Rola</th>
            <th>Status</th>
            <th>Data rejestracji</th>
            <th>Akcje</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.display_name || '—'}</td>
              <td>{u.role}</td>
              <td>{u.is_blocked ? 'Zablokowany' : 'Aktywny'}</td>
              <td>{u.created_at ? new Date(u.created_at).toLocaleDateString('pl') : '—'}</td>
              <td>
                <button type="button" className="btn-sm" onClick={() => toggleBlock(u)}>{u.is_blocked ? 'Odblokuj' : 'Zablokuj'}</button>
                {u.id !== user?.id && (
                  <button type="button" className="btn-sm btn--danger" onClick={() => deleteUser(u)} style={{ marginLeft: 8 }}>Usuń konto</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
