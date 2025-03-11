// src/pages/testing.tsx
import { useEffect, useState } from 'react';
import projects from '../config/projects.json';
import { TxInfoData, ProjectTxData } from '../types/types'; // Adjust the import path as necessary
import SheetFetcher from '../components/SheetFetcher';
import TxTester from '../components/TxTester';
import Charts from '../components/Charts';
import DiscordMessageTester from '@/components/DiscordMessageTester';

// Local type for our project configuration.
interface Project {
  project_id: string;
  wallet_address: string;
}

export default function Testing() {
  // Use the global type for grouping a project's transactions.
  const [data, setData] = useState<ProjectTxData[]>([]);
  // State for Transaction Explorer – using tx_hashes from TxDataItem.
  const [txids, setTxids] = useState<string[]>([]);
  // Use the global TxInfoData for detailed transaction info.
  const [selectedTxInfo, setSelectedTxInfo] = useState<TxInfoData | null>(null);
  const [isLoadingTxids, setIsLoadingTxids] = useState<boolean>(false);
  const [isLoadingTxInfo, setIsLoadingTxInfo] = useState<boolean>(false);

  // Fetch tx data for each project.
  useEffect(() => {
    const fetchTxData = async () => {
      const txData = await Promise.all(
        projects.projects.map(async (project: Project) => {
          const response = await fetch('/api/getAddressTxs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ wallet: project.wallet_address }),
          });

          if (!response.ok) {
            console.error(`Error fetching data for wallet ${project.wallet_address}`);
            return { projectId: project.project_id, txs: [] } as ProjectTxData;
          }

          const data = await response.json();
          return { projectId: project.project_id, txs: data } as ProjectTxData;
        })
      );
      setData(txData);
    };
    console.log('fetching tx data', data);
    fetchTxData();
  }, []);

  // Fetch TXIDs for a wallet – here we use the first project for demonstration.
  const fetchTxids = async () => {
    if (projects.projects.length === 0) return;
    setIsLoadingTxids(true);
    setSelectedTxInfo(null); // Reset any previously selected transaction info

    // Using the first project's wallet address for this example.
    const wallet = projects.projects[0].wallet_address;

    try {
      const response = await fetch('/api/getAddressTxs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wallet }),
      });

      if (!response.ok) {
        console.error(`Error fetching txids for wallet ${wallet}`);
        setIsLoadingTxids(false);
        return;
      }

      const txData = await response.json();
      // Assume txData is either an array of transactions or an object with an array property.
      let txArray: { tx_hash: string }[] = [];
      if (Array.isArray(txData)) {
        txArray = txData;
      } else if (txData && Array.isArray(txData.txs)) {
        txArray = txData.txs;
      }

      // Extract the tx_hash from each transaction and take the first 10.
      const txidsList = txArray.map((tx) => tx.tx_hash).slice(0, 10);
      setTxids(txidsList);
    } catch (error) {
      console.error("Error fetching txids:", error);
    } finally {
      setIsLoadingTxids(false);
    }
  };

  // Fetch detailed transaction info for a given txid.
  // Only show outputs sent to the wallet used for fetching TXIDs.
  const fetchTxInfo = async (txid: string) => {
    setIsLoadingTxInfo(true);
    try {
      const response = await fetch('/api/txInfo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ txid }),
      });
      
      if (!response.ok) {
        console.error(`Error fetching tx info for txid ${txid}`);
        setIsLoadingTxInfo(false);
        return;
      }

      const txInfoData = await response.json();
      console.log('txInfoData', txInfoData);
      const txInfoObj = Array.isArray(txInfoData)
        ? (txInfoData[0] as TxInfoData)
        : (txInfoData as TxInfoData);
      
      // Use the same wallet that was used for fetching TXIDs.
      const wallet = projects.projects[0].wallet_address;

      // Filter outputs for the wallet address.
      const outputsForWallet = txInfoObj.outputs.filter(
        (output) => output.payment_addr.bech32 === wallet
      );

      // Set the filtered outputs as the transaction info to display.
      setSelectedTxInfo({ ...txInfoObj, outputs: outputsForWallet });
    } catch (error) {
      console.error("Error fetching tx info:", error);
    } finally {
      setIsLoadingTxInfo(false);
    }
  };

  return (
    <div className="home-container">
      <Charts />
      <SheetFetcher />
      <TxTester />
      <DiscordMessageTester />
      <h1>Project Dashboard</h1>
      <hr />

      <h2>Transaction Explorer</h2>
      <button onClick={fetchTxids} disabled={isLoadingTxids}>
        {isLoadingTxids ? 'Fetching TXIDs...' : 'Fetch TXIDs'}
      </button>

      {txids.length > 0 && (
        <div className="txid-list">
          <h3>Last 10 TXIDs:</h3>
          {txids.map((txid) => (
            <button
              key={txid}
              onClick={() => fetchTxInfo(txid)}
              disabled={isLoadingTxInfo}
              style={{ margin: '0.5rem' }}
            >
              {txid}
            </button>
          ))}
        </div>
      )}

      {selectedTxInfo && (
        <div className="tx-info">
          <h3>
            Transaction Outputs Sent to Wallet{' '}
            <code>{projects.projects[0].wallet_address}</code>
          </h3>
          <pre>{JSON.stringify(selectedTxInfo, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps() {
  // Only render this page in development mode.
  if (process.env.NODE_ENV !== 'development') {
    return {
      notFound: true,
    };
  }
  
  return { props: {} };
}
