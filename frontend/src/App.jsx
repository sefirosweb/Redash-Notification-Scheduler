import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { CalendarClock, Users, History, Mail, UserCog, LogOut } from 'lucide-react'
import { Toaster } from 'sonner'
import { cn } from './lib/utils'
import Jobs from './pages/Jobs'
import Groups from './pages/Groups'
import Logs from './pages/Logs'
import UsersPage from './pages/Users'
import Login from './pages/Login'

const navItems = [
  { to: '/jobs',   label: 'Jobs',      icon: CalendarClock },
  { to: '/groups', label: 'Grupos',    icon: Users },
  { to: '/logs',   label: 'Historial', icon: History },
  { to: '/users',  label: 'Usuarios',  icon: UserCog },
]

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return children
}

function Sidebar() {
  const navigate = useNavigate()

  function handleLogout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-slate-200 flex flex-col">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-200">
        <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
          <Mail className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-slate-900 text-sm">Redash Mailer</span>
      </div>

      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-200">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

function Layout() {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/jobs" replace />} />
            <Route path="/jobs"   element={<Jobs />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/logs"   element={<Logs />} />
            <Route path="/users"  element={<UsersPage />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}
