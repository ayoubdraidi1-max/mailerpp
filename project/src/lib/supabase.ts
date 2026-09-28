import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Sponsor = {
  id: string;
  name: string;
  region: string | null;
  position: number;
  created_at: string;
};

export type Offer = {
  id: string;
  name: string;
  region: string;
  sponsor_id: string | null;
  position: number;
  created_at: string;
};

export type Dataset = {
  id: string;
  name: string;
  total: number;
  region: string;
  position: number;
  created_at: string;
};

export type Mailer = {
  id: string;
  name: string;
  position: number;
  created_at: string;
};

export type Drop = {
  id: string;
  offer_id: string;
  dataset_id: string;
  mailer_id: string;
  offset: number;
  limit: number;
  position: number;
  created_at: string;
};

export type DropWithNames = Drop & {
  offer_name: string;
  offer_region: string;
  offer_sponsor_name: string;
  dataset_name: string;
  dataset_region: string;
  mailer_name: string;
};

export const REGION_CODES = [
  'FR', 'DE', 'BE', 'NL', 'US', 'AU', 'GB', 'IT', 'SE', 'ES', 'NO', 'FI', 'CH', 'DK', 'CA',
];

export function formatNumber(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return (Number.isInteger(v) ? v : v.toFixed(1)) + 'M';
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return (Number.isInteger(v) ? v : v.toFixed(1)) + 'K';
  }
  return String(n);
}

export function formatFull(n: number): string {
  return n.toLocaleString('en-US');
}
