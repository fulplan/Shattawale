# EcomBot - Telegram E-commerce Bot with MTN Mobile Money

## Overview

EcomBot is a production-ready Telegram e-commerce bot with comprehensive admin dashboard. The system allows customers to browse products, add items to cart, and checkout using MTN Mobile Money (MoMo) payments in Ghana Cedis (GHS). Administrators can manage the entire operation through a web-based CMS with full CRUD operations for products, orders, customers, and analytics.

The project consists of three main components:
- **Telegram Bot**: Customer-facing storefront with product catalog, shopping cart, and checkout
- **Admin CMS**: React-based web application for business management
- **Payment Processing**: MTN Mobile Money integration with webhook handling and reconciliation

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack TypeScript Application
The entire application is built with TypeScript for type safety and developer experience. The monorepo structure includes both frontend and backend code with shared types and schemas.

### Backend Architecture (Node.js + Express)
- **Framework**: Express.js with TypeScript for API routes and middleware
- **Authentication**: Passport.js with local strategy using session-based auth
- **Session Management**: PostgreSQL session store with connect-pg-simple
- **Rate Limiting**: Express rate limiter for webhook and auth endpoints
- **Error Handling**: Centralized error middleware with structured logging

### Database Layer (PostgreSQL + Drizzle ORM)
- **ORM**: Drizzle ORM for type-safe database operations and migrations
- **Connection**: Neon serverless PostgreSQL with connection pooling
- **Schema**: Comprehensive schema covering users, products, orders, payments, and audit logs
- **Data Integrity**: Foreign key relationships and enum constraints for order/payment statuses

### Frontend Architecture (React + TypeScript)
- **Framework**: React with TypeScript and Vite for fast development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state and caching
- **UI Components**: Shadcn/ui component library with Radix primitives
- **Styling**: Tailwind CSS with custom design tokens and dark mode support
- **Forms**: React Hook Form with Zod validation

### Telegram Bot Integration
- **Webhook Architecture**: Production-ready webhook handling instead of polling
- **Bot API**: Official Telegram Bot API for message handling and inline keyboards
- **User Management**: Automatic user registration and profile synchronization
- **Rich UI**: Inline keyboards, quick replies, and media support for product catalog

### Payment Processing (MTN Mobile Money)
- **Collection API**: MTN MoMo Collections API for payment initiation
- **Webhook Processing**: Real-time payment status updates with signature validation
- **Reconciliation Service**: Background cron job for payment status synchronization
- **Idempotency**: Unique reference IDs and duplicate payment prevention
- **Timeout Handling**: Automatic payment cancellation after 10 minutes

### Background Jobs & Cron
- **Reconciliation**: Scheduled payment status checks every 15 minutes
- **Node-cron**: Lightweight job scheduler for maintenance tasks
- **Graceful Handling**: Prevent overlapping reconciliation runs

### Security & Production Features
- **Password Hashing**: Scrypt-based password hashing with salt
- **Session Security**: HTTP-only cookies with secure flags in production
- **Rate Limiting**: API endpoint protection against abuse
- **CORS**: Cross-origin resource sharing configuration
- **Environment Configuration**: Comprehensive environment variable management

### Testing Strategy
- **Unit Tests**: Jest for service layer and utility functions
- **Integration Tests**: API endpoint testing with supertest
- **Mocking**: External service mocks for MTN MoMo and Telegram APIs
- **Test Database**: Separate test database with automatic cleanup

## External Dependencies

### Payment Gateway
- **MTN Mobile Money API**: Primary payment processor for Ghana market
- **Environment**: Sandbox and production environment support
- **Authentication**: OAuth 2.0 client credentials flow
- **Webhooks**: Real-time payment status notifications
- **Currency**: Ghana Cedis (GHS) exclusively

### Database & Infrastructure
- **Neon PostgreSQL**: Serverless PostgreSQL database with connection pooling
- **WebSocket Support**: Required for Neon serverless connections
- **Session Store**: PostgreSQL-backed session storage for admin authentication

### Telegram Platform
- **Telegram Bot API**: Official bot platform integration
- **Webhook URL**: HTTPS endpoint for receiving message updates
- **Bot Token**: Authentication token for API access
- **Message Types**: Text messages, inline keyboards, and media support

### UI & Component Libraries
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **Lucide Icons**: Modern icon library with React components
- **Embla Carousel**: Touch-friendly carousel component

### Development & Build Tools
- **Vite**: Fast build tool with HMR and TypeScript support
- **ESBuild**: Server bundling for production deployment
- **PostCSS**: CSS processing with Tailwind and Autoprefixer
- **TypeScript**: Type checking and compilation across entire stack

### Production & Deployment
- **Docker**: Containerization support with docker-compose for local development
- **GitHub Actions**: CI/CD pipeline configuration
- **Health Checks**: Application health monitoring endpoints
- **Logging**: Structured logging with timestamp and source tracking