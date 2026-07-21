import React, {useCallback, useMemo, useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Filter,
  MapPin,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from 'lucide-react-native';
import {useTranslation} from 'react-i18next';
import {getReports} from '../services/reportStorage';
import {localizeText} from '../services/contentLocalization';
import {
  buildTasks,
  deleteManualTask,
  getTaskStats,
  saveManualTask,
  saveTaskStatus,
  SiteTask,
  TaskCategory,
  TaskDraft,
  TaskPriority,
  TaskStatus,
} from '../services/taskService';
import {colors, radii} from '../theme';
import appI18n, {localizedSiteName} from '../i18n';
import {CountUpText, FocusFadeView} from '../components/AnimatedUI';

const priorities: Array<'All' | TaskPriority> = ['All', 'HIGH', 'MEDIUM', 'LOW'];
const statuses: Array<'All' | TaskStatus> = ['All', 'Open', 'In Progress', 'Pending', 'Done'];
const taskStatuses: TaskStatus[] = ['Open', 'In Progress', 'Pending', 'Done'];
const categories: TaskCategory[] = [
  'Material Missing',
  'Delay',
  'Follow-up',
  'Inspection',
  'Safety',
  'Finance',
  'General',
];

const emptyDraft: TaskDraft = {
  title: '',
  category: 'Follow-up',
  priority: 'MEDIUM',
  status: 'Open',
  site: 'Tower A',
  location: 'Site',
  due: 'Today',
  description: '',
  assignee: '',
};

function nextStatus(status: TaskStatus): TaskStatus {
  const index = taskStatuses.indexOf(status);
  return taskStatuses[(index + 1) % taskStatuses.length];
}

function statusKey(status: TaskStatus) {
  return status === 'In Progress' ? 'inProgress' : status.toLowerCase();
}

function categoryKey(category: TaskCategory) {
  return {
    'Material Missing': 'materialMissing',
    Delay: 'delay',
    'Follow-up': 'followUp',
    Inspection: 'inspection',
    Safety: 'safety',
    Finance: 'finance',
    General: 'general',
  }[category];
}

function toneFor(task: Pick<SiteTask, 'priority' | 'status'>) {
  if (task.status === 'Done') {
    return colors.success;
  }
  if (task.priority === 'HIGH') {
    return colors.danger;
  }
  if (task.priority === 'MEDIUM') {
    return colors.warning;
  }
  return colors.primary;
}

function localizedLocation(location: string, t: (key: string, options?: any) => string) {
  if (location === 'Section B') {
    return t('tasks.section');
  }
  if (location === 'Site logistics') {
    return t('tasks.siteLogistics');
  }
  if (location === 'Site') {
    return t('tasks.site');
  }
  if (location.startsWith('Level ')) {
    return t('tasks.level', {level: location.slice(6)});
  }
  return location;
}

function localizedDue(due: string, t: (key: string, options?: any) => string) {
  if (due === 'Today') {
    return t('tasks.due.today');
  }
  if (due === 'Tomorrow') {
    return t('tasks.due.tomorrow');
  }
  if (due === 'Jun 9') {
    return t('tasks.due.jun9');
  }
  return due;
}

function localizedTaskText(task: SiteTask, field: 'title' | 'description' | 'assignee', t: (key: string) => string) {
  const language = appI18n.language === 'ru' || appI18n.language === 'he' ? appI18n.language : 'en';
  const translated = task.translations?.[language]?.[field];
  if (translated) {
    return translated;
  }

  if (task.source !== 'demo') {
    return localizeText(task[field], language);
  }

  const keyById: Record<string, {title: string; description: string; assignee: string}> = {
    'demo-material-dowels': {
      title: 'tasks.demoTasks.dowelsTitle',
      description: 'tasks.demoTasks.dowelsDescription',
      assignee: 'tasks.demoTasks.siteManager',
    },
    'demo-drywall-screws': {
      title: 'tasks.demoTasks.screwsTitle',
      description: 'tasks.demoTasks.screwsDescription',
      assignee: 'tasks.demoTasks.procurement',
    },
    'demo-elevator-delay': {
      title: 'tasks.demoTasks.elevatorTitle',
      description: 'tasks.demoTasks.elevatorDescription',
      assignee: 'tasks.demoTasks.logistics',
    },
    'demo-safety-plan': {
      title: 'tasks.demoTasks.safetyTitle',
      description: 'tasks.demoTasks.safetyDescription',
      assignee: 'tasks.demoTasks.safetyOfficer',
    },
  };

  const key = keyById[task.id]?.[field];
  return key ? t(key) : task[field];
}

function TaskCard({
  task,
  onOpen,
  onStatusChange,
}: {
  task: SiteTask;
  onOpen: (task: SiteTask) => void;
  onStatusChange: (task: SiteTask) => void;
}) {
  const {t} = useTranslation();
  const tone = toneFor(task);
  const title = localizedTaskText(task, 'title', t);
  const description = localizedTaskText(task, 'description', t);
  const assignee = localizedTaskText(task, 'assignee', t);

  return (
    <Pressable
      onPress={() => onOpen(task)}
      style={[styles.taskCard, {borderColor: `${tone}55`, backgroundColor: `${tone}16`}]}>
      <View style={styles.taskTop}>
        <View style={[styles.priority, {backgroundColor: `${tone}30`}]}>
          <Text style={[styles.priorityText, {color: tone}]}>
            {t(`tasks.priority.${task.priority.toLowerCase()}`)}
          </Text>
        </View>
        <Text style={[styles.category, {color: tone}]}>
          {t(`tasks.category.${categoryKey(task.category)}`)}
        </Text>
        <Text style={styles.sourceLabel}>{t(`tasks.source.${task.source}`)}</Text>
      </View>

      <Text style={styles.taskTitle}>{title}</Text>
      {description ? (
        <Text numberOfLines={2} style={styles.taskDescription}>
          {description}
        </Text>
      ) : null}

      <View style={styles.taskMeta}>
        <MapPin size={12} color={colors.muted} />
        <Text style={styles.metaText}>
          {localizedSiteName(task.site, t)} • {localizedLocation(task.location, t)}
        </Text>
      </View>
      <View style={styles.taskMeta}>
        <Clock3 size={12} color={colors.muted} />
        <Text style={styles.metaText}>{localizedDue(task.due, t)}</Text>
        {assignee ? (
          <>
            <UserRound size={12} color={colors.muted} />
            <Text style={styles.metaText}>{assignee}</Text>
          </>
        ) : null}
      </View>

      <Pressable
        onPress={() => onStatusChange(task)}
        style={[styles.statusButton, {backgroundColor: `${tone}30`}]}>
        <Text style={[styles.statusText, {color: tone}]}>
          {t(`tasks.status.${statusKey(task.status)}`)}
        </Text>
      </Pressable>
    </Pressable>
  );
}

export function TasksScreen() {
  const {t, i18n} = useTranslation();
  const [tasks, setTasks] = useState<SiteTask[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<'All' | TaskPriority>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | TaskStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<SiteTask | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<SiteTask | null>(null);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);

  const load = useCallback(() => {
    getReports().then(async reports => {
      setTasks(await buildTasks(reports, i18n.language));
    });
  }, [i18n.language]);

  useFocusEffect(load);

  const stats = useMemo(() => getTaskStats(tasks), [tasks]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks.filter(task => {
      const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;
      const matchesStatus = statusFilter === 'All' || task.status === statusFilter;
      const matchesSearch =
        !query ||
        [task.title, task.description, task.site, task.location, task.category, task.assignee]
          .join(' ')
          .toLowerCase()
          .includes(query);
      return matchesPriority && matchesStatus && matchesSearch;
    });
  }, [priorityFilter, searchQuery, statusFilter, tasks]);

  async function refresh() {
    const reports = await getReports();
    setTasks(await buildTasks(reports, i18n.language));
  }

  async function handleStatusChange(task: SiteTask) {
    const status = nextStatus(task.status);
    await saveTaskStatus(task.id, status);
    setTasks(current => current.map(item => (item.id === task.id ? {...item, status} : item)));
    setSelectedTask(current => (current?.id === task.id ? {...current, status} : current));
  }

  function openEditor(task?: SiteTask) {
    if (task) {
      setEditingTask(task);
      setDraft({
        title: task.title,
        category: task.category,
        priority: task.priority,
        status: task.status,
        site: task.site,
        location: task.location,
        due: task.due,
        description: task.description,
        assignee: task.assignee,
      });
    } else {
      setEditingTask(null);
      setDraft(emptyDraft);
    }
    setEditorVisible(true);
  }

  async function handleSaveTask() {
    const title = draft.title.trim();
    if (!title) {
      Alert.alert(t('tasks.validationTitle'), t('tasks.validationMessage'));
      return;
    }

    await saveManualTask(
      {
        ...draft,
        title,
        site: draft.site.trim() || 'Tower A',
        location: draft.location.trim() || 'Site',
        due: draft.due.trim() || 'Today',
        description: draft.description.trim(),
        assignee: draft.assignee.trim(),
      },
      editingTask?.source === 'manual' ? editingTask.id : undefined,
    );
    setEditorVisible(false);
    setSelectedTask(null);
    await refresh();
  }

  async function handleDeleteTask(task: SiteTask) {
    if (task.source !== 'manual') {
      Alert.alert(t('tasks.generatedTaskTitle'), t('tasks.generatedTaskMessage'));
      return;
    }

    Alert.alert(t('tasks.deleteTask'), t('tasks.deleteConfirm'), [
      {text: t('common.close'), style: 'cancel'},
      {
        text: t('tasks.deleteTask'),
        style: 'destructive',
        onPress: async () => {
          await deleteManualTask(task.id);
          setSelectedTask(null);
          await refresh();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FocusFadeView style={styles.focusRoot}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title} numberOfLines={2}>{t('tasks.title')}</Text>
            <Text style={styles.subtitle}>{t('tasks.subtitle')}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.headerButton} onPress={() => openEditor()}>
              <Plus size={19} color={colors.text} />
            </Pressable>
            <View style={styles.headerButton}>
              <Filter size={19} color={colors.text} />
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <CountUpText value={stats.open} style={styles.statValue} />
            <Text style={styles.statLabel}>{t('tasks.openTasks')}</Text>
          </View>
          <View style={styles.statCard}>
            <CountUpText value={stats.inProgress} style={styles.statValue} />
            <Text style={styles.statLabel}>{t('tasks.activeWork')}</Text>
          </View>
          <View style={styles.statCard}>
            <CountUpText value={stats.high} style={styles.statValue} />
            <Text style={[styles.statLabel, {color: colors.danger}]}>{t('tasks.highRisk')}</Text>
          </View>
          <View style={styles.statCard}>
            <CountUpText value={stats.done} style={styles.statValue} />
            <Text style={styles.statLabel}>{t('tasks.doneTasks')}</Text>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Search size={17} color={colors.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('tasks.searchPlaceholder')}
            placeholderTextColor={colors.faint}
            style={styles.searchInput}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={16} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {priorities.map(item => {
            const count = item === 'All' ? tasks.length : tasks.filter(task => task.priority === item).length;
            return (
              <Pressable
                key={item}
                onPress={() => setPriorityFilter(item)}
                style={[styles.filterChip, priorityFilter === item && styles.filterChipActive]}>
                <Text style={[styles.filterText, priorityFilter === item && styles.filterTextActive]}>
                  {item === 'All' ? t('common.all') : t(`common.${item.toLowerCase()}`)} {count}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {statuses.map(item => (
            <Pressable
              key={item}
              onPress={() => setStatusFilter(item)}
              style={[styles.statusChip, statusFilter === item && styles.filterChipActive]}>
              <Text style={[styles.filterText, statusFilter === item && styles.filterTextActive]}>
                {item === 'All' ? t('tasks.allStatuses') : t(`tasks.status.${statusKey(item)}`)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.stack}>
          {filteredTasks.length ? (
            filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onOpen={setSelectedTask}
                onStatusChange={handleStatusChange}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <CheckCircle2 size={38} color={colors.primary} />
              <Text style={styles.emptyTitle}>{t('tasks.noTasks')}</Text>
              <Text style={styles.emptyText}>{t('tasks.noTasksHint')}</Text>
              <Pressable style={styles.primaryAction} onPress={() => openEditor()}>
                <Text style={styles.primaryActionText}>{t('tasks.addTask')}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
      </FocusFadeView>

      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onEdit={openEditor}
        onDelete={handleDeleteTask}
        onStatusChange={handleStatusChange}
      />

      <Modal visible={editorVisible} transparent animationType="slide" onRequestClose={() => setEditorVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalShade}>
          <View style={styles.editorSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{editingTask ? t('tasks.editTask') : t('tasks.addTask')}</Text>
              <Pressable style={styles.closeButton} onPress={() => setEditorVisible(false)}>
                <X size={18} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
              <Field
                label={t('tasks.taskTitle')}
                value={draft.title}
                onChangeText={value => setDraft(current => ({...current, title: value}))}
                placeholder={t('tasks.titlePlaceholder')}
              />
              <Field
                label={t('tasks.siteName')}
                value={draft.site}
                onChangeText={value => setDraft(current => ({...current, site: value}))}
                placeholder={t('common.towerA')}
              />
              <Field
                label={t('tasks.location')}
                value={draft.location}
                onChangeText={value => setDraft(current => ({...current, location: value}))}
                placeholder={t('tasks.locationPlaceholder')}
              />
              <Field
                label={t('tasks.dueDate')}
                value={draft.due}
                onChangeText={value => setDraft(current => ({...current, due: value}))}
                placeholder={t('tasks.due.today')}
              />
              <Field
                label={t('tasks.assignee')}
                value={draft.assignee}
                onChangeText={value => setDraft(current => ({...current, assignee: value}))}
                placeholder={t('tasks.assigneePlaceholder')}
              />
              <Field
                label={t('tasks.description')}
                value={draft.description}
                onChangeText={value => setDraft(current => ({...current, description: value}))}
                placeholder={t('tasks.descriptionPlaceholder')}
                multiline
              />

              <OptionGroup
                label={t('tasks.categoryLabel')}
                options={categories}
                value={draft.category}
                getLabel={item => t(`tasks.category.${categoryKey(item)}`)}
                onChange={value => setDraft(current => ({...current, category: value}))}
              />
              <OptionGroup
                label={t('tasks.priorityLabel')}
                options={['HIGH', 'MEDIUM', 'LOW'] as TaskPriority[]}
                value={draft.priority}
                getLabel={item => t(`tasks.priority.${item.toLowerCase()}`)}
                onChange={value => setDraft(current => ({...current, priority: value}))}
              />
              <OptionGroup
                label={t('tasks.statusLabel')}
                options={taskStatuses}
                value={draft.status}
                getLabel={item => t(`tasks.status.${statusKey(item)}`)}
                onChange={value => setDraft(current => ({...current, status: value}))}
              />
            </ScrollView>

            <Pressable style={styles.saveButton} onPress={handleSaveTask}>
              <Text style={styles.saveButtonText}>{t('tasks.saveTask')}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.fieldInput, multiline && styles.fieldTextArea]}
      />
    </View>
  );
}

function OptionGroup<T extends string>({
  label,
  options,
  value,
  getLabel,
  onChange,
}: {
  label: string;
  options: T[];
  value: T;
  getLabel: (value: T) => string;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map(option => (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[styles.optionChip, value === option && styles.optionChipActive]}>
            <Text style={[styles.optionText, value === option && styles.optionTextActive]}>
              {getLabel(option)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function TaskDetailModal({
  task,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  task: SiteTask | null;
  onClose: () => void;
  onEdit: (task: SiteTask) => void;
  onDelete: (task: SiteTask) => void;
  onStatusChange: (task: SiteTask) => void;
}) {
  const {t} = useTranslation();
  if (!task) {
    return null;
  }
  const tone = toneFor(task);
  const title = localizedTaskText(task, 'title', t);
  const description = localizedTaskText(task, 'description', t);
  const assignee = localizedTaskText(task, 'assignee', t);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.detailShade}>
        <View style={styles.detailCard}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{t('tasks.taskDetails')}</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <X size={18} color={colors.text} />
            </Pressable>
          </View>

          <View style={[styles.priority, styles.detailPriority, {backgroundColor: `${tone}30`}]}>
            <Text style={[styles.priorityText, {color: tone}]}>
              {t(`tasks.priority.${task.priority.toLowerCase()}`)} • {t(`tasks.status.${statusKey(task.status)}`)}
            </Text>
          </View>
          <Text style={styles.detailTitle}>{title}</Text>
          <Text style={styles.detailDescription}>
            {description || t('tasks.noDescription')}
          </Text>

          <View style={styles.detailRows}>
            <DetailRow icon={<MapPin size={16} color={colors.primary} />} label={t('tasks.siteName')} value={localizedSiteName(task.site, t)} />
            <DetailRow icon={<MapPin size={16} color={colors.primary} />} label={t('tasks.location')} value={localizedLocation(task.location, t)} />
            <DetailRow icon={<CalendarClock size={16} color={colors.primary} />} label={t('tasks.dueDate')} value={localizedDue(task.due, t)} />
            <DetailRow icon={<UserRound size={16} color={colors.primary} />} label={t('tasks.assignee')} value={assignee || t('common.notSpecified')} />
          </View>

          <View style={styles.detailActions}>
            <Pressable style={styles.secondaryAction} onPress={() => onStatusChange(task)}>
              <Text style={styles.secondaryActionText}>{t('tasks.nextStatus')}</Text>
            </Pressable>
            <Pressable style={styles.secondaryAction} onPress={() => onEdit(task)}>
              <Text style={styles.secondaryActionText}>{t('common.edit')}</Text>
            </Pressable>
            <Pressable style={[styles.secondaryAction, styles.deleteAction]} onPress={() => onDelete(task)}>
              <Trash2 size={16} color={colors.danger} />
              <Text style={[styles.secondaryActionText, {color: colors.danger}]}>{t('tasks.deleteTask')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({icon, label, value}: {icon: React.ReactNode; label: string; value: string}) {
  return (
    <View style={styles.detailRow}>
      {icon}
      <View style={styles.detailRowCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  focusRoot: {flex: 1},
  content: {padding: 20, paddingBottom: 112, gap: 14},
  header: {alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginTop: 6},
  headerCopy: {flex: 1, paddingRight: 12},
  title: {color: colors.text, fontSize: 24, fontWeight: '900', lineHeight: 29},
  subtitle: {color: colors.muted, fontSize: 13, fontWeight: '700', lineHeight: 18, marginTop: 4},
  headerActions: {flexDirection: 'row', flexShrink: 0, gap: 10},
  headerButton: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, height: 42, justifyContent: 'center', width: 42},
  statsGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  statCard: {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, flexBasis: '47%', flexGrow: 1, padding: 14},
  statValue: {color: colors.text, fontSize: 24, fontWeight: '900'},
  statLabel: {color: colors.muted, fontSize: 12, fontWeight: '800', marginTop: 4},
  searchWrap: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 15, borderWidth: 1, flexDirection: 'row', gap: 10, paddingHorizontal: 13},
  searchInput: {color: colors.text, flex: 1, fontSize: 14, minHeight: 48},
  filters: {gap: 8, paddingRight: 20},
  filterChip: {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9},
  statusChip: {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9},
  filterChipActive: {backgroundColor: colors.primarySoft, borderColor: colors.primary},
  filterText: {color: colors.muted, fontSize: 12, fontWeight: '900'},
  filterTextActive: {color: colors.text},
  stack: {gap: 12},
  taskCard: {borderRadius: radii.lg, borderWidth: 1, padding: 15},
  taskTop: {alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  priority: {borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4},
  detailPriority: {alignSelf: 'flex-start'},
  priorityText: {fontSize: 10, fontWeight: '900'},
  category: {fontSize: 11, fontWeight: '900'},
  sourceLabel: {color: colors.faint, fontSize: 10, fontWeight: '800'},
  taskTitle: {color: colors.text, fontSize: 16, fontWeight: '900', lineHeight: 22, marginTop: 10},
  taskDescription: {color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5},
  taskMeta: {alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10},
  metaText: {color: colors.muted, fontSize: 11, fontWeight: '700'},
  statusButton: {alignSelf: 'flex-end', borderRadius: 8, marginTop: 12, paddingHorizontal: 10, paddingVertical: 7},
  statusText: {fontSize: 11, fontWeight: '900'},
  emptyState: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1, padding: 24},
  emptyTitle: {color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 12},
  emptyText: {color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: 'center'},
  primaryAction: {backgroundColor: colors.primary, borderRadius: 14, marginTop: 16, paddingHorizontal: 18, paddingVertical: 12},
  primaryActionText: {color: colors.text, fontSize: 13, fontWeight: '900'},
  modalShade: {backgroundColor: 'rgba(0,0,0,0.68)', flex: 1, justifyContent: 'flex-end'},
  editorSheet: {backgroundColor: colors.background, borderColor: colors.border, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, maxHeight: '88%', padding: 18},
  sheetHeader: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
  sheetTitle: {color: colors.text, fontSize: 20, fontWeight: '900'},
  closeButton: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, height: 38, justifyContent: 'center', width: 38},
  form: {gap: 12, paddingVertical: 16},
  field: {gap: 7},
  fieldLabel: {color: colors.muted, fontSize: 12, fontWeight: '900'},
  fieldInput: {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 13, borderWidth: 1, color: colors.text, fontSize: 14, minHeight: 46, paddingHorizontal: 12},
  fieldTextArea: {minHeight: 92, paddingTop: 12},
  optionRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  optionChip: {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8},
  optionChipActive: {backgroundColor: colors.primarySoft, borderColor: colors.primary},
  optionText: {color: colors.muted, fontSize: 12, fontWeight: '800'},
  optionTextActive: {color: colors.text},
  saveButton: {alignItems: 'center', backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 14},
  saveButtonText: {color: colors.text, fontSize: 14, fontWeight: '900'},
  detailShade: {alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.68)', flex: 1, justifyContent: 'center', padding: 20},
  detailCard: {backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1, gap: 14, padding: 18, width: '100%'},
  detailTitle: {color: colors.text, fontSize: 22, fontWeight: '900', lineHeight: 28},
  detailDescription: {color: colors.muted, fontSize: 13, lineHeight: 20},
  detailRows: {gap: 9},
  detailRow: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 13, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 12},
  detailRowCopy: {flex: 1},
  detailLabel: {color: colors.faint, fontSize: 11, fontWeight: '800'},
  detailValue: {color: colors.text, fontSize: 13, fontWeight: '800', marginTop: 2},
  detailActions: {gap: 9},
  secondaryAction: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 13, borderWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 12},
  secondaryActionText: {color: colors.text, fontSize: 13, fontWeight: '900'},
  deleteAction: {borderColor: `${colors.danger}55`},
});
