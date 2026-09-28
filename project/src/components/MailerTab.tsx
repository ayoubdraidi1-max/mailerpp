import { useMemo } from 'react';
import { Mail, Layers, BarChart3 } from 'lucide-react';
import { formatFull } from '@/lib/supabase';
import type { Dataset, DropWithNames, Mailer } from '@/lib/supabase';

type Props = {
  drops: DropWithNames[];
  datasets: Dataset[];
  mailers: Mailer[];
  mailerId: string | null;
};

export default function MailerTab({ drops, datasets, mailers, mailerId }: Props) {
  const mailer = mailers.find((m) => m.id === mailerId) ?? null;

  const myDrops = useMemo(() => {
    if (!mailerId) return [];
    return drops.filter((d) => d.mailer_id === mailerId);
  }, [drops, mailerId]);

  const totalRecords = useMemo(() => {
    return myDrops.reduce((sum, d) => sum + d.limit, 0);
  }, [myDrops]);

  const uniqueOffers = useMemo(() => {
    const set = new Set(myDrops.map((d) => d.offer_id));
    return set.size;
  }, [myDrops]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Mail className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-100">
            {mailer ? mailer.name : 'My Mailer'}
          </h2>
          <p className="text-sm text-slate-500">Assigned drops and distribution</p>
        </div>
      </div>

      {!mailerId ? (
        <div className="text-center py-20 text-slate-500 rounded-2xl border border-slate-800 bg-slate-900/50">
          <Mail className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No mailer assigned</p>
          <p className="text-sm mt-1">Contact an admin to link a mailer to your account</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={Layers}
              label="Assigned Drops"
              value={String(myDrops.length)}
              accent="from-amber-500 to-orange-400"
            />
            <StatCard
              icon={BarChart3}
              label="Total Records"
              value={formatFull(totalRecords)}
              accent="from-blue-500 to-cyan-400"
            />
            <StatCard
              icon={Mail}
              label="Unique Offers"
              value={String(uniqueOffers)}
              accent="from-emerald-500 to-teal-400"
            />
          </div>

          {/* Drops table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800 bg-slate-900">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-semibold text-sm tracking-wide uppercase text-slate-300">
                My Drops ({myDrops.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="text-left px-5 py-3 font-medium">Offer</th>
                    <th className="text-left px-3 py-3 font-medium">Sponsor</th>
                    <th className="text-left px-3 py-3 font-medium">Region</th>
                    <th className="text-left px-3 py-3 font-medium">Dataset</th>
                    <th className="text-right px-3 py-3 font-medium">Offset</th>
                    <th className="text-right px-3 py-3 font-medium">Limit</th>
                    <th className="text-right px-5 py-3 font-medium">Range</th>
                  </tr>
                </thead>
                <tbody>
                  {myDrops.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-500">
                        No drops assigned to you yet
                      </td>
                    </tr>
                  ) : (
                    myDrops.map((d) => {
                      const ds = datasets.find((x) => x.id === d.dataset_id);
                      const overshoots = ds && d.offset + d.limit > ds.total;
                      return (
                        <tr
                          key={d.id}
                          className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="px-5 py-3 text-slate-200 max-w-[240px] truncate">{d.offer_name}</td>
                          <td className="px-3 py-3 text-slate-400 text-xs">{d.offer_sponsor_name || '—'}</td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center justify-center min-w-[36px] px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 text-xs font-bold">
                              {d.offer_region}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-300">{d.dataset_name}</td>
                          <td className={`px-3 py-3 text-right tabular-nums ${overshoots ? 'text-red-400' : 'text-slate-300'}`}>
                            {formatFull(d.offset)}
                          </td>
                          <td className={`px-3 py-3 text-right tabular-nums ${overshoots ? 'text-red-400' : 'text-slate-300'}`}>
                            {formatFull(d.limit)}
                          </td>
                          <td className={`px-5 py-3 text-right tabular-nums text-xs ${overshoots ? 'text-red-400' : 'text-slate-400'}`}>
                            {formatFull(d.offset + 1)} – {formatFull(d.offset + d.limit)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="text-xl font-bold text-slate-100 tabular-nums">{value}</p>
        </div>
      </div>
    </div>
  );
}
