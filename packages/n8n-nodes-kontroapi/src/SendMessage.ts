import {
  IExecuteFunctions,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

export class KontroAPI implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'KontroAPI Send Message',
    name: 'kontroapiSend',
    group: ['output'],
    version: 1,
    description: 'Send WhatsApp messages via KontroAPI',
    icon: 'file:kontroapi.svg',
    defaults: {
      name: 'KontroAPI Send',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'kontroapiApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Session',
        name: 'sessionId',
        type: 'string',
        required: true,
        placeholder: 'Session ID',
        description: 'The WhatsApp session ID to use',
        default: '',
      },
      {
        displayName: 'Recipient',
        name: 'recipient',
        type: 'string',
        required: true,
        placeholder: '8801XXXXXXXX',
        description: 'Recipient phone number (with country code, no + sign)',
        default: '',
      },
      {
        displayName: 'Message Type',
        name: 'messageType',
        type: 'options',
        required: true,
        options: [
          { name: 'Text', value: 'text', description: 'Send plain text message' },
          { name: 'Image', value: 'image', description: 'Send an image' },
          { name: 'Audio', value: 'audio', description: 'Send an audio file' },
          { name: 'Video', value: 'video', description: 'Send a video' },
          { name: 'Document', value: 'document', description: 'Send a document/file' },
          { name: 'Sticker', value: 'sticker', description: 'Send a sticker' },
          { name: 'Location', value: 'location', description: 'Send a location' },
          { name: 'Contact', value: 'contact', description: 'Send a contact' },
        ],
        default: 'text',
      },
      {
        displayName: 'Message',
        name: 'text',
        type: 'string',
        displayOptions: { show: { messageType: ['text'] } },
        required: true,
        placeholder: 'Your message here',
        default: '',
      },
      {
        displayName: 'Image URL',
        name: 'imageUrl',
        type: 'string',
        displayOptions: { show: { messageType: ['image'] } },
        placeholder: 'https://example.com/image.jpg',
        default: '',
      },
      {
        displayName: 'Caption',
        name: 'imageCaption',
        type: 'string',
        displayOptions: { show: { messageType: ['image'] } },
        placeholder: 'Image caption (optional)',
        default: '',
      },
      {
        displayName: 'Audio URL',
        name: 'audioUrl',
        type: 'string',
        displayOptions: { show: { messageType: ['audio'] } },
        placeholder: 'https://example.com/audio.mp3',
        default: '',
      },
      {
        displayName: 'Video URL',
        name: 'videoUrl',
        type: 'string',
        displayOptions: { show: { messageType: ['video'] } },
        placeholder: 'https://example.com/video.mp4',
        default: '',
      },
      {
        displayName: 'Document URL',
        name: 'documentUrl',
        type: 'string',
        displayOptions: { show: { messageType: ['document'] } },
        placeholder: 'https://example.com/file.pdf',
        default: '',
      },
      {
        displayName: 'File Name',
        name: 'documentFileName',
        type: 'string',
        displayOptions: { show: { messageType: ['document'] } },
        placeholder: 'document.pdf',
        default: '',
      },
      {
        displayName: 'Latitude',
        name: 'latitude',
        type: 'number',
        displayOptions: { show: { messageType: ['location'] } },
        placeholder: '23.8103',
        default: 0,
      },
      {
        displayName: 'Longitude',
        name: 'longitude',
        type: 'number',
        displayOptions: { show: { messageType: ['location'] } },
        placeholder: '90.4125',
        default: 0,
      },
      {
        displayName: 'Contact Phone',
        name: 'contactPhone',
        type: 'string',
        displayOptions: { show: { messageType: ['contact'] } },
        placeholder: '8801XXXXXXXX',
        default: '',
      },
    ],
  };

  async execute(this: IExecuteFunctions) {
    const items = this.getInputData();
    const returnData: any[] = [];
    const baseUrl = 'https://wa.kontroapi.com/api/v1';

    for (let i = 0; i < items.length; i++) {
      const sessionId = this.getNodeParameter('sessionId', i) as string;
      const recipient = this.getNodeParameter('recipient', i) as string;
      const messageType = this.getNodeParameter('messageType', i) as string;

      let body: any = { number: recipient, type: messageType };

      switch (messageType) {
        case 'text':
          body.content = this.getNodeParameter('text', i);
          break;
        case 'image':
          body.url = this.getNodeParameter('imageUrl', i);
          body.caption = this.getNodeParameter('imageCaption', i) || '';
          break;
        case 'audio':
          body.url = this.getNodeParameter('audioUrl', i);
          break;
        case 'video':
          body.url = this.getNodeParameter('videoUrl', i);
          break;
        case 'document':
          body.url = this.getNodeParameter('documentUrl', i);
          body.fileName = this.getNodeParameter('documentFileName', i);
          break;
        case 'location':
          body.latitude = this.getNodeParameter('latitude', i);
          body.longitude = this.getNodeParameter('longitude', i);
          break;
        case 'contact':
          body.contact = { phone: this.getNodeParameter('contactPhone', i) };
          break;
      }

      const credentials = await this.getCredentials('kontroapiApi') as any;
      const apiKey = credentials?.apiKey as string;

      try {
        const response = await this.helpers.request({
          url: `${baseUrl}/sessions/${sessionId}/send`,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body,
        });

        returnData.push({
          success: true,
          messageId: response?.data?.messageId,
          response,
        });
      } catch (error: any) {
        returnData.push({
          success: false,
          error: error.message || 'Failed to send',
        });
      }
    }

    return [this.helpers.returnJsonArray(returnData)];
  }
}