type VatReturnBoxes = { box1: number; box2?: number; box3?: number; box4: number; box5: number; box6: number; box7: number; box8?: number; box9?: number };

export class MtdVatService {
  integrationReadiness() {
    return {
      status: 'adapter_ready_credentials_required',
      requiredSecrets: ['HMRC_CLIENT_ID', 'HMRC_CLIENT_SECRET'],
      requiredScopes: ['read:vat', 'write:vat'],
      endpoints: ['obligations', 'submit_return', 'liabilities', 'payments'],
      fraudPreventionHeaders: 'must_be_added_at_http_client_layer_before_production'
    };
  }

  validateReturnBoxes(boxes: VatReturnBoxes) {
    const errors: string[] = [];
    const expectedBox3 = round((boxes.box1 ?? 0) + (boxes.box2 ?? 0));
    const expectedBox5 = round(expectedBox3 - boxes.box4);
    if (boxes.box3 !== undefined && round(boxes.box3) !== expectedBox3) errors.push('Box 3 must equal Box 1 plus Box 2.');
    if (round(boxes.box5) !== expectedBox5) errors.push('Box 5 must equal Box 3 minus Box 4.');
    return { valid: errors.length === 0, errors, expectedBox3, expectedBox5, boxes };
  }
}

function round(value: number) { return Math.round(value * 100) / 100; }
