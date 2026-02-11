import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

type FilterPanelProps = {
  customers: string[];
  projects: string[];
  stages: string[];
  selectedCustomers: string[];
  selectedProjects: string[];
  selectedStages: string[];
  selectedDOI: string;
  onCustomersChange: (customers: string[]) => void;
  onProjectsChange: (projects: string[]) => void;
  onStagesChange: (stages: string[]) => void;
  onDOIChange: (doi: string) => void;
};

export default function FilterPanel({
  customers,
  projects,
  stages,
  selectedCustomers,
  selectedProjects,
  selectedStages,
  selectedDOI,
  onCustomersChange,
  onProjectsChange,
  onStagesChange,
  onDOIChange,
}: FilterPanelProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement>>({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      let isClickingDropdown = false;

      for (const ref of Object.values(dropdownRefs.current)) {
        if (ref?.contains(target)) {
          isClickingDropdown = true;
          break;
        }
      }

      if (!isClickingDropdown) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const toggleMultiSelect = (value: string, selected: string[], onChange: (items: string[]) => void) => {
    if (selected.includes(value)) {
      onChange(selected.filter(item => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const renderMultiSelectDropdown = (
    name: string,
    label: string,
    options: string[],
    selected: string[],
    onChange: (items: string[]) => void
  ) => (
    <div
      ref={(el) => {
        if (el) dropdownRefs.current[name] = el;
      }}
      className="relative"
    >
      <button
        onClick={() => toggleDropdown(name)}
        className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-between transition-colors"
      >
        <span className="truncate">
          {selected.length === 0 ? label : `${label} (${selected.length})`}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === name ? 'rotate-180' : ''}`} />
      </button>

      {openDropdown === name && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">No options available</div>
          ) : (
            options.map((option) => (
              <label
                key={option}
                className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggleMultiSelect(option, selected, onChange)}
                  className="rounded border-gray-300"
                />
                <span className="ml-3 text-sm text-gray-700">{option || 'Empty'}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Results</h3>

      <div className="grid grid-cols-4 gap-4 mb-4">
        {renderMultiSelectDropdown('customer', 'Customer', customers, selectedCustomers, onCustomersChange)}
        {renderMultiSelectDropdown('project', 'Project', projects, selectedProjects, onProjectsChange)}
        {renderMultiSelectDropdown('stage', 'Stage', stages, selectedStages, onStagesChange)}

        <div>
          <input
            type="text"
            placeholder="Search DOI..."
            value={selectedDOI}
            onChange={(e) => onDOIChange(e.target.value)}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 placeholder-gray-500 hover:border-gray-400 focus:border-orange-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {(selectedCustomers.length > 0 ||
        selectedProjects.length > 0 ||
        selectedStages.length > 0 ||
        selectedDOI) && (
        <div className="flex flex-wrap gap-2">
          {selectedCustomers.map((customer) => (
            <div
              key={`customer-${customer}`}
              className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm"
            >
              {customer}
              <button
                onClick={() =>
                  onCustomersChange(selectedCustomers.filter((c) => c !== customer))
                }
                className="hover:text-orange-900"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {selectedProjects.map((project) => (
            <div
              key={`project-${project}`}
              className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
            >
              {project}
              <button
                onClick={() =>
                  onProjectsChange(selectedProjects.filter((p) => p !== project))
                }
                className="hover:text-blue-900"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {selectedStages.map((stage) => (
            <div
              key={`stage-${stage}`}
              className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
            >
              {stage || 'Empty'}
              <button
                onClick={() =>
                  onStagesChange(selectedStages.filter((s) => s !== stage))
                }
                className="hover:text-green-900"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {selectedDOI && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
              DOI: {selectedDOI}
              <button
                onClick={() => onDOIChange('')}
                className="hover:text-purple-900"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
