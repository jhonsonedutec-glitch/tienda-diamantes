# Añadir una nueva pasarela de pago

La API usa un registro de adaptadores en:

```text
apps/api/src/modules/payments/providers
```

## Contrato

Cada adaptador implementa `PaymentProviderAdapter`:

```ts
interface PaymentProviderAdapter {
  readonly provider: PaymentProvider;
  supports(method: PaymentMethod): boolean;
  createIntent(input: CreatePaymentIntentInput): Promise<CreatedPaymentIntent>;
  verifyWebhook?(input: VerifyWebhookInput): Promise<VerifiedPaymentEvent>;
  queryStatus?(providerReference: string): Promise<PaymentStatus>;
}
```

## Pasos para Culqi, Mercado Pago o Binance Pay

1. Crear el adaptador en `providers/`.
2. Registrar el proveedor en `PaymentProviderRegistry`.
3. Añadir el método permitido en la creación de pedidos.
4. Crear un controlador de webhook independiente.
5. Verificar firma, timestamp, monto, moneda y referencia.
6. Guardar primero el evento en `WebhookEvent`.
7. Usar `provider + providerEventId` como clave idempotente.
8. Marcar `PAID` solo después de una verificación válida.
9. Encolar el despacho fuera del request del webhook.
10. Responder HTTP 200 rápidamente.

## Regla importante

La URL de retorno del navegador no confirma el pago. La confirmación debe provenir de un webhook firmado o de una consulta servidor a servidor.
