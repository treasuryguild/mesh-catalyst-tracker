// ../types/sheets.ts

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

export interface Proposal {
  Budget: string;
  "Collaborator Allocation": string;
  "Funds Distributed": string;
  "Mesh Allocation": string;
  "Mesh Remaining": string;
  "Milestone Quantity": string;
  "Milestones Link": string;
  "Project ID": string;
  "Remaining Funds": string;
  Title: string;
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

export interface ConfigItem {
  "Configuration Key": string;
  Description: string;
  Value: string;
}
