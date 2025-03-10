// components/Charts.js
import React, { useState, useEffect } from 'react';
import styles from '../styles/charts.module.css';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Helper to convert currency strings like "₳169,413" to numbers.
const parseCurrency = (value) => parseFloat(value.replace(/[^0-9.]/g, ''));

export default function ChartsFetched() {
  const [proposalsData, setProposalsData] = useState([]);
  const [milestonesData, setMilestonesData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch proposals and milestones concurrently
        const [proposalsRes, milestonesRes] = await Promise.all([
          fetch('/api/sheets/Proposals'),
          fetch('/api/sheets/Milestones'),
        ]);
        const proposalsJson = await proposalsRes.json();
        const milestonesJson = await milestonesRes.json();

        if (proposalsJson && proposalsJson.data) {
          setProposalsData(proposalsJson.data);
        }
        if (milestonesJson && milestonesJson.data) {
          setMilestonesData(milestonesJson.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <div>Loading charts...</div>;
  }

  // --- Proposals Chart Data (Bar Chart with Horizontal Bars) ---
  const proposalLabels = proposalsData.map((item) => item['Title']);
  const budgetData = proposalsData.map((item) => parseCurrency(item['Budget']));
  const fundsDistributedData = proposalsData.map((item) =>
    parseCurrency(item['Funds Distributed'])
  );
  const remainingFundsData = proposalsData.map((item) =>
    parseCurrency(item['Remaining Funds'])
  );

  const proposalsChartData = {
    labels: proposalLabels,
    datasets: [
      {
        label: 'Budget',
        data: budgetData,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
      {
        label: 'Funds Distributed',
        data: fundsDistributedData,
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
      },
      {
        label: 'Remaining Funds',
        data: remainingFundsData,
        backgroundColor: 'rgba(255, 159, 64, 0.6)',
      },
    ],
  };

  // --- Funds Pie Chart Data ---
  const totalFundsDistributed = fundsDistributedData.reduce(
    (sum, curr) => sum + curr,
    0
  );
  const totalRemainingFunds = remainingFundsData.reduce(
    (sum, curr) => sum + curr,
    0
  );

  const fundsPieChartData = {
    labels: ['Funds Distributed', 'Remaining Funds'],
    datasets: [
      {
        data: [totalFundsDistributed, totalRemainingFunds],
        backgroundColor: [
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
        ],
      },
    ],
  };

  // --- Milestone Approvals Pie Chart Data ---
  let approvedCount = 0;
  let notApprovedCount = 0;
  milestonesData.forEach((milestone) => {
    Object.keys(milestone).forEach((key) => {
      if (key.endsWith('Approved')) {
        if (milestone[key] === 'TRUE') {
          approvedCount++;
        } else {
          notApprovedCount++;
        }
      }
    });
  });

  const approvalsPieChartData = {
    labels: ['Approved', 'Not Approved'],
    datasets: [
      {
        data: [approvedCount, notApprovedCount],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)',
        ],
      },
    ],
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Proposals Overview</h2>
      <div className={styles.chartSection}>
        <Bar
          data={proposalsChartData}
          options={{
            indexAxis: 'y', // Makes the bar chart horizontal
            responsive: true,
            plugins: {
              legend: { position: 'top' },
              title: {
                display: true,
                text: 'Proposal Budgets vs. Funds Distributed vs. Remaining Funds',
              },
            },
            scales: {
              x: {
                ticks: { autoSkip: false },
              },
            },
          }}
        />
      </div>

      <h2 className={styles.heading}>Pie Chart Overview</h2>
      <div className={styles.pieChartsWrapper}>
        <div className={styles.pieChartContainer}>
          <Pie
            data={fundsPieChartData}
            options={{
              responsive: true,
              plugins: {
                legend: { position: 'top' },
                title: {
                  display: true,
                  text: 'Total Funds: Distributed vs. Remaining',
                },
              },
            }}
          />
        </div>
        <div className={styles.pieChartContainer}>
          <Pie
            data={approvalsPieChartData}
            options={{
              responsive: true,
              plugins: {
                legend: { position: 'top' },
                title: {
                  display: true,
                  text: 'Milestone Approvals: Approved vs. Not Approved',
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
