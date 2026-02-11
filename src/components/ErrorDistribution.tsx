import { BarChart3 } from 'lucide-react';

type ErrorDistributionProps = {
  data: { category: string; count: number }[];
};

export default function ErrorDistribution({ data }: ErrorDistributionProps) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const sortedData = [...data].sort((a, b) => b.count - a.count).slice(0, 20);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mt-8">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-6 h-6 text-orange-500" />
        <div>
          <h2 className="text-xl font-bold text-gray-900">Error Distribution</h2>
          <p className="text-sm text-gray-500">Visual breakdown of errors by category</p>
        </div>
      </div>

      <div className="space-y-3">
        {sortedData.map((item, index) => {
          const percentage = (item.count / maxCount) * 100;
          return (
            <div key={index} className="flex items-center gap-4">
              <div className="w-32 text-sm text-gray-600 text-right truncate" title={item.category}>
                {item.category}
              </div>
              <div className="flex-1 relative">
                <div className="h-8 bg-gray-100 rounded">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
              <div className="w-16 text-sm text-gray-900 font-medium text-right">
                {item.count}
              </div>
            </div>
          );
        })}
      </div>

      {data.length > 20 && (
        <p className="text-sm text-gray-500 mt-4 text-center">
          Showing top 20 categories out of {data.length} total
        </p>
      )}
    </div>
  );
}
