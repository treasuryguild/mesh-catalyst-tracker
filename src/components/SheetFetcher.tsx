// ../components/SheetFetcher.tsx

import { useState } from 'react';
import { Milestone, Proposal, WalletTransaction, CollaboratorAllocation, ConfigItem } from '../types/sheets';

export default function SheetsFetcher() {
  const sheets = [
    'Milestones',
    'Proposals',
    'Dashboard',
    'Config',
    'Collaborator Allocations',
    'Wallet Transactions'
  ];
  const [loading, setLoading] = useState<string | null>(null);

  const fetchSheetData = async (sheetName: string) => {
    setLoading(sheetName);
    try {
      const response = await fetch(`/api/sheets/${sheetName}`);
      const data = await response.json();
      
      if (sheetName === 'Milestones') {
        // Assert that data is an array of Milestone objects.
        const milestones = data as Milestone[];
        console.log(`Data for ${sheetName}:`, milestones);
      } else if (sheetName === 'Proposals') {
        // Assert that data is an array of Proposal objects.
        const proposals = data as Proposal[];
        console.log(`Data for ${sheetName}:`, proposals);
      } else if (sheetName === 'Wallet Transactions') {
        // Assert that data is an array of WalletTransaction objects.
        const transactions = data as WalletTransaction[];
        console.log(`Data for ${sheetName}:`, transactions);
      } else if (sheetName === 'Collaborator Allocations') {
        // Assert that data is an array of CollaboratorAllocation objects.
        const allocations = data as CollaboratorAllocation[];
        console.log(`Data for ${sheetName}:`, allocations);
      } else if (sheetName === 'Config') {
        // Assert that data is an array of ConfigItem objects.
        const configData = data as ConfigItem[];
        console.log(`Data for ${sheetName}:`, configData);
      } else {
        // For other sheets, log the data as is.
        console.log(`Data for ${sheetName}:`, data);
      }
    } catch (error) {
      console.error(`Error fetching ${sheetName}:`, error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-4 space-y-2">
      <h2 className="text-lg font-semibold">Fetch Google Sheets Data</h2>
      {sheets.map((sheet) => (
        <button
          key={sheet}
          onClick={() => fetchSheetData(sheet)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          disabled={loading === sheet}
        >
          {loading === sheet ? `Fetching ${sheet}...` : `Fetch ${sheet}`}
        </button>
      ))}
    </div>
  );
}
