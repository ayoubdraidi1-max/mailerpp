import { useState, useCallback } from 'react';
import { Plus, Trash2, Tag, Database, Users, Globe, Building2, Search, TriangleAlert as AlertTriangle } from 'lucide-react';
import { supabase, REGION_CODES, formatFull } from '@/lib/supabase';
import type { Sponsor, Offer, Dataset, Mailer } from '@/lib/supabase';

type Props = {
  sponsors: Sponsor[];
  offers: Offer[];
  datasets: Dataset[];
  mailers: Mailer[];
  refetch: () => void;
};

export default function InputsTab({ sponsors, offers, datasets, mailers, refetch }: Props) {
  const [actionError, setActionError] = useState<string | null>(null);
  const wrappedRefetch = useCallback(() => {
    setActionError(null);
    refetch();
  }, [refetch]);

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {actionError}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <SponsorsSection sponsors={sponsors} refetch={wrappedRefetch} setError={setActionError} />
          <OffersSection sponsors={sponsors} offers={offers} refetch={wrappedRefetch} setError={setActionError} />
        </div>
        <div className="space-y-6">
          <DatasetsSection datasets={datasets} refetch={wrappedRefetch} setError={setActionError} />
          <MailersSection mailers={mailers} refetch={wrappedRefetch} setError={setActionError} />
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  icon: typeof Tag;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800 bg-slate-900">
        <div className={`w-8 h-8 rounded-lg ${accent} flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h2 className="font-semibold text-sm tracking-wide uppercase text-slate-300">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function SponsorsSection({ sponsors, refetch, setError }: { sponsors: Sponsor[]; refetch: () => void; setError: (e: string | null) => void }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const { data: nextPos, error: posError } = await supabase.rpc('get_next_position', { p_table: 'sponsors' });
    if (posError || nextPos === null) {
      setError('Failed to assign position. Please try again.');
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from('sponsors')
      .insert({ name: name.trim(), position: nextPos });
    if (error) {
      setError(error.message || 'Failed to add sponsor.');
    } else {
      setName('');
      refetch();
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    setError(null);
    const { error } = await supabase.from('sponsors').delete().eq('id', id);
    if (error) {
      setError('Failed to delete sponsor. It may be referenced by existing offers.');
    }
    refetch();
  };

  return (
    <SectionCard title="Sponsors" icon={Building2} accent="bg-violet-500">
      <div className="flex gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Sponsor name..."
          className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
        />
        <button
          onClick={add}
          disabled={saving || !name.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-violet-500 hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
        {sponsors.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No sponsors yet</p>
        ) : (
          sponsors.map((s) => (
            <div
              key={s.id}
              className="group flex items-center gap-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 px-3 py-2.5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-violet-500/15 flex items-center justify-center text-violet-400 text-sm font-bold">
                {s.name.charAt(0).toUpperCase()}
              </div>
              <span className="flex-1 text-sm text-slate-200 truncate">{s.name}</span>
              <button
                onClick={() => remove(s.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
}

function OffersSection({ sponsors, offers, refetch, setError }: { sponsors: Sponsor[]; offers: Offer[]; refetch: () => void; setError: (e: string | null) => void }) {
  const [name, setName] = useState('');
  const [sponsorId, setSponsorId] = useState('');
  const [region, setRegion] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOffers = search.trim()
    ? offers.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))
    : offers;

  const add = async () => {
    if (!name.trim() || !sponsorId || !region) return;
    setSaving(true);
    setError(null);
    const { data: nextPos, error: posError } = await supabase.rpc('get_next_position', { p_table: 'offers' });
    if (posError || nextPos === null) {
      setError('Failed to assign position. Please try again.');
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from('offers')
      .insert({
        name: name.trim(),
        region,
        sponsor_id: sponsorId,
        position: nextPos,
      });
    if (error) {
      setError(error.message || 'Failed to add offer. The selected sponsor may have been deleted.');
    } else {
      setName('');
      setSponsorId('');
      setRegion('');
      refetch();
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    setError(null);
    const { error } = await supabase.from('offers').delete().eq('id', id);
    if (error) {
      setError('Failed to delete offer. It may be referenced by existing drops.');
    }
    refetch();
  };

  return (
    <SectionCard title="Offers" icon={Tag} accent="bg-blue-500">
      <div className="space-y-2 mb-4">
        <select
          value={sponsorId}
          onChange={(e) => setSponsorId(e.target.value)}
          className="w-full appearance-none rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
        >
          <option value="">Select sponsor...</option>
          {sponsors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Offer name..."
          className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full appearance-none rounded-lg bg-slate-800 border border-slate-700 pl-8 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Region...</option>
              {REGION_CODES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <button
            onClick={add}
            disabled={saving || !name.trim() || !sponsorId || !region}
            className="flex items-center gap-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search offers by name..."
          className="w-full rounded-lg bg-slate-800 border border-slate-700 pl-8 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
        {filteredOffers.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">
            {offers.length === 0 ? 'No offers yet' : 'No offers match your search'}
          </p>
        ) : (
          filteredOffers.map((o) => {
            const sponsor = sponsors.find((s) => s.id === o.sponsor_id);
            return (
              <div
                key={o.id}
                className="group flex items-center gap-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 px-3 py-2.5 transition-colors"
              >
                <span className="inline-flex items-center justify-center min-w-[36px] px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 text-xs font-bold">
                  {o.region}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-200 truncate">{o.name}</div>
                  {sponsor && (
                    <div className="text-xs text-slate-500 truncate">
                      Sponsor: {sponsor.name}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => remove(o.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </SectionCard>
  );
}

function DatasetsSection({ datasets, refetch, setError }: { datasets: Dataset[]; refetch: () => void; setError: (e: string | null) => void }) {
  const [name, setName] = useState('');
  const [total, setTotal] = useState('');
  const [region, setRegion] = useState('');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!name.trim() || !region || !total) return;
    setSaving(true);
    setError(null);
    const { data: nextPos, error: posError } = await supabase.rpc('get_next_position', { p_table: 'datasets' });
    if (posError || nextPos === null) {
      setError('Failed to assign position. Please try again.');
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from('datasets')
      .insert({ name: name.trim(), total: parseInt(total, 10), region, position: nextPos });
    if (error) {
      setError(error.message || 'Failed to add dataset.');
    } else {
      setName('');
      setTotal('');
      setRegion('');
      refetch();
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    setError(null);
    const { error } = await supabase.from('datasets').delete().eq('id', id);
    if (error) {
      setError('Failed to delete dataset. It may be referenced by existing drops.');
    }
    refetch();
  };

  return (
    <SectionCard title="Datasets" icon={Database} accent="bg-emerald-500">
      <div className="space-y-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Dataset name..."
          className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <div className="flex gap-2">
          <input
            value={total}
            onChange={(e) => setTotal(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Total records..."
            className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <div className="relative">
            <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="appearance-none rounded-lg bg-slate-800 border border-slate-700 pl-8 pr-6 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="">Region</option>
              {REGION_CODES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={add}
          disabled={saving || !name.trim() || !region || !total}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Dataset
        </button>
      </div>

      <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
        {datasets.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No datasets yet</p>
        ) : (
          datasets.map((d) => (
            <div
              key={d.id}
              className="group flex items-center gap-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 px-3 py-2.5 transition-colors"
            >
              <span className="inline-flex items-center justify-center min-w-[36px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-xs font-bold">
                {d.region}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-200 truncate">{d.name}</div>
                <div className="text-xs text-slate-500">{formatFull(d.total)} records</div>
              </div>
              <button
                onClick={() => remove(d.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
}

function MailersSection({ mailers, refetch, setError }: { mailers: Mailer[]; refetch: () => void; setError: (e: string | null) => void }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const { data: nextPos, error: posError } = await supabase.rpc('get_next_position', { p_table: 'mailers' });
    if (posError || nextPos === null) {
      setError('Failed to assign position. Please try again.');
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from('mailers')
      .insert({ name: name.trim(), position: nextPos });
    if (error) {
      setError(error.message || 'Failed to add mailer.');
    } else {
      setName('');
      refetch();
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    setError(null);
    const { error } = await supabase.from('mailers').delete().eq('id', id);
    if (error) {
      setError('Failed to delete mailer. It may be referenced by existing drops.');
    }
    refetch();
  };

  return (
    <SectionCard title="Mailers" icon={Users} accent="bg-amber-500">
      <div className="flex gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Mailer name..."
          className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
        />
        <button
          onClick={add}
          disabled={saving || !name.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
        {mailers.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No mailers yet</p>
        ) : (
          mailers.map((m) => (
            <div
              key={m.id}
              className="group flex items-center gap-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 px-3 py-2.5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-400 text-sm font-bold">
                {m.name.charAt(0).toUpperCase()}
              </div>
              <span className="flex-1 text-sm text-slate-200 truncate">{m.name}</span>
              <button
                onClick={() => remove(m.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
}
