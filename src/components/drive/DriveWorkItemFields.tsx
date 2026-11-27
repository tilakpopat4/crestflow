import React from 'react';
import { Client } from '../../types';

interface DriveWorkItemFieldsProps {
  clients: Client[];
  clientId: string;
  description: string;
  quantity: string;
  rate: string;
  fileCount: number;
  onClientChange: (clientId: string) => void;
  onDescriptionChange: (val: string) => void;
  onQuantityChange: (val: string) => void;
  onRateChange: (val: string) => void;
}

export const DriveWorkItemFields: React.FC<DriveWorkItemFieldsProps> = ({
  clients,
  clientId,
  description,
  quantity,
  rate,
  fileCount,
  onClientChange,
  onDescriptionChange,
  onQuantityChange,
  onRateChange,
}) => (
  <div className="space-y-3 text-left">
    {clients.length > 0 && (
      <div>
        <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
          Associate with Client (for work log)
        </label>
        <select
          value={clientId}
          onChange={(e) => onClientChange(e.target.value)}
          className="w-full p-2.5 bg-[#1B1B22] text-[#F7F7F8] border border-[#2A2A33] rounded-lg text-xs outline-none cursor-pointer"
        >
          <option value="">None (Just generate links)</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
    )}

    <div>
      <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
        Deliverable Description {fileCount > 1 ? '(Base name)' : ''}
      </label>
      <input
        type="text"
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder="e.g. YouTube Video Edit"
        className="w-full p-2.5 bg-[#1B1B22] text-[#F7F7F8] border border-[#2A2A33] rounded-lg text-xs outline-none"
      />
    </div>

    {clientId && (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Quantity</label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => onQuantityChange(e.target.value)}
            className="w-full p-2.5 bg-[#1B1B22] text-[#F7F7F8] border border-[#2A2A33] rounded-lg text-xs outline-none font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">Rate (₹)</label>
          <input
            type="number"
            min="0"
            value={rate}
            onChange={(e) => onRateChange(e.target.value)}
            placeholder="Optional"
            className="w-full p-2.5 bg-[#1B1B22] text-[#F7F7F8] border border-[#2A2A33] rounded-lg text-xs outline-none font-mono"
          />
        </div>
      </div>
    )}
  </div>
);
