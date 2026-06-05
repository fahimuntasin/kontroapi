# KontroAPI n8n Nodes

Custom n8n workflow nodes for KontroAPI WhatsApp integration.

## Installation

### For n8n community nodes

```bash
npm install @kontroapi/n8n-nodes
```

### For self-hosted n8n

Add to your n8n configuration:

```json
{
  "nodesExcludes": ["@kontroapi/n8n-nodes"]
}
```

## Nodes

### KontroAPI Send Message

Send WhatsApp messages via KontroAPI.

**Message Types:**
- Text
- Image
- Audio
- Video
- Document
- Sticker
- Location
- Contact

**Parameters:**
- `sessionId` - Your WhatsApp session ID
- `recipient` - Phone number (with country code, no + sign)
- `messageType` - Type of message to send
- `content` - Message content based on type

### KontroAPI Receive Message

Webhook trigger for receiving WhatsApp messages.

**Events:**
- `messages.received` - Incoming messages
- `messages.sent` - Sent messages
- `messages.update` - Message status updates
- `session.status` - Session connect/disconnect
- `qrcode.updated` - New QR code generated
- `contacts.upsert` - Contact updates
- `groups.upsert` - Group updates

## Authentication

Requires KontroAPI API key with format `YOUR_API_KEY`.

Get your API key from: https://dashboard.kontroapi.com/settings/api

## Usage Example

```
┌─────────────────────┐
│  KontroAPI Receive  │
│  (Webhook Trigger)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Slack Notification │
│  (Send message)     │
└─────────────────────┘
```

## License

MIT