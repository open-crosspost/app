import type { ContractType as BaseApiContract } from "../../api/src/contract.ts";
import type { ContractType as templateContract } from "../../plugins/_template/src/contract.ts";

export type ApiContract = {
  api: BaseApiContract;
  plugins: {
    template: templateContract;
  };
};

