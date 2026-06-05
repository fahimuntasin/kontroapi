"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiveMessage = void 0;
class ReceiveMessage {
    constructor() {
        this.description = {
            displayName: 'KontroAPI Webhook',
            name: 'receiveMessage',
            group: ['trigger'],
            version: 1,
            description: 'Receive WhatsApp webhook events from KontroAPI',
            icon: 'file:kontroapi.svg',
            defaults: {
                name: 'KontroAPI Webhook',
            },
            inputs: [],
            outputs: ['main'],
            credentials: [
                {
                    name: 'kontroapiApi',
                    required: false,
                },
            ],
            webhooks: [
                {
                    name: 'default',
                    httpMethod: 'POST',
                    path: 'kontroapi-webhook',
                    responseMode: 'onReceived',
                    responseData: 'all',
                },
            ],
            properties: [
                {
                    displayName: 'Session ID',
                    name: 'sessionId',
                    type: 'string',
                    required: true,
                    placeholder: 'fbeb8e26-c56f-41e4-bbe7-3000518a59eb',
                    description: 'Your WhatsApp session ID',
                    default: '',
                },
            ],
        };
    }
    async webhook() {
        const bodyData = this.getBodyData();
        const sessionId = this.getNodeParameter('sessionId');
        return {
            webhookResponse: { received: true, sessionId },
            workflowData: [this.helpers.returnJsonArray([bodyData])],
        };
    }
}
exports.ReceiveMessage = ReceiveMessage;
