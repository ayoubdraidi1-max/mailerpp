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
  ClipboardPaste,
  Columns3,
  Rows3,
} from 'lucide-react';

type Sheet = {
  id: string;
  name: string;
  position: number;
  created_at: string;
};

type SheetColumn = {
  id: string;
  sheet_id: string;
  name: string;
  position: number;
};

type SheetRow = {
  id: string;
  sheet_id: string;
  position: number;
  color: string | null;
};

type SheetCell = {
  id: string;
  row_id: string;
  column_id: string;
  content: string;
};

const COLORS = [
  { label: 'None', value: null, bg: '', text: '', dot: 'bg-slate-600' },
  { label: 'Red', value: 'red', bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-500' },
  { label: 'Orange', value: 'orange', bg: 'bg-orange-500/15', text: 'text-orange-400', dot: 'bg-orange-500' },
  { label: 'Yellow', value: 'yellow', bg: 'bg-yellow-500/15', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  { label: 'Green', value: 'green', bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  { label: 'Blue', value: 'blue', bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-500' },
  { label: 'Purple', value: 'purple', bg: 'bg-violet-500/15', text: 'text-violet-400', dot: 'bg-violet-500' },
  { label: 'Pink', value: 'pink', bg: 'bg-pink-500/15', text: 'text-pink-400', dot: 'bg-pink-500' },
];

function getColor(color: string | null) {
  return COLORS.find((c) => c.value === color) ?? COLORS[0];
}

const COLUMN_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

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
    const newSheet = data as Sheet;
    // Create default column
    await supabase
      .from('sheet_columns')
      .insert({ sheet_id: newSheet.id, name: 'Column A', position: 0 });
    setSheets([...sheets, newSheet]);
    setNewName('');
    setShowCreate(false);
    setActiveSheetId(newSheet.id);
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
        onRename={(name: string) => {
          setSheets(sheets.map((s) => (s.id === activeSheet.id ? { ...s, name } : s)));
        }}
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
// SHEET EDITOR — Google Sheets-like grid
// =====================================================

function SheetEditor({
  sheet,
  sheetCount,
  sheetIndex,
  onBack,
  onNavigate,
  onDelete,
  onRename,
}: {
  sheet: Sheet;
  sheetCount: number;
  sheetIndex: number;
  onBack: () => void;
  onNavigate: (dir: number) => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [columns, setColumns] = useState<SheetColumn[]>([]);
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [cells, setCells] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renamingCol, setRenamingCol] = useState<string | null>(null);
  const [renameColValue, setRenameColValue] = useState('');
  const [copiedFlash, setCopiedFlash] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const cellKey = (rowId: string, colId: string) => `${rowId}::${colId}`;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [colsRes, rowsRes] = await Promise.all([
      supabase.from('sheet_columns').select('*').eq('sheet_id', sheet.id).order('position', { ascending: true }),
      supabase.from('sheet_rows').select('*').eq('sheet_id', sheet.id).order('position', { ascending: true }),
    ]);

    if (colsRes.error || rowsRes.error) {
      console.error('Failed to load sheet data:', colsRes.error?.message ?? rowsRes.error?.message);
      setLoading(false);
      return;
    }

    const cols = colsRes.data as SheetColumn[];
    const rws = rowsRes.data as SheetRow[];

    setColumns(cols);
    setRows(rws);

    if (rws.length > 0) {
      const { data: cellData, error: cellErr } = await supabase
        .from('sheet_cells')
        .select('row_id, column_id, content')
        .in('row_id', rws.map((r) => r.id));
      if (cellErr) {
        console.error('Failed to load cells:', cellErr.message);
      } else if (cellData) {
        const map = new Map<string, string>();
        (cellData as SheetCell[]).forEach((c) => {
          map.set(cellKey(c.row_id, c.column_id), c.content);
        });
        setCells(map);
      }
    }
    setLoading(false);
  }, [sheet.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Keyboard: Ctrl+C copy selected rows, Ctrl+V paste
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (editingCell) return; // don't intercept while editing a cell
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedRows.size > 0) {
        e.preventDefault();
        copySelectedRows();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        try {
          const text = await navigator.clipboard.readText();
          if (text) pasteFromClipboard(text);
        } catch {
          // clipboard not available
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCell, selectedRows, rows, columns, cells]);

  const addColumn = async () => {
    const maxPos = columns.length > 0 ? Math.max(...columns.map((c) => c.position)) : 0;
    const colName = `Column ${COLUMN_LETTERS[columns.length] ?? columns.length + 1}`;
    const { data, error } = await supabase
      .from('sheet_columns')
      .insert({ sheet_id: sheet.id, name: colName, position: maxPos + 1 })
      .select()
      .single();
    if (error) {
      console.error('Failed to add column:', error.message);
      return;
    }
    setColumns([...columns, data as SheetColumn]);
  };

  const deleteColumn = async (colId: string) => {
    if (columns.length <= 1) return; // keep at least one column
    const { error } = await supabase.from('sheet_columns').delete().eq('id', colId);
    if (error) {
      console.error('Failed to delete column:', error.message);
      return;
    }
    setColumns(columns.filter((c) => c.id !== colId));
    // Remove cells for this column
    const newCells = new Map(cells);
    for (const key of newCells.keys()) {
      if (key.endsWith(`::${colId}`)) newCells.delete(key);
    }
    setCells(newCells);
  };

  const renameColumn = async (colId: string, name: string) => {
    const { error } = await supabase.from('sheet_columns').update({ name }).eq('id', colId);
    if (error) {
      console.error('Failed to rename column:', error.message);
      return;
    }
    setColumns(columns.map((c) => (c.id === colId ? { ...c, name } : c)));
    setRenamingCol(null);
  };

  const addRow = async () => {
    const maxPos = rows.length > 0 ? Math.max(...rows.map((r) => r.position)) : 0;
    const { data, error } = await supabase
      .from('sheet_rows')
      .insert({ sheet_id: sheet.id, position: maxPos + 1 })
      .select()
      .single();
    if (error) {
      console.error('Failed to add row:', error.message);
      return;
    }
    setRows([...rows, data as SheetRow]);
  };

  const addBulkRows = async (text: string) => {
    const lines = text.split('\n').map((l) => l.trimEnd()).filter((l) => l.length > 0 || l === '');
    const validLines = text.split('\n').map((l) => l).filter((l) => l.trim().length > 0);
    if (validLines.length === 0) return;

    const maxPos = rows.length > 0 ? Math.max(...rows.map((r) => r.position)) : 0;
    const inserts = validLines.map((_, i) => ({
      sheet_id: sheet.id,
      position: maxPos + i + 1,
    }));
    const { data: newRows, error } = await supabase
      .from('sheet_rows')
      .insert(inserts)
      .select();
    if (error) {
      console.error('Failed to add rows:', error.message);
      return;
    }
    const typedRows = newRows as SheetRow[];

    // For each line, split by tab for multi-column paste; put into first column otherwise
    const cellInserts: { row_id: string; column_id: string; content: string }[] = [];
    validLines.forEach((line, i) => {
      const row = typedRows[i];
      const parts = line.split('\t');
      columns.forEach((col, ci) => {
        const content = parts[ci] ?? '';
        if (content) {
          cellInserts.push({ row_id: row.id, column_id: col.id, content });
        }
      });
    });

    if (cellInserts.length > 0) {
      await supabase.from('sheet_cells').insert(cellInserts);
    }

    // Update local state
    setRows([...rows, ...typedRows]);
    const newCells = new Map(cells);
    validLines.forEach((line, i) => {
      const row = typedRows[i];
      const parts = line.split('\t');
      columns.forEach((col, ci) => {
        const content = parts[ci] ?? '';
        if (content) {
          newCells.set(cellKey(row.id, col.id), content);
        }
      });
    });
    setCells(newCells);
  };

  const deleteRow = async (rowId: string) => {
    const { error } = await supabase.from('sheet_rows').delete().eq('id', rowId);
    if (error) {
      console.error('Failed to delete row:', error.message);
      return;
    }
    setRows(rows.filter((r) => r.id !== rowId));
    setSelectedRows(new Set([...selectedRows].filter((id) => id !== rowId)));
    const newCells = new Map(cells);
    for (const key of newCells.keys()) {
      if (key.startsWith(`${rowId}::`)) newCells.delete(key);
    }
    setCells(newCells);
  };

  const deleteSelectedRows = async () => {
    if (selectedRows.size === 0) return;
    const ids = [...selectedRows];
    const { error } = await supabase.from('sheet_rows').delete().in('id', ids);
    if (error) {
      console.error('Failed to delete rows:', error.message);
      return;
    }
    setRows(rows.filter((r) => !selectedRows.has(r.id)));
    const newCells = new Map(cells);
    for (const key of newCells.keys()) {
      const rowId = key.split('::')[0];
      if (selectedRows.has(rowId)) newCells.delete(key);
    }
    setCells(newCells);
    setSelectedRows(new Set());
  };

  const updateCell = async (rowId: string, colId: string, content: string) => {
    const key = cellKey(rowId, colId);
    const existing = cells.get(key);

    if (existing === undefined) {
      // Insert new cell
      const { error } = await supabase
        .from('sheet_cells')
        .insert({ row_id: rowId, column_id: colId, content });
      if (error) {
        console.error('Failed to insert cell:', error.message);
        return;
      }
    } else if (existing !== content) {
      // Update existing cell
      const { error } = await supabase
        .from('sheet_cells')
        .update({ content })
        .eq('row_id', rowId)
        .eq('column_id', colId);
      if (error) {
        console.error('Failed to update cell:', error.message);
        return;
      }
    }

    const newCells = new Map(cells);
    if (content) {
      newCells.set(key, content);
    } else {
      newCells.delete(key);
    }
    setCells(newCells);
  };

  const setRowColor = async (rowId: string, color: string | null) => {
    const { error } = await supabase.from('sheet_rows').update({ color }).eq('id', rowId);
    if (error) {
      console.error('Failed to set row color:', error.message);
      return;
    }
    setRows(rows.map((r) => (r.id === rowId ? { ...r, color } : r)));
  };

  const setBulkRowColor = async (color: string | null) => {
    if (selectedRows.size === 0) return;
    const ids = [...selectedRows];
    const { error } = await supabase.from('sheet_rows').update({ color }).in('id', ids);
    if (error) {
      console.error('Failed to set color:', error.message);
      return;
    }
    setRows(rows.map((r) => (selectedRows.has(r.id) ? { ...r, color } : r)));
    setShowColorPicker(false);
  };

  const copySelectedRows = () => {
    if (selectedRows.size === 0) return;
    const sorted = rows.filter((r) => selectedRows.has(r.id));
    const text = sorted
      .map((r) => columns.map((c) => cells.get(cellKey(r.id, c.id)) ?? '').join('\t'))
      .join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopiedFlash(true);
      setTimeout(() => setCopiedFlash(false), 1500);
    });
  };

  const copyAllRows = () => {
    if (rows.length === 0) return;
    const text = rows
      .map((r) => columns.map((c) => cells.get(cellKey(r.id, c.id)) ?? '').join('\t'))
      .join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopiedFlash(true);
      setTimeout(() => setCopiedFlash(false), 1500);
    });
  };

  const pasteFromClipboard = async (text: string) => {
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;

    // If rows are selected, paste into those rows (overwrite)
    if (selectedRows.size > 0) {
      const sortedSelected = rows.filter((r) => selectedRows.has(r.id));
      const updates: Promise<void>[] = [];
      lines.forEach((line, i) => {
        const row = sortedSelected[i];
        if (!row) return;
        const parts = line.split('\t');
        columns.forEach((col, ci) => {
          const content = parts[ci] ?? '';
          if (content) {
            updates.push(updateCell(row.id, col.id, content));
          }
        });
      });
      await Promise.all(updates);
    } else {
      // Paste as new rows
      await addBulkRows(text);
    }
  };

  const renameSheet = async () => {
    const name = renameValue.trim();
    if (!name) return;
    const { error } = await supabase.from('sheets').update({ name }).eq('id', sheet.id);
    if (error) {
      console.error('Failed to rename sheet:', error.message);
      return;
    }
    onRename(name);
    setRenaming(false);
  };

  const startEdit = (rowId: string, colId: string) => {
    setEditingCell(cellKey(rowId, colId));
    setEditValue(cells.get(cellKey(rowId, colId)) ?? '');
  };

  const saveEdit = () => {
    if (!editingCell) return;
    const [rowId, colId] = editingCell.split('::');
    updateCell(rowId, colId, editValue);
    setEditingCell(null);
  };

  const toggleRowSelection = (rowId: string, ctrlKey: boolean) => {
    if (ctrlKey) {
      setSelectedRows((prev) => {
        const next = new Set(prev);
        if (next.has(rowId)) next.delete(rowId);
        else next.add(rowId);
        return next;
      });
    } else {
      setSelectedRows(new Set([rowId]));
    }
  };

  const selectAllRows = () => {
    setSelectedRows(new Set(rows.map((r) => r.id)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
              <button onClick={renameSheet} className="rounded-lg bg-blue-500 hover:bg-blue-600 px-3 py-1.5 text-sm text-white">
                Save
              </button>
              <button onClick={() => setRenaming(false)} className="text-slate-500 hover:text-slate-300 text-sm">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setRenaming(true); setRenameValue(sheet.name); }}
              className="text-lg font-bold text-slate-100 hover:text-blue-400 transition-colors"
            >
              {sheet.name}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sheet navigation */}
          <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg p-1">
            <button
              onClick={() => onNavigate(-1)}
              disabled={sheetIndex <= 0}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-500 px-1">{sheetIndex + 1} / {sheetCount}</span>
            <button
              onClick={() => onNavigate(1)}
              disabled={sheetIndex >= sheetCount - 1}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Color picker for selected rows */}
          {selectedRows.size > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-2 text-sm text-slate-300 transition-colors"
              >
                <Palette className="w-4 h-4" />
                <span className="hidden sm:inline">Color ({selectedRows.size})</span>
              </button>
              {showColorPicker && (
                <div className="absolute top-full mt-1 right-0 z-30 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl p-2 grid grid-cols-4 gap-1 w-48">
                  {COLORS.map((c) => (
                    <button
                      key={c.label}
                      onClick={() => setBulkRowColor(c.value)}
                      className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors ${c.bg || 'bg-slate-800'} ${c.text || 'text-slate-400'} hover:ring-2 hover:ring-blue-500`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Copy selected */}
          <button
            onClick={copySelectedRows}
            disabled={selectedRows.size === 0}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-2 text-sm text-slate-300 disabled:opacity-40 transition-colors"
            title="Copy selected rows (Ctrl+C)"
          >
            {copiedFlash ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copiedFlash ? 'Copied!' : 'Copy'}</span>
          </button>

          {/* Copy all */}
          <button
            onClick={copyAllRows}
            disabled={rows.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-2 text-sm text-slate-300 disabled:opacity-40 transition-colors"
            title="Copy all rows"
          >
            <ClipboardPaste className="w-4 h-4" />
            <span className="hidden sm:inline">Copy All</span>
          </button>

          {/* Add column */}
          <button
            onClick={addColumn}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-2 text-sm text-slate-300 transition-colors"
            title="Add column"
          >
            <Columns3 className="w-4 h-4" />
            <span className="hidden sm:inline">Column</span>
          </button>

          {/* Add row */}
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors"
            title="Add row"
          >
            <Rows3 className="w-4 h-4" />
            <span className="hidden sm:inline">Row</span>
          </button>

          {/* Delete selected */}
          {selectedRows.size > 0 && (
            <button
              onClick={deleteSelectedRows}
              className="flex items-center gap-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-3 py-2 text-sm text-red-400 transition-colors"
              title="Delete selected rows"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Del ({selectedRows.size})</span>
            </button>
          )}

          {/* Delete sheet */}
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-3 py-2 text-sm text-red-400 transition-colors"
            title="Delete sheet"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hint bar */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span>Ctrl+Click to select multiple rows</span>
        <span>Ctrl+C / Ctrl+V to copy and paste</span>
        <span>Double-click a cell to edit</span>
        <span>Tab-separated values paste into columns</span>
      </div>

      {/* Grid */}
      {rows.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Table2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No rows yet</p>
          <p className="text-sm mt-1">Click "Row" to add a row, or paste data with Ctrl+V</p>
        </div>
      ) : (
        <div ref={gridRef} className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-x-auto">
          <table className="w-full border-collapse select-none">
            {/* Column headers */}
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                <th className="w-10 px-2 py-2 text-center text-xs text-slate-600 font-mono sticky left-0 bg-slate-900/80 z-10">
                  <button
                    onClick={selectAllRows}
                    className="text-slate-600 hover:text-slate-400 transition-colors"
                    title="Select all rows"
                  >
                    #
                  </button>
                </th>
                {columns.map((col) => (
                  <th key={col.id} className="min-w-[160px] border-l border-slate-800 px-2 py-2">
                    {renamingCol === col.id ? (
                      <input
                        autoFocus
                        value={renameColValue}
                        onChange={(e) => setRenameColValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') renameColumn(col.id, renameColValue.trim() || col.name);
                          if (e.key === 'Escape') setRenamingCol(null);
                        }}
                        onBlur={() => renameColumn(col.id, renameColValue.trim() || col.name)}
                        className="w-full rounded bg-slate-950 border border-blue-500 px-2 py-1 text-xs text-slate-100 focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center justify-between group">
                        <button
                          onClick={() => { setRenamingCol(col.id); setRenameColValue(col.name); }}
                          className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors truncate"
                        >
                          {col.name}
                        </button>
                        {columns.length > 1 && (
                          <button
                            onClick={() => deleteColumn(col.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                            title="Delete column"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </th>
                ))}
                <th className="w-10 px-2 py-2 border-l border-slate-800">
                  <button
                    onClick={addColumn}
                    className="text-slate-600 hover:text-slate-400 transition-colors"
                    title="Add column"
                  >
                    <Plus className="w-4 h-4 mx-auto" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => {
                const colorCls = getColor(row.color);
                const isSelected = selectedRows.has(row.id);
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-800/50 transition-colors ${colorCls.bg} ${
                      isSelected ? 'ring-1 ring-inset ring-blue-500/50 bg-blue-500/5' : 'hover:bg-slate-800/20'
                    }`}
                  >
                    {/* Row number / selector */}
                    <td
                      className="w-10 px-2 py-1.5 text-center text-xs text-slate-600 font-mono sticky left-0 bg-slate-900/60 cursor-pointer hover:bg-slate-800/40 z-10"
                      onClick={(e) => toggleRowSelection(row.id, e.ctrlKey || e.metaKey)}
                    >
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-blue-400 mx-auto" />
                      ) : (
                        ri + 1
                      )}
                    </td>
                    {/* Cells */}
                    {columns.map((col) => {
                      const key = cellKey(row.id, col.id);
                      const content = cells.get(key) ?? '';
                      const isEditing = editingCell === key;
                      return (
                        <td
                          key={col.id}
                          className="min-w-[160px] border-l border-slate-800/50 px-2 py-1.5"
                          onDoubleClick={() => startEdit(row.id, col.id)}
                        >
                          {isEditing ? (
                            <input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              onBlur={saveEdit}
                              className="w-full rounded bg-slate-950 border border-blue-500 px-2 py-1 text-sm text-slate-100 focus:outline-none"
                            />
                          ) : (
                            <p className={`text-sm truncate cursor-text ${colorCls.text || 'text-slate-200'}`}>
                              {content || <span className="text-slate-700">—</span>}
                            </p>
                          )}
                        </td>
                      );
                    })}
                    <td className="w-10 border-l border-slate-800/50" />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {!loading && rows.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{rows.length} row{rows.length !== 1 ? 's' : ''} | {columns.length} column{columns.length !== 1 ? 's' : ''}</span>
          {selectedRows.size > 0 && <span>{selectedRows.size} selected</span>}
        </div>
      )}
    </div>
  );
}
