import React, { useState } from 'react';
import { isGoogleDriveUrl, extractDriveFileId } from '../../lib/driveService';
import { generateUUID } from '../../lib/utils';
import { SampleWorkItem } from '../../types';

interface AddSampleVideoFormProps {
  onAdd: (item: SampleWorkItem) => void;
  onCancel: () => void;
}

export const AddSampleVideoForm: React.FC<AddSampleVideoFormProps> = ({ onAdd, onCancel }) => {
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [category, setCategory] = useState('Reels');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanTitle = title.trim();
    const cleanUrl = videoUrl.trim();

    if (!cleanTitle) {
      setFormError('Please provide a title for the sample video.');
      return;
    }
    if (!cleanUrl) {
      setFormError('Please enter a Google Drive video link.');
      return;
    }
    if (!isGoogleDriveUrl(cleanUrl) && !extractDriveFileId(cleanUrl)) {
      setFormError('Please enter a valid Google Drive share or preview link.');
      return;
    }

    const sampleItem: SampleWorkItem = {
      id: generateUUID(),
      title: cleanTitle,
      videoUrl: cleanUrl,
      createdAt: Date.now(),
    };
    if (category.trim()) sampleItem.category = category.trim();
    if (description.trim()) sampleItem.description = description.trim();
    onAdd(sampleItem);
  };

  return (
    <form onSubmit={handleSubmit} className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3 text-xs">
      {formError && (
        <p className="text-red-500 font-medium">{formError}</p>
      )}

      <div>
        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Video Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Nike Brand Campaign Edit"
          className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          required
        />
      </div>

      <div>
        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Google Drive Video URL</label>
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://drive.google.com/file/d/.../view"
          className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-[11px]"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category / Tag</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          >
            <option value="Reels">Reels / Shorts</option>
            <option value="Commercial">Commercial / Ad</option>
            <option value="Product Video">Product Video</option>
            <option value="YouTube">YouTube Long-Form</option>
            <option value="Music Video">Music Video</option>
            <option value="Documentary">Documentary</option>
          </select>
        </div>
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Description (Optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short highlight note"
            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 bg-transparent text-slate-600 dark:text-slate-400 hover:underline border-0 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded border-0 cursor-pointer"
        >
          Add Video
        </button>
      </div>
    </form>
  );
};

export default AddSampleVideoForm;
