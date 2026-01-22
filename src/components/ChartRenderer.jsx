import React from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "#22222e",
          border: "1px solid #2a2a38",
          borderRadius: "8px",
          padding: "10px 14px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}
      >
        <p style={{ color: "#f0f0f5", fontWeight: 500, marginBottom: "4px" }}>
          {label}
        </p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color, fontSize: "13px" }}>
            {entry.name}: {entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function ChartRenderer({ chart, compact = false }) {
  const height = compact ? 150 : 200;
  const fontSize = compact ? 10 : 11;

  const commonAxisProps = {
    tick: { fill: "#9090a8", fontSize },
    axisLine: { stroke: "#2a2a38" },
    tickLine: { stroke: "#2a2a38" },
  };

  if (chart.type === "pie") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chart.data}
            cx="50%"
            cy="50%"
            innerRadius={compact ? 30 : 40}
            outerRadius={compact ? 55 : 70}
            paddingAngle={2}
            dataKey="value"
            label={
              compact
                ? false
                : ({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
            }
            labelLine={!compact}
          >
            {chart.data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {!compact && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chart.type === "line") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chart.data}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" />
          <XAxis dataKey="name" {...commonAxisProps} />
          <YAxis {...commonAxisProps} />
          <Tooltip content={<CustomTooltip />} />
          {!compact && <Legend />}
          <Line
            type="monotone"
            dataKey="value"
            stroke={chart.colors?.[0] || "#3d5afe"}
            strokeWidth={2}
            dot={{ fill: chart.colors?.[0] || "#3d5afe", strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6 }}
            name="Series 1"
          />
          {chart.data[0]?.value2 !== undefined && (
            <Line
              type="monotone"
              dataKey="value2"
              stroke={chart.colors?.[1] || "#00e5ff"}
              strokeWidth={2}
              dot={{
                fill: chart.colors?.[1] || "#00e5ff",
                strokeWidth: 0,
                r: 4,
              }}
              activeDot={{ r: 6 }}
              name="Series 2"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chart.type === "area") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={chart.data}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={chart.colors?.[0] || "#3d5afe"}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={chart.colors?.[0] || "#3d5afe"}
                stopOpacity={0}
              />
            </linearGradient>
            <linearGradient id="colorValue2" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={chart.colors?.[1] || "#00e5ff"}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={chart.colors?.[1] || "#00e5ff"}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" />
          <XAxis dataKey="name" {...commonAxisProps} />
          <YAxis {...commonAxisProps} />
          <Tooltip content={<CustomTooltip />} />
          {!compact && <Legend />}
          <Area
            type="monotone"
            dataKey="value"
            stroke={chart.colors?.[0] || "#3d5afe"}
            fillOpacity={1}
            fill="url(#colorValue)"
            strokeWidth={2}
            name="Series 1"
          />
          {chart.data[0]?.value2 !== undefined && (
            <Area
              type="monotone"
              dataKey="value2"
              stroke={chart.colors?.[1] || "#00e5ff"}
              fillOpacity={1}
              fill="url(#colorValue2)"
              strokeWidth={2}
              name="Series 2"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // Default: bar chart
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chart.data}
        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" />
        <XAxis dataKey="name" {...commonAxisProps} />
        <YAxis {...commonAxisProps} />
        <Tooltip content={<CustomTooltip />} />
        {!compact && <Legend />}
        <Bar
          dataKey="value"
          fill={chart.colors?.[0] || "#3d5afe"}
          radius={[4, 4, 0, 0]}
          name="Series 1"
        />
        {chart.data[0]?.value2 !== undefined && (
          <Bar
            dataKey="value2"
            fill={chart.colors?.[1] || "#7c4dff"}
            radius={[4, 4, 0, 0]}
            name="Series 2"
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

export default ChartRenderer;
