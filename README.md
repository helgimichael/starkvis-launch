# Starkvis Launch

A minimal, production-ready Next.js app using TypeScript, Tailwind CSS, and the App Router.

## Scripts

```bash
npm run dev
```

Starts the local development server.

```bash
npm run build
```

Creates a production build.

```bash
npm run start
```

Starts the production server after a build.

```bash
npm run lint
```

Runs ESLint.

## Notify Form Email

The landing page notify form posts to `/api/notify`, which sends signup notifications to `hello@starkv.is` through Resend.

Configure this Cloudflare Worker secret before deploy:

```bash
npx wrangler secret put RESEND_API_KEY
```

Required Resend environment variable:

```bash
RESEND_API_KEY
```

The Resend sending domain must allow `STARKVIS <hello@starkv.is>` as the sender.
