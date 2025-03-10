// ../types/types.ts

// Type for a single transaction item in txData
export interface TxDataItem {
  block_height: number;
  block_time: number;
  epoch_no: number;
  tx_hash: string;
}

// Type for grouping a project's transactions
export interface ProjectTxData {
  projectId: string;
  txs: TxDataItem[];
}

// ------------------------------
// Basic Supporting Types
// ------------------------------

// Payment address structure
export interface PaymentAddress {
  bech32: string;
  cred: string;
}

// Inline datum attached to a UTxO (CIP-32)
export interface InlineDatum {
  bytes: string;
  value: Record<string, unknown>;
}

// Reference script attached to a UTxO (CIP-33)
export interface ReferenceScript {
  hash: string;
  size: number;
  type: string;
  bytes: string;
  value: Record<string, unknown>;
}

// Asset attached to a UTxO
export interface Asset {
  policy_id: string;
  asset_name: string | null;
  fingerprint: string;
  decimals: number;
  quantity: string;
}

// UTxO represents a transaction output (and is reused for inputs, collateral outputs, and reference inputs)
export interface UTxO {
  payment_addr: PaymentAddress;
  stake_addr: string | null;
  tx_hash: string;
  tx_index: number;
  value: string;
  datum_hash: string | null;
  inline_datum: InlineDatum | null;
  reference_script: ReferenceScript | null;
  asset_list: Asset[] | null;
}

// ------------------------------
// Advanced Transaction Structures
// ------------------------------

// Certificate structure with allowed types
export type CertificateType =
  | 'delegation'
  | 'stake_registration'
  | 'stake_deregistration'
  | 'pool_update'
  | 'pool_retire'
  | 'param_proposal'
  | 'reserve_MIR'
  | 'treasury_MIR';

export interface Certificate {
  index: number | null;
  type: CertificateType;
  info: Record<string, unknown> | null;
}

// Native scripts used in the transaction
export interface NativeScript {
  script_hash: string | null;
  script_json: Record<string, unknown> | null;
}

// Plutus contract details (if any) in the transaction
export type RedeemerPurpose = 'spend' | 'mint' | 'cert' | 'reward';

export interface PlutusContract {
  address: string | null;
  spends_input: {
    script_hash: string | null;
    bytecode: string | null;
    size: number;
    valid_contract: boolean;
  };
  input: {
    redeemer: {
      purpose: RedeemerPurpose;
      fee: string;
      unit: {
        steps: string | number | null;
        mem: string | number | null;
      };
    };
  };
  datum: {
    hash: string | null;
    value: Record<string, unknown> | null;
  };
}

// Voting procedures within the transaction (governance votes)
export type VoterRole = 'ConstitutionalCommittee' | 'DRep' | 'SPO';
export type VoteType = 'Yes' | 'No' | 'Abstain';

export interface VotingProcedure {
  proposal_tx_hash: string;
  proposal_index: number;
  voter_role: VoterRole;
  voter: string;
  voter_hex: string;
  vote: VoteType;
}

// Governance proposals included in the transaction
export type ProposalType =
  | 'ParameterChange'
  | 'HardForkInitiation'
  | 'TreasuryWithdrawals'
  | 'NoConfidence'
  | 'NewCommittee'
  | 'NewConstitution'
  | 'InfoAction';

export interface ProposalProcedure {
  index: number;
  type: ProposalType;
  description: Record<string, unknown> | null;
  deposit: string | null;
  return_address: string;
  expiration: number | null;
  meta_url: string | null;
  meta_hash: string | null;
}

// Transaction withdrawals (an array of UTxO withdrawals)
export interface Withdrawal {
  amount: string;
  stake_addr: string;
}

// Governance withdrawal – specific to proposals (singular)
export interface GovernanceWithdrawal {
  stake_address: string;
  amount: string;
}

// Parameter proposal for governance actions.
// The structure is not fully detailed in the schema so we use a generic record.
export interface ParamProposal {
  details: Record<string, unknown>;
}

// ------------------------------
// Top-Level Transaction Information
// ------------------------------

export interface TxInfoData {
  // Basic transaction properties
  tx_hash: string;
  block_hash: string;
  block_height: number | null;
  epoch_no: number;
  epoch_slot: number;
  absolute_slot: number;
  tx_timestamp: number;
  tx_block_index: number;
  tx_size: number;
  total_output: string;
  fee: string;
  treasury_donation: string;
  deposit: string;
  invalid_before: string | null;
  invalid_after: string | null;

  // UTxO arrays
  collateral_inputs: UTxO[] | null;
  collateral_output: UTxO[] | null;
  inputs: UTxO[];
  outputs: UTxO[];
  reference_inputs: UTxO[] | null;

  // Other transaction components
  withdrawals: Withdrawal[] | null;
  assets_minted: Asset[] | null;
  metadata: Record<string, unknown> | null;
  certificates: Certificate[] | null;
  native_scripts: NativeScript[] | null;
  plutus_contracts: PlutusContract[] | null;
  voting_procedures: VotingProcedure[] | null;
  proposal_procedures: ProposalProcedure[] | null;
  withdrawal: GovernanceWithdrawal | null;
  param_proposal: ParamProposal | null;
}
