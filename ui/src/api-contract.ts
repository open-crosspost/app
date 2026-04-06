import type { ContractType as apiContract } from "../../.bos/generated/api/contract.d.ts";
import type { ContractType as templateContract } from "../../.bos/generated/plugins/template/contract.d.ts";

export type ApiContract = apiContract & {
  template: templateContract;
};
