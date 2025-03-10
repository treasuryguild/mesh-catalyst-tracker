import React, { useState } from 'react';

const TransactionTester = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [txResults, setTxResults] = useState(null);
  const [discordStatus, setDiscordStatus] = useState('');

  // Hardcoded wallet address from env variable.
  const WALLET_ADDRESS = process.env.NEXT_PUBLIC_TEST_WALLET;

  async function getTxInfo(txHash) {
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

  function isIncomingTransaction(tx, walletAddr) {
    // A transaction is incoming if at least one output belongs to the wallet and none of the inputs do.
    const outputMatches = (tx.outputs || []).some(
      (output) =>
        output.payment_addr && output.payment_addr.bech32 === walletAddr
    );
    const inputMatches = (tx.inputs || []).some(
      (input) =>
        input.payment_addr && input.payment_addr.bech32 === walletAddr
    );
    return outputMatches && !inputMatches;
  }

  async function fetchWalletTransactions(walletAddr, startDateStr, endDateStr) {
    const basicRequestData = { _addresses: [walletAddr] };

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

      const incomingTxs = validDetailedTxs.filter((tx) => {
        const txDate = new Date(tx.tx_timestamp * 1000);
        if (startDateStr && txDate < new Date(startDateStr)) return false;
        if (endDateStr && txDate > new Date(endDateStr)) return false;
        return isIncomingTransaction(tx, walletAddr);
      });

      console.log('Filtered incoming transactions:', incomingTxs);
      return incomingTxs;
    } catch (error) {
      console.error('Error fetching wallet transactions:', error);
      throw error;
    }
  }

  // Handler to fetch and display transaction data.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Starting transaction fetch with parameters:', {
        wallet: WALLET_ADDRESS,
        startDate,
        endDate,
      });
      const transactions = await fetchWalletTransactions(
        WALLET_ADDRESS,
        startDate,
        endDate
      );
      console.log('Final results:', transactions);
      setTxResults(transactions);
    } catch (error) {
      console.error('Error in transaction fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handler to trigger a Discord notification using the transaction data.
  const handleDiscordTest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setDiscordStatus('Sending Discord notification...');
    try {
      // Use the transactions already fetched (if available), else fetch them.
      let transactions = txResults;
      console.log('Sending Discord notification with transactions:', transactions);
      if (!transactions) {
        transactions = await fetchWalletTransactions(
          WALLET_ADDRESS,
          startDate,
          endDate
        );
        setTxResults(transactions);
      }
      // Send the transactions along with other parameters to the API.
      const response = await fetch('/api/testDiscord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: WALLET_ADDRESS,
          transactions
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setDiscordStatus('Discord notification sent successfully.');
      } else {
        setDiscordStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sending Discord notification:', error);
      setDiscordStatus('Error sending Discord notification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '20px auto', padding: '20px' }}>
      <h2>Transaction Tester</h2>
      <p style={{ marginBottom: '15px' }}>
        Wallet Address: {WALLET_ADDRESS}
      </p>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
          }}
        >
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Start Date:
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  marginTop: '5px',
                }}
              />
            </label>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              End Date:
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  marginTop: '5px',
                }}
              />
            </label>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Fetching Transactions...' : 'Fetch Transactions'}
        </button>
      </form>
      <button
        onClick={handleDiscordTest}
        disabled={loading}
        style={{
          marginTop: '20px',
          padding: '10px',
          backgroundColor: loading ? '#ccc' : '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading
          ? 'Sending Discord Notification...'
          : 'Send Discord Notification'}
      </button>
      {discordStatus && <p>{discordStatus}</p>}
      {txResults && (
        <div>
          <h3>Transaction Results:</h3>
          <pre>{JSON.stringify(txResults, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default TransactionTester;
