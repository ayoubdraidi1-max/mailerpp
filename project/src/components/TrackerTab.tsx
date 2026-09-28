import { useState, useMemo } from 'react';
import {
  BarChart3, TrendingUp, CheckCircle2, ChevronRight, ArrowLeft, Search,
  Building2, Tag,
} from 'lucide-react';
import { formatFull, formatNumber } from '@/lib/supabase';
import type { Sponsor, Offer, Dataset, DropWithNames } from '@/lib/supabase';

type Props = {
  sponsors: Sponsor[];
  offers: Offer[];
  datasets: Dataset[];
  drops: DropWithNames[];
};

type Range = { start: number; end: number };
type DatasetProgress = {
  name: string;
  total: number;
  distributed: number;
  remaining: number;
  progress: number;
  ranges: Range[];
  dropCount: number;
  availableRanges: { offset: number; limit: number }[];
};

export default function TrackerTab({ sponsors, offers, datasets, drops }: Props) {
  const [selectedSponsorId, setSelectedSponsorId] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const selectedSponsor = sponsors.find((s) => s.id === selectedSponsorId) ?? null;
  const selectedOffer = offers.find((o) => o.id === selectedOfferId) ?? null;

  const sponsorOffers = useMemo(() => {
    if (!selectedSponsorId) return [];
    return offers.filter((o) => o.sponsor_id === selectedSponsorId);
  }, [offers, selectedSponsorId]);

  const filteredOffers = useMemo(() => {
    if (!search.trim()) return sponsorOffers;
    const q = search.toLowerCase();
    return sponsorOffers.filter((o) => o.name.toLowerCase().includes(q));
  }, [sponsorOffers, search]);

  // Level 3: single offer tracker
  if (selectedOffer) {
    return (
      <OfferTracker
        offer={selectedOffer}
        sponsor={selectedSponsor}
        datasets={datasets}
        drops={drops}
        onBack={() => setSelectedOfferId(null)}
      />
    );
  }

  // Level 2: offers list for a sponsor
  if (selectedSponsor) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedSponsorId(null)}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Sponsors
          </button>
          <ChevronRight className="w-4 h-4 text-slate-600" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-violet-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">{selectedSponsor.name}</h2>
            <span className="text-sm text-slate-500">({sponsorOffers.length} offers)</span>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search offers by name..."
            className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {filteredOffers.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Tag className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">
              {search.trim() ? 'No offers match your search' : 'No offers for this sponsor'}
            </p>
            <p className="text-sm mt-1">
              {search.trim() ? 'Try a different name' : 'Add offers in the Inputs tab first'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOffers.map((o) => {
              const offerDrops = drops.filter((d) => d.offer_id === o.id);
              return (
                <button
                  key={o.id}
                  onClick={() => setSelectedOfferId(o.id)}
                  className="text-left rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700 p-5 transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center justify-center min-w-[40px] px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 text-sm font-bold">
                      {o.region}
                    </span>
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="font-semibold text-slate-100 mb-1 line-clamp-2">{o.name}</h3>
                  <p className="text-xs text-slate-500">
                    {offerDrops.length} drop{offerDrops.length !== 1 ? 's' : ''} assigned
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Level 1: sponsors grid
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-100 mb-1">Sponsors</h2>
        <p className="text-sm text-slate-500">Select a sponsor to view its offers</p>
      </div>

      {sponsors.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No sponsors yet</p>
          <p className="text-sm mt-1">Add sponsors in the Inputs tab to see them here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sponsors.map((s) => {
            const sponsorOffers = offers.filter((o) => o.sponsor_id === s.id);
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSponsorId(s.id)}
                className="text-left rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700 p-5 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="font-semibold text-slate-100 mb-1 truncate">{s.name}</h3>
                <p className="text-xs text-slate-500">
                  {sponsorOffers.length} offer{sponsorOffers.length !== 1 ? 's' : ''}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =====================================================
// SINGLE OFFER TRACKER PAGE
// =====================================================

function OfferTracker({
  offer,
  sponsor,
  datasets,
  drops,
  onBack,
}: {
  offer: Offer;
  sponsor: Sponsor | null;
  datasets: Dataset[];
  drops: DropWithNames[];
  onBack: () => void;
}) {
  const datasetProgress = useMemo<DatasetProgress[]>(() => {
    const offerDatasets = datasets.filter(
      (d) => d.region === offer.region && d.total > 0
    );

    return offerDatasets.map((ds) => {
      const dsDrops = drops.filter(
        (d) =>
          d.offer_id === offer.id &&
          d.dataset_id === ds.id &&
          d.offset >= 0 &&
          d.limit > 0
      );

      const ranges: Range[] = dsDrops
        .map((d) => {
          let start = d.offset + 1;
          let end = d.offset + d.limit;
          start = Math.min(start, ds.total + 1);
          end = Math.min(end, ds.total);
          return { start, end };
        })
        .filter((r) => r.start <= r.end)
        .sort((a, b) => a.start - b.start);

      const merged: Range[] = [];
      ranges.forEach((r) => {
        if (merged.length === 0) {
          merged.push({ ...r });
          return;
        }
        const last = merged[merged.length - 1];
        if (r.start <= last.end + 1) {
          last.end = Math.max(last.end, r.end);
        } else {
          merged.push({ ...r });
        }
      });

      const distributed = merged.reduce((sum, r) => sum + (r.end - r.start + 1), 0);
      const remaining = Math.max(0, ds.total - distributed);
      const progress = ds.total > 0 ? distributed / ds.total : 0;

      const availableRanges: { offset: number; limit: number }[] = [];
      let pointer = 1;
      merged.forEach((r) => {
        if (pointer < r.start) {
          availableRanges.push({ offset: pointer - 1, limit: r.start - pointer });
        }
        pointer = r.end + 1;
      });
      if (pointer <= ds.total) {
        availableRanges.push({ offset: pointer - 1, limit: ds.total - pointer + 1 });
      }

      return {
        name: ds.name,
        total: ds.total,
        distributed,
        remaining,
        progress,
        ranges: merged,
        dropCount: dsDrops.length,
        availableRanges,
      };
    });
  }, [offer, datasets, drops]);

  const totalDistributed = datasetProgress.reduce((s, d) => s + d.distributed, 0);
  const totalRecords = datasetProgress.reduce((s, d) => s + d.total, 0);

  return (
    <div className="space-y-6">
      {/* Breadcrumb + title */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {sponsor ? sponsor.name : 'Offers'}
          </button>
          <ChevronRight className="w-4 h-4 text-slate-600" />
          <span className="text-sm text-slate-400 truncate">{offer.name}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center min-w-[44px] px-3 py-1 rounded-lg bg-blue-500/15 text-blue-400 text-sm font-bold">
            {offer.region}
          </span>
          <h2 className="text-xl font-bold text-slate-100 truncate">{offer.name}</h2>
        </div>
        {sponsor && (
          <p className="text-sm text-slate-500">Sponsor: {sponsor.name}</p>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={BarChart3}
          label="Total Records"
          value={formatFull(totalRecords)}
          accent="from-blue-500 to-cyan-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Distributed"
          value={formatFull(totalDistributed)}
          accent="from-emerald-500 to-teal-400"
        />
        <StatCard
          icon={CheckCircle2}
          label="Progress"
          value={totalRecords > 0 ? ((totalDistributed / totalRecords) * 100).toFixed(1) + '%' : '0%'}
          accent="from-amber-500 to-orange-400"
        />
      </div>

      {/* Datasets */}
      {datasetProgress.length === 0 ? (
        <div className="text-center py-16 text-slate-500 rounded-2xl border border-slate-800 bg-slate-900/50">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No datasets for region {offer.region}</p>
          <p className="text-sm mt-1">Add datasets with region {offer.region} in the Inputs tab</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="divide-y divide-slate-800/50">
            {datasetProgress.map((ds) => (
              <DatasetRow key={ds.name} dataset={ds} />
            ))}
          </div>

          {/* Available ranges */}
          {datasetProgress.some((d) => d.availableRanges.length > 0) && (
            <div className="border-t border-slate-800 bg-slate-900/30 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Available Ranges
              </p>
              <div className="flex flex-wrap gap-2">
                {datasetProgress
                  .filter((d) => d.availableRanges.length > 0)
                  .flatMap((d) =>
                    d.availableRanges.map((r, i) => (
                      <div
                        key={`${d.name}-${i}`}
                        className="flex items-center gap-2 rounded-lg bg-slate-800/60 border border-slate-700 px-3 py-1.5"
                      >
                        <span className="text-xs font-medium text-slate-300">{d.name}</span>
                        <span className="text-xs text-slate-500">·</span>
                        <span className="text-xs tabular-nums text-slate-400">
                          Offset {formatNumber(r.offset)}
                        </span>
                        <span className="text-xs tabular-nums text-emerald-400">
                          Limit {formatNumber(r.limit)}
                        </span>
                      </div>
                    ))
                  )}
              </div>
            </div>
          )}
        </div>
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

function DatasetRow({ dataset: ds }: { dataset: DatasetProgress }) {
  const segments = 40;
  const segmentSize = ds.total / segments;

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200">{ds.name}</span>
          <span className="text-xs text-slate-500">
            {ds.dropCount} drop{ds.dropCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-400">
            Distributed <span className="tabular-nums text-emerald-400 font-medium">{formatFull(ds.distributed)}</span>
          </span>
          <span className="text-slate-400">
            Remaining <span className="tabular-nums text-amber-400 font-medium">{formatFull(ds.remaining)}</span>
          </span>
          <span className="text-slate-400">
            Total <span className="tabular-nums text-slate-200 font-medium">{formatFull(ds.total)}</span>
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-0.5 h-3 rounded-lg overflow-hidden bg-slate-800">
        {Array.from({ length: segments }, (_, i) => {
          const segStart = Math.floor(i * segmentSize) + 1;
          const segEnd = Math.floor((i + 1) * segmentSize);
          const isSent = ds.ranges.some((r) => r.start <= segEnd && r.end >= segStart);
          return (
            <div
              key={i}
              className={`flex-1 transition-colors ${
                isSent
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : 'bg-slate-700/50'
              }`}
            />
          );
        })}
      </div>

      {/* Progress percentage */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-slate-500">
          {ds.ranges.length > 0
            ? ds.ranges.map((r) => `${formatNumber(r.start)}–${formatNumber(r.end)}`).join(', ')
            : 'No drops assigned'}
        </span>
        <span className="text-xs font-semibold tabular-nums text-slate-300">
          {(ds.progress * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
