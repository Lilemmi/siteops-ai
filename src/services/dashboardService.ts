import AsyncStorage from '@react-native-async-storage/async-storage';

const DASHBOARD_KEY = '@siteops/dashboard/v1';

export interface DashboardPhoto {
  id: string;
  uri: string;
  fileName: string;
  addedAt: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface ChatMessage {
  id: string;
  body: string;
  author: 'Alex' | 'Site Manager';
  sentAt: string;
}

export interface DashboardState {
  selectedSite: string;
  notificationsRead: boolean;
  photos: DashboardPhoto[];
  checklist: ChecklistItem[];
  chat: ChatMessage[];
}

const initialState: DashboardState = {
  selectedSite: 'All Sites',
  notificationsRead: false,
  photos: [],
  checklist: [
    {id: 'safety', label: 'Morning safety briefing completed', done: true},
    {id: 'materials', label: 'Missing materials confirmed with supplier', done: false},
    {id: 'elevator', label: 'Elevator delivery status checked', done: false},
    {id: 'photos', label: 'Progress photos added to daily report', done: false},
  ],
  chat: [
    {
      id: 'welcome',
      body: 'Morning. Please send today’s progress report before 18:00.',
      author: 'Site Manager',
      sentAt: new Date(0).toISOString(),
    },
  ],
};

export async function getDashboardState(): Promise<DashboardState> {
  const value = await AsyncStorage.getItem(DASHBOARD_KEY);
  if (!value) {
    return initialState;
  }
  try {
    const saved = JSON.parse(value) as Partial<DashboardState>;
    return {
      ...initialState,
      ...saved,
      photos: saved.photos ?? initialState.photos,
      checklist: saved.checklist ?? initialState.checklist,
      chat: saved.chat ?? initialState.chat,
    };
  } catch {
    return initialState;
  }
}

export async function saveDashboardState(state: DashboardState): Promise<void> {
  await AsyncStorage.setItem(DASHBOARD_KEY, JSON.stringify(state));
}
