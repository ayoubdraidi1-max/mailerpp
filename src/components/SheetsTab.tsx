import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Table2,
  Plus,
  ArrowLeft,
  Trash2,
  Copy,
  Check,
  Palette,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type Sheet = {
  id: string;
  name: string;
  position: number;
  created_at: string;
};

type SheetLine = {
  id: string;
  sheet_id: string;
  content: string;
  color: string | null;
  position: number;
};

const COLORS = [
  { label: 'None', value: null, bg: '', text: '' },
  { label: 'Red', value: 'red', bg: 'bg-red-500/15', text: 'text-red-400' },
  { label: 'Orange', value: 'orange', bg: 'bg-orange-500/15', text: 'text-orange-400' },
  { label: 'Yellow', value: 'yellow', bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  { label: 'Green', value: 'green', bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  { label: 'Blue', value: 'blue', bg: 'bg-blue-500/15', text: 'text-blue-400' },
  { label: 'Purple', value: 'purple', bg: 'bg-violet-500/15', text: 'text-violet-400' },
  { label: 'Pink', value: 'pink', bg: 'bg-pink-500/15', text: 'text-pink-400' },
];

function getColorClasses(color: string | null) {
  return COLORS.find((c) => c.value === color) ?? COLORS[0];
}

export default function SheetsTab() {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const fetchSheets = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sheets')
      .select('*')
      .order('position', { ascending: true });
    if (error) {
      console.error('Failed to load sheets:', error.message);
    } else {
      setSheets(data as Sheet[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSheets();
  }, [fetchSheets]);

  const createSheet = async () => {
    const name = newName.trim();
    if (!name) return;
    const maxPos = sheets.length > 0 ? Math.max(...sheets.map((s) => s.position)) : 0;
    const { data, error } = await supabase
      .from('sheets')
      .insert({ name, position: maxPos + 1 })
      .select()
      .single();
    if (error) {
      console.error('Failed to create sheet:', error.message);
      return;
    }
    setSheets([...sheets, data as Sheet]);
    setNewName('');
    setShowCreate(false);
    setActiveSheetId((data as Sheet).id);
  };

  const deleteSheet = async (id: string) => {
    const { error } = await supabase.from('sheets').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete sheet:', error.message);
      return;
    }
    setSheets(sheets.filter((s) => s.id !== id));
    if (activeSheetId === id) setActiveSheetId(null);
  };

  const activeSheet = sheets.find((s) => s.id === activeSheetId) ?? null;
  const activeIndex = sheets.findIndex((s) => s.id === activeSheetId);

  if (activeSheet) {
    return (
      <SheetEditor
        sheet={activeSheet}
        sheetCount={sheets.length}
        sheetIndex={activeIndex}
        onBack={() => setActiveSheetId(null)}
        onNavigate={(dir) => {
          const next = sheets[activeIndex + dir];
          if (next) setActiveSheetId(next.id);
        }}
        onDelete={() => deleteSheet(activeSheet.id)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100 mb-1">Sheets</h2>
          <p className="text-sm text-slate-500">Create pages to paste and organize lines of text or links</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-500 hover:bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Sheet
        </button>
      </div>

      {showCreate && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center gap-3">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createSheet()}
              placeholder="Sheet name..."
              className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={createSheet}
              className="rounded-xl bg-blue-500 hover:bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setNewName('');
              }}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2.5 text-sm text-slate-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sheets.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Table2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No sheets yet</p>
          <p className="text-sm mt-1">Click "New Sheet" to create your first page</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sheets.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSheetId(s.id)}
              className="text-left rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700 p-5 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Table2 className="w-6 h-6 text-white" />
                </div>
                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-semibold text-slate-100 mb-1 truncate">{s.name}</h3>
              <p className="text-xs text-slate-500">
                {new Date(s.created_at).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================
// SHEET EDITOR — single sheet page
// =====================================================

function SheetEditor({
  sheet,
  sheetCount,
  sheetIndex,
  onBack,
  onNavigate,
  onDelete,
}: {
  sheet: Sheet;
  sheetCount: number;
  sheetIndex: number;
  onBack: () => void;
  onNavigate: (dir: number) => void;
  onDelete: () => void;
}) {
  const [lines, setLines] = useState<SheetLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const fetchLines = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sheet_lines')
      .select('*')
      .eq('sheet_id', sheet.id)
      .order('position', { ascending: true });
    if (error) {
      console.error('Failed to load lines:', error.message);
    } else {
      setLines(data as SheetLine[]);
    }
    setLoading(false);
  }, [sheet.id]);

  useEffect(() => {
    fetchLines();
  }, [fetchLines]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setColorPickerFor(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addBulkLines = async () => {
    const rawLines = bulkText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (rawLines.length === 0) return;

    const maxPos = lines.length > 0 ? Math.max(...lines.map((l) => l.position)) : 0;
    const inserts = rawLines.map((content, i) => ({
      sheet_id: sheet.id,
      content,
      position: maxPos + i + 1,
    }));

    const { data, error } = await supabase
      .from('sheet_lines')
      .insert(inserts)
      .select();
    if (error) {
      console.error('Failed to add lines:', error.message);
      return;
    }
    setLines([...lines, ...(data as SheetLine[])]);
    setBulkText('');
    setShowBulkPaste(false);
  };

  const updateLine = async (id: string, updates: Partial<SheetLine>) => {
    const { error } = await supabase.from('sheet_lines').update(updates).eq('id', id);
    if (error) {
      console.error('Failed to update line:', error.message);
      return;
    }
    setLines(lines.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  };

  const deleteLine = async (id: string) => {
    const { error } = await supabase.from('sheet_lines').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete line:', error.message);
      return;
    }
    setLines(lines.filter((l) => l.id !== id));
  };

  const copyLine = (line: SheetLine) => {
    navigator.clipboard.writeText(line.content).then(() => {
      setCopiedId(line.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const copyAllLines = () => {
    const text = lines.map((l) => l.content).join('\n');
    navigator.clipboard.writeText(text);
  };

  const renameSheet = async () => {
    const name = renameValue.trim();
    if (!name) return;
    const { error } = await supabase.from('sheets').update({ name }).eq('id', sheet.id);
    if (error) {
      console.error('Failed to rename sheet:', error.message);
      return;
    }
    setRenaming(false);
    // The parent state will be stale but we can't update it from here;
    // the user will see the new name on next navigation
    window.location.reload();
  };

  const startEdit = (line: SheetLine) => {
    setEditingId(line.id);
    setEditValue(line.content);
  };

  const saveEdit = () => {
    if (editingId) {
      updateLine(editingId, { content: editValue.trim() });
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All Sheets
          </button>
          <ChevronRight className="w-4 h-4 text-slate-600" />
          {renaming ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && renameSheet()}
                className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={renameSheet}
                className="rounded-lg bg-blue-500 hover:bg-blue-600 px-3 py-1.5 text-sm text-white"
              >
                Save
              </button>
              <button
                onClick={() => setRenaming(false)}
                className="text-slate-500 hover:text-slate-300 text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setRenaming(true);
                setRenameValue(sheet.name);
              }}
              className="text-lg font-bold text-slate-100 hover:text-blue-400 transition-colors"
            >
              {sheet.name}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sheet navigation arrows */}
          <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg p-1">
            <button
              onClick={() => onNavigate(-1)}
              disabled={sheetIndex <= 0}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous sheet"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-500 px-1">
              {sheetIndex + 1} / {sheetCount}
            </span>
            <button
              onClick={() => onNavigate(1)}
              disabled={sheetIndex >= sheetCount - 1}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next sheet"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={copyAllLines}
            disabled={lines.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-2 text-sm text-slate-300 disabled:opacity-40 transition-colors"
            title="Copy all lines"
          >
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">Copy All</span>
          </button>

          <button
            onClick={() => setShowBulkPaste(!showBulkPaste)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Paste Lines</span>
          </button>

          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-3 py-2 text-sm text-red-400 transition-colors"
            title="Delete sheet"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bulk paste area */}
      {showBulkPaste && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
          <p className="text-sm text-slate-400">Paste multiple lines below — each line break creates a new row:</p>
          <textarea
            autoFocus
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={"https://example.com/link1\nhttps://example.com/link2\nSome text line"}
            rows={6}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 font-mono focus:outline-none focus:border-blue-500 transition-colors resize-y"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={addBulkLines}
              className="rounded-lg bg-blue-500 hover:bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              Add Lines
            </button>
            <button
              onClick={() => {
                setShowBulkPaste(false);
                setBulkText('');
              }}
              className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-2 text-sm text-slate-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Lines list */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : lines.length === 0 && !showBulkPaste ? (
        <div className="text-center py-20 text-slate-500">
          <Table2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No lines yet</p>
          <p className="text-sm mt-1">Click "Paste Lines" to add text or links</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          {/* Column headers */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800 bg-slate-900/80 text-xs font-medium text-slate-500 uppercase tracking-wider">
            <div className="w-8 text-center">#</div>
            <div className="flex-1">Content</div>
            <div className="w-24 text-center">Color</div>
            <div className="w-28 text-center">Actions</div>
          </div>

          {lines.map((line, i) => {
            const colorCls = getColorClasses(line.color);
            return (
              <div
                key={line.id}
                className={`flex items-center gap-2 px-4 py-2.5 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group ${colorCls.bg}`}
              >
                {/* Row number */}
                <div className="w-8 text-center text-xs text-slate-600 font-mono">
                  {i + 1}
                </div>

                {/* Content — editable on click */}
                <div className="flex-1 min-w-0">
                  {editingId === line.id ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onBlur={saveEdit}
                      className="w-full rounded-lg bg-slate-950 border border-blue-500 px-3 py-1.5 text-sm text-slate-100 focus:outline-none"
                    />
                  ) : (
                    <p
                      onDoubleClick={() => startEdit(line)}
                      className={`text-sm truncate cursor-text ${colorCls.text || 'text-slate-200'}`}
                      title="Double-click to edit"
                    >
                      {line.content}
                    </p>
                  )}
                </div>

                {/* Color picker */}
                <div className="w-24 flex justify-center relative" ref={colorPickerFor === line.id ? colorPickerRef : undefined}>
                  <button
                    onClick={() => setColorPickerFor(colorPickerFor === line.id ? null : line.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors ${
                      line.color ? colorCls.text : 'text-slate-600'
                    } hover:bg-slate-700/40`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    {line.color ? (
                      <span className="capitalize">{line.color}</span>
                    ) : (
                      <span>Color</span>
                    )}
                  </button>
                  {colorPickerFor === line.id && (
                    <div className="absolute top-full mt-1 right-0 z-20 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl p-2 grid grid-cols-4 gap-1 w-44">
                      {COLORS.map((c) => (
                        <button
                          key={c.label}
                          onClick={() => {
                            updateLine(line.id, { color: c.value });
                            setColorPickerFor(null);
                          }}
                          className={`flex items-center justify-center rounded-lg px-2 py-1.5 text-xs transition-colors ${
                            c.bg || 'bg-slate-800'
                          } ${c.text || 'text-slate-400'} hover:ring-2 hover:ring-blue-500`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="w-28 flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => copyLine(line)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
                    title="Copy"
                  >
                    {copiedId === line.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => startEdit(line)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-slate-700/50 transition-colors text-xs font-medium"
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteLine(line.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-700/50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer count */}
      {!loading && lines.length > 0 && (
        <p className="text-xs text-slate-500 text-center">
          {lines.length} line{lines.length !== 1 ? 's' : ''} in this sheet
        </p>
      )}
    </div>
  );
}
