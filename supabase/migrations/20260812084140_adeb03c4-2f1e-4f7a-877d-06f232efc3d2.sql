
REVOKE EXECUTE ON FUNCTION public.ensure_business(text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.receive_purchase(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.create_sale(jsonb) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.is_member(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_business(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_purchase(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sale(jsonb) TO authenticated;
