import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/runs', async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      payrollRuns: [
        {
          id: 'demo-payroll-1',
          taxYear: '2024/25',
          payPeriodStart: '2024-04-01',
          payPeriodEnd: '2024-04-30',
          paymentDate: '2024-04-30',
          status: 'paid',
          totalGross: 28450.00,
          totalNet: 22100.50,
        },
      ],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payroll runs' });
  }
});

router.post('/runs', async (req: AuthRequest, res: Response) => {
  try {
    res.status(201).json({
      message: 'Payroll run created',
      payrollRunId: 'demo-payroll-new',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create payroll run' });
  }
});

router.post('/calculate', async (req: AuthRequest, res: Response) => {
  try {
    const { grossPay, taxCode } = req.body;
    
    res.json({
      grossPay: grossPay || 3000,
      tax: 487.40,
      niEmployee: 204.80,
      niEmployer: 282.60,
      netPay: 2307.80,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate payroll' });
  }
});

export default router;
