# EcomBot - Telegram E-commerce Bot with MTN Mobile Money

A production-ready Telegram e-commerce bot with MTN Mobile Money (MoMo) payments and comprehensive admin dashboard built with Node.js, React, and PostgreSQL.

## 🚀 Features

### Telegram Bot
- **Product Catalog**: Browse products by category with pagination
- **Search Functionality**: Find products by name or SKU
- **Shopping Cart**: Add, modify, and remove items
- **MTN MoMo Payments**: Secure payment processing with Ghana Cedis (GHS)
- **Order Tracking**: Real-time order status updates
- **User Management**: Automatic user registration and profile management

### Admin Dashboard
- **Product Management**: Full CRUD operations with image uploads
- **Order Management**: Track and update order status
- **Payment Logs**: MTN MoMo transaction history and reconciliation
- **Customer Management**: View user profiles and order history
- **Analytics Dashboard**: Revenue, conversion rates, and performance metrics
- **Coupon System**: Create and manage discount codes
- **System Settings**: User management and configuration

### Payment Integration
- **MTN Mobile Money**: Primary payment method for Ghana market
- **Automatic Reconciliation**: Background job to sync payment status
- **Webhook Processing**: Real-time payment confirmations
- **Idempotency**: Prevent duplicate charges
- **Timeout Handling**: Automatic cancellation after 10 minutes

## 🛠 Tech Stack

### Backend
- **Node.js** with TypeScript
- **Express.js** for API routes
- **PostgreSQL** with Prisma ORM
- **Passport.js** for authentication
- **Node-cron** for scheduled jobs

### Frontend
- **React** with TypeScript
- **Tailwind CSS** for styling
- **Wouter** for routing
- **TanStack Query** for data fetching
- **Shadcn/ui** components

### DevOps
- **Docker** & docker-compose
- **GitHub Actions** for CI/CD
- **Jest** for testing

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 13+
- Docker and docker-compose (optional)
- Telegram Bot Token (from @BotFather)
- MTN MoMo API credentials

## 🏃‍♂️ Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/your-repo/ecombot.git
cd ecombot
npm install
