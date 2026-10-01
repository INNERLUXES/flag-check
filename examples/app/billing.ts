import { OpenFeature } from '@openfeature/server-sdk';

const client = OpenFeature.getClient();

export async function billingPage(tenant: string): Promise<string> {
  const useNewPage = await client.getBooleanValue('new-billing-page', false, { tenant });
  return useNewPage ? 'billing-v2' : 'billing-v1';
}

export async function exportFormat(tenant: string): Promise<string> {
  return client.getStringValue('report-export', 'csv', { tenant });
}
