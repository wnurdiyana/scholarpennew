import { Link, useLocation, useNavigate } from "react-router-dom";
import { FileText, Home, LogOut, Plus, Settings, User as UserIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const NavItem = ({ to, icon: Icon, children, testId }) => {
  const { pathname } = useLocation();
  const active = pathname === to || (to !== "/dashboard" && pathname.startsWith(to));
  return (
    <Link
      to={to}
      data-testid={testId}
      className="toc-link flex items-center gap-3 px-3 py-2 text-sm text-zinc-700"
      data-active={active ? "true" : "false"}
    >
      <Icon className="w-4 h-4" strokeWidth={1.5} />
      <span>{children}</span>
    </Link>
  );
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="left-nav border-r border-zinc-200 bg-[#fafafa] flex flex-col h-screen sticky top-0" data-testid="left-sidebar">
      <div className="px-5 py-5 border-b border-zinc-200">
        <Link to="/" className="flex items-center gap-2" data-testid="sidebar-logo">
          <span className="inline-block w-2.5 h-2.5 bg-[#0033A0]" />
          <span className="font-semibold tracking-tight text-zinc-900">ScholarPen</span>
        </Link>
        <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-zinc-500">Workspace</div>
      </div>

      <div className="px-3 py-4">
        <button
          onClick={() => navigate("/new")}
          className="btn-brand w-full inline-flex items-center justify-center gap-2"
          data-testid="sidebar-new-manuscript-btn"
        >
          <Plus className="w-4 h-4" /> New Manuscript
        </button>
      </div>

      <nav className="px-2 flex-1">
        <div className="px-3 mt-2 mb-1 text-[10px] font-mono uppercase tracking-widest text-zinc-400">Navigate</div>
        <NavItem to="/dashboard" icon={Home} testId="nav-home">Dashboard</NavItem>
        <NavItem to="/library" icon={FileText} testId="nav-library">Library</NavItem>
        <NavItem to="/settings" icon={Settings} testId="nav-settings">Settings</NavItem>
      </nav>

      <div className="border-t border-zinc-200 p-3">
        <div className="flex items-center gap-3 px-2 py-2" data-testid="sidebar-user-card">
          <div className="icon-square">
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-4 h-4" strokeWidth={1.5} />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-zinc-900 truncate">{user?.name || "Researcher"}</div>
            <div className="text-[11px] font-mono text-zinc-500 truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={async () => { await logout(); navigate("/"); }}
          className="mt-1 w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          data-testid="sidebar-logout-btn"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
