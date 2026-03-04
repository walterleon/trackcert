import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MapPin, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface Props {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: Props) {
  const { company, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/20 rounded-lg">
            <MapPin className="w-5 h-5 text-blue-400" />
          </div>
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            RastreoYa
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/dashboard" active={isActive('/dashboard')}>
            <LayoutDashboard className="w-4 h-4" />
            Campañas
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium text-gray-200">{company?.name}</span>
            <span className="text-xs text-gray-500 capitalize">{company?.planName}</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
}

function NavLink({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
      }`}
    >
      {children}
    </Link>
  );
}
