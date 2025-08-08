# eCommerce Client Project Structure

This document provides a comprehensive overview of the eCommerce client application structure, including all main directories and their key components.

## Root Directory Structure

```
Client/
├── .dockerignore
├── .gitignore
├── .next/
├── Dockerfile
├── README.md
├── Untitled-1.txt
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── node_modules/
├── package-lock.json
├── package.json
├── playwright.config.ts
├── postcss.config.mjs
├── public/
├── src/                   # Main source code directory
├── tests/
├── tests-examples/
└── tsconfig.json
```

## Source Directory (`src`) Structure

```
src/
├── app/                   # Main application directory (Next.js App Router)
├── lib/                   # Library code and utilities
├── middleware.ts          # Next.js middleware
├── product.html
├── services/              # Service classes and functions
├── test-api.js
└── types/                 # Type definitions
```

## App Directory Structure

```
app/
├── Crm/                   # CRM module
│   ├── Admin/             # Admin features
│   │   └── settings/      # Admin settings
│   ├── Crm/               # CRM core features
│   │   ├── contacts/      # Contact management
│   │   └── page.tsx
│   ├── Masters/           # Master data management
│   │   ├── admin/
│   │   ├── attributes/
│   │   ├── catalogue/
│   │   ├── countries/
│   │   ├── currencies/
│   │   ├── customers/
│   │   ├── inventory/
│   │   ├── page.tsx
│   │   ├── pricing/
│   │   └── products/
│   ├── layout.tsx
│   └── page.tsx
├── [tenant]/              # Dynamic tenant routes
│   ├── page.tsx
│   └── tenant/
├── actions/               # Server actions
├── api/                   # API routes
├── auth/                  # Authentication
│   ├── components/        # Auth components
│   ├── hooks/             # Auth hooks
│   ├── providers/         # Auth context providers
│   ├── services/          # Auth services
│   └── store/             # Auth state management
├── components/            # Shared components
│   ├── AppLayout/
│   ├── ClientLayout.tsx
│   ├── ClientWrapper.tsx
│   ├── ImageKIt.io/
│   ├── PageTitle.tsx
│   ├── Store/             # Store-specific components
│   │   ├── addresses/     # Address management
│   │   ├── cart/          # Shopping cart
│   │   ├── checkout/      # Checkout process
│   │   ├── dashboard/     # User dashboard
│   │   ├── loyalty/       # Loyalty program
│   │   ├── order/         # Order components
│   │   ├── orderDetails/  # Order details
│   │   ├── orders/        # Orders list
│   │   ├── pdp/           # Product detail page
│   │   ├── plp/           # Product listing page
│   │   ├── returns/       # Return management
│   │   ├── wallet/        # Wallet features
│   │   └── wishlist/      # Wishlist features
│   ├── admin/             # Admin components
│   ├── common/            # Common shared components
│   ├── forms/             # Form components
│   ├── layouts/           # Layout components
│   ├── ofm/               # Order Fulfillment Management
│   ├── providers/         # Context providers
│   └── workflow/          # Workflow components
├── constants/             # Application constants
├── contexts/              # React contexts
├── data/                  # Data files
├── favicon.ico
├── globals.css            # Global CSS
├── hooks/                 # Custom React hooks
│   ├── api/               # API hooks
│   │   ├── assets.ts
│   │   ├── attributes.ts
│   │   ├── auth.ts
│   │   ├── catalogue.ts
│   │   ├── config.ts
│   │   ├── customers.ts
│   │   ├── inventory.ts
│   │   ├── ofm/           # Order Fulfillment Management hooks
│   │   ├── ofm.ts
│   │   ├── pricing.ts
│   │   ├── products.ts
│   │   ├── settings.ts
│   │   ├── shared.ts
│   │   ├── store/         # Store-specific API hooks
│   │   │   ├── dashboardService.ts
│   │   │   ├── invoiceService.ts
│   │   │   ├── orderService.ts
│   │   │   ├── rmaService.ts
│   │   │   ├── useAddresses.ts
│   │   │   ├── useCart.ts
│   │   │   ├── useGuestOrderDetails.ts
│   │   │   ├── useLoyalty.ts
│   │   │   ├── useOrder.ts
│   │   │   ├── useOrderDetails.ts
│   │   │   ├── usePaymentMethods.ts
│   │   │   ├── useProduct.ts
│   │   │   ├── useProducts.ts
│   │   │   ├── useShippingMethods.ts
│   │   │   ├── useSubmitReturnRequest.ts
│   │   │   ├── useUserOrderDetail.ts
│   │   │   ├── useUserOrders.ts
│   │   │   ├── useWallet.ts
│   │   │   └── useWishlist.ts
│   │   └── various utility hooks...
│   ├── mutations/         # React Query mutations
│   ├── queries/           # React Query queries
│   ├── useAuth.ts         # Authentication hook
│   ├── useCurrentUser.ts  # Current user hook
│   ├── useDebounce.ts     # Debounce functionality
│   ├── useLocalStorage.ts # Local storage hook
│   └── useNotification.ts # Notification system
├── i18n/                  # Internationalization
├── i18n-init.ts
├── layout.tsx             # Root layout
├── lib/                   # Library code
├── login/                 # Login pages
├── metadata.ts            # App metadata
├── page.tsx               # Root page
├── services/              # Service functions
├── signup/                # Signup pages
├── store/                 # Store pages (customer-facing)
│   ├── [storeslug]/       # Dynamic store slug routes
│   ├── account/           # Customer account pages
│   ├── cart/              # Cart pages
│   ├── checkout/          # Checkout pages
│   ├── invoice/           # Invoice pages
│   ├── layout.tsx         # Store layout
│   ├── order-confirmation/# Order confirmation pages
│   ├── page.tsx           # Store home page
│   ├── product/           # Product pages
│   └── track-order/       # Order tracking pages
├── tenant-admin/          # Tenant administration
├── theme/                 # Theme management
├── types/                 # Type definitions
│   ├── account.ts
│   ├── attributes.ts
│   ├── auth.ts
│   ├── catalogue.ts
│   ├── customers.ts
│   ├── index.ts
│   ├── inventory-types.ts
│   ├── inventory.ts
│   ├── ofm.ts
│   ├── pricing.ts
│   ├── products.ts
│   ├── schemas/           # Schema definitions
│   ├── schemas.ts
│   ├── settings.ts
│   ├── shared.ts
│   └── store/             # Store-specific types
│       ├── addressTypes.ts
│       ├── cart.ts
│       ├── checkout.ts
│       ├── loyaltyTypes.ts
│       ├── order.ts
│       ├── orderTypes.ts
│       ├── product.ts
│       ├── walletTypes.ts
│       └── wishlist.ts
├── utils/                 # Utility functions
└── validations/           # Form validation
```

## Key Architecture Features

### Multi-Tenant Architecture
- The app uses two dynamic route parameters:
  - `[tenant]`: Used for admin/CRM sections
  - `[storeslug]`: Used for customer-facing storefront under store path

### Authentication System
- JWT tokens stored in localStorage as 'access_token' and 'refresh_token'
- AuthService handles token management
- Token contains tenant-specific identifiers (user_id, client_id, account_id, contact_id)

### Frontend Organization
- Next.js App Router architecture
- Organized by feature domains (store, auth, crm)
- Component-based structure with reusable UI elements
- API hooks for data fetching using React Query

### Data Flow
- React Context for state management
- TanStack Query for data fetching
- React Hook Form for form handling
- Zod for validation

### Styling
- MUI v6 component library
- Theme-based styling with consistent use of spacing and colors
- Responsive design patterns
