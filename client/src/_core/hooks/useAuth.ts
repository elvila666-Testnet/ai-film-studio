import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";

export function useAuth() {
  const me = trpc.auth.me.useQuery(undefined, {
    retry: false
  });

  function login(provider?: string) {
    window.location.href = getLoginUrl(provider);
  }

  function logout() {
    window.location.href = "/api/auth/logout";
  }

  return { me, login, logout };
}
