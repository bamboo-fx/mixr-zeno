import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "./auth-client";

export const SESSION_QUERY_KEY = ["auth-session"] as const;

export const useSession = () => {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      const result = await authClient.getSession();
      return result.data ?? null;
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useInvalidateSession = () => {
  const queryClient = useQueryClient();
  return async () => {
    // Immediately set session to null so guards re-evaluate right away,
    // then refetch to confirm with the server
    queryClient.setQueryData(SESSION_QUERY_KEY, null);
    await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
  };
};
