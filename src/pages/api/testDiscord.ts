// pages/api/testDiscord.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendDiscordNotification } from '../../utils/discordNotifier';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }
  
  // Expect the wallet address, transaction data, and proposal details in the request body
  const { wallet, transactions, proposal } = req.body;
  
  if (!wallet) {
    return res.status(400).json({ error: 'Wallet parameter is required.' });
  }
  
  if (!transactions || !Array.isArray(transactions)) {
    return res.status(400).json({ error: 'Transaction data is required and should be an array.' });
  }
  
  if (!proposal) {
    return res.status(400).json({ error: 'Proposal data is required.' });
  }
  
  try {
    // Send the provided transaction data via Discord with proposal details
    await sendDiscordNotification(transactions, wallet, proposal);
    
    return res.status(200).json({
      message: 'Discord notification triggered with provided transactions and proposal details.',
      transactions,
      proposal
    });
  } catch (error) {
    console.error('Error in testDiscord endpoint:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to send Discord notification.' 
    });
  }
}