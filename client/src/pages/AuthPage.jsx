import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const VIEW = { LOGIN: 'login', REGISTER: 'register', FORGOT: 'forgot', RECOVERY: 'recovery' }

export function AuthPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const isRegister = searchParams.get('rejestracja') === '1'
  const isForgot = searchParams.get('reset') === '1'
  const navigate = useNavigate()

  const [view, setView] = useState(() => {
    if (typeof window !== 'undefined' && (window.location.hash || '').includes('type=recovery')) return VIEW.RECOVERY
    if (isRegister) return VIEW.REGISTER
    if (isForgot) return VIEW.FORGOT
    return VIEW.LOGIN
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(false)

  // Tryb "recovery" gdy użytkownik wrócił z linku w mailu (hash z type=recovery).
  // Nie wywołujemy setSearchParams – hash musi zostać w URL, żeby Supabase mógł w initialize() odczytać token i zapisać sesję; inaczej updateUser() zwraca "Auth session missing!".
  useEffect(() => {
    const hash = window.location.hash || ''
    const hasRecovery = hash.includes('type=recovery')
    if (hasRecovery) {
      setView(VIEW.RECOVERY)
    }
  }, [])

  useEffect(() => {
    if (isRegister) setView(VIEW.REGISTER)
    else if (isForgot) setView(VIEW.FORGOT)
    else if (view !== VIEW.RECOVERY) setView(VIEW.LOGIN)
  }, [isRegister, isForgot, view])

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage({ type: '', text: '' })
    if (!supabase) {
      console.log(
        '[AuthPage] Supabase client is not initialized. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in client/.env or Vercel project settings.'
      )
      setMessage({ type: 'error', text: 'Tymczasowy błąd połączenia. Spróbuj ponownie za chwilę.' })
      return
    }
    setLoading(true)
    try {
      if (view === VIEW.REGISTER) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage({
          type: 'success',
          text: 'Na podany adres e-mail wysłaliśmy wiadomość. Aby potwierdzić rejestrację, kliknij w link aktywacyjny w tej wiadomości. Po potwierdzeniu będziesz mógł się zalogować.'
        })
        return
      }
      if (view === VIEW.FORGOT) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`
        })
        if (error) throw error
        setMessage({
          type: 'success',
          text: 'Jeśli konto z podanym adresem e-mail istnieje, wysłaliśmy na niego link do ustawienia nowego hasła. Sprawdź skrzynkę (oraz folder spam).'
        })
        return
      }
      if (view === VIEW.RECOVERY) {
        if (password !== passwordConfirm) {
          setMessage({ type: 'error', text: 'Hasła muszą być identyczne.' })
          return
        }
        if (password.length < 6) {
          setMessage({ type: 'error', text: 'Hasło musi mieć co najmniej 6 znaków.' })
          return
        }
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
        setMessage({ type: 'success', text: 'Hasło zostało zmienione. Możesz się teraz zalogować.' })
        setView(VIEW.LOGIN)
        setPassword('')
        setPasswordConfirm('')
        return
      }
      // LOGIN
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const raw = (err.message || 'Wystąpił błąd.').trim()
      const lower = raw.toLowerCase()
      let text = raw
      if (lower === 'invalid login credentials') text = 'Błędny adres email lub hasło.'
      else if (lower.includes('email rate limit exceeded')) text = 'Zbyt wiele prób wysłania e-maila. Poczekaj kilkanaście minut i spróbuj ponownie.'
      else if (lower.includes('auth session missing')) text = 'Sesja wygasła. Kliknij ponownie w link z e-maila i ustaw hasło od razu po otwarciu strony.'
      setMessage({ type: 'error', text })
    } finally {
      setLoading(false)
    }
  }

  const titles = {
    [VIEW.LOGIN]: 'Logowanie',
    [VIEW.REGISTER]: 'Rejestracja',
    [VIEW.FORGOT]: 'Odzyskiwanie hasła',
    [VIEW.RECOVERY]: 'Ustaw nowe hasło'
  }

  return (
    <div className="layout layout--narrow">
      <header className="page-header" style={{ marginBottom: 32 }}>
        <h1>{titles[view]}</h1>
        <Link to="/">Strona główna</Link>
      </header>

      <div className="card" style={{ maxWidth: 420, margin: '0 auto' }}>
        <form onSubmit={handleSubmit} className="form-block" style={{ marginBottom: 0 }}>
          {message.text && (
            <p className={message.type === 'error' ? 'msg--error' : 'msg--success'} style={{ marginTop: 0 }}>
              {message.text}
            </p>
          )}
          {(view === VIEW.LOGIN || view === VIEW.REGISTER || view === VIEW.FORGOT) && (
            <label>
              E-mail
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="np. jan@example.com"
                required
                autoComplete="email"
              />
            </label>
          )}
          {(view === VIEW.LOGIN || view === VIEW.REGISTER) && (
            <label>
              Hasło
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={view === VIEW.REGISTER ? 'min. 6 znaków' : 'hasło'}
                required
                minLength={6}
                autoComplete={view === VIEW.REGISTER ? 'new-password' : 'current-password'}
              />
            </label>
          )}
          {view === VIEW.RECOVERY && (
            <>
              <label>
                Nowe hasło
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="min. 6 znaków"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </label>
              <label>
                Powtórz hasło
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="powtórz hasło"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </label>
            </>
          )}
          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading
              ? 'Proszę czekać…'
              : view === VIEW.REGISTER
                ? 'Zarejestruj się'
                : view === VIEW.FORGOT
                  ? 'Wyślij link do resetowania hasła'
                  : view === VIEW.RECOVERY
                    ? 'Zapisz nowe hasło'
                    : 'Zaloguj się'}
          </button>
        </form>
        <p style={{ marginTop: 20, marginBottom: 0, color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {view === VIEW.REGISTER && (
            <>Masz konto? <Link to="/auth">Zaloguj się</Link></>
          )}
          {view === VIEW.LOGIN && (
            <>
              Nie masz konta? <Link to="/auth?rejestracja=1">Zarejestruj się</Link>
              {' · '}
              <Link to="/auth?reset=1">Zapomniałeś hasła?</Link>
            </>
          )}
          {view === VIEW.FORGOT && (
            <>Pamiętasz hasło? <Link to="/auth">Zaloguj się</Link></>
          )}
          {view === VIEW.RECOVERY && (
            <>Po zapisaniu hasła <Link to="/auth">zaloguj się</Link> przy użyciu nowego hasła.</>
          )}
        </p>
      </div>
    </div>
  )
}
