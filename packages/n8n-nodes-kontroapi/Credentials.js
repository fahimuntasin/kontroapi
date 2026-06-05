"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KontroApiApi = void 0;
class KontroApiApi {
    constructor() {
        this.name = 'kontroapiApi';
        this.displayName = 'KontroAPI API';
        this.documentationUrl = 'https://docs.kontroapi.com';
        this.icon = 'file:kontroapi.svg';
        this.properties = [
            {
                displayName: 'API Key',
                name: 'apiKey',
                type: 'string',
                required: true,
                placeholder: 'sk_live_...',
                default: '',
                description: 'Your KontroAPI API key',
                typeOptions: {
                    password: true,
                },
            },
        ];
    }
}
exports.KontroApiApi = KontroApiApi;
