import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function UserList() {
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
