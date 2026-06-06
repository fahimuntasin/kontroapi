import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const schema = z.object({
  type: z.enum(['cloudflare', 'nginx', 'manual']),
  domain: z.string().optional(),
  apiToken: z.string().optional(),
  token: z.string().optional(),
});

async function getPublicIp(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    return data.ip || 'YOUR_SERVER_IP';
  } catch {
    try {
      const res = await fetch('https://ifconfig.me/ip', { signal: AbortSignal.timeout(5000) });
      return (await res.text()).trim() || 'YOUR_SERVER_IP';
    } catch {
      return 'YOUR_SERVER_IP';
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error?.errors?.[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { type, domain, apiToken, token } = parsed.data;
    const cloudflareToken = apiToken || token;
    const serverIp = await getPublicIp();

    if (type === 'manual') {
      return NextResponse.json({
        success: true,
        data: {
          type: 'manual',
          enginesUrl: 'http://localhost:3000',
          dashboardUrl: 'http://localhost:3001',
        },
      });
    }

    if (type === 'nginx') {
      if (!domain) {
        return NextResponse.json(
          { success: false, error: 'Domain is required for nginx setup' },
          { status: 400 }
        );
      }

      const config = `# KontroAPI Nginx Configuration
# Place this file at: /etc/nginx/sites-available/${domain}
# Then symlink: ln -s /etc/nginx/sites-available/${domain} /etc/nginx/sites-enabled/

server {
    listen 80;
    server_name ${domain};

    # Engine API
    location /engine/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Dashboard
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}`;

      return NextResponse.json({
        success: true,
        data: {
          type: 'nginx',
          config,
          certbotCommand: `certbot --nginx -d ${domain}`,
          instructions: [
            `📌 DNS: Add an A record for ${domain} → ${serverIp}`,
            `Wait for DNS to propagate (1-5 minutes)`,
            ``,
            `📋 Nginx config generated below — copy to your server`,
            `Then run: certbot --nginx -d ${domain}`,
          ],
        },
      });
    }

    if (type === 'cloudflare') {
      if (!domain) {
        return NextResponse.json(
          { success: false, error: 'Domain is required for Cloudflare setup' },
          { status: 400 }
        );
      }
      if (!cloudflareToken) {
        return NextResponse.json(
          { success: false, error: 'API token is required for Cloudflare setup' },
          { status: 400 }
        );
      }

      try {
        const verifyRes = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
          headers: { Authorization: `Bearer ${cloudflareToken}` },
        });

        if (!verifyRes.ok) {
          return NextResponse.json(
            { success: false, error: 'Invalid Cloudflare API token' },
            { status: 400 }
          );
        }

        const zoneRes = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${domain}`, {
          headers: { Authorization: `Bearer ${cloudflareToken}`, 'Content-Type': 'application/json' },
        });

        const zoneData = await zoneRes.json();
        const zone = zoneData?.result?.[0];

        if (!zone) {
          return NextResponse.json(
            { success: false, error: `No Cloudflare zone found for domain: ${domain}` },
            { status: 400 }
          );
        }

        const accountsRes = await fetch('https://api.cloudflare.com/client/v4/accounts?page=1&per_page=1', {
          headers: { Authorization: `Bearer ${cloudflareToken}`, 'Content-Type': 'application/json' },
        });

        const accountsData = await accountsRes.json();
        const account = accountsData?.result?.[0];

        if (!account) {
          return NextResponse.json(
            { success: false, error: 'No Cloudflare account found for this token' },
            { status: 400 }
          );
        }

        const tunnelName = `kontroapi-${domain.replace(/\./g, '-')}`;
        const tunnelRes = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${account.id}/cfd_tunnel`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${cloudflareToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: tunnelName }),
          }
        );

        const tunnelData = await tunnelRes.json();

        if (!tunnelData.success) {
          return NextResponse.json(
            {
              success: false,
              error: `Cloudflare tunnel creation failed: ${tunnelData.errors?.[0]?.message || 'Unknown error'}`,
            },
            { status: 500 }
          );
        }

        const tunnel = tunnelData.result;

        const tokenRes = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${account.id}/cfd_tunnel/${tunnel.id}/token`,
          {
            headers: { Authorization: `Bearer ${cloudflareToken}`, 'Content-Type': 'application/json' },
          }
        );

        const tokenData = await tokenRes.json();
        const tunnelToken = tokenData?.result;

        const dnsRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${cloudflareToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'CNAME',
              name: domain,
              content: `${tunnel.id}.cfargotunnel.com`,
              proxied: true,
            }),
          }
        );

        const dnsData = await dnsRes.json();

        if (process.env.NODE_ENV !== 'production') {
          process.env.KONTROAPI_DOMAIN_TYPE = 'cloudflare';
          process.env.KONTROAPI_TUNNEL_ID = tunnel.id;
          process.env.KONTROAPI_DOMAIN = domain;
        }

        return NextResponse.json({
          success: true,
          data: {
            type: 'cloudflare',
            tunnelToken: tunnelToken,
            tunnelId: tunnel.id,
            dnsRecord: dnsData.result,
          },
        });
      } catch (cfErr: any) {
        console.error('Cloudflare API error:', cfErr);
        return NextResponse.json(
          { success: false, error: `Cloudflare API error: ${cfErr.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Invalid domain type' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Domain setup error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Domain setup failed' },
      { status: 500 }
    );
  }
}
