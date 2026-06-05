import {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class KontroApiApi implements ICredentialType {
  name = 'kontroapiApi';
  displayName = 'KontroAPI API';
  documentationUrl = 'https://docs.kontroapi.com';
  icon = 'file:kontroapi.svg' as any;
  
  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      required: true,
      placeholder: 'YOUR_API_KEY',
      default: '',
      description: 'Your KontroAPI API key',
      typeOptions: {
        password: true,
      },
    },
  ];
}