import { FileText, AlertCircle, BarChart3 } from 'lucide-react';

type StatisticsCardsProps = {
  totalEntries: number;
  totalErrors: number;
  categoriesFound: number;
};

export default function StatisticsCards({ totalEntries, totalErrors, categoriesFound }: StatisticsCardsProps) {
  const errorPercentage = totalEntries > 0 ? ((totalErrors / totalEntries) * 100).toFixed(1) : '0.0';

  return (
    <div className="grid grid-cols-3 gap-6 mt-8">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-gray-600" />
          </div>
          <span className="text-sm font-medium text-gray-600">Total Entries</span>
        </div>
        <p className="text-3xl font-bold text-gray-900">{totalEntries.toLocaleString()}</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <span className="text-sm font-medium text-gray-600">Total Errors</span>
        </div>
        <p className="text-3xl font-bold text-red-500">{totalErrors.toLocaleString()}</p>
        <p className="text-sm text-gray-500 mt-1">{errorPercentage}% of total entries</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-orange-500" />
          </div>
          <span className="text-sm font-medium text-gray-600">Categories Found</span>
        </div>
        <p className="text-3xl font-bold text-gray-900">{categoriesFound}</p>
      </div>
    </div>
  );
}
