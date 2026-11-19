import React, { useState } from 'react';
import { isGoogleDriveUrl, extractDriveFileId } from '../../lib/driveService';
import { generateUUID } from '../../lib/utils';
import { SampleWorkItem } from '../../types';
import { Button } from '../ui/button';

interface AddSampleVideoFormProps {
  onAdd: (item: SampleWorkItem) => void;
  onCancel: () => void;
}

/**
 * AddSampleVideoForm Component
 * Form to input Google Drive video URL and metadata for public showcase.
 */
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
    <form onSubmit={handleSubmit} className="p-3.5 bg-surface-800 border border-surface-400 rounded-lg space-y-3 text-xs">
      {formError && (
        <p className="text-accent font-medium">{formError}</p>
      )}

      <div>
        <label className="block font-semibold text-text-secondary mb-1">Video Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Nike Brand Campaign Edit"
          className="w-full px-2.5 py-1.5 border border-surface-400 rounded bg-surface-700 text-text-primary placeholder:text-text-muted focus:border-surface-300 outline-none"
          required
        />
      </div>

      <div>
        <label className="block font-semibold text-text-secondary mb-1">Google Drive Video URL</label>
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://drive.google.com/file/d/.../view"
          className="w-full px-2.5 py-1.5 border border-surface-400 rounded bg-surface-700 text-text-primary placeholder:text-text-muted font-mono text-[11px] focus:border-surface-300 outline-none"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block font-semibold text-text-secondary mb-1">Category / Tag</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-surface-400 rounded bg-surface-700 text-text-primary focus:border-surface-300 outline-none cursor-pointer"
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
          <label className="block font-semibold text-text-secondary mb-1">Description (Optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short highlight note"
            className="w-full px-2.5 py-1.5 border border-surface-400 rounded bg-surface-700 text-text-primary placeholder:text-text-muted focus:border-surface-300 outline-none"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-xs"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          className="text-xs"
        >
          Add Video
        </Button>
      </div>
    </form>
  );
};

export default AddSampleVideoForm;
