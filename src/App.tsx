import { useState } from 'react';
import { Database, Layers, ChartBar as BarChart3, Mail, Shield, LogOut, Table2 } from 'lucide-react';
import { useTrackerData } from '@/hooks/useTrackerData';
import { useAuth, usePresence } from '@/hooks/useAuth';
import LoginPage from '@/components/LoginPage';
import InputsTab from '@/components/InputsTab';
import DropsTab from '@/components/DropsTab';
import TrackerTab from '@/components/TrackerTab';
import AdminTab from '@/components/AdminTab';
import MailerTab from '@/components/MailerTab';
import SheetsTab from '@/components/SheetsTab';
import Avatar from '@/components/Avatar';
import ProfileModal from '@/components/ProfileModal';

type Tab = 'inputs' | 'drops' | 'tracker' | 'admin' | 'mailer' | 'sheets';

export default function App() {
  const [tab, setTab] = useState<Tab>('tracker');
  const { user, loading: authLoading, signIn, signOut, refreshProfile } = useAuth();
  const { sponsors, offers, datasets, mailers, drops, loading, error, refetch } = useTrackerData();
  const onlineUsers = usePresence();
  const [showProfile, setShowProfile] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage onSignIn={signIn} />;
  }

  const isAdmin = user.role === 'admin';

  const tabs: { id: Tab; label: string; icon: typeof Database; adminOnly?: boolean }[] = [
    { id: 'tracker', label: 'Tracker', icon: BarChart3 },
    { id: 'sheets', label: 'Sheets', icon: Table2 },
    { id: 'inputs', label: 'Inputs', icon: Database, adminOnly: true },
    { id: 'drops', label: 'Drops', icon: Layers, adminOnly: true },
    { id: 'mailer', label: 'My Mailer', icon: Mail },
    { id: 'admin', label: 'Admin', icon: Shield, adminOnly: true },
  ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);
  const activeTab = visibleTabs.some((t) => t.id === tab) ? tab : 'tracker';

  const otherOnlineUsers = onlineUsers.filter((u) => u.id !== user.id);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Mail Tracker</h1>
                <p className="text-xs text-slate-400">Distribution management</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Tabs */}
              <nav className="flex items-center gap-1 bg-slate-800/60 rounded-xl p-1">
                {visibleTabs.map((t) => {
                  const Icon = t.icon;
                  const active = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        active
                          ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{t.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Active users avatars (Google Sheets style) */}
              {otherOnlineUsers.length > 0 && (
                <div className="hidden md:flex items-center -space-x-2">
                  {otherOnlineUsers.slice(0, 5).map((u) => (
                    <Avatar
                      key={u.id}
                      user={u}
                      size={32}
                      ring
                      className="ring-2 ring-slate-900"
                    />
                  ))}
                  {otherOnlineUsers.length > 5 && (
                    <div className="w-8 h-8 rounded-full bg-slate-700 ring-2 ring-slate-900 flex items-center justify-center text-xs font-bold text-slate-300">
                      +{otherOnlineUsers.length - 5}
                    </div>
                  )}
                </div>
              )}

              {/* User menu */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowProfile(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 transition-colors"
                  title="Edit profile"
                >
                  <Avatar user={user} size={28} className="ring-1 ring-slate-600" />
                  <div className="text-xs text-left">
                    <p className="text-slate-200 font-medium max-w-[120px] truncate">
                      {user.display_name || user.email}
                    </p>
                    <p className="text-slate-500 capitalize">{user.role}</p>
                  </div>
                </button>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-2 text-sm text-slate-300 hover:text-slate-100 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'tracker' && (
              <TrackerTab
                sponsors={sponsors}
                offers={offers}
                datasets={datasets}
                drops={drops}
              />
            )}
            {activeTab === 'inputs' && isAdmin && (
              <InputsTab
                sponsors={sponsors}
                offers={offers}
                datasets={datasets}
                mailers={mailers}
                refetch={refetch}
              />
            )}
            {activeTab === 'drops' && isAdmin && (
              <DropsTab
                offers={offers}
                datasets={datasets}
                mailers={mailers}
                drops={drops}
                refetch={refetch}
              />
            )}
            {activeTab === 'mailer' && (
              <MailerTab
                drops={drops}
                datasets={datasets}
                mailers={mailers}
                mailerId={user.mailer_id}
              />
            )}
            {activeTab === 'sheets' && (
              <SheetsTab />
            )}
            {activeTab === 'admin' && isAdmin && (
              <AdminTab mailers={mailers} />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        Mail Distribution Tracker
      </footer>

      {showProfile && user && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onUpdated={refreshProfile}
        />
      )}
    </div>
  );
}
