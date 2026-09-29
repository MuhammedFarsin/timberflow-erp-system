REVOKE EXECUTE ON FUNCTION public.is_owner(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_member(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.ensure_business(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.create_sale(jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.receive_purchase(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_owner(uuid), public.is_member(uuid), public.ensure_business(text), public.create_sale(jsonb), public.receive_purchase(uuid) TO authenticated;