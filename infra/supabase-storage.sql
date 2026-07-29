-- Ejecutar en el SQL Editor de Supabase.
-- El bucket queda privado y solo el backend con service_role accede a él.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'payment-receipts',
  'payment-receipts',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No se crean políticas para anon/authenticated porque el navegador
-- nunca sube directamente. El backend usa service_role y valida el pedido.
