import { useState, useRef } from 'react';
import { X, Camera, KeyRound, Check, Loader2, CircleAlert as AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Avatar, { getFallbackUrl } from '@/components/Avatar';
import type { AppUser } from '@/hooks/useAuth';

type Props = {
  user: AppUser;
  onClose: () => void;
  onUpdated: () => void;
};

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function ProfileModal({ user, onClose, onUpdated }: Props) {
  const [displayName, setDisplayName] = useState(user.display_name ?? '');
  const [avatarPath, setAvatarPath] = useState<string | null>(user.avatar_url ?? null);
  const [gender] = useState(user.gender);
  const [uploading, setUploading] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUser: AppUser = { ...user, display_name: displayName, avatar_url: avatarPath };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Please upload a JPEG, PNG, WebP, or GIF image.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Image must be 2 MB or smaller.');
      return;
    }

    setUploading(true);
    try {
      const oldPath = avatarPath;
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const newPath = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('profile-avatars')
        .upload(newPath, file, { contentType: file.type, upsert: false });

      if (upErr) {
        setError('Failed to upload image. Please try again.');
        setUploading(false);
        return;
      }

      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_url: newPath })
        .eq('id', user.id);

      if (dbErr) {
        setError('Failed to save profile image.');
        setUploading(false);
        return;
      }

      if (oldPath) {
        await supabase.storage.from('profile-avatars').remove([oldPath]);
      }

      setAvatarPath(newPath);
      setSuccess('Profile photo updated.');
      onUpdated();
    } catch {
      setError('Something went wrong during upload.');
    }
    setUploading(false);
  };

  const saveName = async () => {
    setSavingName(true);
    setError(null);
    setSuccess(null);

    const { error: dbErr } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() || null })
      .eq('id', user.id);

    if (dbErr) {
      setError('Failed to save name.');
    } else {
      setSuccess('Name saved.');
      onUpdated();
    }
    setSavingName(false);
  };

  const changePassword = async () => {
    setChangingPw(true);
    setError(null);
    setSuccess(null);

    if (!currentPw || !newPw || !confirmPw) {
      setError('Please fill in all password fields.');
      setChangingPw(false);
      return;
    }

    if (newPw !== confirmPw) {
      setError('New passwords do not match.');
      setChangingPw(false);
      return;
    }

    if (newPw.length < 6) {
      setError('New password must be at least 6 characters.');
      setChangingPw(false);
      return;
    }

    const { error: authErr } = await supabase.auth.updateUser({ password: newPw });

    if (authErr) {
      setError('Failed to change password. Please verify your current password.');
    } else {
      setSuccess('Password changed successfully.');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    }
    setChangingPw(false);
  };

  const removeAvatar = async () => {
    if (!avatarPath) return;
    setError(null);
    setSuccess(null);

    await supabase.storage.from('profile-avatars').remove([avatarPath]);

    const { error: dbErr } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', user.id);

    if (dbErr) {
      setError('Failed to remove photo.');
    } else {
      setAvatarPath(null);
      setSuccess('Photo removed. Using default avatar.');
      onUpdated();
    }
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
          <h3 className="text-lg font-semibold text-slate-100">Edit Profile</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Avatar section */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <Avatar user={previewUser} size={96} />
              {uploading ? (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/50 flex items-center justify-center transition-colors"
                  title="Change photo"
                >
                  <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileSelect}
            />

            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Upload photo
              </button>
              {avatarPath && (
                <button
                  onClick={removeAvatar}
                  disabled={uploading}
                  className="text-sm text-slate-500 hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>

            {!avatarPath && (
              <p className="text-xs text-slate-500 text-center">
                Using default {gender ?? 'unknown'} avatar
              </p>
            )}
          </div>

          {/* Display name */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Display Name
            </label>
            <div className="flex gap-2">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name..."
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                onClick={saveName}
                disabled={savingName}
                className="flex items-center gap-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-40 px-4 py-2.5 text-sm font-medium text-white transition-colors"
              >
                {savingName ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save
              </button>
            </div>
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
              Email
            </label>
            <input
              value={user.email}
              disabled
              className="w-full rounded-xl bg-slate-800/50 border border-slate-700/50 px-3 py-2.5 text-sm text-slate-400 cursor-not-allowed"
            />
          </div>

          {/* Change password */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="w-4 h-4 text-slate-400" />
              <h4 className="text-sm font-medium text-slate-200">Change Password</h4>
            </div>
            <div className="space-y-2.5">
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="New password"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Confirm new password"
                onKeyDown={(e) => e.key === 'Enter' && changePassword()}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                onClick={changePassword}
                disabled={changingPw || !newPw || !confirmPw}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-medium text-white transition-colors"
              >
                {changingPw ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Update Password
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300">
              <Check className="w-4 h-4 flex-shrink-0" />
              {success}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
