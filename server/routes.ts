import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { telegramService } from "./services/telegram";
import { mtnMomoService } from "./services/mtn-momo";
import { reconciliationService } from "./services/reconciliation";
import rateLimit from "express-rate-limit";

// Rate limiting middleware
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many webhook requests' }
});

const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  message: { error: 'Too many authentication requests' }
});

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Apply rate limiting to auth routes
  app.use('/api/login', authLimiter);
  app.use('/api/register', authLimiter);

  // Health check
  app.get('/healthz', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        telegram: telegramService ? 'configured' : 'not configured',
        mtnMomo: process.env.MTN_CLIENT_ID ? 'configured' : 'not configured'
      }
    });
  });

  // Telegram webhook (with rate limiting)
  app.post(telegramService.getWebhookPath(), webhookLimiter, async (req, res) => {
    await telegramService.handleWebhook(req, res);
  });

  // MTN MoMo webhook
  app.post('/api/webhooks/mtn-callback', webhookLimiter, async (req, res) => {
    try {
      const signature = req.headers['x-mtn-signature'] as string;
      const payload = JSON.stringify(req.body);
      
      // Validate webhook signature if provided
      if (signature && !mtnMomoService.validateWebhookSignature(payload, signature)) {
        console.warn('Invalid MTN webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const webhookData = req.body;
      console.log('MTN MoMo webhook received:', webhookData);

      // Find payment by reference ID or external ID
      let payment;
      if (webhookData.referenceId) {
        payment = await storage.getAllPayments().then(payments => 
          payments.find(p => p.providerReference === webhookData.referenceId)
        );
      }

      if (!payment && webhookData.externalId) {
        payment = await storage.getAllPayments().then(payments => 
          payments.find(p => p.externalId === webhookData.externalId)
        );
      }

      if (!payment) {
        console.warn('Payment not found for webhook:', webhookData);
        return res.status(404).json({ error: 'Payment not found' });
      }

      // Update payment status based on webhook
      let newStatus: 'SUCCESS' | 'FAILED' | 'PENDING' = 'PENDING';
      let orderStatus: 'PAID' | 'CANCELLED' | 'PENDING' = 'PENDING';

      if (webhookData.status === 'SUCCESSFUL' || webhookData.status === 'SUCCESS') {
        newStatus = 'SUCCESS';
        orderStatus = 'PAID';
      } else if (webhookData.status === 'FAILED' || webhookData.status === 'REJECTED') {
        newStatus = 'FAILED';
        orderStatus = 'CANCELLED';
      }

      // Update payment
      await storage.updatePayment(payment.id, {
        status: newStatus,
        providerReference: webhookData.referenceId || payment.providerReference,
        webhookPayload: webhookData
      });

      // Update order
      await storage.updateOrder(payment.orderId, {
        status: orderStatus
      });

      console.log(`Payment ${payment.id} updated to ${newStatus}, order ${payment.orderId} updated to ${orderStatus}`);

      res.json({ success: true, message: 'Webhook processed' });
    } catch (error) {
      console.error('Error processing MTN webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Dashboard API routes (require authentication)
  app.get('/api/dashboard/metrics', requireAuth, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  });

  // Products API
  app.get('/api/products', requireAuth, async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  app.post('/api/products', requireAuth, async (req, res) => {
    try {
      const product = await storage.createProduct(req.body);
      res.status(201).json(product);
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  });

  app.put('/api/products/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const product = await storage.updateProduct(id, req.body);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json(product);
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  });

  app.delete('/api/products/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteProduct(id);
      if (!success) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  });

  // Categories API
  app.get('/api/categories', requireAuth, async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  app.post('/api/categories', requireAuth, async (req, res) => {
    try {
      const category = await storage.createCategory(req.body);
      res.status(201).json(category);
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({ error: 'Failed to create category' });
    }
  });

  // Orders API
  app.get('/api/orders', requireAuth, async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  app.put('/api/orders/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const order = await storage.updateOrder(id, req.body);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json(order);
    } catch (error) {
      console.error('Error updating order:', error);
      res.status(500).json({ error: 'Failed to update order' });
    }
  });

  // Payments API
  app.get('/api/payments', requireAuth, async (req, res) => {
    try {
      const payments = await storage.getAllPayments();
      res.json(payments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({ error: 'Failed to fetch payments' });
    }
  });

  // Users/Customers API
  app.get('/api/customers', requireAuth, async (req, res) => {
    try {
      const customers = await storage.getAllUsers();
      res.json(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  });

  // Coupons API
  app.get('/api/coupons', requireAuth, async (req, res) => {
    try {
      const coupons = await storage.getAllCoupons();
      res.json(coupons);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      res.status(500).json({ error: 'Failed to fetch coupons' });
    }
  });

  app.post('/api/coupons', requireAuth, async (req, res) => {
    try {
      const coupon = await storage.createCoupon(req.body);
      res.status(201).json(coupon);
    } catch (error) {
      console.error('Error creating coupon:', error);
      res.status(500).json({ error: 'Failed to create coupon' });
    }
  });

  app.delete('/api/coupons/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteCoupon(id);
      if (!success) {
        return res.status(404).json({ error: 'Coupon not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting coupon:', error);
      res.status(500).json({ error: 'Failed to delete coupon' });
    }
  });

  // Export Orders API
  app.get('/api/export/orders', requireAuth, async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      
      // Create CSV content
      const csvHeaders = 'Order Number,Customer Phone,Status,Amount (GHS),Date,Items\n';
      const csvRows = orders.map(order => {
        const date = new Date(order.createdAt).toLocaleDateString();
        const amount = parseFloat(order.totalGhs || "0").toFixed(2);
        return `"${order.orderNumber}","${order.customerPhone || 'N/A'}","${order.status}","₵${amount}","${date}",""`;
      }).join('\n');
      
      const csvContent = csvHeaders + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=orders-export.csv');
      res.send(csvContent);
    } catch (error) {
      console.error('Error exporting orders:', error);
      res.status(500).json({ error: 'Failed to export orders' });
    }
  });

  // Reconciliation API
  app.post('/api/reconciliation/force', requireAuth, async (req, res) => {
    try {
      const result = await reconciliationService.forceReconciliation();
      res.json(result);
    } catch (error) {
      console.error('Error forcing reconciliation:', error);
      res.status(500).json({ error: 'Failed to force reconciliation' });
    }
  });

  app.get('/api/reconciliation/status', requireAuth, async (req, res) => {
    try {
      const status = reconciliationService.getStatus();
      res.json(status);
    } catch (error) {
      console.error('Error getting reconciliation status:', error);
      res.status(500).json({ error: 'Failed to get reconciliation status' });
    }
  });

  // System Settings API
  app.get('/api/settings', requireAuth, async (req, res) => {
    try {
      const settings = await storage.getAllSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error fetching system settings:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.post('/api/settings', requireAuth, async (req, res) => {
    try {
      const { key, value, description } = req.body;
      const setting = await storage.setSystemSetting({ key, value, description });
      
      // If Telegram bot token was updated, refresh the service and webhook
      if (key === 'TELEGRAM_BOT_TOKEN') {
        console.log('Telegram bot token updated, refreshing service...');
        const { telegramService } = await import('./services/telegram');
        await telegramService.refreshBotToken();
        
        // Register webhook with deployment URL if available
        const deploymentUrl = process.env.REPLIT_DEPLOYMENT_URL;
        if (deploymentUrl && value) {
          console.log('Re-registering webhook with new bot token...');
          console.log('Webhook URL:', deploymentUrl);
          const webhookSet = await telegramService.setWebhook(deploymentUrl);
          console.log('Webhook registration result:', webhookSet);
          if (webhookSet) {
            console.log('✅ Telegram webhook successfully registered! Your bot is now active.');
          } else {
            console.log('❌ Failed to register webhook. Please check your bot token.');
          }
        } else {
          console.log('ℹ️  Webhook registration skipped: Deploy your app to production to enable webhooks.');
          console.log('💡 Your bot token has been saved and will automatically register when deployed.');
        }
      }

      // If MTN MoMo settings were updated, refresh the service
      if (key.startsWith('MTN_')) {
        console.log('MTN MoMo setting updated, refreshing service...');
        await mtnMomoService.refreshCredentials();
      }
      
      res.status(201).json(setting);
    } catch (error) {
      console.error('Error creating/updating system setting:', error);
      res.status(500).json({ error: 'Failed to save setting' });
    }
  });

  app.put('/api/settings/:key', requireAuth, async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      const setting = await storage.updateSystemSetting(key, value);
      if (!setting) {
        return res.status(404).json({ error: 'Setting not found' });
      }
      res.json(setting);
    } catch (error) {
      console.error('Error updating system setting:', error);
      res.status(500).json({ error: 'Failed to update setting' });
    }
  });

  // Start reconciliation service
  reconciliationService.start();

  const httpServer = createServer(app);
  return httpServer;
}
