import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | undefined;

function getPrisma() {
  if (!process.env.DATABASE_URL) return undefined;
  prisma ??= new PrismaClient();
  return prisma;
}

export class PersistenceService {
  status() {
    return {
      mode: getPrisma() ? 'postgres_enabled' : 'mock_no_database_url',
      databaseConfigured: Boolean(process.env.DATABASE_URL)
    };
  }

  async createAuditEvent(action: string, metadata: Record<string, unknown>, entityId?: string, actorId?: string) {
    const client = getPrisma();
    if (!client) return { persisted: false, action, metadata, reason: 'DATABASE_URL not configured' };
    return client.auditEvent.create({ data: { action, metadata, entityId, actorId } });
  }

  async createReportSnapshot(entityId: string, reportType: string, periodStart: string, periodEnd: string, payload: Record<string, unknown>) {
    const client = getPrisma();
    if (!client) return { persisted: false, reportType, payload, reason: 'DATABASE_URL not configured' };
    return client.reportSnapshot.create({ data: { entityId, reportType, periodStart: new Date(periodStart), periodEnd: new Date(periodEnd), payload } });
  }

  async createStatutoryDocument(entityId: string, documentType: string, payload: Record<string, unknown>, employeeId?: string, taxYear?: string) {
    const client = getPrisma();
    if (!client) return { persisted: false, documentType, payload, reason: 'DATABASE_URL not configured' };
    return client.statutoryDocument.create({ data: { entityId, employeeId, taxYear, documentType, documentData: payload } });
  }
}
