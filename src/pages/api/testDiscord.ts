// pages/api/testDiscord.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendDiscordNotification } from '../../utils/discordNotifier';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }
  
  // Expect the wallet address, optional date filters, and transaction data in the request body.
  const { wallet, transactions } = req.body;
  
  if (!wallet) {
    return res.status(400).json({ error: 'Wallet parameter is required.' });
  }
  
  if (!transactions || !Array.isArray(transactions)) {
    return res.status(400).json({ error: 'Transaction data is required and should be an array.' });
  }
  
  try {
    // Send the provided transaction data via Discord.
    await sendDiscordNotification(transactions, wallet);
    
    return res.status(200).json({
      message: 'Discord notification triggered with provided transactions.',
      transactions
    });
  } catch (error) {
    console.error('Error in testDiscord endpoint:', error);
    return res.status(500).json({ error: 'Failed to send Discord notification.' });
  }
}
