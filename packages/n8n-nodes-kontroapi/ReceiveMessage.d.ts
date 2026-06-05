import { IWebhookFunctions, INodeType, INodeTypeDescription } from 'n8n-workflow';
export declare class ReceiveMessage implements INodeType {
    description: INodeTypeDescription;
    webhook(this: IWebhookFunctions): Promise<{
        webhookResponse: {
            received: boolean;
            sessionId: string;
        };
        workflowData: import("n8n-workflow").INodeExecutionData[][];
    }>;
}
//# sourceMappingURL=ReceiveMessage.d.ts.map