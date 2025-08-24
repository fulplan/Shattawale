import { Request, Response } from 'express';
import { storage } from '../storage';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: {
    id: number;
    type: string;
  };
  text?: string;
  date: number;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: any;
}

interface CheckoutSession {
  step: 'address' | 'phone' | 'complete';
  deliveryAddress?: string;
  phoneNumber?: string;
  userId: string;
}

class TelegramService {
  private botToken: string = '';
  private webhookPath: string;
  private checkoutSessions: Map<number, CheckoutSession> = new Map();

  constructor() {
    this.initializeBotToken();
    this.webhookPath = process.env.TELEGRAM_WEBHOOK_SECRET_PATH || '/webhook/telegram/secret';
  }

  private async initializeBotToken() {
    // First try to get from database
    try {
      const setting = await storage.getSystemSetting('TELEGRAM_BOT_TOKEN');
      if (setting && setting.value) {
        this.botToken = setting.value;
        return;
      }
    } catch (error) {
      console.warn('Could not load Telegram bot token from database:', error);
    }

    // Fallback to environment variable
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    
    if (!this.botToken) {
      console.warn('TELEGRAM_BOT_TOKEN not configured. Bot functionality will be limited.');
    }
  }

  async getBotToken(): Promise<string> {
    if (!this.botToken) {
      await this.initializeBotToken();
    }
    return this.botToken;
  }

  async sendMessage(chatId: number, text: string, options: any = {}) {
    const botToken = await this.getBotToken();
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          ...options,
        }),
      });

      const responseText = await response.text();
      if (!response.ok) {
        console.error('Failed to send Telegram message:', responseText);
        return { ok: false, error: responseText };
      }

      return JSON.parse(responseText);
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      throw error;
    }
  }

  async sendPhoto(chatId: number, photo: string, caption?: string, options: any = {}) {
    const botToken = await this.getBotToken();
    const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          photo,
          caption,
          ...options,
        }),
      });

      const responseText = await response.text();
      if (!response.ok) {
        console.error('Failed to send Telegram photo:', responseText);
        return { ok: false, error: responseText };
      }

      return JSON.parse(responseText);
    } catch (error) {
      console.error('Error sending Telegram photo:', error);
      throw error;
    }
  }

  async handleWebhook(req: Request, res: Response) {
    try {
      const update: TelegramUpdate = req.body;
      
      if (update.message) {
        await this.handleMessage(update.message);
      } else if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('Error handling Telegram webhook:', error);
      res.sendStatus(500);
    }
  }

  private async handleMessage(message: TelegramMessage) {
    const chatId = message.chat.id;
    const text = message.text || '';
    const user = message.from;

    // Register or update user
    let dbUser = await storage.getUserByTelegramId(user.id.toString());
    if (!dbUser) {
      dbUser = await storage.createUser({
        telegramId: user.id.toString(),
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
      });
    }

    if (text.startsWith('/start')) {
      await this.handleStartCommand(chatId, dbUser);
    } else if (text.startsWith('/menu')) {
      await this.showMainMenu(chatId);
    } else if (text.startsWith('/browse')) {
      await this.showCategories(chatId);
    } else if (text.startsWith('/cart')) {
      await this.showCart(chatId, dbUser.id);
    } else if (text.startsWith('/orders')) {
      await this.showOrders(chatId, dbUser.id);
    } else if (text.startsWith('/support')) {
      await this.showSupport(chatId);
    } else {
      await this.handleTextMessage(chatId, text, dbUser);
    }
  }

  private async handleCallbackQuery(callbackQuery: any) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const messageId = callbackQuery.message.message_id;

    // Answer callback query to remove loading state
    const botToken = await this.getBotToken();
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQuery.id }),
    });

    if (data.startsWith('category_')) {
      const categoryId = data.replace('category_', '');
      await this.showProductsInCategory(chatId, categoryId);
    } else if (data.startsWith('product_')) {
      const productId = data.replace('product_', '');
      await this.showProductDetails(chatId, productId);
    } else if (data.startsWith('add_to_cart_')) {
      const productId = data.replace('add_to_cart_', '');
      await this.addToCart(chatId, productId);
    } else if (data.startsWith('checkout')) {
      await this.startCheckout(chatId, callbackQuery.from.id.toString());
    } else if (data === 'browse_categories') {
      await this.showCategories(chatId);
    } else if (data === 'main_menu') {
      // Get user from database
      const dbUser = await storage.getUserByTelegramId(callbackQuery.from.id.toString());
      if (dbUser) {
        await this.handleStartCommand(chatId, dbUser);
      }
    } else if (data.startsWith('order_status_')) {
      const orderId = data.replace('order_status_', '');
      await this.showOrderDetails(chatId, orderId);
    }
  }

  private async handleStartCommand(chatId: number, user: any) {
    const welcomeMessage = `
🛍️ *Welcome to EcomBot!*

Hi ${user.firstName || 'there'}! I'm your personal shopping assistant. 

Here's what you can do:
• 📱 Browse products by category
• 🔍 Search for specific items  
• 🛒 Add items to your cart
• 💳 Pay securely with MTN Mobile Money
• 📦 Track your orders

Let's get started! Use the menu below or type /menu anytime.
    `;

    await this.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        keyboard: [
          [{ text: '📱 Browse Products' }, { text: '🛒 My Cart' }],
          [{ text: '📦 My Orders' }, { text: '🔍 Search' }],
          [{ text: '💬 Support' }, { text: '👤 Profile' }]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
      }
    });
  }

  private async showMainMenu(chatId: number) {
    const menuMessage = `
🏠 *Main Menu*

Choose an option below:
    `;

    await this.sendMessage(chatId, menuMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📱 Browse Categories', callback_data: 'browse_categories' },
            { text: '🔍 Search Products', callback_data: 'search_products' }
          ],
          [
            { text: '🛒 View Cart', callback_data: 'view_cart' },
            { text: '📦 My Orders', callback_data: 'my_orders' }
          ],
          [
            { text: '💬 Contact Support', callback_data: 'support' },
            { text: '👤 My Profile', callback_data: 'profile' }
          ]
        ]
      }
    });
  }

  private async showCategories(chatId: number) {
    const categories = await storage.getAllCategories();
    
    if (categories.length === 0) {
      await this.sendMessage(chatId, '📱 No categories available at the moment. Please check back later!');
      return;
    }

    const inlineKeyboard = categories.map(category => ([
      { text: category.name, callback_data: `category_${category.id}` }
    ]));

    await this.sendMessage(chatId, '📱 *Product Categories*\n\nChoose a category to browse:', {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: inlineKeyboard }
    });
  }

  private async showProductsInCategory(chatId: number, categoryId: string) {
    const products = await storage.getProductsByCategoryId(categoryId);
    
    if (products.length === 0) {
      await this.sendMessage(chatId, '📱 No products available in this category.');
      return;
    }

    for (const product of products.slice(0, 10)) { // Show first 10 products
      const message = `
🛍️ *${product.title}*

💰 Price: ₵${product.priceGhs}
📦 Stock: ${product.stock} available
📋 SKU: ${product.sku}

${product.description || 'No description available'}
      `;

      const keyboard = [
        [{ text: '🛒 Add to Cart', callback_data: `add_to_cart_${product.id}` }],
        [{ text: '📱 View Details', callback_data: `product_${product.id}` }]
      ];

      if (product.images && product.images.length > 0) {
        await this.sendPhoto(chatId, product.images[0], message, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        });
      } else {
        await this.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        });
      }
    }
  }

  private async showProductDetails(chatId: number, productId: string) {
    const product = await storage.getProduct(productId);
    
    if (!product) {
      await this.sendMessage(chatId, '❌ Product not found.');
      return;
    }

    const message = `
🛍️ *${product.title}*

💰 *Price:* ₵${product.priceGhs}
📦 *Stock:* ${product.stock} available
📋 *SKU:* ${product.sku}

📝 *Description:*
${product.description || 'No description available'}

${product.tags && product.tags.length > 0 ? `🏷️ *Tags:* ${product.tags.join(', ')}` : ''}
    `;

    const keyboard = [
      [{ text: '🛒 Add to Cart', callback_data: `add_to_cart_${product.id}` }],
      [{ text: '🔙 Back to Categories', callback_data: 'browse_categories' }]
    ];

    if (product.images && product.images.length > 0) {
      await this.sendPhoto(chatId, product.images[0], message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
    } else {
      await this.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
    }
  }

  private async addToCart(chatId: number, productId: string) {
    // In a real implementation, you'd store cart items in a session or database
    // For now, we'll just show a success message
    const product = await storage.getProduct(productId);
    
    if (!product || product.stock <= 0) {
      await this.sendMessage(chatId, '❌ Sorry, this product is not available.');
      return;
    }

    await this.sendMessage(chatId, `✅ *${product.title}* added to your cart!\n\n💰 Price: ₵${product.priceGhs}`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🛒 View Cart', callback_data: 'view_cart' },
            { text: '💳 Checkout', callback_data: 'checkout' }
          ],
          [{ text: '🔙 Continue Shopping', callback_data: 'browse_categories' }]
        ]
      }
    });
  }

  private async showCart(chatId: number, userId: string) {
    // Placeholder for cart functionality
    await this.sendMessage(chatId, '🛒 *Your Cart*\n\nYour cart is currently empty.\nUse /browse to start shopping!', {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 Browse Products', callback_data: 'browse_categories' }]
        ]
      }
    });
  }

  private async showOrders(chatId: number, userId: string) {
    const orders = await storage.getOrdersByUserId(userId);
    
    if (orders.length === 0) {
      await this.sendMessage(chatId, '📦 *Your Orders*\n\nYou haven\'t placed any orders yet.\nStart shopping to see your orders here!', {
        parse_mode: 'Markdown'
      });
      return;
    }

    let ordersText = '📦 *Your Recent Orders*\n\n';
    
    for (const order of orders.slice(0, 5)) {
      ordersText += `🆔 Order: ${order.orderNumber}\n`;
      ordersText += `💰 Total: ₵${order.totalGhs}\n`;
      ordersText += `📊 Status: ${order.status}\n`;
      ordersText += `📅 Date: ${order.createdAt.toLocaleDateString()}\n\n`;
    }

    await this.sendMessage(chatId, ordersText, { parse_mode: 'Markdown' });
  }

  private async showSupport(chatId: number) {
    const supportMessage = `
💬 *Customer Support*

Need help? Our support team is here for you!

📧 *Email:* support@ecombot.gh
📱 *Phone:* +233 XXX XXX XXX
⏰ *Hours:* Mon-Fri, 9AM-6PM GMT

*Common Questions:*
• How to pay with MTN MoMo?
• Order status and tracking
• Product returns and refunds
• Account management

Type your question below or contact us directly!
    `;

    await this.sendMessage(chatId, supportMessage, { parse_mode: 'Markdown' });
  }

  private async startCheckout(chatId: number, userId?: string) {
    if (!userId) {
      await this.sendMessage(chatId, '❌ Unable to start checkout. Please try again.');
      return;
    }

    // Initialize checkout session
    this.checkoutSessions.set(chatId, {
      step: 'address',
      userId
    });

    const message = `📍 *Delivery Address Required*

Before we process your payment, please provide your complete delivery address.

📝 *Please include:*
• House number and street name
• Area/Neighborhood
• City
• Region
• Any special delivery instructions

💰 *Order Total:* ₵25.00 (example)

Please type your full delivery address:`;

    await this.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        force_reply: true,
        input_field_placeholder: 'Enter your complete delivery address...'
      }
    });

    console.log('Checkout initiated for user:', userId);
  }

  private async handleCheckoutStep(chatId: number, text: string, session: CheckoutSession, user: any) {
    switch (session.step) {
      case 'address':
        await this.handleAddressInput(chatId, text, session);
        break;
      case 'phone':
        await this.handlePhoneInput(chatId, text, session, user);
        break;
      default:
        // Reset session if in unknown state
        this.checkoutSessions.delete(chatId);
        await this.sendMessage(chatId, '❌ Something went wrong. Please start checkout again.');
    }
  }

  private async handleAddressInput(chatId: number, address: string, session: CheckoutSession) {
    if (address.length < 10) {
      await this.sendMessage(chatId, '⚠️ *Address Too Short*\n\nPlease provide a more complete address with street, area, and city.', {
        parse_mode: 'Markdown',
        reply_markup: {
          force_reply: true,
          input_field_placeholder: 'Enter your complete delivery address...'
        }
      });
      return;
    }

    // Save address and move to phone step
    session.deliveryAddress = address;
    session.step = 'phone';
    this.checkoutSessions.set(chatId, session);

    const message = `✅ *Address Confirmed*\n\n📍 *Delivery Address:*\n${address}\n\n📱 *Phone Number Required*\n\nNow please provide your MTN Mobile Money number for payment.\n\n*Supported formats:*\n• +233XXXXXXXXX (e.g., +233244123456)\n• 0XXXXXXXXX (e.g., 0244123456)\n\nPlease reply with your phone number:`;

    await this.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        force_reply: true,
        input_field_placeholder: 'Enter your MTN MoMo number (e.g., 0244123456)'
      }
    });
  }

  private async handlePhoneInput(chatId: number, phone: string, session: CheckoutSession, user: any) {
    const phoneRegex = /^(?:\+233|0)\d{9}$/;
    if (!phoneRegex.test(phone)) {
      await this.sendMessage(chatId, '⚠️ *Invalid Phone Number*\n\nPlease enter a valid Ghana phone number.\n\n*Examples:*\n• +233244123456\n• 0244123456', {
        parse_mode: 'Markdown',
        reply_markup: {
          force_reply: true,
          input_field_placeholder: 'Enter your MTN MoMo number (e.g., 0244123456)'
        }
      });
      return;
    }

    // Save phone and complete checkout
    session.phoneNumber = phone;
    session.step = 'complete';
    
    // Process payment with collected information
    await this.processPaymentWithAddress(chatId, phone, session.deliveryAddress!, user);
    
    // Clear session
    this.checkoutSessions.delete(chatId);
  }

  private async processPaymentWithAddress(chatId: number, phoneNumber: string, deliveryAddress: string, user: any) {
    try {
      // Import MTN MoMo service
      const { mtnMomoService } = await import('./mtn-momo');
      
      // Payment details (demo values)
      const amount = '25.00';
      const description = 'EcomBot Purchase';
      const externalId = `ecom_${Date.now()}_${chatId}`;
      
      // Initiate MTN MoMo collection
      const collectionResult = await mtnMomoService.initiateCollection(
        amount,
        phoneNumber,
        externalId,
        description
      );

      if (collectionResult.success) {
        // Parse delivery address into components
        const addressComponents = this.parseAddress(deliveryAddress);
        
        // Create order with delivery address
        const order = await storage.createOrder({
          userId: user.id,
          customerPhone: phoneNumber,
          totalGhs: amount,
          status: 'PENDING' as const,
          address: addressComponents,
          notes: `Delivery Address: ${deliveryAddress}` // Store address in notes for now
        });

        const payment = await storage.createPayment({
          orderId: order.id,
          provider: 'mtn_momo',
          amountGhs: amount,
          currency: 'GHS',
          status: 'PENDING' as const,
          providerReference: collectionResult.referenceId,
          externalId,
          customerPhone: phoneNumber,
          idempotencyKey: `payment_${externalId}`
        });

        // Success message with payment instructions
        const successMessage = `✅ *Payment Request Sent!*

📱 *Next Steps:*
1. Check your phone (${phoneNumber}) for MTN MoMo prompt
2. Enter your MTN MoMo PIN to complete payment
3. You'll receive confirmation once payment is successful

💰 *Payment Details:*
• Amount: ₵${amount}
• Reference: ${externalId}
• Order ID: ${order.id.substring(0, 8)}

📍 *Delivery Address:*
${deliveryAddress}

⏰ *Important:* This payment request expires in 10 minutes.`;

        await this.sendMessage(chatId, successMessage, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📦 Check Order Status', callback_data: `order_status_${order.id}` }],
              [{ text: '🏠 Back to Main Menu', callback_data: 'main_menu' }]
            ]
          }
        });

      } else {
        // Payment initiation failed
        await this.sendMessage(chatId, `❌ *Payment Request Failed*\n\n${collectionResult.error || 'Unable to process payment at this time.'}\n\nPlease try again or contact support if the problem persists.`, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Try Again', callback_data: 'checkout' }],
              [{ text: '💬 Contact Support', callback_data: 'support' }]
            ]
          }
        });
      }

    } catch (error) {
      console.error('Error processing payment with address:', error);
      await this.sendMessage(chatId, '❌ *Error Processing Payment*\n\nSomething went wrong. Please try again or contact support.', {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Try Again', callback_data: 'checkout' }],
            [{ text: '💬 Contact Support', callback_data: 'support' }]
          ]
        }
      });
    }
  }

  private parseAddress(fullAddress: string): Record<string, any> {
    // Simple address parsing - can be enhanced with more sophisticated logic
    const lines = fullAddress.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    return {
      fullAddress: fullAddress,
      street: lines[0] || '',
      area: lines.length > 1 ? lines[1] : '',
      city: lines.length > 2 ? lines[2] : 'Accra',
      region: lines.length > 3 ? lines[3] : 'Greater Accra',
      country: 'Ghana'
    };
  }

  private async handleTextMessage(chatId: number, text: string, user: any) {
    // Check if user is in checkout flow
    const checkoutSession = this.checkoutSessions.get(chatId);
    if (checkoutSession) {
      await this.handleCheckoutStep(chatId, text.trim(), checkoutSession, user);
      return;
    }
    
    // Check if this looks like a phone number for payment processing (legacy support)
    const phoneRegex = /^(?:\+233|0)\d{9}$/;
    if (phoneRegex.test(text.trim())) {
      await this.processPayment(chatId, text.trim(), user);
      return;
    }
    
    if (text.includes('browse') || text.includes('📱')) {
      await this.showCategories(chatId);
    } else if (text.includes('cart') || text.includes('🛒')) {
      await this.showCart(chatId, user.id);
    } else if (text.includes('orders') || text.includes('📦')) {
      await this.showOrders(chatId, user.id);
    } else if (text.includes('support') || text.includes('💬')) {
      await this.showSupport(chatId);
    } else if (text.includes('search') || text.includes('🔍')) {
      await this.sendMessage(chatId, '🔍 *Search Products*\n\nSearch functionality coming soon!\nFor now, use /browse to explore our categories.', {
        parse_mode: 'Markdown'
      });
    } else {
      // Try to search for products
      const searchResults = await storage.searchProducts(text);
      
      if (searchResults.length > 0) {
        await this.sendMessage(chatId, `🔍 Found ${searchResults.length} product(s) for "${text}":`);
        await this.showSearchResults(chatId, searchResults);
      } else {
        await this.sendMessage(chatId, `❌ No products found for "${text}".\n\nTry browsing our categories instead!`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📱 Browse Categories', callback_data: 'browse_categories' }]
            ]
          }
        });
      }
    }
  }

  private async showSearchResults(chatId: number, products: any[]) {
    for (const product of products.slice(0, 5)) {
      const message = `
🛍️ *${product.title}*
💰 ₵${product.priceGhs} | 📦 ${product.stock} in stock
      `;

      await this.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📱 View Details', callback_data: `product_${product.id}` }]
          ]
        }
      });
    }
  }

  async setWebhook(webhookUrl: string) {
    const botToken = await this.getBotToken();
    if (!botToken) {
      console.error('Cannot set webhook: No bot token configured');
      return false;
    }
    
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/setWebhook`;
    const fullWebhookUrl = webhookUrl + this.webhookPath;
    
    try {
      console.log(`🔗 Setting webhook URL: ${fullWebhookUrl}`);
      
      const response = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: fullWebhookUrl,
          allowed_updates: ['message', 'callback_query', 'inline_query'],
          drop_pending_updates: true, // Clear any pending updates
          secret_token: process.env.TELEGRAM_WEBHOOK_SECRET || undefined
        }),
      });

      const result = await response.json();
      console.log('Telegram API response:', result);
      
      if (result.ok) {
        console.log(`✅ Webhook successfully set to: ${fullWebhookUrl}`);
      } else {
        console.error(`❌ Failed to set webhook: ${result.description || 'Unknown error'}`);
      }
      
      return result.ok;
    } catch (error) {
      console.error('Error setting webhook:', error);
      return false;
    }
  }

  async refreshBotToken() {
    console.log('Refreshing bot token from database...');
    this.botToken = ''; // Clear current token
    await this.initializeBotToken();
    console.log('Bot token refreshed successfully');
  }

  getWebhookPath() {
    return this.webhookPath;
  }

  private async showOrderDetails(chatId: number, orderId: string) {
    try {
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        await this.sendMessage(chatId, '❌ Order not found.');
        return;
      }

      const orderMessage = `📦 *Order Details*

🆔 *Order ID:* ${order.id.substring(0, 8)}
📋 *Order Number:* ${order.orderNumber}
💰 *Total:* ₵${order.totalGhs}
📊 *Status:* ${order.status}
📱 *Phone:* ${order.customerPhone || 'N/A'}
📅 *Date:* ${order.createdAt.toLocaleDateString()}

${order.notes ? `📝 *Notes:* ${order.notes}\n\n` : ''}📍 *Delivery Address:*
${order.address ? Object.values(order.address).join(', ') : 'Not provided'}`;

      await this.sendMessage(chatId, orderMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📦 My Orders', callback_data: 'my_orders' }],
            [{ text: '🏠 Main Menu', callback_data: 'main_menu' }]
          ]
        }
      });
    } catch (error) {
      console.error('Error showing order details:', error);
      await this.sendMessage(chatId, '❌ Unable to load order details. Please try again.');
    }
  }

  private async processPayment(chatId: number, phoneNumber: string, user: any) {
    try {
      // Validate phone number format
      const phoneRegex = /^(?:\+233|0)\d{9}$/;
      if (!phoneRegex.test(phoneNumber)) {
        await this.sendMessage(chatId, '❌ *Invalid Phone Number Format*\n\nPlease use one of these formats:\n• +233XXXXXXXXX (e.g., +233244123456)\n• 0XXXXXXXXX (e.g., 0244123456)\n\nTry again:', {
          parse_mode: 'Markdown'
        });
        return;
      }

      // Show processing message
      await this.sendMessage(chatId, '⏳ *Processing Payment Request...*\n\nSetting up your MTN Mobile Money payment...', {
        parse_mode: 'Markdown'
      });

      // Import MTN MoMo service
      const { mtnMomoService } = await import('./mtn-momo');
      
      // Payment details (demo values)
      const amount = '25.00';
      const description = 'EcomBot Purchase';
      const externalId = `ecom_${Date.now()}_${chatId}`;
      
      // Initiate MTN MoMo collection
      const collectionResult = await mtnMomoService.initiateCollection(
        amount,
        phoneNumber,
        externalId,
        description
      );

      if (collectionResult.success) {
        // Create order and payment records
        const order = await storage.createOrder({
          userId: user.id,
          customerPhone: phoneNumber,
          totalGhs: amount,
          status: 'PENDING' as const,
          address: {
            street: 'TBD',
            city: 'TBD',
            region: 'TBD',
            country: 'Ghana'
          } as Record<string, any>
        });

        const payment = await storage.createPayment({
          orderId: order.id,
          provider: 'mtn_momo',
          amountGhs: amount,
          currency: 'GHS',
          status: 'PENDING' as const,
          providerReference: collectionResult.referenceId,
          externalId,
          customerPhone: phoneNumber,
          idempotencyKey: `payment_${externalId}`
        });

        // Success message with payment instructions
        const successMessage = `✅ *Payment Request Sent!*

📱 *Next Steps:*
1. Check your phone (${phoneNumber}) for MTN MoMo prompt
2. Enter your MTN MoMo PIN to complete payment
3. You'll receive confirmation once payment is successful

💰 *Payment Details:*
• Amount: ₵${amount}
• Reference: ${externalId}
• Order ID: ${order.id.substring(0, 8)}

⏰ *Important:* This payment request expires in 10 minutes.

If you don't receive the prompt, please check that:
• Your phone number is correct
• You have sufficient balance
• MTN MoMo service is active`;

        await this.sendMessage(chatId, successMessage, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📦 Check Order Status', callback_data: `order_status_${order.id}` }],
              [{ text: '🏠 Back to Main Menu', callback_data: 'main_menu' }]
            ]
          }
        });

      } else {
        // Payment initiation failed
        await this.sendMessage(chatId, `❌ *Payment Request Failed*\n\n${collectionResult.error || 'Unable to process payment at this time.'}\n\nPlease try again or contact support if the problem persists.`, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Try Again', callback_data: 'checkout' }],
              [{ text: '💬 Contact Support', callback_data: 'support' }]
            ]
          }
        });
      }

    } catch (error) {
      console.error('Error processing payment:', error);
      await this.sendMessage(chatId, '❌ *Error Processing Payment*\n\nSomething went wrong. Please try again or contact support.', {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Try Again', callback_data: 'checkout' }],
            [{ text: '💬 Contact Support', callback_data: 'support' }]
          ]
        }
      });
    }
  }
}

export const telegramService = new TelegramService();
