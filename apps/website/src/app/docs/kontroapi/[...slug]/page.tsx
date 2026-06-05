import { notFound } from 'next/navigation';

const pages: Record<string, { title: string; content: string[] }> = {
  'quick-start': {
    title: 'Quick Start',
    content: [
      'Get KontroAPI running on your machine in under 5 minutes.',
      'Prerequisites: Docker Engine + Docker Compose v2, Node.js 20+, and at least 2 GB free RAM.',
      'First, install the CLI globally:',
      'npm install -g @kontroapis/cli',
      'Initialize your instance. This creates configuration files and a docker-compose.yml:',
      'kontroapi init -y',
      "You'll see an admin password — save it. You won't see it again.",
      'Start the engine and dashboard:',
      'kontroapi start -d',
      'Wait 30-60 seconds for all containers to become healthy. Check status with:',
      'kontroapi status',
      'Visit http://localhost:3001 in your browser and log in with the admin credentials from the init step.',
      'You are now ready to create WhatsApp sessions, send messages, and configure webhooks.',
    ],
  },
  installation: {
    title: 'Installation',
    content: [
      'KontroAPI runs anywhere Docker runs — Linux, macOS, Windows (via WSL2).',
      'System Requirements: Docker Engine 20.10+, Docker Compose v2, 4 GB RAM recommended, 10 GB disk space',
      'Install via npm:',
      'npm install -g @kontroapis/cli',
      'The CLI generates everything you need: docker-compose.yml, .env with secrets, and an admin user seed script.',
      'By default, KontroAPI bundles PostgreSQL 16 and Redis 7 as Docker containers. You can also point it to existing instances using kontroapi config.',
      'Manual Docker Usage:',
      'If you prefer not to use the CLI, you can run the Docker images directly: docker run -d -p 3000:3000 ghcr.io/fahimuntasin/kontroapi/engine:latest — but the CLI handles configuration and secret management for you.',
    ],
  },
  auth: {
    title: 'Authentication',
    content: [
      'KontroAPI supports two authentication methods: JWT tokens for dashboard access, and API keys for programmatic engine access.',
      'JWT Auth:',
      'Login to the dashboard at /api/auth/login with email and password to receive a JWT token (stored as an HTTP-only cookie, 30-day expiry).',
      'API Key Auth:',
      'Create API keys from the Dashboard → Settings → API Tokens page. Each key is associated with a WhatsApp session and has configurable permissions.',
      'Use API keys in requests by setting the Authorization header: Authorization: Bearer kontroapi_sk_xxxxxxxx',
      'Internal Communication:',
      'The dashboard communicates with the engine using an INTERNAL_SECRET key. This key is automatically generated during init and must match between both services.',
    ],
  },
  'send-message': {
    title: 'Send Message',
    content: [
      'Send WhatsApp messages through the REST API.',
      'Endpoint: POST /api/messages/send',
      'Headers: Content-Type: application/json, Authorization: Bearer YOUR_API_KEY',
      'Request Body:',
      '{ "sessionId": "your-session-id", "to": "8801XXXXXXXXX", "message": "Hello from KontroAPI!" }',
      'Phone numbers must be in international format: country code + number. For Bangladesh: 8801XXXXXXXXX (13 digits total).',
      'The response includes a messageId for tracking delivery status. Messages are queued via BullMQ + Redis and delivered asynchronously.',
      'Error codes: 401 — invalid API key, 404 — session not found, 400 — invalid request body.',
    ],
  },
  webhooks: {
    title: 'Receive Messages',
    content: [
      'KontroAPI delivers incoming WhatsApp messages to your webhook URL in real-time.',
      'Configure your webhook URL in the Dashboard → Sessions → session settings. Each session can have its own webhook URL.',
      'Webhook Payload Format:',
      '{ "event": "message", "data": { "sessionId": "...", "from": "8801...", "body": "Hello", "timestamp": "..." } }',
      'Webhook Signature:',
      'Every webhook includes an X-KontroAPI-Signature header for verification. The signature is an HMAC-SHA256 of the payload body, signed with your webhook secret.',
      'The engine retries failed webhook deliveries up to 3 times with exponential backoff.',
    ],
  },
  sessions: {
    title: 'Sessions',
    content: [
      'WhatsApp sessions represent individual WhatsApp connections managed by KontroAPI.',
      'Each session has: a unique ID, a friendly name, a connection status (connecting/connected/disconnected), QR code for phone linking, and configurable webhook URL.',
      'Create a session via Dashboard → Sessions → Create New, or programmatically via POST /api/sessions.',
      'Session States:',
      '- Pending: Session created, waiting for QR scan',
      '- Connecting: QR code scanned, authenticating with WhatsApp',
      '- Connected: Active WhatsApp connection — can send/receive messages',
      '- Disconnected: Session lost connection — you can restart it',
      'Sessions are persisted across restarts. The engine automatically tries to reconnect disconnected sessions.',
    ],
  },
  'deploy-vps': {
    title: 'Deploy to VPS',
    content: [
      'Deploy KontroAPI to any VPS running Ubuntu 22.04+ in about 15 minutes.',
      '1. SSH into your VPS and install Docker: curl -fsSL https://get.docker.com | sh',
      '2. Install Node.js 20+: curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install nodejs -y',
      '3. Install KontroAPI CLI: npm install -g @kontroapis/cli',
      '4. Initialize: kontroapi init -y — saves the generated password!',
      '5. Start: kontroapi start -d',
      '6. Set up Nginx reverse proxy with SSL:',
      '   - Point your domain to the VPS IP',
      '   - Run certbot for SSL: apt install certbot python3-certbot-nginx -y && certbot --nginx -d your-domain.com',
      '   - Add Nginx config to proxy port 3000 (engine) and 3001 (dashboard)',
      'Tip: Use Cloudflare Tunnels (cloudflared) for zero-config secure tunneling without opening ports.',
    ],
  },
  n8n: {
    title: 'n8n Integration',
    content: [
      'KontroAPI ships with a dedicated n8n community node for building WhatsApp automation workflows.',
      'Install the node in your n8n instance: npm install n8n-nodes-kontroapi',
      'In n8n, add KontroAPI credentials: engine URL (your KontroAPI engine URL), API key (from Dashboard → Settings → API Tokens), and test the connection.',
      'Available Operations:',
      'Send Message — Send a text message to any WhatsApp number',
      'Send Media — Send images, documents, videos, or audio',
      'Check Session Status — Get the current connection status of a session',
      'Trigger on Incoming Message — Set up a webhook trigger that fires when a WhatsApp message arrives',
      'Example: Build a customer support workflow that receives a WhatsApp message, looks up the customer in your database, and sends an automated reply — all in n8n with zero code.',
    ],
  },
  'sms-gateway': {
    title: 'SMS Gateway',
    content: [
      'KontroAPI includes an SMS gateway integration for fallback delivery and OTP verification.',
      'When WhatsApp is not available (phone offline, blocked, etc.), messages can optionally be delivered via SMS.',
      'The OTP verification system generates secure one-time passwords and delivers them via SMS for user verification flows.',
      'SMS provider configuration: set SMS_GATEWAY_URL, SMS_GATEWAY_KEY, and SMS_GATEWAY_SECRET in your .env file',
      'KontroAPI currently supports syssms.com as the SMS provider. Additional providers will be added in future releases.',
    ],
  },
};

export default async function DocsSubPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const key = slug.join('/');
  const page = pages[key];

  if (!page) {
    notFound();
  }

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
        {page.title}
      </h1>
      <div className="mt-10 space-y-5">
        {page.content.map((paragraph, index) => (
          <p
            key={index}
            className="text-base leading-relaxed text-muted-foreground"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({ slug: slug.split('/') }));
}
