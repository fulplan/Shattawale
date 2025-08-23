import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { mtnMomoService } from '../server/services/mtn-momo';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('MTN MoMo Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initiate collection request', async () => {
    const mockToken = 'mock-access-token';
    const mockReferenceId = '550e8400-e29b-41d4-a716-446655440000';

    // Mock token request
    (fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: mockToken,
          token_type: 'Bearer',
          expires_in: 3600
        })
      } as Response);

    // Mock collection request
    (fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        status: 202,
        statusText: 'Accepted'
      } as Response);

    const result = await mtnMomoService.initiateCollection(
      '125.50',
      '+233244123456',
      'order:12345:uuid',
      'Test payment'
    );

    expect(result.success).toBe(true);
    expect(result.referenceId).toBeDefined();
  });

  test('should validate Ghana phone numbers', () => {
    expect(() => mtnMomoService.formatPhoneNumber('+233244123456')).not.toThrow();
    expect(() => mtnMomoService.formatPhoneNumber('0244123456')).not.toThrow();
    expect(mtnMomoService.formatPhoneNumber('0244123456')).toBe('+233244123456');
    
    expect(() => mtnMomoService.formatPhoneNumber('1234567890')).toThrow();
    expect(() => mtnMomoService.formatPhoneNumber('+1234567890')).toThrow();
  });

  test('should validate webhook signatures', () => {
    const payload = '{"test": "data"}';
    const secret = 'webhook-secret';
    
    // Create valid signature
    const crypto = require('crypto');
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    
    const isValid = mtnMomoService.validateWebhookSignature(payload, signature);
    expect(isValid).toBe(true);
    
    const isInvalid = mtnMomoService.validateWebhookSignature(payload, 'invalid-signature');
    expect(isInvalid).toBe(false);
  });

  test('should generate idempotency keys', () => {
    const key1 = mtnMomoService.generateIdempotencyKey('order123');
    const key2 = mtnMomoService.generateIdempotencyKey('order123');
    
    expect(key1).toMatch(/^order:order123:[0-9a-f-]{36}$/);
    expect(key2).toMatch(/^order:order123:[0-9a-f-]{36}$/);
    expect(key1).not.toBe(key2); // Should be unique
  });

  test('should check payment status', async () => {
    const mockToken = 'mock-access-token';
    const referenceId = '550e8400-e29b-41d4-a716-446655440000';

    // Mock token request
    (fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: mockToken,
          token_type: 'Bearer',
          expires_in: 3600
        })
      } as Response);

    // Mock status check
    (fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'SUCCESSFUL',
          financialTransactionId: '1234567890'
        })
      } as Response);

    const result = await mtnMomoService.checkPaymentStatus(referenceId);
    
    expect(result.status).toBe('SUCCESSFUL');
    expect(result.financialTransactionId).toBe('1234567890');
  });
});
