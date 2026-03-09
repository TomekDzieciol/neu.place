import { Component } from 'react'

export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="page-message">
          <h1>Coś poszło nie tak</h1>
          <p>{this.state.error?.message || String(this.state.error)}</p>
          <p style={{ fontSize: 14 }}>
            Sprawdź konsolę przeglądarki (F12) i upewnij się, że w <code>client/.env</code> są ustawione
            VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY (skopiuj z <code>client/.env.example</code>).
          </p>
          <button type="button" className="btn btn--primary" onClick={() => this.setState({ error: null })}>
            Spróbuj ponownie
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
