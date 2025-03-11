// types/sheets.ts

export interface Milestone {
  Title: string;
  "Project ID": string;
  Milestone: string;
  Month: string;
  Cost: string;
  Completion?: string;
  "Evidence Approved"?: string;
  "Funds Distributed"?: string;
  "Last Updated"?: string;
  "Outputs Approved"?: string;
  "POA Content Approved"?: string;
  "POA Signoff Count"?: string;
  "SOM Signoff Count"?: string;
  "Success Criteria Approved"?: string;
  "Total Budget"?: string;
}

// Define the API response structure
export interface Proposal {
  "Project ID": string;
  Title: string;
  Budget: string;
  "Funds Distributed": string;
  "Remaining Funds": string;
  Milestones?: string;
  "Milestones Link"?: string;
  "Collaborator Allocation"?: string;
  "Mesh Allocation"?: string;
  "Mesh Remaining"?: string;
  "Milestone Quantity"?: string;
}

// Define the internal structure used by the component
export interface ProposalData {
  project_id: string;
  title: string;
  budget: string;
  funds_distributed: string;
  remaining_funds: string;
  milestones_qty?: string;
  milestones_link?: string;
}

export interface WalletTransaction {
  "Amount (ADA)": string;
  "Milestone Funds?": string;
  "Project ID": string;
  Timestamp: string;
  "Transaction Hash": string;
  "Wallet Address": string;
}

export interface CollaboratorAllocation {
  "Allocation Amount (ADA)": string;
  "Collaborator Name": string;
  "Last Updated": string;
  "Notes": string;
  "Project ID": string;
  "Test Allocation Pending": string;
  "Test Allocation Received": string;
  "Test Allocation Total": string;
  Title: string;
}

// API response format
export interface ConfigItem {
  "Configuration Key": string;
  Description: string;
  Value: string;
}

// Internal format used in the component
export type ConfigItemArray = [string, string, string?]; // [key, value, description?]