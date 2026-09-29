import { useState, useMemo } from 'react';
import { Plus, Trash2, TriangleAlert as AlertTriangle, Layers } from 'lucide-react';
import { supabase, formatFull } from '@/lib/supabase';
import type { Offer, Dataset, Mailer, DropWithNames } from '@/lib/supabase';

type Props = {
  offers: Offer[];
  datasets: Dataset[];
  mailers: Mailer[];
  drops: DropWithNames[];
  refetch: () => void;
};

export default function DropsTab({ offers, datasets, mailers, drops, refetch }: Props) {
  const [newOffer, setNewOffer] = useState('');
  const [newDataset, setNewDataset] = useState('');
  const [newMailer, setNewMailer] = useState('');
  const [newOffset, setNewOffset] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const selectedOffer = offers.find((o) => o.id === newOffer);
  const selectedDataset = datasets.find((d) => d.id === newDataset);

  const filteredDatasets = useMemo(() => {
    if (!selectedOffer) return [];
    return datasets.filter((d) => d.region === selectedOffer.region);
  }, [datasets, selectedOffer]);

  const offsetNum = parseInt(newOffset, 10);
  const limitNum = parseInt(newLimit, 10);
  const hasInput = newOffset !== '' || newLimit !== '';
  const isInvalid =
    hasInput &&
    (isNaN(offsetNum) ||
      offsetNum < 0 ||
      isNaN(limitNum) ||
      limitNum <= 0 ||
      (selectedDataset && offsetNum + limitNum > selectedDataset.total));

  const addDrop = async () => {
    if (!newOffer || !newDataset || !newMailer) return;
    let offset = newOffset === '' ? 0 : parseInt(newOffset, 10);
    let limit = newLimit === '' ? 0 : parseInt(newLimit, 10);

    if (newOffset === '' && newLimit === '' && selectedDataset) {
      offset = 0;
      limit = selectedDataset.total;
    }

    setSaving(true);
    setActionError(null);
    const { data: nextPos, error: posError } = await supabase.rpc('get_next_position', { p_table: 'drops' });
    if (posError || nextPos === null) {
      setActionError('Failed to assign position. Please try again.');
      setSaving(false);
      return;
    }
    const { error } = await supabase.from('drops').insert({
      offer_id: newOffer,
      dataset_id: newDataset,
      mailer_id: newMailer,
      offset,
      limit,
      position: nextPos,
    });
    if (error) {
      setActionError(error.message || 'Failed to add drop. The selected offer, dataset, or mailer may have been deleted by another user.');
    } else {
      setNewOffer('');
      setNewDataset('');
      setNewMailer('');
      setNewOffset('');
      setNewLimit('');
      refetch();
    }
    setSaving(false);
  };

  const removeDrop = async (id: string) => {
    setActionError(null);
    const { error } = await supabase.from('drops').delete().eq('id', id);
    if (error) {
      setActionError('Failed to delete drop. It may have already been removed by another user.');
    }
    refetch();
  };

  const selectClass =
    'w-full appearance-none rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition-colors';

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {actionError}
        </div>
      )}
      {/* Add new drop */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800 bg-slate-900">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <Plus className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-semibold text-sm tracking-wide uppercase text-slate-300">New Drop</h2>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <select
              value={newOffer}
              onChange={(e) => {
                setNewOffer(e.target.value);
                setNewDataset('');
              }}
              className={selectClass}
            >
              <option value="">Offer...</option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.region})
                </option>
              ))}
            </select>

            <div className="relative">
              <select
                value={newDataset}
                onChange={(e) => setNewDataset(e.target.value)}
                disabled={!newOffer}
                className={`${selectClass} disabled:opacity-40`}
              >
                <option value="">Dataset...</option>
                {filteredDatasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({formatFull(d.total)})
                  </option>
                ))}
              </select>
            </div>

            <select
              value={newMailer}
              onChange={(e) => setNewMailer(e.target.value)}
              className={selectClass}
            >
              <option value="">Mailer...</option>
              {mailers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            <input
              value={newOffset}
              onChange={(e) => setNewOffset(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Offset"
              className={`rounded-lg bg-slate-800 border px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors ${
                isInvalid ? 'border-red-500 text-red-400' : 'border-slate-700 focus:border-blue-500'
              }`}
            />

            <input
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Limit"
              className={`rounded-lg bg-slate-800 border px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors ${
                isInvalid ? 'border-red-500 text-red-400' : 'border-slate-700 focus:border-blue-500'
              }`}
            />

            <button
              onClick={addDrop}
              disabled={saving || !newOffer || !newDataset || !newMailer || isInvalid}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {isInvalid && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
              <AlertTriangle className="w-4 h-4" />
              {selectedDataset && offsetNum + limitNum > selectedDataset.total
                ? `Offset + Limit (${formatFull(offsetNum + limitNum)}) exceeds dataset total (${formatFull(selectedDataset.total)})`
                : 'Offset must be >= 0 and Limit must be > 0'}
            </div>
          )}
          {newOffer && newDataset === '' && (
            <p className="mt-3 text-xs text-slate-500">
              {filteredDatasets.length === 0
                ? `No datasets available for region ${selectedOffer?.region}`
                : `Select a dataset for region ${selectedOffer?.region}`}
            </p>
          )}
          {newOffset === '' && newLimit === '' && selectedDataset && (
            <p className="mt-3 text-xs text-slate-500">
              Leave blank to use the full dataset ({formatFull(selectedDataset.total)} records)
            </p>
          )}
        </div>
      </div>

      {/* Drops table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800 bg-slate-900">
          <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-semibold text-sm tracking-wide uppercase text-slate-300">
            All Drops ({drops.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">Offer</th>
                <th className="text-left px-3 py-3 font-medium">Sponsor</th>
                <th className="text-left px-3 py-3 font-medium">Region</th>
                <th className="text-left px-3 py-3 font-medium">Dataset</th>
                <th className="text-left px-3 py-3 font-medium">Mailer</th>
                <th className="text-right px-3 py-3 font-medium">Offset</th>
                <th className="text-right px-3 py-3 font-medium">Limit</th>
                <th className="text-right px-3 py-3 font-medium">Range</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {drops.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500">
                    No drops yet. Create one above.
                  </td>
                </tr>
              ) : (
                drops.map((d) => {
                  const ds = datasets.find((x) => x.id === d.dataset_id);
                  const overshoots = ds && d.offset + d.limit > ds.total;
                  return (
                    <tr
                      key={d.id}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group"
                    >
                      <td className="px-5 py-3 text-slate-200 max-w-[240px] truncate">{d.offer_name}</td>
                      <td className="px-3 py-3 text-slate-400 text-xs">{d.offer_sponsor_name || '—'}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center justify-center min-w-[36px] px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 text-xs font-bold">
                          {d.offer_region}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-300">{d.dataset_name}</td>
                      <td className="px-3 py-3 text-slate-300">{d.mailer_name}</td>
                      <td className={`px-3 py-3 text-right tabular-nums ${overshoots ? 'text-red-400' : 'text-slate-300'}`}>
                        {formatFull(d.offset)}
                      </td>
                      <td className={`px-3 py-3 text-right tabular-nums ${overshoots ? 'text-red-400' : 'text-slate-300'}`}>
                        {formatFull(d.limit)}
                      </td>
                      <td className={`px-3 py-3 text-right tabular-nums text-xs ${overshoots ? 'text-red-400' : 'text-slate-400'}`}>
                        {formatFull(d.offset + 1)} – {formatFull(d.offset + d.limit)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => removeDrop(d.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
