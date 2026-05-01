import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { db } from '../database/db';

interface HMRCTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface VATReturn {
  periodKey: string;
  vatDueSales: number;
  vatDueAcquisitions: number;
  totalVatDue: number;
  vatReclaimedCurrPeriod: number;
  netVatDue: number;
  totalValueSalesExVAT: number;
  totalValuePurchasesExVAT: number;
  totalValueGoodsSuppliedExVAT: number;
  totalAcquisitionsExVAT: number;
  finalised: boolean;
}

export class HMRCService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.hmrc.baseUrl,
      timeout: 30000,
      headers: {
        'Accept': 'application/vnd.hmrc.1.0+json',
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: config.hmrc.clientId,
      response_type: 'code',
      scope: config.oauth.scopes,
      redirect_uri: config.oauth.redirectUri,
      state,
    });

    return `${config.hmrc.baseUrl}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<HMRCTokenResponse> {
    const response = await axios.post(
      `${config.hmrc.baseUrl}/oauth/token`,
      new URLSearchParams({
        client_id: config.hmrc.clientId,
        client_secret: config.hmrc.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.oauth.redirectUri,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response.data;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<HMRCTokenResponse> {
    const response = await axios.post(
      `${config.hmrc.baseUrl}/oauth/token`,
      new URLSearchParams({
        client_id: config.hmrc.clientId,
        client_secret: config.hmrc.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response.data;
  }

  /**
   * Get valid access token (refresh if expired)
   */
  async getValidAccessToken(companyId: string): Promise<string> {
    const connection = await db.query(
      'SELECT * FROM hmrc_connections WHERE company_id = $1',
      [companyId]
    );

    if (!connection.rows[0]) {
      throw new Error('HMRC connection not found');
    }

    const { access_token, refresh_token, expires_at } = connection.rows[0];
    const now = new Date();

    // If token expires in less than 5 minutes, refresh it
    if (new Date(expires_at) <= new Date(now.getTime() + 5 * 60 * 1000)) {
      const newTokens = await this.refreshAccessToken(refresh_token);
      const newExpiresAt = new Date(now.getTime() + newTokens.expires_in * 1000);

      await db.query(
        `UPDATE hmrc_connections 
         SET access_token = $1, refresh_token = $2, expires_at = $3, updated_at = NOW()
         WHERE company_id = $4`,
        [newTokens.access_token, newTokens.refresh_token, newExpiresAt, companyId]
      );

      return newTokens.access_token;
    }

    return access_token;
  }

  /**
   * Submit VAT return to HMRC
   */
  async submitVATReturn(
    companyId: string,
    vrn: string,
    vatReturn: VATReturn
  ): Promise<any> {
    const accessToken = await this.getValidAccessToken(companyId);

    const response = await this.client.post(
      `/organisations/vat/${vrn}/returns`,
      vatReturn,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Gov-Test-Scenario': config.nodeEnv === 'development' ? 'DEFAULT' : undefined,
        },
      }
    );

    return response.data;
  }

  /**
   * Retrieve VAT obligations
   */
  async getVATObligations(
    companyId: string,
    vrn: string,
    from: string,
    to: string
  ): Promise<any> {
    const accessToken = await this.getValidAccessToken(companyId);

    const response = await this.client.get(
      `/organisations/vat/${vrn}/obligations`,
      {
        params: { from, to, status: 'O' }, // O = Open obligations
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  }

  /**
   * Retrieve VAT liabilities
   */
  async getVATLiabilities(
    companyId: string,
    vrn: string,
    from: string,
    to: string
  ): Promise<any> {
    const accessToken = await this.getValidAccessToken(companyId);

    const response = await this.client.get(
      `/organisations/vat/${vrn}/liabilities`,
      {
        params: { from, to },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  }

  /**
   * Submit PAYE FPS (Full Payment Submission)
   */
  async submitPayeFPS(
    companyId: string,
    empRef: string,
    fpsData: any
  ): Promise<any> {
    const accessToken = await this.getValidAccessToken(companyId);

    const response = await this.client.post(
      `/organisations/paye/${empRef}/fps`,
      fpsData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Gov-Test-Scenario': config.nodeEnv === 'development' ? 'DEFAULT' : undefined,
        },
      }
    );

    return response.data;
  }

  /**
   * Submit PAYE EPS (Employer Payment Summary)
   */
  async submitPayeEPS(
    companyId: string,
    empRef: string,
    epsData: any
  ): Promise<any> {
    const accessToken = await this.getValidAccessToken(companyId);

    const response = await this.client.post(
      `/organisations/paye/${empRef}/eps`,
      epsData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  }

  /**
   * Get Corporation Tax obligations
   */
  async getCorporationTaxObligations(
    companyId: string,
    utr: string,
    from: string,
    to: string
  ): Promise<any> {
    const accessToken = await this.getValidAccessToken(companyId);

    const response = await this.client.get(
      `/organisations/corporation-tax/${utr}/obligations`,
      {
        params: { from, to },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  }

  /**
   * Test HMRC connection
   */
  async testConnection(companyId: string): Promise<boolean> {
    try {
      const accessToken = await this.getValidAccessToken(companyId);
      
      // Simple test call to check connection
      await this.client.get('/test/fraud-prevention-headers/validate', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return true;
    } catch (error) {
      console.error('HMRC connection test failed:', error);
      return false;
    }
  }
}

export const hmrcService = new HMRCService();
