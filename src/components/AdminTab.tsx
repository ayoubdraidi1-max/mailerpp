import { useState, useEffect, useCallback } from 'react';
import { Shield, UserPlus, KeyRound, Trash2, Search, Mail, CircleAlert as AlertCircle, X, UserCog } from 'lucide-react';
import { supabase, formatFull } from '@/lib/supabase';
import type { Mailer } from '@/lib/supabase';
import Avatar from '@/components/Avatar';

type ManagedUser = {
  id: string;
  email: string;
  role: string;
  mailer_id: string | null;
  mailer_name: string | null;
  created_at: string;
  avatar_url: string | null;
  gender: 'male' | 'female' | null;
  is_online: boolean;
  display_name: string | null;
};

type Props = {
  mailers: Mailer[];
};

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-management`;

export default function AdminTab({ mailers }: Props) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) {
      setLoading(false);
      return;
    }

    const res = await fetch(`${FN_URL}/list-users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Failed to load users');
      setLoading(false);
      return;
    }

    const data = await res.json();
    setUsers(data);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = search.trim()
    ? users.filter((u) => u.email.toLowerCase().includes(search.toLowerCase()))
    : users;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">User Management</h2>
            <p className="text-sm text-slate-500">{users.length} user{users.length !== 1 ? 's' : ''} total</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-500 hover:bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by email..."
          className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Users table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-medium">User</th>
                  <th className="text-left px-3 py-3 font-medium">Role</th>
                  <th className="text-left px-3 py-3 font-medium">Mailer</th>
                  <th className="text-left px-3 py-3 font-medium">Gender</th>
                  <th className="text-left px-3 py-3 font-medium">Status</th>
                  <th className="text-left px-3 py-3 font-medium">Created</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      {users.length === 0 ? 'No users yet' : 'No users match your search'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      mailers={mailers}
                      onChanged={() => fetchUsers(true)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add user modal */}
      {showAddForm && (
        <AddUserModal
          mailers={mailers}
          onClose={() => setShowAddForm(false)}
          onCreated={() => {
            setShowAddForm(false);
            fetchUsers(true);
          }}
        />
      )}
    </div>
  );
}

function UserRow({
  user,
  mailers,
  onChanged,
}: {
  user: ManagedUser;
  mailers: Mailer[];
  onChanged: () => void;
}) {
  const [changingPw, setChangingPw] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  const getToken = async () => {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token ?? '';
  };

  const changeRole = async (newRole: string) => {
    const token = await getToken();
    await fetch(`${FN_URL}/update-role`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, new_role: newRole }),
    });
    onChanged();
  };

  const changeMailer = async (mailerId: string | null) => {
    const token = await getToken();
    await fetch(`${FN_URL}/update-mailer`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, mailer_id: mailerId }),
    });
    onChanged();
  };

  const submitPw = async () => {
    if (!newPw) return;
    setPwMsg(null);
    const token = await getToken();
    const res = await fetch(`${FN_URL}/change-password`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, new_password: newPw }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setChangingPw(false);
      setNewPw('');
      setPwMsg(null);
    } else {
      setPwMsg(body.error ?? 'Failed to change password');
    }
  };

  const deleteUser = async () => {
    if (!confirm(`Delete user "${user.email}"? This cannot be undone.`)) return;
    const token = await getToken();
    await fetch(`${FN_URL}/delete-user`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    });
    onChanged();
  };

  return (
    <tr className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
      <td className="px-5 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar user={user} size={36} />
          <div className="min-w-0">
            <div className="text-slate-200 truncate">{user.display_name || user.email}</div>
            {user.display_name && (
              <div className="text-xs text-slate-500 truncate">{user.email}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <select
          value={user.role}
          onChange={(e) => changeRole(e.target.value)}
          className="appearance-none rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
        >
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
      </td>
      <td className="px-3 py-3">
        <select
          value={user.mailer_id ?? ''}
          onChange={(e) => changeMailer(e.target.value || null)}
          className="appearance-none rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer max-w-[140px]"
        >
          <option value="">None</option>
          {mailers.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3">
        <span className="text-xs text-slate-400 capitalize">{user.gender ?? '—'}</span>
      </td>
      <td className="px-3 py-3">
        {user.is_online ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-slate-600" />
            Offline
          </span>
        )}
      </td>
      <td className="px-3 py-3 text-xs text-slate-500">
        {new Date(user.created_at).toLocaleDateString()}
      </td>
      <td className="px-3 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {changingPw ? (
            <div className="flex items-center gap-1">
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="New password"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && submitPw()}
                className="w-28 rounded-lg bg-slate-800 border border-slate-700 px-2 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={submitPw}
                className="rounded-lg bg-emerald-500 hover:bg-emerald-600 px-2 py-1 text-xs text-white transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => { setChangingPw(false); setNewPw(''); setPwMsg(null); }}
                className="text-slate-500 hover:text-slate-300 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              {pwMsg && <span className="text-xs text-red-400 mr-2">{pwMsg}</span>}
              <button
                onClick={() => setChangingPw(true)}
                className="text-slate-500 hover:text-blue-400 p-1.5 rounded-lg transition-colors"
                title="Change password"
              >
                <KeyRound className="w-4 h-4" />
              </button>
              <button
                onClick={deleteUser}
                className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg transition-colors"
                title="Delete user"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function AddUserModal({
  mailers,
  onClose,
  onCreated,
}: {
  mailers: Mailer[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [mailerId, setMailerId] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const previewUser = {
    avatar_url: null,
    gender,
    email: email || 'Preview',
  };

  const submit = async () => {
    if (!email.trim() || !password) return;
    setSaving(true);
    setError(null);

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    const res = await fetch(`${FN_URL}/create-user`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        role,
        mailer_id: mailerId || null,
        gender,
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      onCreated();
    } else {
      setError(body.error ?? 'Failed to create user');
    }
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-slate-100">Add New User</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Avatar preview + gender selector */}
          <div className="flex items-center gap-4">
            <Avatar user={previewUser} size={64} />
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Gender
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setGender('male')}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    gender === 'male'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Male
                </button>
                <button
                  onClick={() => setGender('female')}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    gender === 'female'
                      ? 'bg-pink-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Female
                </button>
              </div>
            </div>
          </div>

          <div className="pt-1">
            <p className="text-xs text-slate-500">
              The user can upload their own photo later from their profile settings.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              autoFocus
              className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full appearance-none rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Mailer
              </label>
              <select
                value={mailerId}
                onChange={(e) => setMailerId(e.target.value)}
                className="w-full appearance-none rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">None</option>
                {mailers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={saving || !email.trim() || !password}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-3 text-sm font-medium text-white transition-colors"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Create User
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
