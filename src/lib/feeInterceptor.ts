/**
 * feeInterceptor.ts
 *
 * Thin re-export so DappRunner can import from @/lib/feeInterceptor
 * while the implementation lives in feeService.ts.
 */
export { handleTransactionWithFees, calculateFeesSync } from './feeService'
export type { FeeInfo, TxParams } from './feeService'
