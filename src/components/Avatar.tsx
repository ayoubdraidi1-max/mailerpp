import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const UNKNOWN_AVATAR = 'https://images.pexels.com/photos/399772/pexels-photo-399772.jpeg?auto=compress&cs=tinysrgb&h=200&w=200';
const MALE_FALLBACK = 'https://images.pexels.com/photos/31420959/pexels-photo-31420959.jpeg?auto=compress&cs=tinysrgb&h=200&w=200';
const FEMALE_FALLBACK = 'https://images.pexels.com/photos/10230832/pexels-photo-10230832.jpeg?auto=compress&cs=tinysrgb&h=200&w=200';

export function getFallbackUrl(gender?: 'male' | 'female' | null): string {
  if (gender === 'male') return MALE_FALLBACK;
  if (gender === 'female') return FEMALE_FALLBACK;
  return UNKNOWN_AVATAR;
}

type AvatarUser = {
  avatar_url?: string | null;
  gender?: 'male' | 'female' | null;
  email?: string;
  display_name?: string | null;
};

type Props = {
  user: AvatarUser;
  size?: number;
  ring?: boolean;
  className?: string;
};

export default function Avatar({ user, size = 32, ring = false, className = '' }: Props) {
  const storagePath = user.avatar_url ?? null;
  const fallback = getFallbackUrl(user.gender ?? null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSignedUrl(null);
    setImgError(false);

    if (!storagePath) {
      return;
    }

    (async () => {
      const { data, error } = await supabase.storage
        .from('profile-avatars')
        .createSignedUrl(storagePath, 3600);

      if (!cancelled && !error && data?.signedUrl) {
        setSignedUrl(data.signedUrl);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  const displayName = user.display_name || user.email || '?';
  const initials = displayName.charAt(0).toUpperCase();
  const src = signedUrl ?? fallback;

  return (
    <div
      className={`relative rounded-full overflow-hidden bg-slate-700 shrink-0 ${ring ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900' : ''} ${className}`}
      style={{ width: size, height: size }}
      title={displayName}
    >
      {!imgError ? (
        <img
          src={src}
          alt={displayName}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-700">
          <span className="text-slate-300 font-bold" style={{ fontSize: size * 0.4 }}>
            {initials}
          </span>
        </div>
      )}
    </div>
  );
}
