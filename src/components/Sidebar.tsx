import { FileText, LayoutDashboard, BarChart3, Clock, Settings, LogOut, User } from 'lucide-react';

type HistorySidebarItem = {
  id: string;
  uploaded_at: string;
  total_entries: number;
};

type SidebarProps = {
  activeTab: string;
  onTabChange: (tab: string) => void;
  historyItems?: HistorySidebarItem[];
  historyLoading?: boolean;
  selectedHistoryUploadId?: string | null;
  onHistorySelect?: (uploadId: string) => void;
  onLogout?: () => void;
  userEmail?: string;
};

export default function Sidebar({
  activeTab,
  onTabChange,
  historyItems = [],
  historyLoading = false,
  selectedHistoryUploadId = null,
  onHistorySelect,
  onLogout,
  userEmail = '',
}: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analyse', label: 'Analyse', icon: BarChart3 },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const formatHistoryLabel = (uploadedAt: string) => {
    return new Date(uploadedAt).toLocaleString('en-GB');
  };

  return (
    <div className="w-64 shrink-0 sticky top-0 bg-white border-r border-gray-200 flex flex-col h-screen">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Log Manager</h1>
            <p className="text-xs text-gray-500">v1.0</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-hidden flex flex-col">
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {activeTab === 'history' && (
          <div className="mt-3 pt-3 border-t border-gray-200 flex-1 min-h-0">
            <p className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">History Uploads</p>
            <div className="space-y-1 overflow-y-auto h-full pr-1">
              {historyLoading && (
                <div className="px-2 py-2 text-xs text-gray-500">Loading...</div>
              )}
              {!historyLoading && historyItems.length === 0 && (
                <div className="px-2 py-2 text-xs text-gray-500">No uploads</div>
              )}
              {!historyLoading && historyItems.map((item) => {
                const isSelected = selectedHistoryUploadId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onHistorySelect?.(item.id)}
                    className={`w-full text-left px-2 py-2 rounded-md border text-xs transition-colors ${
                      isSelected
                        ? 'bg-orange-50 border-orange-200 text-orange-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-semibold">{formatHistoryLabel(item.uploaded_at)}</div>
                    <div className="text-gray-500">{item.total_entries} records</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-4 py-2 mb-2">
          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center border border-orange-200">
            <User className="w-4 h-4 text-orange-600" />
          </div>
          <span className="text-sm text-gray-600">{userEmail || 'User'}</span>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
