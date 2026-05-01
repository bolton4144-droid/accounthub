type OcrProvider = 'aws_textract' | 'taggun' | 'manual_upload';

type ReceiptExtractionInput = {
  provider: OcrProvider;
  fileName: string;
  mimeType: string;
  extractedText?: string;
};

export class OcrService {
  extractionBlueprint(provider: OcrProvider) {
    return {
      provider,
      status: 'requires_provider_credentials',
      requiredSecrets: provider === 'aws_textract' ? ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'] : provider === 'taggun' ? ['TAGGUN_API_KEY'] : [],
      output: ['supplier', 'invoice_date', 'total', 'vat_total', 'currency', 'line_items'],
      storagePolicy: 'source_files_encrypted_and_linked_to_purchase_bill'
    };
  }

  parseReceipt(input: ReceiptExtractionInput) {
    return {
      provider: input.provider,
      fileName: input.fileName,
      mimeType: input.mimeType,
      status: input.extractedText ? 'text_received_ready_for_classification' : 'queued_for_ocr_worker',
      extracted: {
        supplier: null,
        invoiceDate: null,
        total: null,
        vatTotal: null,
        confidence: 0
      }
    };
  }
}
