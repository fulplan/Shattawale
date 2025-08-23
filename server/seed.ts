import { hashPassword } from './auth';
import { storage } from './storage';

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // Create default admin user
    const existingAdmin = await storage.getAdminUserByEmail('admin@example.com');
    if (!existingAdmin) {
      const hashedPassword = await hashPassword('ChangeMe!2025');
      await storage.createAdminUser({
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin',
        mustChangePassword: true
      });
      console.log('✅ Created default admin user (admin@example.com / ChangeMe!2025)');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // Create sample categories
    const categories = [
      { name: 'Electronics', slug: 'electronics', description: 'Phones, laptops, and electronic devices' },
      { name: 'Fashion', slug: 'fashion', description: 'Clothing, shoes, and accessories' },
      { name: 'Home & Garden', slug: 'home-garden', description: 'Furniture, appliances, and home decor' },
      { name: 'Books', slug: 'books', description: 'Educational and entertainment books' },
      { name: 'Sports', slug: 'sports', description: 'Sports equipment and fitness gear' }
    ];

    const createdCategories = [];
    for (const categoryData of categories) {
      const existingCategories = await storage.getAllCategories();
      const exists = existingCategories.some(cat => cat.slug === categoryData.slug);
      
      if (!exists) {
        const category = await storage.createCategory(categoryData);
        createdCategories.push(category);
        console.log(`✅ Created category: ${category.name}`);
      } else {
        const existing = existingCategories.find(cat => cat.slug === categoryData.slug);
        createdCategories.push(existing!);
        console.log(`ℹ️  Category already exists: ${categoryData.name}`);
      }
    }

    // Create sample products
    const products = [
      {
        title: 'iPhone 15 Pro Max',
        sku: 'IPH-15PM-128',
        description: 'Latest Apple smartphone with 128GB storage, advanced camera system, and A17 Pro chip',
        priceGhs: '8500.00',
        stock: 25,
        categoryId: createdCategories.find(c => c.slug === 'electronics')?.id,
        images: ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400'],
        tags: ['smartphone', 'apple', 'premium'],
        isActive: true
      },
      {
        title: 'Samsung Galaxy S24',
        sku: 'SAM-S24-256',
        description: 'Samsung flagship with 256GB storage, AI photography, and long-lasting battery',
        priceGhs: '6800.00',
        stock: 18,
        categoryId: createdCategories.find(c => c.slug === 'electronics')?.id,
        images: ['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400'],
        tags: ['smartphone', 'samsung', 'android'],
        isActive: true
      },
      {
        title: 'Premium Cotton T-Shirt',
        sku: 'TSH-COT-001',
        description: 'Comfortable everyday wear made from 100% organic cotton, available in multiple colors',
        priceGhs: '45.00',
        stock: 5,
        categoryId: createdCategories.find(c => c.slug === 'fashion')?.id,
        images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400'],
        tags: ['clothing', 'cotton', 'casual'],
        isActive: true
      },
      {
        title: 'Automatic Coffee Maker',
        sku: 'COF-MKR-12C',
        description: '12-cup programmable coffee maker with timer, auto-shutoff, and thermal carafe',
        priceGhs: '320.00',
        stock: 0,
        categoryId: createdCategories.find(c => c.slug === 'home-garden')?.id,
        images: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400'],
        tags: ['appliance', 'coffee', 'kitchen'],
        isActive: false
      },
      {
        title: 'JavaScript Programming Guide',
        sku: 'BOK-JS-001',
        description: 'Complete guide to modern JavaScript programming with practical examples and projects',
        priceGhs: '85.00',
        stock: 50,
        categoryId: createdCategories.find(c => c.slug === 'books')?.id,
        images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400'],
        tags: ['programming', 'javascript', 'education'],
        isActive: true
      }
    ];

    const existingProducts = await storage.getAllProducts();
    for (const productData of products) {
      const exists = existingProducts.some(p => p.sku === productData.sku);
      if (!exists) {
        await storage.createProduct(productData);
        console.log(`✅ Created product: ${productData.title}`);
      } else {
        console.log(`ℹ️  Product already exists: ${productData.title}`);
      }
    }

    // Create sample coupons
    const coupons = [
      {
        code: 'WELCOME10',
        name: 'Welcome Discount',
        description: 'Get 10% off your first order',
        type: 'percent',
        value: '10',
        minOrderAmount: '50.00',
        maxUses: 100,
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      },
      {
        code: 'SAVE50',
        name: 'Fixed Discount',
        description: 'Save GHS 50 on orders over GHS 300',
        type: 'fixed',
        value: '50.00',
        minOrderAmount: '300.00',
        maxUses: 50,
        isActive: true,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days from now
      }
    ];

    const existingCoupons = await storage.getAllCoupons();
    for (const couponData of coupons) {
      const exists = existingCoupons.some(c => c.code === couponData.code);
      if (!exists) {
        await storage.createCoupon(couponData);
        console.log(`✅ Created coupon: ${couponData.code}`);
      } else {
        console.log(`ℹ️  Coupon already exists: ${couponData.code}`);
      }
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('- Admin user: admin@example.com / ChangeMe!2025');
    console.log('- Categories: 5 created');
    console.log('- Products: 5 created');
    console.log('- Coupons: 2 created');
    console.log('');
    console.log('⚠️  Remember to change the admin password on first login!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedDatabase };
