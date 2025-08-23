// Utility to help with webhook URL determination and validation

export class WebhookHelper {
  static getWebhookUrl(): string | null {
    // Priority 1: Production deployment URL
    if (process.env.REPLIT_DEPLOYMENT_URL) {
      return process.env.REPLIT_DEPLOYMENT_URL;
    }
    
    // Priority 2: Custom domain from REPLIT_DOMAINS
    if (process.env.REPLIT_DOMAINS) {
      const domains = process.env.REPLIT_DOMAINS.split(',');
      if (domains.length > 0) {
        const domain = domains[0].trim();
        return `https://${domain}`;
      }
    }
    
    // Priority 3: Development URL using REPL_ID and REPL_OWNER
    if (process.env.REPL_ID && process.env.REPL_OWNER) {
      return `https://${process.env.REPL_ID}--${process.env.REPL_OWNER}.replit.dev`;
    }
    
    // Priority 4: Try to construct from available environment
    if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
      return `https://${process.env.REPL_SLUG}--${process.env.REPL_OWNER}.replit.dev`;
    }
    
    return null;
  }
  
  static getEnvironmentInfo() {
    return {
      isProduction: !!process.env.REPLIT_DEPLOYMENT_URL,
      isDevelopment: !process.env.REPLIT_DEPLOYMENT_URL,
      webhookUrl: this.getWebhookUrl(),
      replId: process.env.REPL_ID,
      replOwner: process.env.REPL_OWNER,
      replDomains: process.env.REPLIT_DOMAINS
    };
  }
  
  static logEnvironmentInfo() {
    const info = this.getEnvironmentInfo();
    console.log('🔧 Webhook Environment Info:');
    console.log(`   Mode: ${info.isProduction ? 'Production' : 'Development'}`);
    console.log(`   Webhook URL: ${info.webhookUrl || 'Not available'}`);
    console.log(`   REPL_ID: ${info.replId || 'Not set'}`);
    console.log(`   REPL_OWNER: ${info.replOwner || 'Not set'}`);
    console.log(`   REPLIT_DOMAINS: ${info.replDomains || 'Not set'}`);
  }
}