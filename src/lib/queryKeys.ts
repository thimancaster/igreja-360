import { QueryClient } from "@tanstack/react-query";

// Constantes centralizadas para query keys
export const QUERY_KEYS = {
  transactions: "transactions",
  transactionStats: "transaction-stats",
  overdueTransactions: "overdue-transactions",
  todaysDueTransactions: "todays-due-transactions",
  dueTransactionAlerts: "due-transaction-alerts",
  installmentStats: "installment-stats",
  filteredTransactions: "filtered-transactions",
  installmentGroup: "installment-group",
} as const;

// Função helper para invalidar todas as queries relacionadas a transações
export const invalidateAllTransactionQueries = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.transactions] });
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.transactionStats] });
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.overdueTransactions] });
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.todaysDueTransactions] });
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dueTransactionAlerts] });
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.installmentStats] });
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.filteredTransactions] });
};
