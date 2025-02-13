// components/Charts.js
import React, { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
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

  // --- Proposals Chart Data ---
  // Extract proposals labels and values by stripping out the currency symbols.
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

  // --- Milestones Chart Data ---
  // For the milestones chart, we’ll filter the data for one project (e.g. Project ID "1000107")
  const projectMilestones = milestonesData.filter(
    (item) => item['Project ID'] === "1000107"
  );

  // Sort milestones by the Milestone number (assuming numeric order)
  projectMilestones.sort((a, b) => Number(a.Milestone) - Number(b.Milestone));

  const milestoneLabels = projectMilestones.map(
    (item) => `Milestone ${item.Milestone}`
  );
  const completionData = projectMilestones.map((item) =>
    Number(item.Completion)
  );

  const milestonesChartData = {
    labels: milestoneLabels,
    datasets: [
      {
        label: 'Completion',
        data: completionData,
        fill: false,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
      },
    ],
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Proposals Overview</h2>
      <Bar
        data={proposalsChartData}
        options={{
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
              ticks: { autoSkip: false, maxRotation: 90, minRotation: 45 },
            },
          },
        }}
      />

      <h2 className="text-2xl font-bold my-8">
        Milestones Completion (Project: MeshJS SDK Operations)
      </h2>
      <Line
        data={milestonesChartData}
        options={{
          responsive: true,
          plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Milestone Completion Progress' },
          },
        }}
      />
    </div>
  );
}
