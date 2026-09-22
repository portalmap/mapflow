import { useState, useMemo, useEffect } from 'react';
import { Search, User, Layers, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFilteredAllTasks } from '@/hooks/useFilteredAllTasks';
import { useUserRole } from '@/hooks/useUserRole';
import { useStatuses, useDefaultStatus } from '@/hooks/useStatuses';
import { EverythingTableView } from '@/components/everything/EverythingTableView';
import { EverythingFilters, FilterState } from '@/components/everything/EverythingFilters';
import { GroupBySelector, GroupByOption } from '@/components/everything/GroupBySelector';
import { AssigneeFilterPanel } from '@/components/everything/AssigneeFilterPanel';
import { FollowerFilterPanel } from '@/components/everything/FollowerFilterPanel';
import { ColumnSelector } from '@/components/tasks/ColumnSelector';
import { BulkActionsBar } from '@/components/tasks/BulkActionsBar';
import { useColumnPreferences, DEFAULT_VISIBLE_COLUMNS, DEFAULT_COLUMN_ORDER, ColumnId, SortConfig } from '@/hooks/useColumnPreferences';
import { useTaskSorting } from '@/hooks/useTaskSorting';

/** Abaixo de 1024px os painéis abrem sobrepostos, então só um por vez. */
const isNarrowScreen = () =>
  typeof window !== 'undefined' && window.innerWidth < 1024;

export default function EverythingView() {
  const { data: workspaces = [], isLoading: workspacesLoading } = useWorkspaces();
  const { activeWorkspace, setActiveWorkspace } = useWorkspace();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    activeWorkspace?.id || null
  );
  
  // Sync with activeWorkspace or default to first workspace
  useEffect(() => {
    if (activeWorkspace?.id && workspaces.some(w => w.id === activeWorkspace.id)) {
      setSelectedWorkspaceId(activeWorkspace.id);
    } else if (workspaces.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [activeWorkspace, workspaces, selectedWorkspaceId]);

  // Update global context when workspace changes
  const handleWorkspaceChange = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      setActiveWorkspace(workspace);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<GroupByOption>('due_date');
  const { data: roleInfo } = useUserRole();
  const isGuest = roleInfo?.isGuest ?? false;

  const [filters, setFilters] = useState<FilterState>({
    statuses: [],
    priorities: [],
    tags: [],
    showCompleted: false,
    showTransferred: false,
    viewMode: 'assigned',
  });
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [includeUnassigned, setIncludeUnassigned] = useState(false);
  const [showAssigneePanel, setShowAssigneePanel] = useState(false);
  const [selectedFollowers, setSelectedFollowers] = useState<string[]>([]);
  const [includeNoFollowers, setIncludeNoFollowers] = useState(false);
  const [showFollowerPanel, setShowFollowerPanel] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // Guest always sees only assigned tasks
  const effectiveViewMode = isGuest ? 'assigned' : filters.viewMode;
  const { data: tasks = [], isLoading } = useFilteredAllTasks(selectedWorkspaceId ?? undefined, effectiveViewMode, filters.showTransferred);
  const { data: statuses = [] } = useStatuses(selectedWorkspaceId ?? undefined);
  const { data: defaultStatus } = useDefaultStatus(selectedWorkspaceId ?? undefined);

  // Column preferences
  const { data: columnPrefs } = useColumnPreferences(null, 'everything');
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(DEFAULT_VISIBLE_COLUMNS);
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(DEFAULT_COLUMN_ORDER);

  useEffect(() => {
    if (columnPrefs) {
      setVisibleColumns(columnPrefs.visible_columns);
      setColumnOrder(columnPrefs.column_order);
    }
  }, [columnPrefs]);

  // Base statuses available for filtering (declared before the base filter)
  const availableStatusesBase = useMemo(() => {
    return statuses.map((s) => ({ id: s.id, name: s.name, color: s.color }));
  }, [statuses]);

  /**
   * Base set: everything except the people filters (assignee / follower).
   * Panel counts are derived from this so the number shown always matches
   * the number of rows the list will display.
   */
  const baseFilteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDescription = task.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDescription) return false;
      }

      if (filters.statuses.length > 0 && task.status) {
        const selectedStatusNames = filters.statuses
          .map((statusId) => availableStatusesBase.find((s) => s.id === statusId)?.name)
          .filter(Boolean);
        if (!selectedStatusNames.includes(task.status.name)) return false;
      }

      if (filters.priorities.length > 0) {
        if (!filters.priorities.includes(task.priority)) return false;
      }

      if (!filters.showCompleted) {
        const isCompleted = task.completed_at ||
          (task.status?.name?.toLowerCase() === 'concluído');
        if (isCompleted) return false;
      }

      return true;
    });
  }, [tasks, searchQuery, filters, availableStatusesBase]);

  // Calculate assignee statistics (over the same base as the list)
  const assigneeStats = useMemo(() => {
    const stats: Record<string, { id: string; full_name: string | null; avatar_url: string | null; taskCount: number }> = {};
    let unassignedCount = 0;

    baseFilteredTasks.forEach((task) => {
      if (task.assignees.length === 0) {
        unassignedCount++;
      } else {
        task.assignees.forEach((assignee) => {
          if (!stats[assignee.id]) {
            stats[assignee.id] = { ...assignee, taskCount: 0 };
          }
          stats[assignee.id].taskCount++;
        });
      }
    });

    return {
      assignees: Object.values(stats).sort((a, b) => b.taskCount - a.taskCount),
      unassignedCount,
    };
  }, [baseFilteredTasks]);

  // Calculate follower statistics (over the same base as the list)
  const followerStats = useMemo(() => {
    const stats: Record<string, { id: string; full_name: string | null; avatar_url: string | null; taskCount: number }> = {};
    let noFollowerCount = 0;

    baseFilteredTasks.forEach((task) => {
      if (!task.followers || task.followers.length === 0) {
        noFollowerCount++;
      } else {
        task.followers.forEach((follower) => {
          if (!stats[follower.id]) {
            stats[follower.id] = { ...follower, taskCount: 0 };
          }
          stats[follower.id].taskCount++;
        });
      }
    });

    return {
      followers: Object.values(stats).sort((a, b) => b.taskCount - a.taskCount),
      noFollowerCount,
    };
  }, [baseFilteredTasks]);

  // Available statuses for filtering
  const availableStatuses = availableStatusesBase;

  // Filter tasks: base filters + people filters
  const filteredTasks = useMemo(() => {
    return baseFilteredTasks.filter((task) => {
      // Assignee filter
      if (selectedAssignees.length > 0 || includeUnassigned) {
        const hasSelectedAssignee = task.assignees.some((a) => selectedAssignees.includes(a.id));
        const isUnassigned = task.assignees.length === 0;

        if (!hasSelectedAssignee && !(includeUnassigned && isUnassigned)) {
          return false;
        }
      }

      // Follower filter
      if (selectedFollowers.length > 0 || includeNoFollowers) {
        const hasSelectedFollower = task.followers?.some((f) => selectedFollowers.includes(f.id));
        const hasNoFollower = !task.followers || task.followers.length === 0;

        if (!hasSelectedFollower && !(includeNoFollowers && hasNoFollower)) {
          return false;
        }
      }

      return true;
    });
  }, [baseFilteredTasks, selectedAssignees, includeUnassigned, selectedFollowers, includeNoFollowers]);

  // Apply sorting
  const sortedTasks = useTaskSorting(filteredTasks, sortConfig);

  const handleSortChange = (column: ColumnId) => {
    setSortConfig((prev) => {
      if (prev?.column === column) {
        return prev.direction === 'asc'
          ? { column, direction: 'desc' }
          : null;
      }
      return { column, direction: 'asc' };
    });
  };

  const toggleAssignee = (assigneeId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(assigneeId)
        ? prev.filter((id) => id !== assigneeId)
        : [...prev, assigneeId]
    );
  };

  const toggleFollower = (followerId: string) => {
    setSelectedFollowers((prev) =>
      prev.includes(followerId)
        ? prev.filter((id) => id !== followerId)
        : [...prev, followerId]
    );
  };


  return (
    <div className="relative flex h-full overflow-hidden">
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex items-center gap-2">
                <Layers className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Tudo</h1>
              </div>
              <div className="flex flex-wrap items-center gap-3 ml-0 sm:ml-8">
                <Select 
                  value={selectedWorkspaceId ?? ''} 
                  onValueChange={handleWorkspaceChange}
                  disabled={workspacesLoading}
                >
                  <SelectTrigger className="w-full max-w-64 sm:w-64">
                    <SelectValue placeholder="Selecione um workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((ws) => (
                      <SelectItem key={ws.id} value={ws.id}>
                        {ws.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  {isGuest
                    ? 'Suas tarefas atribuídas'
                    : roleInfo?.isAdmin 
                      ? 'Todas as tarefas do workspace' 
                      : filters.viewMode === 'my-spaces'
                        ? 'Todas as tarefas dos seus Spaces'
                        : 'Suas tarefas atribuídas'}
                </span>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar tarefas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full"
                />
              </div>
            </div>
          </div>

          {/* Tabs & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs defaultValue="list" className="w-auto">
              <TabsList>
                <TabsTrigger value="list">Lista</TabsTrigger>
                <TabsTrigger value="kanban" disabled>Quadro</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <GroupBySelector value={groupBy} onChange={setGroupBy} />
              {!isGuest && (
              <EverythingFilters
                filters={filters}
                onChange={setFilters}
                availableStatuses={availableStatuses}
                isAdmin={roleInfo?.isAdmin === true}
              />
              )}
              <ColumnSelector
                listId={null}
                scope="everything"
                visibleColumns={visibleColumns}
                columnOrder={columnOrder}
                onColumnsChange={setVisibleColumns}
                onOrderChange={setColumnOrder}
              />
              <Button
                variant={showAssigneePanel ? 'secondary' : 'outline'}
                size="sm"
                className="h-8 gap-2"
                onClick={() => {
                  const next = !showAssigneePanel;
                  setShowAssigneePanel(next);
                  if (next && isNarrowScreen()) setShowFollowerPanel(false);
                }}
              >
                <User className="h-4 w-4" />
                Responsável
                {(selectedAssignees.length > 0 || includeUnassigned) && (
                  <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground rounded text-xs">
                    {selectedAssignees.length + (includeUnassigned ? 1 : 0)}
                  </span>
                )}
              </Button>
              <Button
                variant={showFollowerPanel ? 'secondary' : 'outline'}
                size="sm"
                className="h-8 gap-2"
                onClick={() => {
                  const next = !showFollowerPanel;
                  setShowFollowerPanel(next);
                  if (next && isNarrowScreen()) setShowAssigneePanel(false);
                }}
              >
                <Eye className="h-4 w-4" />
                Seguidor
                {(selectedFollowers.length > 0 || includeNoFollowers) && (
                  <span className="ml-1 px-1.5 py-0.5 bg-primary text-primary-foreground rounded text-xs">
                    {selectedFollowers.length + (includeNoFollowers ? 1 : 0)}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Carregando tarefas...</p>
            </div>
          ) : (
            <EverythingTableView 
              tasks={sortedTasks} 
              groupBy={groupBy}
              selectedTaskIds={selectedTaskIds}
              onSelectionChange={setSelectedTaskIds}
              sortConfig={sortConfig}
              onSortChange={handleSortChange}
              visibleColumns={visibleColumns}
              columnOrder={columnOrder}
            />
          )}
        </div>
      </div>

      {/* Assignee Filter Panel */}
      {showAssigneePanel && (
        <AssigneeFilterPanel
          assignees={assigneeStats.assignees}
          selectedAssignees={selectedAssignees}
          unassignedCount={assigneeStats.unassignedCount}
          includeUnassigned={includeUnassigned}
          onToggleAssignee={toggleAssignee}
          onToggleUnassigned={() => setIncludeUnassigned(!includeUnassigned)}
          onClose={() => setShowAssigneePanel(false)}
        />
      )}

      {/* Follower Filter Panel */}
      {showFollowerPanel && (
        <FollowerFilterPanel
          followers={followerStats.followers}
          selectedFollowers={selectedFollowers}
          noFollowerCount={followerStats.noFollowerCount}
          includeNoFollowers={includeNoFollowers}
          onToggleFollower={toggleFollower}
          onToggleNoFollowers={() => setIncludeNoFollowers(!includeNoFollowers)}
          onClose={() => setShowFollowerPanel(false)}
        />
      )}

      <BulkActionsBar
        selectedTaskIds={selectedTaskIds}
        workspaceId={selectedWorkspaceId || ''}
        defaultStatusId={defaultStatus?.id}
        onClearSelection={() => setSelectedTaskIds([])}
      />
    </div>
  );
}
