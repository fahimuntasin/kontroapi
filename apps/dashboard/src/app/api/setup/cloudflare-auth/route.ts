import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const domain = searchParams.get('domain');

    const clientId = process.env.CL_CLIENT_ID;
    const clientSecret = process.env.CL_CLIENT_SECRET;
    const redirectUri = process.env.CL_REDIRECT_URI || 'http://localhost:3001/api/setup/cloudflare-auth';

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        success: false,
        error: 'Cloudflare OAuth not configured. Contact admin.',
        setup: true,
      });
    }

    if (code) {
      const tokenRes = await fetch('https://dash.cloudflare.com/api/v4/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenRes.ok) {
        try {
          const errData = await tokenRes.json();
          console.error('CF token exchange failed:', errData);
        } catch {}
        return NextResponse.json({
          success: false,
          error: 'Authorization failed. Please try again.',
        });
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      if (!accessToken) {
        return NextResponse.json({
          success: false,
          error: 'Authorization failed. No access token received.',
        });
      }

      try {
        const accountsRes = await fetch(
          'https://api.cloudflare.com/client/v4/accounts?page=1&per_page=1',
          { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
        );
        const accountsData = await accountsRes.json();
        const account = accountsData?.result?.[0];

        if (!account) {
          return NextResponse.json({
            success: false,
            error: 'No Cloudflare account found.',
          });
        }

        const tunnelName = `kontroapi-tunnel`;
        const tunnelRes = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${account.id}/cfd_tunnel`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: tunnelName }),
          }
        );
        const tunnelData = await tunnelRes.json();

        if (!tunnelData.success) {
          return NextResponse.json({
            success: false,
            error: `Tunnel creation failed: ${tunnelData.errors?.[0]?.message || 'Unknown error'}`,
          });
        }

        const tunnel = tunnelData.result;
        const tunnelId = tunnel.id;

        const tunnelTokenRes = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${account.id}/cfd_tunnel/${tunnelId}/token`,
          { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
        );
        const tunnelTokenData = await tunnelTokenRes.json();
        const tunnelToken = tunnelTokenData?.result;

        if (domain) {
          try {
            const zoneRes = await fetch(
              `https://api.cloudflare.com/client/v4/zones?name=${domain}`,
              { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
            );
            const zoneData = await zoneRes.json();
            const zone = zoneData?.result?.[0];

            if (zone) {
              await fetch(
                `https://api.cloudflare.com/client/v4/zones/${zone.id}/dns_records`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    type: 'CNAME',
                    name: domain,
                    content: `${tunnelId}.cfargotunnel.com`,
                    proxied: true,
                  }),
                }
              );
            }
          } catch (dnsErr) {
            console.error('DNS record creation failed:', dnsErr);
          }
        }

        const redirectUrl = new URL('/setup', request.url);
        redirectUrl.searchParams.set('cloudflare', 'connected');
        redirectUrl.searchParams.set('tunnelToken', String(tunnelToken || ''));
        redirectUrl.searchParams.set('tunnelId', tunnelId);
        if (domain) redirectUrl.searchParams.set('domain', domain);

        return NextResponse.redirect(redirectUrl.toString());
      } catch (cfErr: any) {
        console.error('Cloudflare setup error:', cfErr);
        return NextResponse.json({
          success: false,
          error: `Tunnel creation failed: ${cfErr.message}`,
        });
      }
    }

    const stateToken = crypto.randomUUID();
    const authUrl = new URL('https://dash.cloudflare.com/api/v4/oauth/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', stateToken);
    authUrl.searchParams.set('scope', 'account:read zone:read zone:dns:edit');

    return NextResponse.json({
      url: authUrl.toString(),
      state: stateToken,
    });
  } catch (err: any) {
    console.error('Cloudflare auth error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Cloudflare auth failed' },
      { status: 500 }
    );
  }
}
