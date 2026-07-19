import AsyncStorage from '@react-native-async-storage/async-storage';
import {StructuredReport} from '../types/report';

const TASK_STATUS_KEY = '@siteops/task-status/v1';
const MANUAL_TASKS_KEY = '@siteops/manual-tasks/v1';

export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskStatus = 'Open' | 'In Progress' | 'Pending' | 'Done';
export type TaskCategory =
  | 'Material Missing'
  | 'Delay'
  | 'Follow-up'
  | 'Inspection'
  | 'Safety'
  | 'Finance'
  | 'General';
export type TaskSource = 'report' | 'manual' | 'demo';

export interface SiteTask {
  id: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  site: string;
  location: string;
  due: string;
  description: string;
  assignee: string;
  source: TaskSource;
  reportId?: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskDraft = Pick<
  SiteTask,
  'title' | 'category' | 'priority' | 'status' | 'site' | 'location' | 'due' | 'description' | 'assignee'
>;

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const value = await AsyncStorage.getItem(key);
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function readStatuses(): Promise<Record<string, TaskStatus>> {
  return readJson<Record<string, TaskStatus>>(TASK_STATUS_KEY, {});
}

async function readManualTasks(): Promise<SiteTask[]> {
  return readJson<SiteTask[]>(MANUAL_TASKS_KEY, []);
}

async function writeManualTasks(tasks: SiteTask[]) {
  await AsyncStorage.setItem(MANUAL_TASKS_KEY, JSON.stringify(tasks));
}

export async function saveTaskStatus(taskId: string, status: TaskStatus) {
  const statuses = await readStatuses();
  await AsyncStorage.setItem(TASK_STATUS_KEY, JSON.stringify({...statuses, [taskId]: status}));

  const manualTasks = await readManualTasks();
  if (manualTasks.some(task => task.id === taskId)) {
    await writeManualTasks(
      manualTasks.map(task =>
        task.id === taskId ? {...task, status, updatedAt: new Date().toISOString()} : task,
      ),
    );
  }
}

export async function saveManualTask(draft: TaskDraft, id?: string): Promise<SiteTask> {
  const now = new Date().toISOString();
  const tasks = await readManualTasks();
  const existing = id ? tasks.find(task => task.id === id) : undefined;
  const task: SiteTask = {
    id: existing?.id ?? `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    source: 'manual',
    reportId: existing?.reportId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ...draft,
  };

  const next = existing
    ? tasks.map(item => (item.id === task.id ? task : item))
    : [task, ...tasks];

  await writeManualTasks(next);
  return task;
}

export async function deleteManualTask(taskId: string) {
  const tasks = await readManualTasks();
  await writeManualTasks(tasks.filter(task => task.id !== taskId));
}

function cleanSite(site: string) {
  return !site || site === 'Не указан' || site === 'Not specified' || site === 'לא צוין'
    ? 'Tower A'
    : site;
}

function reportBase(report: StructuredReport): Pick<
  SiteTask,
  'site' | 'location' | 'source' | 'reportId' | 'createdAt' | 'updatedAt'
> {
  return {
    site: cleanSite(report.site),
    location: report.floors[0] ? `Level ${report.floors[0]}` : 'Site',
    source: 'report',
    reportId: report.id,
    createdAt: report.createdAt,
    updatedAt: report.createdAt,
  };
}

function buildReportTasks(reports: StructuredReport[], statuses: Record<string, TaskStatus>): SiteTask[] {
  const tasks: SiteTask[] = [];

  reports.forEach(report => {
    report.missingMaterials.forEach((item, index) => {
      const id = `${report.id}-material-${index}`;
      tasks.push({
        id,
        title: `${item.name} ${item.quantity}`.trim(),
        category: 'Material Missing',
        priority: 'HIGH',
        status: statuses[id] ?? 'Open',
        due: 'Today',
        description: report.financialImpact || report.summary,
        assignee: '',
        ...reportBase(report),
      });
    });

    report.delays.forEach((item, index) => {
      const id = `${report.id}-delay-${index}`;
      tasks.push({
        id,
        title: item.reason,
        category: 'Delay',
        priority: 'MEDIUM',
        status: statuses[id] ?? 'In Progress',
        due: 'Tomorrow',
        description: item.impact || report.summary,
        assignee: '',
        ...reportBase(report),
      });
    });

    report.nextDayTasks.slice(0, 4).forEach((title, index) => {
      const id = `${report.id}-next-${index}`;
      tasks.push({
        id,
        title,
        category: 'Follow-up',
        priority: 'LOW',
        status: statuses[id] ?? 'Pending',
        due: 'Tomorrow',
        description: report.summary,
        assignee: '',
        ...reportBase(report),
      });
    });
  });

  return tasks;
}

function demoTasks(statuses: Record<string, TaskStatus>): SiteTask[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'demo-material-dowels',
      title: 'Dowel nails 6x40',
      category: 'Material Missing',
      priority: 'HIGH',
      status: statuses['demo-material-dowels'] ?? 'Open',
      site: 'Tower A',
      location: 'Section B',
      due: 'Today',
      description: 'Fasteners required before drywall installation can continue.',
      assignee: 'Site Manager',
      source: 'demo',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-drywall-screws',
      title: 'Drywall screws',
      category: 'Material Missing',
      priority: 'HIGH',
      status: statuses['demo-drywall-screws'] ?? 'Open',
      site: 'Tower A',
      location: 'Section B',
      due: 'Today',
      description: 'Confirm quantity with supplier and update the foreman.',
      assignee: 'Procurement',
      source: 'demo',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-elevator-delay',
      title: 'Elevator delivery delayed by 2 days',
      category: 'Delay',
      priority: 'MEDIUM',
      status: statuses['demo-elevator-delay'] ?? 'In Progress',
      site: 'Tower A',
      location: 'Site logistics',
      due: 'Tomorrow',
      description: 'Track schedule impact and prepare an update for the project manager.',
      assignee: 'Logistics',
      source: 'demo',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'demo-safety-plan',
      title: 'Update site safety plan',
      category: 'Safety',
      priority: 'LOW',
      status: statuses['demo-safety-plan'] ?? 'Pending',
      site: 'Tower A',
      location: 'Site',
      due: 'Jun 9',
      description: 'Review updated access paths before the next inspection.',
      assignee: 'Safety Officer',
      source: 'demo',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export async function buildTasks(reports: StructuredReport[]): Promise<SiteTask[]> {
  const [statuses, manualTasks] = await Promise.all([readStatuses(), readManualTasks()]);
  const reportTasks = buildReportTasks(reports, statuses);
  const generated = reportTasks.length ? reportTasks : demoTasks(statuses);
  const normalizedManual = manualTasks.map(task => ({
    ...task,
    status: statuses[task.id] ?? task.status,
  }));

  return [...normalizedManual, ...generated].sort((a, b) => {
    const priorityWeight = {HIGH: 0, MEDIUM: 1, LOW: 2};
    const statusWeight = {Open: 0, 'In Progress': 1, Pending: 2, Done: 3};
    return (
      statusWeight[a.status] - statusWeight[b.status] ||
      priorityWeight[a.priority] - priorityWeight[b.priority] ||
      b.createdAt.localeCompare(a.createdAt)
    );
  });
}

export function getTaskStats(tasks: SiteTask[]) {
  return {
    total: tasks.length,
    open: tasks.filter(task => task.status === 'Open').length,
    inProgress: tasks.filter(task => task.status === 'In Progress').length,
    pending: tasks.filter(task => task.status === 'Pending').length,
    done: tasks.filter(task => task.status === 'Done').length,
    high: tasks.filter(task => task.priority === 'HIGH' && task.status !== 'Done').length,
  };
}
