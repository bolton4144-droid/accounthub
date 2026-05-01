import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      cashBalance: 45678.90,
      cashChange: 12.5,
      monthlyPayroll: 28450.00,
      payrollChange: -3.2,
      employeeCount: 12,
      employeeChange: 0,
      vatOwed: 8945.50,
      vatDueDate: '2026-05-07',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

router.get('/deadlines', async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      deadlines: [
        {
          id: '1',
          title: 'VAT Return Q1',
          date: '2026-05-07',
          type: 'vat',
          status: 'upcoming',
        },
        {
          id: '2',
          title: 'April Payroll',
          date: '2026-05-22',
          type: 'payroll',
          status: 'upcoming',
        },
      ],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch deadlines' });
  }
});

export default router;
