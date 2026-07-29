# Lista de verificación para producción

## Infraestructura

- PostgreSQL administrado con backups y recuperación puntual.
- Redis administrado con persistencia.
- TLS obligatorio.
- API y worker desplegados como procesos independientes.
- Variables secretas en un gestor de secretos.

## Seguridad

- Cambiar `JWT_ADMIN_SECRET` por 32 bytes aleatorios o más.
- Activar MFA en cuentas administrativas del proveedor de identidad.
- Restringir CORS al dominio real.
- Activar WAF/rate limiting en el proxy.
- Rotar claves de Supabase y WhatsApp.
- Revisar logs sin exponer tokens, comprobantes o datos completos.
- Añadir antivirus/escaneo de archivos si aumenta el volumen.

## Pagos

- Contrato comercial con la pasarela.
- Webhooks firmados e idempotentes.
- Conciliación diaria de pedidos vs. abonos.
- Procedimiento de reembolso y disputas.
- Monto y moneda validados en backend.

## Despacho

- Usar únicamente distribuidores autorizados.
- Registrar cada intento y referencia externa.
- Evitar doble despacho mediante clave idempotente.
- Alertar errores definitivos como UID inválido.

## Privacidad

- Política de privacidad y términos de servicio.
- Plazo de retención de comprobantes.
- Canal para solicitudes de eliminación/corrección.
- Consentimiento para mensajes por WhatsApp.
