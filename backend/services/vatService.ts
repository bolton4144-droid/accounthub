import { db } from '../database/db';

interface VATCalculation {
  vatDueSales: number;
  vatDueAcquisitions: number;
  totalVatDue: number;
  vatReclaimed: number;
  netVatDue: number;
  totalValueSales: number;
  totalValuePurchases: number;
  totalValueGoodsSupplied: number;
  totalAcquisitions: number;
}

export class VATService {
  // Standard VAT rate (can be adjusted)
  private readonly standardRate = 0.20; // 20%
  private readonly reducedRate = 0.05; // 5%
  private readonly zeroRate = 0.00; // 0%

  /**
   * Calculate VAT from gross amount
   */
  calculateVATFromGross(gross: number, rate: number = this.standardRate): number {
    const vat = gross - gross / (1 + rate);
    return Math.round(vat * 100) / 100;
  }

  /**
   * Calculate VAT from net amount
   */
  calculateVATFromNet(net: number, rate: number = this.standardRate): number {
    const vat = net * rate;
    return Math.round(vat * 100) / 100;
  }

  /**
   * Calculate VAT return for a period
   */
  async calculateVATReturn(
    companyId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<VATCalculation> {
    // Get all sales transactions (invoices, receipts)
    const salesResult = await db.query(
      `SELECT 
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(tax_amount), 0) as vat_on_sales,
        COALESCE(SUM(net_amount), 0) as net_sales
       FROM transactions
       WHERE company_id = $1
       AND transaction_date BETWEEN $2 AND $3
       AND transaction_type IN ('invoice', 'receipt', 'sale')
       AND status != 'void'`,
      [companyId, periodStart, periodEnd]
    );

    // Get all purchase transactions (bills, expenses)
    const purchasesResult = await db.query(
      `SELECT 
        COALESCE(SUM(total_amount), 0) as total_purchases,
        COALESCE(SUM(tax_amount), 0) as vat_on_purchases,
        COALESCE(SUM(net_amount), 0) as net_purchases
       FROM transactions
       WHERE company_id = $1
       AND transaction_date BETWEEN $2 AND $3
       AND transaction_type IN ('bill', 'expense', 'purchase')
       AND status != 'void'`,
      [companyId, periodStart, periodEnd]
    );

    const sales = salesResult.rows[0];
    const purchases = purchasesResult.rows[0];

    // Box 1: VAT due on sales
    const vatDueSales = parseFloat(sales.vat_on_sales) || 0;

    // Box 2: VAT due on acquisitions (EC purchases)
    const vatDueAcquisitions = 0; // Would need to track EC acquisitions separately

    // Box 3: Total VAT due (Box 1 + Box 2)
    const totalVatDue = vatDueSales + vatDueAcquisitions;

    // Box 4: VAT reclaimed on purchases
    const vatReclaimed = parseFloat(purchases.vat_on_purchases) || 0;

    // Box 5: Net VAT to pay/reclaim (Box 3 - Box 4)
    const netVatDue = totalVatDue - vatReclaimed;

    // Box 6: Total value of sales (excluding VAT)
    const totalValueSales = parseFloat(sales.net_sales) || 0;

    // Box 7: Total value of purchases (excluding VAT)
    const totalValuePurchases = parseFloat(purchases.net_purchases) || 0;

    // Box 8: Total value of goods supplied (ex VAT) - EC only
    const totalValueGoodsSupplied = 0;

    // Box 9: Total acquisitions (ex VAT) - EC only
    const totalAcquisitions = 0;

    return {
      vatDueSales: Math.round(vatDueSales * 100) / 100,
      vatDueAcquisitions: Math.round(vatDueAcquisitions * 100) / 100,
      totalVatDue: Math.round(totalVatDue * 100) / 100,
      vatReclaimed: Math.round(vatReclaimed * 100) / 100,
      netVatDue: Math.round(netVatDue * 100) / 100,
      totalValueSales: Math.round(totalValueSales * 100) / 100,
      totalValuePurchases: Math.round(totalValuePurchases * 100) / 100,
      totalValueGoodsSupplied: Math.round(totalValueGoodsSupplied * 100) / 100,
      totalAcquisitions: Math.round(totalAcquisitions * 100) / 100,
    };
  }

  /**
   * Generate period key for HMRC submission
   */
  generatePeriodKey(periodStart: Date): string {
    const year = periodStart.getFullYear().toString().slice(-2);
    const month = periodStart.getMonth() + 1;

    // Quarterly periods
    let quarter: string;
    if (month >= 1 && month <= 3) quarter = 'A1'; // Jan-Mar
    else if (month >= 4 && month <= 6) quarter = 'A2'; // Apr-Jun
    else if (month >= 7 && month <= 9) quarter = 'A3'; // Jul-Sep
    else quarter = 'A4'; // Oct-Dec

    return `${year}${quarter}`;
  }

  /**
   * Get VAT return periods (quarterly)
   */
  getVATReturnPeriods(year: number): Array<{
    periodKey: string;
    start: Date;
    end: Date;
    dueDate: Date;
  }> {
    const periods: Array<{
      periodKey: string;
      start: Date;
      end: Date;
      dueDate: Date;
    }> = [];
    const quarters = [
      { start: new Date(year, 0, 1), end: new Date(year, 2, 31) },  // Q1
      { start: new Date(year, 3, 1), end: new Date(year, 5, 30) },  // Q2
      { start: new Date(year, 6, 1), end: new Date(year, 8, 30) },  // Q3
      { start: new Date(year, 9, 1), end: new Date(year, 11, 31) }, // Q4
    ];

    quarters.forEach((quarter, index) => {
      // Due date is 1 month and 7 days after period end
      const dueDate = new Date(quarter.end);
      dueDate.setMonth(dueDate.getMonth() + 1);
      dueDate.setDate(7);

      periods.push({
        periodKey: this.generatePeriodKey(quarter.start),
        start: quarter.start,
        end: quarter.end,
        dueDate,
      });
    });

    return periods;
  }

  /**
   * Check if VAT return is overdue
   */
  isVATReturnOverdue(dueDate: Date): boolean {
    return new Date() > dueDate;
  }

  /**
   * Calculate flat rate VAT
   */
  calculateFlatRateVAT(
    turnover: number,
    flatRatePercentage: number,
    limitedCostTrader: boolean = false
  ): number {
    // Limited cost traders pay an additional 1%
    const rate = limitedCostTrader
      ? flatRatePercentage + 1
      : flatRatePercentage;

    return Math.round(turnover * (rate / 100) * 100) / 100;
  }

  /**
   * Determine VAT scheme eligibility
   */
  determineVATSchemeEligibility(annualTurnover: number): {
    canUseStandard: boolean;
    canUseFlatRate: boolean;
    canUseCashAccounting: boolean;
    mustRegister: boolean;
  } {
    const REGISTRATION_THRESHOLD = 90000; // £90,000
    const FLAT_RATE_LIMIT = 150000; // £150,000
    const CASH_ACCOUNTING_LIMIT = 1350000; // £1,350,000

    return {
      canUseStandard: true, // Always available
      canUseFlatRate: annualTurnover <= FLAT_RATE_LIMIT,
      canUseCashAccounting: annualTurnover <= CASH_ACCOUNTING_LIMIT,
      mustRegister: annualTurnover >= REGISTRATION_THRESHOLD,
    };
  }

  /**
   * Validate VAT number format (UK)
   */
  validateVATNumber(vatNumber: string): boolean {
    // UK VAT format: GB followed by 9 or 12 digits
    const ukVATPattern = /^GB\d{9}$|^GB\d{12}$/;
    return ukVATPattern.test(vatNumber.replace(/\s/g, ''));
  }

  /**
   * Format VAT number
   */
  formatVATNumber(vatNumber: string): string {
    const cleaned = vatNumber.replace(/\s/g, '').toUpperCase();
    if (cleaned.startsWith('GB')) {
      return cleaned;
    }
    return `GB${cleaned}`;
  }
}

export const vatService = new VATService();
