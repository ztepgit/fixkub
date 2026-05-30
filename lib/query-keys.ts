export const queryKeys = {
  queues: {
    all: ['queues'] as const,
    list: (shopId: string) => [...queryKeys.queues.all, shopId] as const,
    detail: (shopId: string, jobId: string) => [...queryKeys.queues.list(shopId), jobId] as const,
  },
  reports: {
    all: ['reports'] as const,
    stats: (shopId: string) => [...queryKeys.reports.all, shopId] as const,
  }
}