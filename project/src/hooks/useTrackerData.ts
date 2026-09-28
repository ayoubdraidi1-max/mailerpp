import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Offer, Dataset, Mailer, Sponsor, Drop, DropWithNames } from '@/lib/supabase';

export function useTrackerData() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [mailers, setMailers] = useState<Mailer[]>([]);
  const [drops, setDrops] = useState<DropWithNames[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFirstLoad = useRef(true);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [sponsorsRes, offersRes, datasetsRes, mailersRes, dropsRes] = await Promise.all([
        supabase.from('sponsors').select('*').order('position', { ascending: true }),
        supabase.from('offers').select('*').order('position', { ascending: true }),
        supabase.from('datasets').select('*').order('position', { ascending: true }),
        supabase.from('mailers').select('*').order('position', { ascending: true }),
        supabase
          .from('drops')
          .select(`
            *,
            offer:offer_id (name, region, sponsor:sponsor_id (name)),
            dataset:dataset_id (name, region),
            mailer:mailer_id (name)
          `)
          .order('position', { ascending: true }),
      ]);

      if (sponsorsRes.error) throw sponsorsRes.error;
      if (offersRes.error) throw offersRes.error;
      if (datasetsRes.error) throw datasetsRes.error;
      if (mailersRes.error) throw mailersRes.error;
      if (dropsRes.error) throw dropsRes.error;

      setSponsors(sponsorsRes.data as Sponsor[]);
      setOffers(offersRes.data as Offer[]);
      setDatasets(datasetsRes.data as Dataset[]);
      setMailers(mailersRes.data as Mailer[]);

      const dropRows = (dropsRes.data as unknown as Array<
        Drop & {
          offer: { name: string; region: string; sponsor: { name: string } | null } | null;
          dataset: { name: string; region: string } | null;
          mailer: { name: string } | null;
        }
      >).map((d) => ({
        id: d.id,
        offer_id: d.offer_id,
        dataset_id: d.dataset_id,
        mailer_id: d.mailer_id,
        offset: d.offset,
        limit: d.limit,
        position: d.position,
        created_at: d.created_at,
        offer_name: d.offer?.name ?? '',
        offer_region: d.offer?.region ?? '',
        offer_sponsor_name: d.offer?.sponsor?.name ?? '',
        dataset_name: d.dataset?.name ?? '',
        dataset_region: d.dataset?.region ?? '',
        mailer_name: d.mailer?.name ?? '',
      }));

      setDrops(dropRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const refetch = useCallback(() => {
    const silent = !isFirstLoad.current;
    isFirstLoad.current = false;
    return fetchAll(silent);
  }, [fetchAll]);

  return { sponsors, offers, datasets, mailers, drops, loading, error, refetch };
}
