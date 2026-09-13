import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { date, type Snapshot } from "./data";

export default function ProgressHistory({ history }: { history: Snapshot[] }) {
  return (
    <ResponsiveContainer width="100%" height={190}>
      <LineChart
        data={history.map((h) => ({
          month: date(h.month),
          progress: h.progress,
        }))}
        margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
        <Tooltip />
        <Line
          dataKey="progress"
          stroke="#35664a"
          strokeWidth={2.5}
          dot={{ r: 4 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
