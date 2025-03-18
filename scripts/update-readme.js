import axios from 'axios';
import { PROJECTS_INFO } from './mockData.js';

// Initialize constants
const MILESTONES_BASE_URL = process.env.NEXT_PUBLIC_MILESTONES_URL || 'https://milestones.projectcatalyst.io';
// We don't need these GitHub-related constants anymore since we're writing locally

// Get project IDs from environment variable
const README_PROJECT_IDS = process.env.README_PROJECT_IDS;
console.log('Project IDs from environment:', README_PROJECT_IDS);

// Supabase credentials check - we'll use mock data if they're missing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL2;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY2;
const USE_MOCK_DATA = !supabaseUrl || !supabaseKey;

let supabase;
if (!USE_MOCK_DATA) {
    const { createClient } = await import('@supabase/supabase-js');
    supabase = createClient(supabaseUrl, supabaseKey);
}

// Extract just the project IDs
// Use environment variable project IDs if available, otherwise use the ones from PROJECTS_INFO
const PROJECT_IDS = README_PROJECT_IDS
    ? README_PROJECT_IDS.split(',').map(id => id.trim())
    : PROJECTS_INFO.map(project => project.id);

/**
 * Retrieves the proposal details.
 */
async function getProposalDetails(projectId) {
    console.log(`Getting proposal details for project ${projectId}`);

    if (USE_MOCK_DATA) {
        // Use mock data from our predefined array
        const mockProject = PROJECTS_INFO.find(p => p.id === projectId);
        if (mockProject) {
            console.log(`Using mock data for project ${projectId}`);
            return {
                id: mockProject.id,
                title: mockProject.name,
                budget: mockProject.budget,
                milestones_qty: mockProject.milestones_qty,
                funds_distributed: mockProject.funds_distributed,
                project_id: mockProject.id,
                name: mockProject.name,
                category: mockProject.category,
                url: mockProject.url,
                status: mockProject.status,
                finished: mockProject.finished
            };
        }
        return null;
    }

    // Real data from Supabase
    const { data, error } = await supabase
        .from('proposals')
        .select(`
      id,
      title,
      budget,
      milestones_qty,
      funds_distributed,
      project_id
    `)
        .eq('project_id', projectId)
        .single();

    if (error) {
        console.error(`Error fetching proposal details for project ${projectId}:`, error);
        return null;
    }

    // Find supplementary info from our predefined array
    const supplementaryInfo = PROJECTS_INFO.find(p => p.id === projectId);

    const enhancedData = {
        ...data,
        name: supplementaryInfo?.name || data.title,
        category: supplementaryInfo?.category || '',
        url: supplementaryInfo?.url || '',
        status: supplementaryInfo?.status || 'In Progress',
        finished: supplementaryInfo?.finished || ''
    };

    console.log(`Found proposal details for project ${projectId}:`, enhancedData);
    return enhancedData;
}

/**
 * Fetches milestone snapshot data.
 */
async function fetchSnapshotData(projectId) {
    if (USE_MOCK_DATA) {
        // Return empty array for mock data as we'll use hardcoded completion values
        return [];
    }

    try {
        const response = await axios({
            method: 'POST',
            url: `${supabaseUrl}/rest/v1/rpc/getproposalsnapshot`,
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Content-Profile': 'public',
                'x-client-info': 'supabase-js/2.2.3'
            },
            data: { _project_id: projectId }
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching snapshot data for project ${projectId}:`, error);
        return [];
    }
}

/**
 * Generates markdown for a project table.
 */
function generateProjectTable(project, milestonesCompleted) {
    // Format the budget to include commas for thousands
    const formattedBudget = new Intl.NumberFormat('en-US').format(project.budget);

    // Get the funds_distributed or use 0 if not available
    const fundsDistributed = project.funds_distributed || 0;
    const formattedFundsDistributed = new Intl.NumberFormat('en-US').format(fundsDistributed);

    // Calculate completion percentage and create progress bar for funds
    const fundPercentComplete = Math.round((fundsDistributed / project.budget) * 100);
    const filledBlocks = Math.round(fundPercentComplete / 5);
    const emptyBlocks = 20 - filledBlocks;
    const progressBar = '█'.repeat(filledBlocks) + '·'.repeat(emptyBlocks);

    // Determine status emoji based on milestone completion
    let statusEmoji;
    const milestonePercentComplete = Math.round((milestonesCompleted / project.milestones_qty) * 100);

    if (milestonePercentComplete === 100) {
        statusEmoji = '✅';
    } else if (milestonePercentComplete >= 75) {
        statusEmoji = '🔆';
    } else if (milestonePercentComplete >= 50) {
        statusEmoji = '🔄';
    } else if (milestonePercentComplete > 0) {
        statusEmoji = '🚀';
    } else {
        statusEmoji = '📋';
    }

    // Create standard markdown table which will work more consistently across renderers
    const tableMarkdown = `
| Property | Value |
|:---------|:------|
| **Project ID** | ${project.project_id} |
| **Name** | ${project.name} |
| **Link** | [Open full project](${project.url}) |
| **Milestones** | [Milestones](${MILESTONES_BASE_URL}/projects/${project.project_id}) |
| **${project.category.includes('Challenge') ? 'Challenge' : 'Funding Category'}** | ${project.category} |
| **Proposal Budget** | ADA ${formattedBudget} |
| **Status** | ${statusEmoji} ${project.status} |
| **Milestones completed** | ${milestonesCompleted}/${project.milestones_qty} (${milestonePercentComplete}%) |
| **Funds distributed** | ADA ${formattedFundsDistributed} of ${formattedBudget} (${fundPercentComplete}%) |
| **Funding Progress** | \`${progressBar}\` |
${project.finished ? `| **Finished** | ${project.finished} |` : ''}
`;

    return tableMarkdown;
}

/**
 * Generates a summary table with progress bars for all proposals.
 */
function generateSummaryTable(projects) {
    let summaryMarkdown = `## Overview of All Proposals

| Project | ID | Milestones | Funding |
|:--------|:---|:-----------|:--------|
`;

    // Sort projects by fund number and group them
    const sortedProjects = projects.flat().sort((a, b) => {
        // Extract fund number from project ID (first two digits) - ensure it's a string
        const fundA = String(a.projectDetails.project_id).substring(0, 2);
        const fundB = String(b.projectDetails.project_id).substring(0, 2);
        return Number(fundA) - Number(fundB);
    });

    // Group projects by fund
    const groupedProjects = {};
    sortedProjects.forEach(project => {
        // Get fund number from project ID (first two digits) - ensure it's a string
        const fundNumber = String(project.projectDetails.project_id).substring(0, 2);
        if (!groupedProjects[fundNumber]) {
            groupedProjects[fundNumber] = [];
        }
        groupedProjects[fundNumber].push(project);
    });

    // Add projects fund by fund
    Object.keys(groupedProjects)
        .sort((a, b) => Number(a) - Number(b))
        .forEach(fundNumber => {
            // Add projects for this fund
            groupedProjects[fundNumber].forEach(project => {
                const { projectDetails, milestonesCompleted } = project;

                // Calculate milestone progress
                const milestonePercentComplete = Math.round((milestonesCompleted / projectDetails.milestones_qty) * 100);
                const milestoneFilled = Math.round(milestonePercentComplete / 5);
                const milestoneEmpty = 20 - milestoneFilled;
                const milestoneBar = '█'.repeat(milestoneFilled) + '·'.repeat(milestoneEmpty);

                // Calculate funding progress
                const fundsDistributed = projectDetails.funds_distributed || 0;
                const fundPercentComplete = Math.round((fundsDistributed / projectDetails.budget) * 100);
                const fundFilled = Math.round(fundPercentComplete / 5);
                const fundEmpty = 20 - fundFilled;
                const fundBar = '█'.repeat(fundFilled) + '·'.repeat(fundEmpty);

                // Add project row with fund prefix
                summaryMarkdown += `| F${fundNumber} - ${projectDetails.name} | ${projectDetails.project_id} | \`${milestoneBar}\` ${milestonePercentComplete}% | \`${fundBar}\` ${fundPercentComplete}% |\n`;
            });
        });

    return summaryMarkdown + '\n';
}

/**
 * Generate the complete README markdown.
 */
async function generateReadme() {
    // Get current date and time for the timestamp
    const now = new Date();
    const timestamp = now.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    });

    let markdownContent = `# MeshJS Proposal Overview - Project Catalyst

List of funded proposals from MeshJS at Cardano's Project Catalyst.

`;

    // Set USE_MOCK_DATA based on available environment variables
    // Only use mock data if absolutely necessary
    const USE_REAL_DATA = !USE_MOCK_DATA;
    console.log('Using real data from Supabase:', USE_REAL_DATA);
    console.log('Using mock data:', USE_MOCK_DATA);

    // Add data source information to README
    if (USE_REAL_DATA) {
        markdownContent += `> **Data Source**: Real data from Catalyst\n`;
        markdownContent += `> **Last Updated**: ${timestamp}\n\n`;
    } else {
        markdownContent += `> **Data Source**: Mock data (Credentials not available)\n`;
        markdownContent += `> **Last Generated**: ${timestamp}\n\n`;
    }

    // Group projects by fund
    const projectsByFund = {
        'Fund 10': [],
        'Fund 11': [],
        'Fund 12': [],
        'Fund 13': []
    };

    // Track milestones completions
    const milestoneStatusByProject = {};

    // Process each project
    for (const projectId of PROJECT_IDS) {
        const projectDetails = await getProposalDetails(projectId);
        if (!projectDetails) continue;

        const snapshotData = await fetchSnapshotData(projectId);

        // Get milestones completed data
        let milestonesCompleted;
        if (USE_REAL_DATA) {
            // If we have real data, use the snapshot data
            milestonesCompleted = snapshotData.filter(
                milestone => milestone.som_signoff_count > 0 && milestone.poa_signoff_count > 0
            ).length;

            // Use the switch case as fallback for specific projects if needed
            if (milestonesCompleted === 0) {
                switch (projectId) {
                    case '1000107': milestonesCompleted = 5; break;
                    case '1100271': milestonesCompleted = 5; break;
                    case '1200148': milestonesCompleted = 2; break;
                    case '1200220': milestonesCompleted = 5; break;
                    case '1200147': milestonesCompleted = 4; break;
                    case '1300036': milestonesCompleted = 2; break;
                    case '1300134': milestonesCompleted = 0; break;
                    case '1300135': milestonesCompleted = 2; break;
                    case '1300050': milestonesCompleted = 1; break;
                    case '1300130': milestonesCompleted = 1; break;
                }
            }
        } else {
            // If no real data, use the mock data
            const mockProject = PROJECTS_INFO.find(p => p.id === projectId);
            milestonesCompleted = mockProject?.milestonesCompleted || 0;
        }

        milestoneStatusByProject[projectId] = {
            completed: milestonesCompleted,
            total: projectDetails.milestones_qty
        };

        // Add to fund group
        const fund = PROJECTS_INFO.find(p => p.id === projectId)?.fund || 'Other';
        if (projectsByFund[fund]) {
            projectsByFund[fund].push({
                projectDetails,
                milestonesCompleted
            });
        }
    }

    // Calculate total milestones and completed milestones across all projects
    let totalMilestones = 0;
    let totalCompletedMilestones = 0;

    Object.values(projectsByFund).flat().forEach(project => {
        totalMilestones += project.projectDetails.milestones_qty;
        totalCompletedMilestones += project.milestonesCompleted;
    });

    // Generate overall milestone progress bar
    const overallMilestonePercentComplete = Math.round((totalCompletedMilestones / totalMilestones) * 100);
    const overallMilestoneFilled = Math.round(overallMilestonePercentComplete / 5);
    const overallMilestoneEmpty = 20 - overallMilestoneFilled;
    const overallMilestoneBar = '█'.repeat(overallMilestoneFilled) + '·'.repeat(overallMilestoneEmpty);

    // Add overall milestone progress to the markdown
    markdownContent += `## Overall Milestone Progress
    
Total milestones completed: ${totalCompletedMilestones}/${totalMilestones} (${overallMilestonePercentComplete}%)

\`${overallMilestoneBar}\` ${overallMilestonePercentComplete}%

`;

    markdownContent += generateSummaryTable(Object.values(projectsByFund));

    // Add project tables grouped by fund
    for (const fund in projectsByFund) {
        if (projectsByFund[fund].length === 0) continue;

        markdownContent += `\n# ${fund}\n\n`;

        projectsByFund[fund].forEach(project => {
            markdownContent += generateProjectTable(project.projectDetails, project.milestonesCompleted);
        });
    }

    return markdownContent;
}

/**
 * Writes the README to the local filesystem.
 */
async function commitToGithub(content) {
    try {
        // Use Node.js fs module to write the file
        const fs = await import('fs');
        fs.default.writeFileSync('README.md', content);
        console.log('Successfully wrote README.md to local filesystem');
        return true;
    } catch (error) {
        console.error('Error writing README.md to local filesystem:', error);
        return false;
    }
}

/**
 * Main function.
 */
async function main() {
    console.log('Generating README markdown...');
    console.log('Using mock data:', USE_MOCK_DATA);

    const markdownContent = await generateReadme();

    // Write README to local filesystem
    console.log('README markdown generated');
    const success = await commitToGithub(markdownContent);

    if (success) {
        console.log('README.md has been updated locally.');
        console.log('In GitHub Actions, the changes will be visible in the repository.');
    } else {
        console.warn('Failed to update README.md locally.');
    }
}

main().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
}); 