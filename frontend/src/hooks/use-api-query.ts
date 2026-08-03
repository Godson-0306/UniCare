"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { z } from "zod";

import { apiClient } from "@/lib/api/client";
import { apiResponseSchema } from "@/lib/api/schema";

export function useApiQuery<TSchema extends z.ZodType>(
  queryKey: readonly unknown[],
  endpoint: string,
  schema: TSchema,
  options?: Omit<UseQueryOptions<z.infer<TSchema>>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await apiClient.get(endpoint);
      const parsed = apiResponseSchema(schema).parse(response.data) as
        | { success: true; data: z.infer<TSchema> }
        | { success: false; error: { message: string } };
      if ("error" in parsed) {
        throw new Error(parsed.error.message);
      }
      return parsed.data;
    },
    ...options,
  });
}
