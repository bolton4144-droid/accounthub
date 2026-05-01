type VatPreviewInput = { scheme: 'standard' | 'flat_rate' | 'cash'; taxableSales: number; taxablePurchases: number; flatRatePercent?: number };

export class VatService {
  previewReturn(input: VatPreviewInput) {
    if (input.scheme === 'flat_rate') {
      const box1 = round(input.taxableSales * ((input.flatRatePercent ?? 14.5) / 100));
      return this.returnBoxes(input.scheme, box1, 0, input.taxableSales, input.taxablePurchases);
    }
    const box1 = round(input.taxableSales * 0.2);
    const box4 = round(input.taxablePurchases * 0.2);
    return this.returnBoxes(input.scheme, box1, box4, input.taxableSales, input.taxablePurchases);
  }

  private returnBoxes(scheme: VatPreviewInput['scheme'], box1: number, box4: number, sales: number, purchases: number) {
    return { scheme, boxes: { box1VatDueOnSales: box1, box4VatReclaimed: box4, box5NetVatDue: round(box1 - box4), box6NetSalesExVat: sales, box7NetPurchasesExVat: purchases }, nextStep: 'Wire these boxes to locked ledger tax-code summaries and HMRC MTD obligations.' };
  }
}

function round(value: number) { return Math.round(value * 100) / 100; }
