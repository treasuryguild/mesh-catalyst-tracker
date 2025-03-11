// components/DiscordMessageTester.tsx
import React, { useState, useEffect } from 'react';
import { ProposalData, ConfigItemArray, Proposal, ConfigItem } from '../types/sheets';
import { TxInfoData } from '../types/types';

// Use the TxInfoData type from types.ts with some specific metadata shape
interface TransactionResult extends TxInfoData {
  metadata: {
    [key: string]: {
      msg?: string[];
    };
  } | null;
}

interface DiscordTestResult {
  success: boolean;
  message: string;
}

const DiscordMessageTester: React.FC = () => {
  // State
  const [projectId, setProjectId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingProposals, setFetchingProposals] = useState<boolean>(false);
  const [fetchingConfig, setFetchingConfig] = useState<boolean>(false);
  const [txResults, setTxResults] = useState<TransactionResult[] | null>(null);
  const [proposals, setProposals] = useState<ProposalData[]>([]);
  const [configItems, setConfigItems] = useState<ConfigItemArray[]>([]);
  const [discordResult, setDiscordResult] = useState<DiscordTestResult | null>(null);
  const [previewMessage, setPreviewMessage] = useState<string>('');
  const [selectedProposal, setSelectedProposal] = useState<ProposalData | null>(null);

  // Fetch proposals on component mount
  useEffect(() => {
    fetchProposals();
    fetchConfig();
  }, []);

  // Update wallet address when project ID changes
  useEffect(() => {
    if (projectId && configItems.length > 0) {
      console.log('Looking for wallet config for project:', projectId);
      console.log('Available config items:', configItems);
      
      const walletConfigKey = `project_${projectId}_wallet`;
      const walletConfig = configItems.find(item => 
        // Check if the first element (key) matches our expected pattern
        Array.isArray(item) && item[0] === walletConfigKey
      );
      
      console.log('Found wallet config:', walletConfig);
      
      if (walletConfig && walletConfig[1]) {
        setWalletAddress(walletConfig[1]);
      } else {
        setWalletAddress('');
      }
    }
  }, [projectId, configItems]);

  // Update selected proposal when project ID changes
  useEffect(() => {
    if (projectId && proposals.length > 0) {
      const proposal = proposals.find(p => p.project_id.toString() === projectId);
      setSelectedProposal(proposal || null);
    } else {
      setSelectedProposal(null);
    }
  }, [projectId, proposals]);

  // Fetch proposals from Google Sheets
  const fetchProposals = async () => {
    setFetchingProposals(true);
    try {
      const response = await fetch('/api/sheets/Proposals');
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const responseJson = await response.json();
      console.log('Proposals API response:', responseJson);
      
      // Extract the data array from the response
      if (responseJson && responseJson.data && Array.isArray(responseJson.data)) {
        // Map the data to match our expected format (camelCase properties)
        const mappedProposals: ProposalData[] = responseJson.data.map((item: Proposal) => ({
          project_id: item['Project ID'],
          title: item['Title'],
          budget: item['Budget'],
          funds_distributed: item['Funds Distributed'],
          remaining_funds: item['Remaining Funds'],
          milestones_qty: item['Milestones'] || item['Milestone Quantity'],
          milestones_link: item['Milestones Link']
        }));
        setProposals(mappedProposals);
      } else {
        console.error('API did not return expected data format:', responseJson);
        setProposals([]);
      }
    } catch (error) {
      console.error('Error fetching proposals:', error);
      setProposals([]); // Reset to empty array on error
    } finally {
      setFetchingProposals(false);
    }
  };

  // Fetch config from Google Sheets
  const fetchConfig = async () => {
    setFetchingConfig(true);
    try {
      const response = await fetch('/api/sheets/Config');
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const responseJson = await response.json();
      console.log('Config API response:', responseJson);
      
      // Extract the data array from the response
      if (responseJson && responseJson.data && Array.isArray(responseJson.data)) {
        // Map the config items to the expected array format
        const mappedConfig: ConfigItemArray[] = responseJson.data.map((item: ConfigItem | [string, string, string]) => {
          // Check which format the data is in
          if (Array.isArray(item)) {
            // It's already in array format
            return item as ConfigItemArray;
          } else if (item && typeof item === 'object' && 'Configuration Key' in item) {
            // It's in object format with expected keys
            return [
              item['Configuration Key'],
              item['Value'],
              item['Description']
            ] as ConfigItemArray;
          } else {
            console.warn('Unexpected config item format:', item);
            return ['', '', ''] as ConfigItemArray;
          }
        });
        
        console.log('Mapped config items:', mappedConfig);
        setConfigItems(mappedConfig);
      } else {
        console.error('Config API did not return expected data format:', responseJson);
        setConfigItems([]);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      setConfigItems([]); // Reset to empty array on error
    } finally {
      setFetchingConfig(false);
    }
  };

  // Get transaction details
  async function getTxInfo(txHash: string) {
    const data = {
      _tx_hashes: [txHash],
      _inputs: true,
      _metadata: true,
      _assets: true,
      _withdrawals: true,
      _certs: true,
      _scripts: true,
      _bytecode: true,
    };

    const response = await fetch('/api/koios?endpoint=tx_info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    return responseData && responseData[0] ? responseData[0] : null;
  }

  // Check if transaction is incoming
  function isIncomingTransaction(tx: TransactionResult, wallet: string) {
    const outputMatches = (tx.outputs || []).some(
      (output) => output.payment_addr && output.payment_addr.bech32 === wallet
    );
    const inputMatches = (tx.inputs || []).some(
      (input) => input.payment_addr && input.payment_addr.bech32 === wallet
    );
    return outputMatches && !inputMatches;
  }

  // Fetch wallet transactions
  async function fetchWalletTransactions(wallet: string, startDateStr: string, endDateStr: string) {
    if (!wallet) {
      throw new Error('Wallet address is required');
    }

    const basicRequestData = { _addresses: [wallet] };

    try {
      const response = await fetch('/api/koios?endpoint=address_txs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(basicRequestData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const basicTxs = await response.json();
      console.log('Basic transactions:', basicTxs);

      if (!Array.isArray(basicTxs) || basicTxs.length === 0) {
        return [];
      }

      const detailedTxs = await Promise.all(
        basicTxs.map(async (tx) => {
          try {
            return await getTxInfo(tx.tx_hash);
          } catch (error) {
            console.error(`Skipping tx ${tx.tx_hash} due to error:`, error);
            return null;
          }
        })
      );

      const validDetailedTxs = detailedTxs.filter((tx) => tx !== null);
      console.log('Detailed transactions:', validDetailedTxs);

      // Filter for incoming transactions with metadata for "Fund" and "Cohort"
      const incomingTxs = validDetailedTxs.filter((tx) => {
        const txDate = new Date(tx.tx_timestamp * 1000);
        if (startDateStr && txDate < new Date(startDateStr)) return false;
        if (endDateStr && txDate > new Date(endDateStr)) return false;
        
        // Check if it's an incoming transaction
        if (!isIncomingTransaction(tx, wallet)) return false;
        
        // Check metadata for "Fund" and "Cohort"
        const metadataMsg = tx?.metadata?.[674]?.msg;
        if (!metadataMsg || !Array.isArray(metadataMsg)) return false;

        // Ensure it contains both 'Fund' and 'Cohort'
        const metadataString = metadataMsg.join(' ').toLowerCase();
        return metadataString.includes('fund') && 
               metadataString.includes('cohort') && 
               !metadataString.includes('test');
      });

      console.log('Filtered incoming transactions:', incomingTxs);
      return incomingTxs;
    } catch (error) {
      console.error('Error fetching wallet transactions:', error);
      throw error;
    }
  }

  // Get ADA amount from transaction
  function getAdaAmount(tx: TransactionResult, wallet: string) {
    let totalLovelace = 0;
    
    if (wallet) {
      // Check that the wallet does not appear in any input
      const isIncoming = (tx.inputs || []).every(input => {
        return !(input.payment_addr && input.payment_addr.bech32 === wallet);
      });
      
      if (!isIncoming) {
        return 0;
      }
      
      // Sum lovelace from outputs whose payment address matches the wallet
      (tx.outputs || []).forEach((output) => {
        if (output.payment_addr && output.payment_addr.bech32 === wallet) {
          if (output.value) {
            totalLovelace += Number(output.value) || 0;
          } else if (output.value && Array.isArray(output.value)) {
            output.value.forEach((coin) => {
              if (coin.unit === 'lovelace') {
                totalLovelace += Number(coin.quantity);
              }
            });
          }
        }
      });
    }
    
    // Convert lovelace to ADA (1 ADA = 1,000,000 lovelace)
    return totalLovelace / 1e6;
  }

  // Generate preview message
  const generatePreviewMessage = (transactions: TransactionResult[], proposal: ProposalData | null, wallet: string) => {
    if (!transactions.length) {
      return 'No transactions found to preview.';
    }

    // Calculate total ADA amount
    const totalAda = transactions.reduce((sum, tx) => sum + getAdaAmount(tx, wallet), 0).toFixed(0);

    const transactionDetails = transactions.map((tx, index) => {
      const txDate = new Date(tx.tx_timestamp * 1000).toLocaleDateString();
      const adaAmount = getAdaAmount(tx, wallet).toFixed(0);
      
      // Extract metadata message if available
      let metadataInfo = '';
      if (tx.metadata && tx.metadata[674] && tx.metadata[674].msg) {
        const msg = Array.isArray(tx.metadata[674].msg) 
          ? tx.metadata[674].msg.join(' ') 
          : tx.metadata[674].msg;
        metadataInfo = `\nMetadata: ${msg}`;
      }
      
      return `**Transaction ${index + 1}:**\n` +
             `[View on CardanoScan](https://cardanoscan.io/transaction/${tx.tx_hash})\n` +
             `Date: ${txDate}\n` +
             `Amount: ${adaAmount} ADA${metadataInfo}`;
    }).join('\n\n');

    let proposalInfo = '';
    if (proposal) {
      proposalInfo = `\n\n**Project Information:**\n` +
                     `Project ID: ${proposal.project_id}\n` +
                     `Title: ${proposal.title}\n` +
                     `Budget: ${proposal.budget}\n`;
      
      if (proposal.funds_distributed) {
        proposalInfo += `Funds Distributed: ${proposal.funds_distributed}\n`;
      }
      
      if (proposal.remaining_funds) {
        proposalInfo += `Remaining Funds: ${proposal.remaining_funds}\n`;
      }
      
      if (proposal.milestones_link) {
        proposalInfo += `[View Project](${proposal.milestones_link})`;
      }
    }

    return `**Catalyst Funding Notification**\n\n` +
           `Received ${transactions.length} transaction(s) totaling ${totalAda} ADA:\n\n` +
           `${transactionDetails}${proposalInfo}`;
  };

  // Handle fetch transactions
  const handleFetchTransactions = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTxResults(null);
    setPreviewMessage('');
    setDiscordResult(null);

    try {
      if (!walletAddress) {
        throw new Error('Wallet address is required. Select a project ID with a configured wallet.');
      }

      console.log('Starting transaction fetch with parameters:', {
        wallet: walletAddress,
        projectId,
        startDate,
        endDate,
      });
      
      const transactions = await fetchWalletTransactions(
        walletAddress,
        startDate,
        endDate
      );
      
      setTxResults(transactions);
      
      if (transactions.length > 0 && selectedProposal) {
        const preview = generatePreviewMessage(transactions, selectedProposal, walletAddress);
        setPreviewMessage(preview);
      } else {
        setPreviewMessage('No transactions found that match the criteria.');
      }
    } catch (error) {
      console.error('Error in transaction fetch:', error);
      setPreviewMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle send Discord notification
  const handleSendDiscordNotification = async () => {
    if (!txResults || !txResults.length || !selectedProposal) {
      setDiscordResult({
        success: false,
        message: 'No transactions or proposal selected. Fetch transactions first.'
      });
      return;
    }

    setLoading(true);
    try {
      // Call the API endpoint to send the Discord notification
      const response = await fetch('/api/testDiscord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: walletAddress,
          transactions: txResults,
          proposal: selectedProposal
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setDiscordResult({
          success: true,
          message: 'Discord notification sent successfully!'
        });
      } else {
        setDiscordResult({
          success: false,
          message: `Error: ${data.error || 'Unknown error'}`
        });
      }
    } catch (error) {
      console.error('Error sending Discord notification:', error);
      setDiscordResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-6">Discord Message Tester</h1>
      
      {/* Project Selection */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Project Selection</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2">
              Project ID:
              <select
                className="w-full p-2 border rounded mt-1"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={fetchingProposals}
              >
                <option value="">Select a project</option>
                {Array.isArray(proposals) && proposals.length > 0 ? (
                  proposals.map((proposal) => (
                    <option key={proposal.project_id} value={proposal.project_id}>
                      {proposal.project_id} - {proposal.title}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No proposals available</option>
                )}
              </select>
            </label>
            {fetchingProposals && <p className="text-sm text-gray-500">Loading projects...</p>}
          </div>
          <div>
            <label className="block mb-2">
              Wallet Address:
              <input
                type="text"
                className="w-full p-2 border rounded mt-1 bg-gray-100"
                value={walletAddress}
                readOnly
                placeholder="Select a project to see wallet"
              />
            </label>
            {fetchingConfig && <p className="text-sm text-gray-500">Loading config...</p>}
          </div>
        </div>
      </div>

      {/* Date Range */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Transaction Date Range</h2>
        <form onSubmit={handleFetchTransactions} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-2">
              Start Date:
              <input
                type="date"
                className="w-full p-2 border rounded mt-1"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
          </div>
          <div>
            <label className="block mb-2">
              End Date:
              <input
                type="date"
                className="w-full p-2 border rounded mt-1"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading || !projectId}
              className={`w-full p-2 rounded text-white ${
                loading || !projectId ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {loading ? 'Fetching...' : 'Fetch Transactions'}
            </button>
          </div>
        </form>
      </div>

      {/* Preview Section */}
      {previewMessage && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Discord Message Preview</h2>
          <div className="bg-gray-800 text-white p-4 rounded-lg whitespace-pre-wrap">
            {previewMessage}
          </div>
        </div>
      )}

      {/* Send Button */}
      <div className="mb-6">
        <button
          onClick={handleSendDiscordNotification}
          disabled={loading || !txResults || !txResults.length}
          className={`w-full p-3 rounded text-white font-semibold ${
            loading || !txResults || !txResults.length
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {loading ? 'Sending...' : 'Send Discord Notification'}
        </button>
        {discordResult && (
          <div className={`mt-2 p-2 rounded ${discordResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {discordResult.message}
          </div>
        )}
      </div>

      {/* Transaction Details */}
      {txResults && txResults.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-3 flex items-center justify-between">
            <span>Transaction Details</span>
            <span className="text-sm text-gray-500">
              {txResults.length} transaction{txResults.length !== 1 ? 's' : ''} found
            </span>
          </h2>
          <div className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96">
            <pre className="text-xs">{JSON.stringify(txResults, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscordMessageTester;