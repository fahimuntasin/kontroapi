import { NextRequest, NextResponse } from 'next/server';
import http from 'node:http';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url, secret, session_id } = body;

  if (!url && !session_id) {
    return NextResponse.json({ success: false, message: 'url or session_id required' }, { status: 400 });
  }

  const waEngineUrl = process.env.WA_ENGINE_URL || 'http://127.0.0.1:3000';
  const urlObj = new URL(`${waEngineUrl}/api/v1/webhook/test`);
  
  const postData = JSON.stringify({ url, secret, session_id });
  
  return new Promise<Response>((resolve) => {
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(NextResponse.json(json, { status: res.statusCode }));
        } catch {
          resolve(NextResponse.json({ success: false, message: 'Invalid response' }, { status: 500 }));
        }
      });
    });
    
    req.on('error', (err) => {
      resolve(NextResponse.json({ success: false, message: err.message }, { status: 500 }));
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve(NextResponse.json({ success: false, message: 'Timeout' }, { status: 504 }));
    });
    
    req.write(postData);
    req.end();
  });
}