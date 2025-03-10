const axios = require('axios');

/**
 * Checks whether a transaction is recent enough (i.e. within the last 8 hours and 10 minutes).
 * @param {number} txTimestamp - The transaction timestamp (in seconds).
 * @returns {boolean} True if the transaction is recent.
 */
function isRecentTransaction(txTimestamp) {
  const txTimeMs = txTimestamp * 1000;
  const cutoffMs = Date.now() - ((8 * 60 + 10) * 60 * 1000);
  return txTimeMs > cutoffMs;
}

/**
 * Helper to calculate the ADA amount from a transaction object.
 *
 * If the transaction object includes a 'wallet' property, it sums the 'value'
 * from outputs whose payment address matches that wallet (as per your Google Sheets logic).
 * Otherwise, it falls back to using an 'amount' array within each output.
 *
 * @param {Object} tx - Transaction object.
 * @returns {number} Total ADA amount (in ADA units).
 */
function getAdaAmount(tx, wallet) {
  let totalLovelace = 0;
  
  if (wallet) {
    // Check that the wallet does not appear in any input.
    const isIncoming = (tx.inputs || []).every(input => {
      return !(input.payment_addr && input.payment_addr.bech32 === wallet);
    });
    if (!isIncoming) {
      // Not an incoming transaction for this wallet.
      return 0;
    }
    // Sum lovelace from outputs whose payment address matches the wallet.
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
    // Fallback: If no wallet is provided, aggregate all lovelace from outputs.
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
  
  // Convert lovelace to ADA (1 ADA = 1,000,000 lovelace)
  return totalLovelace / 1e6;
}

/**
 * Sends a Discord notification with details about the provided transactions.
 * @param {Array} txs - Array of transaction objects.
 */
async function sendDiscordNotification(txs, wallet) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("Discord webhook URL is not configured.");
    return;
  }

  let message = `**Recent Transaction Notification**\nReceived ${txs.length} recent transaction(s):`;
  txs.forEach((tx, index) => {
    const txDate = new Date(tx.tx_timestamp * 1000).toLocaleString();
    const adaAmount = getAdaAmount(tx, wallet).toFixed(6);
    message += `\n\n**Transaction ${index + 1}:**\nHash: \`${tx.tx_hash}\`\nDate: ${txDate}\nADA Amount: ${adaAmount} ADA`;
  });

  const payload = { content: message };

  try {
    await axios.post(webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log("Discord notification sent successfully.");
  } catch (error) {
    console.error("Failed to send Discord notification:", error);
  }
}

module.exports = {
  isRecentTransaction,
  sendDiscordNotification
};
