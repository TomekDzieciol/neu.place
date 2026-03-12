import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

const TAB_TITLES = {
  '/admin/uzytkownicy': 'Lista użytkowników',
  '/admin/ogloszenia': 'Lista ogłoszeń',
  '/admin/marki': 'Marki pojazdów',
  '/admin/modele': 'Modele pojazdów',
}

export function DashboardAdmin() {
  const location = useLocation()
  const sectionTitle = TAB_TITLES[location.pathname] || 'Panel zarządzania'

  return (
    <div className="layout">
      <header className="page-header">
        <h1>Panel zarządzania</h1>
        <nav>
          <Link to="/dashboard">Moje konto</Link>
          <Link to="/">Strona główna</Link>
        </nav>
      </header>

      <nav className="tabs tabs--secondary" style={{ marginBottom: 24 }}>
        <NavLink to="/admin/uzytkownicy" className={({ isActive }) => isActive ? 'tabs__link tabs__link--active' : 'tabs__link'}>
          Lista użytkowników
        </NavLink>
        <NavLink to="/admin/ogloszenia" className={({ isActive }) => isActive ? 'tabs__link tabs__link--active' : 'tabs__link'}>
          Lista ogłoszeń
        </NavLink>
        <NavLink to="/admin/marki" className={({ isActive }) => isActive ? 'tabs__link tabs__link--active' : 'tabs__link'}>
          Marki pojazdów
        </NavLink>
        <NavLink to="/admin/modele" className={({ isActive }) => isActive ? 'tabs__link tabs__link--active' : 'tabs__link'}>
          Modele pojazdów
        </NavLink>
      </nav>

      <section className="section">
        <h2 className="section__title">{sectionTitle}</h2>
        <Outlet />
      </section>
    </div>
  )
}
