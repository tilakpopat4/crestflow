import { useRef } from 'react';
import { safeStringify } from './useFirestore';
import { Invoice } from '../types';

interface UseDashboardBackupProps {
  invoices: Invoice[];
  batchReplaceClients: (clients: any[]) => Promise<void>;
  batchReplaceAllInvoices: (invoices: any[]) => Promise<void>;
}

export function useDashboardBackup({
  invoices,
  batchReplaceClients,
  batchReplaceAllInvoices,
}: UseDashboardBackupProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = {
      clients: localStorage.getItem('clients') || '[]',
      monthlyWork: safeStringify(invoices),
    };
    const blob = new Blob([safeStringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.clients) {
          const parsedClients = typeof data.clients === 'string' ? JSON.parse(data.clients) : data.clients;
          await batchReplaceClients(parsedClients);
        }
        if (data.monthlyWork) {
          const parsedWork = typeof data.monthlyWork === 'string' ? JSON.parse(data.monthlyWork) : data.monthlyWork;
          await batchReplaceAllInvoices(parsedWork);
        }
        alert('Data imported successfully!');
      } catch (err) {
        alert('Invalid backup file.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const migrateLocalData = async () => {
    try {
      const localClients = localStorage.getItem('clients');
      if (localClients) {
        const parsedClients = JSON.parse(localClients);
        if (parsedClients.length > 0) {
          await batchReplaceClients(parsedClients);
        }
      }
      const localInvoices = localStorage.getItem('monthlyWork');
      if (localInvoices) {
        const parsedInvoices = JSON.parse(localInvoices);
        if (parsedInvoices.length > 0) {
          await batchReplaceAllInvoices(parsedInvoices);
        }
      }
      localStorage.removeItem('clients');
      localStorage.removeItem('monthlyWork');
      alert('Local data successfully migrated to Cloud!');
    } catch (err) {
      alert('Error migrating data.');
    }
  };

  return {
    fileInputRef,
    handleExport,
    handleImport,
    migrateLocalData,
  };
}
