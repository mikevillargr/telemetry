'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  Users,
  Settings,
  Rocket,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';

const navItems = [
  { icon: LayoutDashboard, label: 'Data Stream', path: '/dashboard' },
  { icon: FileText, label: 'Reports', path: '/reports' },
  { icon: TrendingUp, label: 'Trends', path: '/trends' },
  { icon: Users, label: 'Clients', path: '/clients' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === 'admin';
  const isClient = user?.role === 'client';

  // Client role only sees portal
  if (isClient) return null;

  return (
    <aside
      className={cn(
        'border-r border-border bg-background flex flex-col h-screen sticky top-0 transition-all duration-200 z-20',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border shrink-0">
        <div className="flex items-center overflow-hidden">
          <Rocket className="w-6 h-6 text-primary flex-shrink-0" />
          {!collapsed && (
            <span className="font-medium text-base tracking-tight ml-2 whitespace-nowrap text-foreground">
              Telemetry
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 ml-2 flex-shrink-0 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav items */}
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              href={item.path}
              title={collapsed ? item.label : undefined}
              className={cn(
                'relative flex items-center px-3 py-2 rounded-md text-sm transition-colors group',
                isActive
                  ? 'bg-primary/10 text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground font-medium',
                collapsed && 'justify-center px-0'
              )}
            >
              {isActive && !collapsed && (
                <div className="absolute left-0 w-1 h-4 bg-primary rounded-r-full" />
              )}
              <item.icon
                className={cn(
                  'w-5 h-5 flex-shrink-0',
                  !collapsed && 'mr-3',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* Bottom section */}
      <div className="p-3 border-t border-border shrink-0">
        {/* Settings — admin only */}
        {isAdmin && (
          <Link
            href="/settings"
            title={collapsed ? 'Settings' : undefined}
            className={cn(
              'relative flex items-center px-3 py-2 rounded-md text-sm transition-colors group',
              pathname.startsWith('/settings')
                ? 'bg-primary/10 text-foreground font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground font-medium',
              collapsed && 'justify-center px-0'
            )}
          >
            {pathname.startsWith('/settings') && !collapsed && (
              <div className="absolute left-0 w-1 h-4 bg-primary rounded-r-full" />
            )}
            <Settings
              className={cn(
                'w-5 h-5 flex-shrink-0',
                !collapsed && 'mr-3',
                pathname.startsWith('/settings')
                  ? 'text-primary'
                  : 'text-muted-foreground group-hover:text-foreground'
              )}
            />
            {!collapsed && <span className="whitespace-nowrap">Settings</span>}
          </Link>
        )}

        {/* Theme toggle */}
        <div className={cn('mt-2 flex', collapsed ? 'justify-center' : 'px-3')}>
          <ThemeToggle collapsed={collapsed} />
        </div>

        {/* User info */}
        <div className={cn('mt-2 py-2 flex items-center', collapsed ? 'justify-center' : 'px-3')}>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
            {user?.name?.slice(0, 2).toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="ml-3 overflow-hidden flex-1">
              <p className="text-sm font-normal leading-none whitespace-nowrap text-foreground">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 whitespace-nowrap capitalize">
                {user?.role || 'Unknown'}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              className="ml-2 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
