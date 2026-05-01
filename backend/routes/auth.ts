import { Router, Request, Response } from 'express';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName } = req.body;
    
    // Demo response
    res.status(201).json({
      message: 'User registered successfully',
      userId: 'demo-user-id',
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // Demo response - accept any credentials
    res.json({
      token: 'demo-jwt-token-12345',
      user: {
        id: 'demo-user-id',
        email: email,
        fullName: 'Demo User',
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
