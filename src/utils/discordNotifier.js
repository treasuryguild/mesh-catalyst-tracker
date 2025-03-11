// utils/discordNotifier.js
import axios from 'axios';

/**
 * Checks whether a transaction is recent enough (i.e. within the last 8 hours and 10 minutes).
 * @param {number} txTimestamp - The transaction timestamp (in seconds).
 * @returns {boolean} True if the transaction is recent.
 */
export function isRecentTransaction(txTimestamp) {
  const txTimeMs = txTimestamp * 1000;
  const cutoffMs = Date.now() - ((8 * 60 + 10) * 60 * 1000);
  return txTimeMs > cutoffMs;
}

/**
 * Helper to calculate the ADA amount from a transaction object.
 *
 * If the transaction object includes a 'wallet' property, it sums the 'value'
 * from outputs whose payment address matches that wallet.
 * Otherwise, it falls back to using an 'amount' array within each output.
 *
 * @param {Object} tx - Transaction object.
 * @param {string} wallet - The wallet address.
 * @returns {number} Total ADA amount (in ADA units).
 */
export function getAdaAmount(tx, wallet) {
  let totalLovelace = 0;
  
  if (wallet) {
    const isIncoming = (tx.inputs || []).every(input => {
      return !(input.payment_addr && input.payment_addr.bech32 === wallet);
    });
    if (!isIncoming) {
      return 0;
    }
    (tx.outputs || []).forEach((output) => {
      if (output.payment_addr && output.payment_addr.bech32 === wallet) {
        if (output.value) {
          totalLovelace += Number(output.value) || 0;
        } else if (output.amount && Array.isArray(output.amount)) {
          output.amount.forEach((coin) => {
            if (coin.unit === 'lovelace') {
              totalLovelace += Number(coin.quantity);
            }
          });
        }
      }
    });
  } else {
    (tx.outputs || []).forEach((output) => {
      if (output.amount && Array.isArray(output.amount) && output.amount.length > 0) {
        output.amount.forEach((coin) => {
          if (coin.unit === 'lovelace') {
            totalLovelace += Number(coin.quantity);
          }
        });
      } else if (output.value) {
        totalLovelace += Number(output.value);
      }
    });
  }
  
  return totalLovelace / 1e6;
}

/**
 * Sends a Discord notification with details about the provided transactions and proposal.
 * 
 * @param {Array} txs - Array of transaction objects.
 * @param {string} wallet - The wallet address.
 * @param {Object} [proposal=null] - Optional proposal object with project details.
 */
export async function sendDiscordNotification(txs, wallet, proposal = null) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("Discord webhook URL is not configured.");
    throw new Error("Discord webhook URL is not configured.");
  }

  const transactionDetails = txs.map((tx, index) => {
    const txDate = new Date(tx.tx_timestamp * 1000).toLocaleDateString();
    const adaAmount = getAdaAmount(tx, wallet).toFixed(0);
    
    let metadataInfo = '';
    if (tx.metadata && tx.metadata[674] && tx.metadata[674].msg) {
      const msg = Array.isArray(tx.metadata[674].msg) 
        ? tx.metadata[674].msg.join(' ') 
        : tx.metadata[674].msg;
      metadataInfo = `\nMetadata: ${msg}`;
    }
    
    return `**Transaction ${index + 1}:**\n[View on CardanoScan](https://cardanoscan.io/transaction/${tx.tx_hash})\nDate: ${txDate}\nAmount: ${adaAmount} ADA${metadataInfo}`;
  }).join('\n\n');

  let proposalInfo = '';
  if (proposal) {
    proposalInfo = `\n\n**Project Information:**\nProject ID: ${proposal.project_id}\nTitle: ${proposal.title}\nBudget: ${proposal.budget} ADA`;
    if (proposal.milestones_qty) {
      proposalInfo += `\nTotal Milestones: ${proposal.milestones_qty}`;
    }
  }

  const totalAda = txs.reduce((sum, tx) => sum + getAdaAmount(tx, wallet), 0).toFixed(0);

  const embed = {
    title: 'Catalyst Funding Notification',
    description: `Received ${txs.length} transaction(s) totaling ${totalAda} ADA:\n\n${transactionDetails}${proposalInfo}`,
    color: 0x3498db,
    timestamp: new Date().toISOString()
  };

  const payload = { embeds: [embed] };

  try {
    await axios.post(webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log("Discord notification sent successfully.");
    return true;
  } catch (error) {
    console.error("Failed to send Discord notification:", error);
    throw error;
  }
}
