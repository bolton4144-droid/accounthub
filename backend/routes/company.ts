import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      companies: [
        {
          id: 'demo-company-id',
          companyName: 'Demo Company Ltd',
          companyNumber: '12345678',
          vatNumber: 'GB123456789',
        },
      ],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { companyName, companyNumber, vatNumber } = req.body;
    
    res.status(201).json({
      message: 'Company created successfully',
      companyId: 'demo-company-id',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create company' });
  }
});

export default router;
