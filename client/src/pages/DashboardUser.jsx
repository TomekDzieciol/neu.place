import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ProfileForm } from '../components/ProfileForm'
import { supabase } from '../lib/supabase'

export function DashboardUser() {
  const { user, profile } = useAuth()
  // #region agent log
  if (typeof fetch !== 'undefined') fetch('http://127.0.0.1:7273/ingest/65417a7f-0a10-4c8c-9baa-f3ced7ad1ff3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'69178f'},body:JSON.stringify({sessionId:'69178f',location:'DashboardUser.jsx:render',message:'profile on dashboard',data:{profileRole:profile?.role,hasProfile:!!profile,showAdminLink:!(profile?.role !== 'admin' && profile?.role !== 'superadmin')},timestamp:Date.now(),hypothesisId:'H3,H4'})}).catch(()=>{});
  // #endregion

  async function handleSignOut() {
    if (supabase) await supabase.auth.signOut()
  }

  return (
    <div className="layout layout--narrow">
      <header className="page-header">
        <h1>Moje konto</h1>
        <nav>
          <Link to="/">Strona główna</Link>
          <Link to="/sprzedaj">Sprzedaj</Link>
          {(profile?.role === 'admin' || profile?.role === 'superadmin') && <Link to="/admin">Panel zarządzania</Link>}
          <button type="button" className="btn-link" onClick={handleSignOut}>Wyloguj</button>
        </nav>
      </header>

      <section className="form-block section">
        <h2 className="section__title">Mój profil</h2>
        <ProfileForm profile={profile} userId={user?.id} />
      </section>

      <section className="section">
        <h2 className="section__title">Moje ogłoszenia</h2>
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
          Lista Twoich ofert – dodawanie, edycja, ukrywanie (implementacja w kolejnym kroku).
        </p>
        <p style={{ marginTop: 12 }}>
          <Link to="/sprzedaj" className="btn btn--secondary">
            Wystaw nowe ogłoszenie
          </Link>
        </p>
      </section>
    </div>
  )
}
