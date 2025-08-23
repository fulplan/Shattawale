import cron from 'node-cron';
import { storage } from '../storage';
import { mtnMomoService } from './mtn-momo';

class ReconciliationService {
  private isRunning = false;
  private cronExpression: string;

  constructor() {
    this.cronExpression = process.env.RECONCILE_CRON || '*/15 * * * *'; // Every 15 minutes
  }

  start() {
    console.log(`Starting reconciliation service with schedule: ${this.cronExpression}`);
    
    cron.schedule(this.cronExpression, async () => {
      if (this.isRunning) {
        console.log('Reconciliation already running, skipping...');
        return;
      }

      await this.runReconciliation();
    });

    // Run once on startup
    setTimeout(() => this.runReconciliation(), 5000);
  }

  async runReconciliation() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log('Starting payment reconciliation...');
      
      const pendingPayments = await storage.getPendingPayments();
      const timeoutMinutes = mtnMomoService.getPaymentTimeoutMinutes();
      const timeoutMs = timeoutMinutes * 60 * 1000;
      
      let processed = 0;
      let updated = 0;
      let timedOut = 0;

      for (const payment of pendingPayments) {
        processed++;
        
        try {
          // Check if payment has timed out
          const paymentAge = Date.now() - payment.createdAt.getTime();
          if (paymentAge > timeoutMs) {
            await storage.updatePayment(payment.id, {
              status: 'TIMEOUT'
            });
            
            // Update order status
            await storage.updateOrder(payment.orderId, {
              status: 'CANCELLED'
            });
            
            timedOut++;
            console.log(`Payment ${payment.id} timed out after ${Math.round(paymentAge / 60000)} minutes`);
            continue;
          }

          // Check payment status with MTN
          if (payment.providerReference) {
            const statusResult = await mtnMomoService.checkPaymentStatus(payment.providerReference);
            
            if (statusResult.status === 'SUCCESSFUL') {
              await storage.updatePayment(payment.id, {
                status: 'SUCCESS',
                webhookPayload: { 
                  reconciliation: true,
                  mtnStatus: statusResult,
                  timestamp: new Date().toISOString()
                }
              });

              // Update order status
              await storage.updateOrder(payment.orderId, {
                status: 'PAID'
              });

              updated++;
              console.log(`Payment ${payment.id} reconciled as successful`);
              
            } else if (statusResult.status === 'FAILED') {
              await storage.updatePayment(payment.id, {
                status: 'FAILED',
                webhookPayload: { 
                  reconciliation: true,
                  mtnStatus: statusResult,
                  timestamp: new Date().toISOString()
                }
              });

              // Update order status
              await storage.updateOrder(payment.orderId, {
                status: 'CANCELLED'
              });

              updated++;
              console.log(`Payment ${payment.id} reconciled as failed: ${statusResult.reason}`);
            }
            // If status is still PENDING, leave it as is for next reconciliation
          }
        } catch (error) {
          console.error(`Error reconciling payment ${payment.id}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`Reconciliation completed in ${duration}ms: ${processed} processed, ${updated} updated, ${timedOut} timed out`);
      
    } catch (error) {
      console.error('Error during reconciliation:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async forceReconciliation(): Promise<{ success: boolean; message: string }> {
    if (this.isRunning) {
      return { success: false, message: 'Reconciliation is already running' };
    }

    try {
      await this.runReconciliation();
      return { success: true, message: 'Reconciliation completed successfully' };
    } catch (error) {
      console.error('Force reconciliation error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      schedule: this.cronExpression,
      lastRun: new Date().toISOString(), // In a real app, store this in database
      nextRun: this.getNextRunTime()
    };
  }

  private getNextRunTime(): string {
    // Calculate next run time based on cron expression
    // This is a simplified calculation - in production, use a proper cron parser
    const now = new Date();
    const next = new Date(now.getTime() + 15 * 60 * 1000); // Assume 15 minute intervals
    return next.toISOString();
  }
}

export const reconciliationService = new ReconciliationService();
