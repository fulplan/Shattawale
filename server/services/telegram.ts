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

class TelegramService {
  private botToken: string;
  private webhookPath: string;

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
      await this.startCheckout(chatId);
    }
  }

  private async handleStartCommand(chatId: number, user: any) {
    const welcomeMessage = `
🛍️ **Welcome to EcomBot!**

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
🏠 **Main Menu**

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

    await this.sendMessage(chatId, '📱 **Product Categories**\n\nChoose a category to browse:', {
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
🛍️ **${product.title}**

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
🛍️ **${product.title}**

💰 **Price:** ₵${product.priceGhs}
📦 **Stock:** ${product.stock} available
📋 **SKU:** ${product.sku}

📝 **Description:**
${product.description || 'No description available'}

${product.tags && product.tags.length > 0 ? `🏷️ **Tags:** ${product.tags.join(', ')}` : ''}
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

    await this.sendMessage(chatId, `✅ **${product.title}** added to your cart!\n\n💰 Price: ₵${product.priceGhs}`, {
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
    await this.sendMessage(chatId, '🛒 **Your Cart**\n\nYour cart is currently empty.\nUse /browse to start shopping!', {
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
      await this.sendMessage(chatId, '📦 **Your Orders**\n\nYou haven\'t placed any orders yet.\nStart shopping to see your orders here!', {
        parse_mode: 'Markdown'
      });
      return;
    }

    let ordersText = '📦 **Your Recent Orders**\n\n';
    
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
💬 **Customer Support**

Need help? Our support team is here for you!

📧 **Email:** support@ecombot.gh
📱 **Phone:** +233 XXX XXX XXX
⏰ **Hours:** Mon-Fri, 9AM-6PM GMT

**Common Questions:**
• How to pay with MTN MoMo?
• Order status and tracking
• Product returns and refunds
• Account management

Type your question below or contact us directly!
    `;

    await this.sendMessage(chatId, supportMessage, { parse_mode: 'Markdown' });
  }

  private async startCheckout(chatId: number) {
    await this.sendMessage(chatId, '💳 **Checkout Process**\n\nCheckout functionality is under development.\nYou will be able to pay securely with MTN Mobile Money soon!', {
      parse_mode: 'Markdown'
    });
  }

  private async handleTextMessage(chatId: number, text: string, user: any) {
    if (text.includes('browse') || text.includes('📱')) {
      await this.showCategories(chatId);
    } else if (text.includes('cart') || text.includes('🛒')) {
      await this.showCart(chatId, user.id);
    } else if (text.includes('orders') || text.includes('📦')) {
      await this.showOrders(chatId, user.id);
    } else if (text.includes('support') || text.includes('💬')) {
      await this.showSupport(chatId);
    } else if (text.includes('search') || text.includes('🔍')) {
      await this.sendMessage(chatId, '🔍 **Search Products**\n\nSearch functionality coming soon!\nFor now, use /browse to explore our categories.', {
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
🛍️ **${product.title}**
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
    
    const url = `https://api.telegram.org/bot${botToken}/setWebhook`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl + this.webhookPath,
          allowed_updates: ['message', 'callback_query']
        }),
      });

      const result = await response.json();
      console.log('Webhook set result:', result);
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
}

export const telegramService = new TelegramService();
