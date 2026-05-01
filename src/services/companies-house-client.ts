type Fetcher = typeof fetch;

export class CompaniesHouseClient {
  private readonly baseUrl = 'https://api.company-information.service.gov.uk';

  constructor(private readonly apiKey = '', private readonly fetcher: Fetcher = fetch) {}

  async searchCompanies(query: string) {
    return this.get(`/search/companies?q=${encodeURIComponent(query)}&items_per_page=10`);
  }

  async getCompanyBundle(companyNumber: string) {
    const [profile, officers, psc, filingHistory] = await Promise.all([
      this.get(`/company/${companyNumber}`),
      this.get(`/company/${companyNumber}/officers`),
      this.get(`/company/${companyNumber}/persons-with-significant-control`),
      this.get(`/company/${companyNumber}/filing-history`)
    ]);
    return { profile, officers, personsWithSignificantControl: psc, filingHistory };
  }

  private async get(path: string) {
    if (!this.apiKey) {
      return { mode: 'mock', message: 'Set COMPANIES_HOUSE_API_KEY in Railway to enable live Companies House calls.', path };
    }

    const token = Buffer.from(`${this.apiKey}:`).toString('base64');
    const response = await this.fetcher(`${this.baseUrl}${path}`, { headers: { Authorization: `Basic ${token}`, Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Companies House request failed ${response.status}`);
    return response.json();
  }
}
