import { NextApiRequest, NextApiResponse } from 'next';
import { initSocket } from '@/lib/socket/server';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    initSocket(res);
    res.status(200).json({ message: 'Socket.IO server initialized' });
  } catch (error) {
    console.error('Socket initialization error:', error);
    res.status(500).json({ error: 'Failed to initialize Socket.IO' });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};