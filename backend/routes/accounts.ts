import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/transactions', async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      transactions: [
        {
          id: 'txn-1',
          date: '2024-04-29',
          description: 'Client Invoice #1234',
          amount: 15000.00,
          type: 'income',
          status: 'paid',
        },
        {
          id: 'txn-2',
          date: '2024-04-25',
          description: 'Office Rent',
          amount: -2500.00,
          type: 'expense',
          status: 'paid',
        },
      ],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

router.get('/profit-loss', async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      revenue: 45000.00,
      expenses: 18000.00,
      profit: 27000.00,
      period: 'Q1 2024',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate P&L' });
  }
});

router.get('/balance-sheet', async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      assets: 125000.00,
      liabilities: 45000.00,
      equity: 80000.00,
      asOfDate: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate balance sheet' });
  }
});

export default router;
