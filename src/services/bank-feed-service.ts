type BankFeedProvider = 'truelayer' | 'plaid' | 'manual_csv';
type BankStatementLine = { id: string; date: string; description: string; amount: number; direction: 'money_in' | 'money_out'; counterparty?: string };
type MatchCandidate = { bankLineId: string; targetType: 'sales_invoice' | 'purchase_bill' | 'journal' | 'transfer'; targetId: string; confidence: number; reason: string };

export class BankFeedService {
  connectionBlueprint(provider: BankFeedProvider) {
    return {
      provider,
      status: 'requires_oauth_credentials',
      requiredSecrets: provider === 'truelayer' ? ['TRUELAYER_CLIENT_ID', 'TRUELAYER_CLIENT_SECRET'] : provider === 'plaid' ? ['PLAID_CLIENT_ID', 'PLAID_SECRET'] : [],
      scopes: ['accounts', 'transactions', 'balance'],
      tenantIsolation: 'provider_tokens_are_stored_per_business_entity_and_encrypted'
    };
  }

  normaliseStatementLine(line: BankStatementLine) {
    return { ...line, amount: Math.abs(line.amount), importedAt: new Date().toISOString(), reconciliationStatus: 'unmatched' };
  }

  suggestMatches(line: BankStatementLine, candidates: MatchCandidate[]) {
    return candidates
      .filter((candidate) => candidate.bankLineId === line.id)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }
}
