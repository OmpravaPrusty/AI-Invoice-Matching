import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  GitCompare,
  Settings,
  User,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

/**
 * MainLayout - Global app shell with header, sidebar, and content area
 *
 * Features:
 * - Fixed 64px header with branding, search, notifications, language selector, user profile
 * - Collapsible 240px sidebar with navigation (collapses to hamburger on mobile <768px)
 * - Fluid main content area with breadcrumbs, page header, and scrollable body
 * - Responsive design with mobile-first approach
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Page content to render
 * @param {string} props.breadcrumbs - Breadcrumb navigation text (e.g., "App > Core > Section")
 * @param {string} props.pageTitle - Main page title
 * @param {React.ReactNode} props.pageActions - Action buttons in header
 * @returns {JSX.Element} App shell layout
 */
export default function MainLayout({
  children,
  breadcrumbs = "Dashboard",
  pageTitle = "Dashboard",
  pageActions = null,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: FileText, label: "Purchase Orders", path: "/purchase-orders" },
    { icon: Receipt, label: "Invoices", path: "/invoices" },
    { icon: GitCompare, label: "Comparisons", path: "/comparisons" },
  ];

  const utilityItems = [
    { icon: Settings, label: "Settings", path: "/settings" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`fixed md:relative z-30 md:z-0 h-screen w-240 bg-slate-900 text-white flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-lg">
              ⚡
            </div>
            <h1 className="text-xl font-bold hidden sm:block">AI Hub</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
            aria-label="Close sidebar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors text-left text-slate-300 hover:text-white group"
            >
              <item.icon size={20} className="flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Utility Items */}
        <div className="border-t border-slate-800 p-4 space-y-2">
          {utilityItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors text-left text-slate-300 hover:text-white"
            >
              <item.icon size={20} className="flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-rose-900 transition-colors text-left text-rose-300 hover:text-rose-100"
          >
            <LogOut size={20} className="flex-shrink-0" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="fixed md:relative top-0 right-0 left-0 md:left-auto z-20 h-16 md:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 gap-4">
          {/* Left: Menu + Search */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-slate-600 hover:text-slate-900"
              aria-label="Toggle sidebar"
            >
              <Menu size={24} />
            </button>

            {/* Search Bar */}
            <div className="hidden sm:flex items-center gap-2 flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 min-w-0">
              <Search size={18} className="text-slate-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                className="flex-1 bg-transparent text-slate-900 placeholder-slate-400 outline-none text-sm"
              />
              <kbd className="hidden lg:inline-flex text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-300">
                /
              </kbd>
            </div>
          </div>

          {/* Right: Notifications, Language, User Profile */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Notification Bell */}
            <button
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium hidden md:flex items-center gap-1"
              >
                EN
                <ChevronDown size={16} />
              </button>
              {languageMenuOpen && (
                <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg py-2">
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 text-slate-700">
                    English
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 text-slate-700">
                    Spanish
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 text-slate-700">
                    French
                  </button>
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="User menu"
              >
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {user?.email?.[0]?.toUpperCase() || "O"}
                </div>
                <span className="hidden md:inline text-sm font-medium text-slate-700">
                  {user?.email?.split("@")[0] || "Omprava"}
                </span>
                <ChevronDown
                  size={16}
                  className="text-slate-500 hidden md:inline"
                />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-2">
                  <div className="px-4 py-2 border-b border-slate-200 text-sm text-slate-600">
                    {user?.email || "omprava@example.com"}
                  </div>
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 text-slate-700">
                    Profile Settings
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 text-slate-700">
                    Account
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-rose-50 text-rose-600"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto pt-16 md:pt-0">
          <div className="max-w-1600 mx-auto">
            {/* Breadcrumb */}
            <div className="px-4 md:px-8 py-4 border-b border-slate-200 bg-white">
              <nav className="text-sm">
                <ol className="flex items-center gap-2">
                  {(Array.isArray(breadcrumbs)
                    ? breadcrumbs
                    : breadcrumbs.split("> ").map((label) => ({ label }))
                  ).map((crumb, idx, arr) => (
                    <li key={idx} className="flex items-center gap-2">
                      {crumb.to ? (
                        <Link
                          to={crumb.to}
                          className="text-slate-600 hover:text-blue-600"
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="text-slate-600">
                          {crumb.label.trim()}
                        </span>
                      )}
                      {idx < arr.length - 1 && (
                        <span className="text-slate-400">/</span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            </div>

            {/* Page Header */}
            <div className="px-4 md:px-8 py-6 border-b border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">
                    {pageTitle}
                  </h1>
                </div>
                {pageActions && (
                  <div className="flex items-center gap-3">{pageActions}</div>
                )}
              </div>
            </div>

            {/* Body Content */}
            <div className="p-4 md:p-8">{children}</div>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
