interface StatBoxesProps {
  stats: Array<{
    label: string;
    count: number;
    color: string;
  }>;
}

export function StatBoxes({ stats }: StatBoxesProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div 
          key={stat.label} 
          className="bg-white border-2 p-4 text-center"
          style={{ borderColor: stat.color }}
        >
          <div className="text-3xl mb-1" style={{ color: stat.color }}>
            {stat.count}
          </div>
          <div className="text-sm text-gray-600">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
