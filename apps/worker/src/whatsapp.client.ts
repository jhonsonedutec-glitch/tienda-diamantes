import { NOTIFICATION_TEMPLATES } from '@ff/shared';

interface SendInput {
  to: string;
  template: string;
  payload: Record<string, unknown>;
}

interface WhatsAppResponse {
  messages?: Array<{ id: string }>;
  error?: { message: string; code?: number };
}

export class WhatsAppClient {
  private readonly enabled = process.env.WHATSAPP_ENABLED === 'true';
  private readonly allowText =
    process.env.WHATSAPP_ALLOW_TEXT_MESSAGES === 'true';

  async send(input: SendInput): Promise<string> {
    if (!this.enabled) {
      console.info(
        `[WhatsApp deshabilitado] ${input.template} para ${maskPhone(input.to)}`,
      );
      return `dev-log:${Date.now()}`;
    }

    const graphVersion = required('WHATSAPP_GRAPH_VERSION');
    const phoneNumberId = required('WHATSAPP_PHONE_NUMBER_ID');
    const accessToken = required('WHATSAPP_ACCESS_TOKEN');
    const configuredTemplate = templateName(input.template);

    const body = configuredTemplate
      ? templateBody(input.to, configuredTemplate, input.payload)
      : this.allowText
        ? textBody(input.to, renderText(input.template, input.payload))
        : null;

    if (!body) {
      throw new Error(
        `No hay plantilla configurada para ${input.template} y los mensajes de texto están deshabilitados.`,
      );
    }

    const response = await fetch(
      `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      },
    );

    const data = (await response.json()) as WhatsAppResponse;
    if (!response.ok || data.error) {
      throw new Error(
        `WhatsApp API: ${data.error?.message ?? `HTTP ${response.status}`}`,
      );
    }

    const messageId = data.messages?.[0]?.id;
    if (!messageId) throw new Error('WhatsApp no devolvió un ID de mensaje.');
    return messageId;
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable ${name}.`);
  return value;
}

function templateName(template: string): string | undefined {
  const mapping: Record<string, string | undefined> = {
    [NOTIFICATION_TEMPLATES.orderCreated]:
      process.env.WHATSAPP_TEMPLATE_ORDER_CREATED,
    [NOTIFICATION_TEMPLATES.receiptReceived]:
      process.env.WHATSAPP_TEMPLATE_RECEIPT_RECEIVED,
    [NOTIFICATION_TEMPLATES.paymentApproved]:
      process.env.WHATSAPP_TEMPLATE_PAYMENT_APPROVED,
    [NOTIFICATION_TEMPLATES.paymentRejected]:
      process.env.WHATSAPP_TEMPLATE_PAYMENT_REJECTED,
    [NOTIFICATION_TEMPLATES.orderCompleted]:
      process.env.WHATSAPP_TEMPLATE_ORDER_COMPLETED,
  };
  return mapping[template] || undefined;
}

function templateBody(
  to: string,
  name: string,
  payload: Record<string, unknown>,
) {
  const parameters = Object.values(payload).map((value) => ({
    type: 'text',
    text: String(value ?? ''),
  }));

  return {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name,
      language: {
        code: process.env.WHATSAPP_LANGUAGE_CODE ?? 'es_PE',
      },
      components: parameters.length
        ? [{ type: 'body', parameters }]
        : undefined,
    },
  };
}

function textBody(to: string, body: string) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body },
  };
}

function renderText(template: string, payload: Record<string, unknown>) {
  const code = String(payload.publicCode ?? '');
  switch (template) {
    case NOTIFICATION_TEMPLATES.orderCreated:
      return `Pedido ${code} creado. Monto: S/ ${payload.amount}. Sube tu comprobante desde el navegador donde creaste el pedido.`;
    case NOTIFICATION_TEMPLATES.receiptReceived:
      return `Recibimos el comprobante del pedido ${code}. Está pendiente de revisión.`;
    case NOTIFICATION_TEMPLATES.paymentApproved:
      return `El pago del pedido ${code} fue aprobado. La recarga está lista para despacho.`;
    case NOTIFICATION_TEMPLATES.paymentRejected:
      return `El comprobante del pedido ${code} fue observado: ${payload.reason}. Puedes subir uno nuevo.`;
    case NOTIFICATION_TEMPLATES.orderCompleted:
      return `El pedido ${code} fue completado correctamente para el UID registrado.`;
    default:
      return `Actualización del pedido ${code}.`;
  }
}

function maskPhone(phone: string) {
  return phone.length > 4 ? `${'*'.repeat(phone.length - 4)}${phone.slice(-4)}` : '****';
}
