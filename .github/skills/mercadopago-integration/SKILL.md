---
name: mercadopago-integration
description: Guide for integrating Mercado Pago payment processing into SaaS applications. Use this skill whenever the user mentions Mercado Pago, payment integration, checkout, cobros, pagos, suscripciones, or wants to add payment processing to a web app targeting Latin American markets. Also trigger when the user asks about Checkout Pro, Checkout API, webhooks for payments, or subscription billing with Mercado Pago — even if they just say "add payments" or "integrate payments" in a LATAM context.
---

# Mercado Pago SaaS Integration

This skill provides step-by-step guidance for integrating Mercado Pago into a SaaS application, covering one-time payments, subscriptions, and webhook handling.

## When to Use This Skill

- Adding payment processing to a SaaS or web app targeting Argentina, Brazil, Mexico, Colombia, Chile, Uruguay, or Peru
- Implementing Checkout Pro (redirect-based) or Checkout API (embedded)
- Setting up recurring billing / subscriptions via Mercado Pago
- Configuring webhooks to track payment status changes
- Handling test credentials and going to production

## Prerequisites

- A Mercado Pago account (create at https://www.mercadopago.com)
- Access to credentials from the Developer Dashboard (https://www.mercadopago.com/developers/panel/app)
- Node.js or Python environment (SDK available for both)
- A running web application (Next.js, Express, Django, etc.)

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Frontend   │────▶│  Your API    │────▶│  Mercado Pago   │
│  (checkout)  │◀────│  (backend)   │◀────│  API            │
└─────────────┘     └──────┬───────┘     └─────────────────┘
                           │
                    ┌──────▼───────┐
                    │  Webhook      │
                    │  Endpoint     │
                    │  /api/webhook │
                    └──────────────┘
```

## Integration Paths

Choose the right approach based on your needs:

| Approach | Best For | Complexity | PCI Scope |
|----------|----------|------------|-----------|
| **Checkout Pro** | Quick setup, redirect to MP | Low | None |
| **Checkout API (Orders)** | Embedded checkout, full control | Medium | SAQ A |
| **Checkout Bricks** | Pre-built UI components | Low-Medium | SAQ A |
| **Subscriptions** | Recurring SaaS billing | Medium | Depends |

## Step 1: Environment Setup

### Install the SDK

**Node.js:**
```bash
npm install mercadopago
```

**Python:**
```bash
pip install mercadopago
```

### Configure Credentials

Always use environment variables. Never hardcode credentials.

**`.env` file:**
```env
MP_ACCESS_TOKEN=your_access_token
MP_PUBLIC_KEY=your_public_key
# Use TEST credentials during development
# Switch to PROD credentials when going live
```

**Node.js initialization:**
```javascript
import { MercadoPagoConfig } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});
```

**Python initialization:**
```python
import mercadopago

sdk = mercadopago.SDK(os.environ.get("MP_ACCESS_TOKEN"))
```

## Step 2: Checkout Pro (Redirect-Based)

Best for MVPs and quick launches. The buyer is redirected to Mercado Pago to pay.

### Create a Payment Preference (Node.js / Next.js API Route)

```javascript
import { MercadoPagoConfig, Preference } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

export async function POST(req) {
  const { planName, price, userId } = await req.json();

  const preference = new Preference(client);
  const result = await preference.create({
    body: {
      items: [
        {
          id: "plan-pro",
          title: planName,
          unit_price: price,
          quantity: 1,
          currency_id: "ARS", // BRL, MXN, COP, CLP, UYU, PEN
        },
      ],
      payer: {
        email: "buyer@example.com",
      },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_URL}/payment/success`,
        failure: `${process.env.NEXT_PUBLIC_URL}/payment/failure`,
        pending: `${process.env.NEXT_PUBLIC_URL}/payment/pending`,
      },
      auto_return: "approved",
      notification_url: `${process.env.NEXT_PUBLIC_URL}/api/webhooks/mercadopago`,
      external_reference: userId, // Your internal reference
      metadata: {
        user_id: userId,
        plan: planName,
      },
    },
  });

  return Response.json({ init_point: result.init_point });
}
```

### Frontend Redirect

```javascript
const handlePayment = async () => {
  const res = await fetch("/api/create-preference", {
    method: "POST",
    body: JSON.stringify({ planName: "Pro", price: 9990, userId: user.id }),
  });
  const { init_point } = await res.json();
  window.location.href = init_point; // Redirects to Mercado Pago
};
```

## Step 3: Checkout API (Embedded — via Orders)

For full control over the checkout UX without redirecting.

> **Note:** Mercado Pago now recommends using the Orders API instead of the Payments API for new integrations. The Orders API simplifies development and provides better error messages.

### Add MercadoPago.js to Frontend

```html
<script src="https://sdk.mercadopago.com/js/v2"></script>
```

### Initialize and Mount Card Form

```javascript
const mp = new MercadoPago("YOUR_PUBLIC_KEY", { locale: "es-AR" });

const cardForm = mp.cardForm({
  amount: "9990",
  iframe: true,
  form: {
    id: "form-checkout",
    cardNumber: { id: "form-checkout__cardNumber", placeholder: "Número de tarjeta" },
    expirationDate: { id: "form-checkout__expirationDate", placeholder: "MM/YY" },
    securityCode: { id: "form-checkout__securityCode", placeholder: "CVV" },
    cardholderName: { id: "form-checkout__cardholderName", placeholder: "Titular" },
    identificationType: { id: "form-checkout__identificationType" },
    identificationNumber: { id: "form-checkout__identificationNumber", placeholder: "DNI" },
    installments: { id: "form-checkout__installments" },
  },
  callbacks: {
    onFormMounted: (error) => {
      if (error) console.warn("Form mount error:", error);
    },
    onSubmit: (event) => {
      event.preventDefault();
      const cardFormData = cardForm.getCardFormData();
      // Send cardFormData.token to your backend
      fetch("/api/process-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cardFormData),
      });
    },
  },
});
```

### Backend: Process the Payment

```javascript
import { MercadoPagoConfig, Payment } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

export async function POST(req) {
  const { token, installments, payment_method_id, issuer_id, payer } = await req.json();

  const payment = new Payment(client);
  const result = await payment.create({
    body: {
      transaction_amount: 9990,
      token,
      description: "Plan Pro - Mi SaaS",
      installments: Number(installments),
      payment_method_id,
      issuer_id,
      payer: {
        email: payer.email,
        identification: payer.identification,
      },
      metadata: {
        user_id: "your-user-id",
      },
    },
  });

  return Response.json({ status: result.status, id: result.id });
}
```

## Step 4: Webhook Configuration

**Critical for SaaS:** Never trust only the client-side redirect. Always confirm payment status via webhooks.

### Webhook Endpoint (Next.js App Router)

```javascript
import { MercadoPagoConfig, Payment } from "mercadopago";
import crypto from "crypto";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

export async function POST(req) {
  // 1. Validate webhook signature (recommended)
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");
  // See MP docs for full HMAC validation

  // 2. Parse the notification
  const body = await req.json();

  if (body.type === "payment") {
    const paymentId = body.data.id;

    // 3. Always fetch payment details from MP API (don't trust webhook body alone)
    const payment = new Payment(client);
    const paymentData = await payment.get({ id: paymentId });

    // 4. Update your database based on payment status
    switch (paymentData.status) {
      case "approved":
        // Activate subscription / grant access
        await activateUserPlan(paymentData.external_reference, paymentData.metadata);
        break;
      case "pending":
        // Payment pending (cash payments like Rapipago)
        await markPaymentPending(paymentData.external_reference);
        break;
      case "rejected":
        // Payment failed
        await handleFailedPayment(paymentData.external_reference);
        break;
      case "refunded":
        // Refund processed
        await revokeAccess(paymentData.external_reference);
        break;
    }
  }

  // 5. Always return 200 to acknowledge receipt
  return new Response("OK", { status: 200 });
}
```

### Configure Webhook URL

In the Mercado Pago Developer Dashboard:
1. Go to your application → Notifications
2. Set the webhook URL: `https://yourdomain.com/api/webhooks/mercadopago`
3. Select events: `payment`, `plan`, `subscription`, `invoice`

## Step 5: Subscriptions (Recurring Billing)

For SaaS monthly/annual plans using Mercado Pago's preapproval system.

```javascript
import { MercadoPagoConfig, PreApproval } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

export async function createSubscription(userId, planType) {
  const plans = {
    basic: { amount: 4990, reason: "Plan Basic" },
    pro: { amount: 9990, reason: "Plan Pro" },
    enterprise: { amount: 29990, reason: "Plan Enterprise" },
  };

  const plan = plans[planType];
  const preapproval = new PreApproval(client);

  const result = await preapproval.create({
    body: {
      reason: plan.reason,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: plan.amount,
        currency_id: "ARS",
      },
      back_url: `${process.env.NEXT_PUBLIC_URL}/subscription/callback`,
      payer_email: "buyer@example.com",
      external_reference: userId,
    },
  });

  return result.init_point; // Redirect user here
}
```

## Step 6: Testing

### Test Credentials

Always use **TEST credentials** during development. Get them from the Developer Dashboard.

### Test Cards (Argentina)

| Card | Number | CVV | Expiration |
|------|--------|-----|------------|
| Visa (approved) | 4509 9535 6623 3704 | 123 | 11/25 |
| Mastercard (approved) | 5031 7557 3453 0604 | 123 | 11/25 |
| Visa (rejected) | 4000 0000 0000 0002 | 123 | 11/25 |

### Test User Accounts

Create test buyer/seller accounts via the API:
```bash
curl -X POST \
  'https://api.mercadopago.com/users/test' \
  -H 'Authorization: Bearer YOUR_TEST_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"site_id": "MLA", "description": "Test buyer"}'
```

## Guidelines

1. **Never hardcode credentials** — Always use environment variables
2. **Always validate webhooks** — Don't trust client-side redirects for activating features
3. **Always fetch payment from API** — On webhook, get the full payment object from MP's API instead of trusting the notification body
4. **Use `external_reference`** — Map payments to your internal user/order IDs
5. **Use `metadata`** — Attach custom data (plan name, user ID) for easy reconciliation
6. **Handle all statuses** — `approved`, `pending`, `rejected`, `refunded`, `cancelled`
7. **Return 200 on webhooks** — MP will retry if your endpoint doesn't return 200
8. **Implement idempotency** — Webhooks can fire multiple times for the same event
9. **Use test credentials first** — Switch to production only after thorough testing
10. **Check currency_id per country** — ARS (Argentina), BRL (Brazil), MXN (Mexico), etc.

## Common Pitfalls

- **Webhook URL must be HTTPS** and publicly accessible (use ngrok for local dev)
- **Sandbox vs Production** — Different access tokens, different behavior
- **IPN vs Webhooks** — Use Webhooks (v2), IPN is legacy
- **Currency mismatch** — `currency_id` must match the country of your MP account
- **Installments** — Available only for credit cards, behavior varies by country

## Useful Links

- Developer Dashboard: https://www.mercadopago.com/developers/panel/app
- API Reference: https://www.mercadopago.com.ar/developers/en/reference
- SDK (Node): https://github.com/mercadopago/sdk-nodejs
- SDK (Python): https://github.com/mercadopago/sdk-python
- Checkout Pro Docs: https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/overview
- Checkout API (Orders): https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/overview
- Webhooks: https://www.mercadopago.com.ar/developers/en/docs/your-integrations/notifications/webhooks
- Test Cards: https://www.mercadopago.com.ar/developers/en/docs/your-integrations/test/cards
