import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';

interface MTNCollectionRequest {
  amount: string;
  currency: string;
  externalId: string;
  payer: {
    partyIdType: string;
    partyId: string;
  };
  payerMessage: string;
  payeeNote: string;
}

interface MTNCollectionResponse {
  referenceId: string;
  status: string;
  reason?: string;
}

interface MTNTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

class MTNMomoService {
  private clientId: string = '';
  private clientSecret: string = '';
  private apiBaseUrl: string = '';
  private env: string = '';
  private callbackSecret: string = '';
  private cachedToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor() {
    this.initializeCredentials();
  }

  private async initializeCredentials() {
    try {
      // Try to load from database first
      const userIdSetting = await storage.getSystemSetting('MTN_USER_ID');
      const primaryKeySetting = await storage.getSystemSetting('MTN_PRIMARY_KEY');
      const apiBaseUrlSetting = await storage.getSystemSetting('MTN_API_BASE_URL');
      const envSetting = await storage.getSystemSetting('MTN_ENV');
      const callbackSecretSetting = await storage.getSystemSetting('MTN_CALLBACK_SECRET');

      // Use User ID as clientId and Primary Key as clientSecret
      this.clientId = userIdSetting?.value || process.env.MTN_COLLECTION_USER_ID || '';
      this.clientSecret = primaryKeySetting?.value || process.env.MTN_COLLECTION_API_KEY || '';
      this.apiBaseUrl = apiBaseUrlSetting?.value || process.env.MTN_API_BASE_URL || 'https://sandbox.momodeveloper.mtn.com';
      this.env = envSetting?.value || process.env.MTN_ENV || 'sandbox';
      this.callbackSecret = callbackSecretSetting?.value || process.env.MTN_CALLBACK_SECRET || 'default-webhook-secret';
    } catch (error) {
      console.warn('Could not load MTN MoMo settings from database, using environment variables:', error);
      
      this.clientId = process.env.MTN_COLLECTION_USER_ID || '';
      this.clientSecret = process.env.MTN_COLLECTION_API_KEY || '';
      this.apiBaseUrl = process.env.MTN_API_BASE_URL || 'https://sandbox.momodeveloper.mtn.com';
      this.env = process.env.MTN_ENV || 'sandbox';
      this.callbackSecret = process.env.MTN_CALLBACK_SECRET || 'default-webhook-secret';
    }

    if (!this.clientId || !this.clientSecret) {
      console.warn('MTN MoMo credentials not configured. Payment functionality will be limited.');
    }
  }

  async refreshCredentials() {
    console.log('Refreshing MTN MoMo credentials from database...');
    await this.initializeCredentials();
    // Clear cached token to force re-authentication
    this.cachedToken = null;
    this.tokenExpiry = null;
    console.log('MTN MoMo credentials refreshed successfully');
  }

  private async getAuthToken(): Promise<string> {
    // Return cached token if still valid
    if (this.cachedToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.cachedToken;
    }

    try {
      // Get subscription key from settings
      const subscriptionKeySetting = await storage.getSystemSetting('MTN_SUBSCRIPTION_KEY');
      const subscriptionKey = subscriptionKeySetting?.value || process.env.MTN_SUBSCRIPTION_KEY || '';
      
      if (!subscriptionKey) {
        throw new Error('MTN subscription key not configured');
      }
      
      if (!this.clientId || !this.clientSecret) {
        console.error('MTN credentials debug:', {
          clientId: this.clientId ? 'SET' : 'MISSING',
          clientSecret: this.clientSecret ? 'SET' : 'MISSING',
          subscriptionKey: subscriptionKey ? 'SET' : 'MISSING'
        });
        throw new Error('MTN User ID and Primary Key are required for authentication');
      }
      
      console.log('MTN Auth attempt with credentials:', {
        clientId: this.clientId?.substring(0, 8) + '...',
        hasSecret: !!this.clientSecret,
        hasSubscriptionKey: !!subscriptionKey
      });

      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await fetch(`${this.apiBaseUrl}/collection/token/`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': subscriptionKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('MTN Token Request Failed:', response.status, errorText);
        throw new Error(`Failed to get MTN token: ${response.statusText} - ${errorText}`);
      }

      const tokenData: MTNTokenResponse = await response.json();
      
      // Cache token with expiry
      this.cachedToken = tokenData.access_token;
      this.tokenExpiry = new Date(Date.now() + (tokenData.expires_in - 300) * 1000); // Refresh 5 minutes early
      
      return this.cachedToken;
    } catch (error) {
      console.error('Error getting MTN auth token:', error);
      throw error;
    }
  }

  async initiateCollection(
    amount: string,
    customerPhone: string,
    externalId: string,
    description: string = 'EcomBot Purchase'
  ): Promise<{ referenceId: string; success: boolean; error?: string }> {
    try {
      const token = await this.getAuthToken();
      const referenceId = uuidv4();
      
      // Validate phone number format (Ghana: +233XXXXXXXXX or 0XXXXXXXXX)
      const phoneRegex = /^(?:\+233|0)\d{9}$/;
      if (!phoneRegex.test(customerPhone)) {
        throw new Error('Invalid phone number format. Use +233XXXXXXXXX or 0XXXXXXXXX');
      }

      // Normalize phone number to international format
      let normalizedPhone = customerPhone;
      if (customerPhone.startsWith('0')) {
        normalizedPhone = '+233' + customerPhone.substring(1);
      }

      const requestData: MTNCollectionRequest = {
        amount,
        currency: 'EUR', // MTN sandbox uses EUR, production would use GHS
        externalId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: normalizedPhone
        },
        payerMessage: `Payment for ${description}`,
        payeeNote: `EcomBot order payment - ${externalId}`
      };

      const response = await fetch(`${this.apiBaseUrl}/collection/v1_0/requesttopay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Reference-Id': referenceId,
          'X-Target-Environment': this.env,
          'Ocp-Apim-Subscription-Key': (await storage.getSystemSetting('MTN_SUBSCRIPTION_KEY'))?.value || process.env.MTN_SUBSCRIPTION_KEY || ''
        },
        body: JSON.stringify(requestData)
      });

      if (response.status === 202) {
        return { referenceId, success: true };
      } else {
        const errorText = await response.text();
        console.error('MTN Collection Request Failed:', response.status, errorText);
        return { 
          referenceId, 
          success: false, 
          error: `Payment request failed: ${response.statusText}` 
        };
      }
    } catch (error) {
      console.error('Error initiating MTN collection:', error);
      return { 
        referenceId: '', 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async checkPaymentStatus(referenceId: string): Promise<{
    status: string;
    reason?: string;
    financialTransactionId?: string;
  }> {
    try {
      const token = await this.getAuthToken();
      
      const response = await fetch(`${this.apiBaseUrl}/collection/v1_0/requesttopay/${referenceId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Target-Environment': this.env,
          'Ocp-Apim-Subscription-Key': (await storage.getSystemSetting('MTN_SUBSCRIPTION_KEY'))?.value || process.env.MTN_SUBSCRIPTION_KEY || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          status: data.status,
          reason: data.reason,
          financialTransactionId: data.financialTransactionId
        };
      } else {
        throw new Error(`Failed to check payment status: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      return { status: 'FAILED', reason: 'Status check failed' };
    }
  }

  validateWebhookSignature(payload: string, signature: string): boolean {
    if (!signature || !this.callbackSecret) {
      console.warn('Missing webhook signature or secret');
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.callbackSecret)
        .update(payload)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('Error validating webhook signature:', error);
      return false;
    }
  }

  generateIdempotencyKey(orderId: string): string {
    return `order:${orderId}:${uuidv4()}`;
  }

  formatPhoneNumber(phone: string): string {
    // Validate and format Ghana phone numbers
    const phoneRegex = /^(?:\+233|0)(\d{9})$/;
    const match = phone.match(phoneRegex);
    
    if (!match) {
      throw new Error('Invalid Ghana phone number format');
    }
    
    return `+233${match[1]}`;
  }

  getPaymentTimeoutMinutes(): number {
    return parseInt(process.env.RECONCILE_TIMEOUT_MINUTES || '10');
  }

  getWebhookCallbackUrl(): string {
    const domains = process.env.REPLIT_DOMAINS?.split(',') || ['localhost:5000'];
    const domain = domains[0];
    return `https://${domain}/api/webhooks/mtn-callback`;
  }
}

export const mtnMomoService = new MTNMomoService();
