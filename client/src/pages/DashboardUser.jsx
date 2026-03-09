import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ProfileForm } from '../components/ProfileForm'
import { supabase } from '../lib/supabase'

export function DashboardUser() {
  const { user, profile } = useAuth()

  async function handleSignOut() {
    if (supabase) await supabase.auth.signOut()
  }

  return (
    <div className="layout layout--narrow">
      <header className="page-header">
        <h1>Moje konto</h1>
        <nav>
          <Link to="/">Strona główna</Link>
          {(profile?.role === 'admin' || profile?.role === 'superadmin') && <Link to="/admin">Panel admina</Link>}
          <button type="button" className="btn-link" onClick={handleSignOut}>Wyloguj</button>
        </nav>
      </header>

      <section className="form-block section">
        <h2 className="section__title">Mój profil</h2>
        <ProfileForm profile={profile} userId={user?.id} />
      </section>

      <section className="section">
        <h2 className="section__title">Moje ogłoszenia</h2>
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Lista Twoich ofert – dodawanie, edycja, ukrywanie (implementacja w kolejnym kroku).</p>
      </section>
    </div>
  )
}
