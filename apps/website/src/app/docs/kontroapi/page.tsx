import { cn } from '@/lib/utils';

export default function KontroApiDocPage() {
  return (
    <div>
      <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
        KontroAPI — WhatsApp API Gateway
      </h1>

      <section className="mt-10">
        <h2 className="font-heading text-xl font-semibold text-foreground">
          What is KontroAPI?
        </h2>
        <p className="mt-3 leading-relaxed text-default">
          KontroAPI is an open-source, self-hosted WhatsApp Business API gateway
          that lets you send and receive WhatsApp messages through a simple REST
          API. Built on the Baileys library, it provides a production-ready
          gateway with BullMQ + Redis for queued message delivery, JWT
          authentication, webhook integrations, and a beautiful dashboard UI.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Features
        </h2>
        <ul className="mt-3 space-y-2">
          {[
            'Self-hosted — run on your own infrastructure',
            'REST API for sending and receiving WhatsApp messages',
            'Queue-based delivery with BullMQ + Redis',
            'JWT authentication and API key auth',
            'Webhook signatures for message verification',
            'Dashboard UI with session management and logs',
            'n8n workflow integration node',
            'SMS gateway fallback via syssms.com',
            'Docker compose deployment in 30 seconds',
          ].map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-3 text-default"
            >
              <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {feature}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Architecture
        </h2>
        <p className="mt-3 leading-relaxed text-default">
          KontroAPI uses a microservices architecture with the following
          components:
        </p>
        <ul className="mt-3 space-y-3">
          {[
            {
              name: 'Engine',
              desc: 'The core API server handling WhatsApp connections, message routing, and webhook delivery.',
            },
            {
              name: 'Dashboard',
              desc: 'A web UI for managing sessions, viewing logs, and monitoring system health.',
            },
            {
              name: 'Redis',
              desc: 'Message queue and session state store via BullMQ.',
            },
            {
              name: 'PostgreSQL',
              desc: 'Persistent storage for messages, sessions, contacts, and user accounts.',
            },
          ].map((item) => (
            <li key={item.name} className="rounded-xl border border-border p-4">
              <h3 className="font-heading text-sm font-semibold text-foreground">
                {item.name}
              </h3>
              <p className="mt-1 text-sm text-default">{item.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Quick Start
        </h2>
        <div
          className={cn(
            'mt-4 overflow-x-auto rounded-xl border border-border bg-black p-4 sm:p-6'
          )}
        >
          <pre className="font-mono text-[13px] leading-7">
            <code>
              <span className="text-gray-400">
                $ npm install -g @kontroapis/cli{'\n'}
              </span>
              <span className="text-gray-400">
                $ kontroapi init{'\n'}
              </span>
              <span className="text-gray-400">
                $ kontroapi start -d{'\n'}
              </span>
              <span className="text-gray-400">
                $ curl http://localhost:3000/health{'\n'}
              </span>
              <span className="text-blue-400">
                {'  '}
                {'{'}&quot;status&quot;:&quot;ok&quot;,&quot;version&quot;:&quot;0.1.0&quot;
                {'}'}
              </span>
            </code>
          </pre>
        </div>
      </section>
    </div>
  );
}
