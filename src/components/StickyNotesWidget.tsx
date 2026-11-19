import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { useFirestore } from '../hooks/useFirestore';
import { Client, StickyNote } from '../types';
import { StickyNote as NoteIcon, Plus, Trash2, Edit3, Search, Pin, User as UserIcon, Tag, Check, X } from 'lucide-react';

interface StickyNotesWidgetProps {
  user: User | null;
  clients: Client[];
}

const COLOR_MAP: Record<StickyNote['color'], { bg: string; border: string; text: string; pin: string; dot: string }> = {
  yellow: {
    bg: 'bg-[#212121]',
    border: 'border-[#383838] hover:border-surface-300',
    text: 'text-[#f1f1f1]',
    pin: 'text-[#aaaaaa]',
    dot: 'bg-[#aaaaaa]'
  },
  blue: {
    bg: 'bg-[#1e1e1e]',
    border: 'border-[#383838] hover:border-surface-300',
    text: 'text-[#f1f1f1]',
    pin: 'text-text-primary',
    dot: 'bg-surface-400'
  },
  green: {
    bg: 'bg-[#242424]',
    border: 'border-[#383838] hover:border-surface-300',
    text: 'text-[#f1f1f1]',
    pin: 'text-slate-400',
    dot: 'bg-slate-400'
  },
  pink: {
    bg: 'bg-[#212121]',
    border: 'border-[#383838] hover:border-surface-300',
    text: 'text-[#f1f1f1]',
    pin: 'text-[#aaaaaa]',
    dot: 'bg-[#aaaaaa]'
  },
  purple: {
    bg: 'bg-[#1a1a1a]',
    border: 'border-[#383838] hover:border-surface-300',
    text: 'text-[#f1f1f1]',
    pin: 'text-text-primary',
    dot: 'bg-surface-400'
  }
};

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'note_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
}

export default function StickyNotesWidget({ user, clients }: StickyNotesWidgetProps) {
  const { data: notes, loading, addOrUpdateItem, removeItem } = useFirestore<StickyNote>('notes', user?.uid);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [formData, setFormData] = useState<{
    clientId: string;
    content: string;
    color: StickyNote['color'];
  }>({
    clientId: 'general',
    content: '',
    color: 'yellow'
  });

  const handleOpenAdd = () => {
    setEditingNoteId(null);
    setFormData({
      clientId: 'general',
      content: '',
      color: 'yellow'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (note: StickyNote) => {
    setEditingNoteId(note.id);
    setFormData({
      clientId: note.clientId || 'general',
      content: note.content,
      color: note.color || 'yellow'
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingNoteId(null);
    setFormData({
      clientId: 'general',
      content: '',
      color: 'yellow'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) {
      alert("Note content cannot be empty.");
      return;
    }

    try {
      if (editingNoteId) {
        const existing = notes.find(n => n.id === editingNoteId);
        if (existing) {
          const updatedNote: StickyNote = {
            ...existing,
            clientId: formData.clientId,
            content: formData.content.trim(),
            color: formData.color,
            updatedAt: Date.now()
          };
          await addOrUpdateItem(updatedNote);
        }
      } else {
        const newNote: StickyNote = {
          id: generateUUID(),
          clientId: formData.clientId,
          content: formData.content.trim(),
          color: formData.color,
          createdAt: Date.now()
        };
        await addOrUpdateItem(newNote);
      }

      handleCloseModal();
    } catch (err: any) {
      console.error("Error saving sticky note:", err);
      alert("Failed to save sticky note: " + (err?.message || String(err)));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this sticky note?")) {
      try {
        await removeItem(id);
      } catch (err: any) {
        console.error("Error deleting note:", err);
        alert("Failed to delete note: " + (err?.message || String(err)));
      }
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesClient = selectedClientFilter === 'ALL' 
      ? true 
      : selectedClientFilter === 'GENERAL'
        ? note.clientId === 'general' || !note.clientId
        : note.clientId === selectedClientFilter;

    const matchesSearch = searchQuery.trim() === '' || 
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clients.find(c => c.id === note.clientId)?.name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesClient && matchesSearch;
  }).sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg">
            <NoteIcon size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              Sticky Notes
              <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                {notes.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Quick temporary snippets and notes for your clients.</p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus size={16} /> Add Note
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 dark:bg-slate-900/70 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search notes or clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={selectedClientFilter}
            onChange={(e) => setSelectedClientFilter(e.target.value)}
            className="w-full py-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Clients & Notes</option>
            <option value="GENERAL">General Snippets Only</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sticky Notes Grid */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 select-none">
          <div className="w-5 h-5 rounded-full border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-400 dark:text-slate-500">Loading sticky notes...</span>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500">
            <Pin size={20} />
          </div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No sticky notes found</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
            {searchQuery || selectedClientFilter !== 'ALL'
              ? 'Try clearing your search filters to view existing notes.'
              : 'Create a quick sticky note to record client guidelines, feedback, or temporary snippets.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            <Plus size={14} /> Create First Note
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const client = clients.find(c => c.id === note.clientId);
            const style = COLOR_MAP[note.color || 'yellow'];

            return (
              <div
                key={note.id}
                className={`relative p-5 rounded-xl border ${style.bg} ${style.border} ${style.text} shadow-xs hover:shadow-md transition-all flex flex-col justify-between min-h-[170px] group`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Pin size={14} className={`${style.pin} rotate-45 shrink-0`} />
                      <span
                        style={{ backgroundColor: 'transparent' }}
                        className="text-[10.5px] font-bold uppercase tracking-wider text-inherit opacity-90 truncate !bg-transparent"
                      >
                        {client ? client.name : 'General Note'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => handleOpenEdit(note)}
                        style={{ backgroundColor: 'transparent' }}
                        className="p-1 rounded hover:bg-black/5 dark:hover:bg-black/10 text-inherit opacity-75 hover:opacity-100 transition-opacity cursor-pointer !bg-transparent border-none"
                        title="Edit note"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        style={{ backgroundColor: 'transparent' }}
                        className="p-1 rounded hover:bg-red-500/10 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer !bg-transparent border-none"
                        title="Delete note"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed whitespace-pre-wrap font-medium">
                    {note.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-black/5 dark:border-white/10 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-3">
                  <span>
                    {new Date(note.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${style.dot}`}></span>
                    <span className="capitalize">{note.color}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div 
          onClick={handleCloseModal}
          className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in cursor-pointer select-none"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-700 rounded-xl max-w-lg w-full p-6 shadow-xl border border-surface-400 text-text-primary space-y-5 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-surface-400/80 pb-4">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Pin size={18} className="text-accent" />
                {editingNoteId ? 'Edit Sticky Note' : 'Create New Sticky Note'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-1 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-600 transition-colors cursor-pointer border-0 bg-transparent"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Client Association</label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-800 text-text-primary border border-surface-400 rounded-lg text-xs font-medium focus:border-surface-300 outline-none"
                >
                  <option value="general">General / Quick Snippet (No Client)</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Note Content *</label>
                <textarea
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="e.g., Client prefers energetic transition effects, 9:16 aspect ratio, and background music at -18dB..."
                  className="w-full px-3 py-2.5 bg-surface-800 text-text-primary placeholder:text-text-muted border border-surface-400 rounded-lg text-xs font-normal focus:border-surface-300 outline-none resize-y"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary">Color Palette</label>
                <div className="flex items-center gap-2">
                  {(['yellow', 'blue', 'green', 'pink', 'purple'] as StickyNote['color'][]).map((color) => {
                    const style = COLOR_MAP[color];
                    const isSelected = formData.color === color;

                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${style.bg} ${
                          isSelected ? 'border-text-primary ring-2 ring-surface-400' : 'border-surface-400'
                        } cursor-pointer`}
                        title={color}
                      >
                        {isSelected && <Check size={14} className="text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-surface-400/80">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-600 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer border-0"
                >
                  {editingNoteId ? 'Update Note' : 'Save Sticky Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
