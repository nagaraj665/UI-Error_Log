import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { LogEntry } from '../lib/supabase';
import { getDisplayCategory } from '../lib/errorCategory';

type ErrorsByCategoryProps = {
  entries: LogEntry[];
};

type CategoryGroup = {
  category: string;
  errors: LogEntry[];
  count: number;
};

export default function ErrorsByCategory({ entries }: ErrorsByCategoryProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const groupedErrors: CategoryGroup[] = entries.reduce((acc, entry) => {
    const category = getDisplayCategory(entry);
    const existing = acc.find(g => g.category === category);
    if (existing) {
      existing.errors.push(entry);
      existing.count++;
    } else {
      acc.push({ category, errors: [entry], count: 1 });
    }
    return acc;
  }, [] as CategoryGroup[]);

  const sortedGroups = groupedErrors.sort((a, b) => b.count - a.count);
  const totalErrors = entries.length;

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mt-8">
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle className="w-6 h-6 text-orange-500" />
        <div>
          <h2 className="text-xl font-bold text-gray-900">Errors by Category</h2>
          <p className="text-sm text-gray-500">Grouped by error category for easier triage</p>
        </div>
      </div>

      <div className="space-y-3">
        {sortedGroups.map((group, index) => {
          const isExpanded = expandedCategories.has(group.category);
          const percentage = ((group.count / totalErrors) * 100).toFixed(0);
          const barWidth = (group.count / totalErrors) * 100;

          return (
            <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory(group.category)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{group.category}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      All errors in this category ({group.count} total)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-900">{group.count} errors</span>
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-pink-500 rounded-full"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-12 text-right">{percentage}%</span>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="bg-gray-50 border-t border-gray-200 p-4">
                  <div className="space-y-3">
                    {group.errors.slice(0, 10).map((error, errorIndex) => (
                      <div key={errorIndex} className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start gap-3">
                          <div className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-700">
                            #{errorIndex + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900 mb-1">
                              {getDisplayCategory(error)}
                            </p>
                            <p className="text-sm font-mono text-gray-900 mb-2">
                              {error.error_msg}
                            </p>
                            <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                              <span>
                                <span className="font-medium">Element:</span> {error.element_name}
                              </span>
                              <span>
                                <span className="font-medium">Parent:</span> {error.parent_element}
                              </span>
                              <span>
                                <span className="font-medium">Line:</span> {error.line}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {group.errors.length > 10 && (
                      <p className="text-sm text-gray-500 text-center">
                        Showing first 10 of {group.errors.length} errors
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
