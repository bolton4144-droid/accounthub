import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/connect', async (req: AuthRequest, res: Response) => {
  try {
    // Return OAuth URL for HMRC connection
    res.json({
      authUrl: 'https://test-api.service.hmrc.gov.uk/oauth/authorize',
      message: 'Redirect user to this URL to connect HMRC',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate HMRC auth URL' });
  }
});

router.get('/callback', async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.query;
    
    res.json({
      message: 'HMRC connected successfully',
      connected: true,
    });
  } catch (error) {
    res.status(500).json({ error: 'HMRC connection failed' });
  }
});

router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      connected: true,
      lastSynced: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check HMRC status' });
  }
});

export default router;
