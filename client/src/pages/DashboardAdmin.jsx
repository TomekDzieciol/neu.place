import { Link } from 'react-router-dom'
import { UserList } from '../components/UserList'

export function DashboardAdmin() {
  return (
    <div className="layout">
      <header className="page-header">
        <h1>Panel administratora</h1>
        <nav>
          <Link to="/dashboard">Moje konto</Link>
          <Link to="/">Strona główna</Link>
        </nav>
      </header>

      <section className="section">
        <h2 className="section__title">Zarządzanie użytkownikami</h2>
        <UserList />
      </section>
    </div>
  )
}
