REVOKE EXECUTE ON FUNCTION public.can_manage_followers(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sync_space_account_follower() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.guard_space_account_follower_delete() FROM anon, authenticated, public;