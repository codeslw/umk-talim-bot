import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BookOpen,
  Bot,
  ClipboardList,
  Download,
  LayoutDashboard,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Settings2,
  Trash2,
  UserRound,
  Users
} from 'lucide-react';
import { ApiClient, getStoredAdminKey, setStoredAdminKey } from '@/lib/api';
import type { AdminMeta, Application, Course, DynamicSchemas, SchemaQuestion, Stats, User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

type View = 'overview' | 'courses' | 'applications' | 'users' | 'schemas' | 'bot';
type Editor =
  | { type: 'course'; item?: Course }
  | { type: 'application'; item?: Application }
  | { type: 'user'; item: User }
  | null;

const emptyMeta: AdminMeta = {
  questionTypes: [],
  responseTypes: [],
  applicationStatuses: [],
  applicationStatusLabels: {},
  educationTypes: [],
  learningGoals: [],
  studyFormats: [],
  courseFormats: {}
};

const navItems: Array<{ view: View; label: string; icon: typeof LayoutDashboard }> = [
  { view: 'overview', label: 'Overview', icon: LayoutDashboard },
  { view: 'courses', label: 'Courses', icon: BookOpen },
  { view: 'applications', label: 'Applications', icon: ClipboardList },
  { view: 'users', label: 'Clients', icon: Users },
  { view: 'schemas', label: 'Schema settings', icon: Settings2 },
  { view: 'bot', label: 'Bot operations', icon: Bot }
];

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(value));
}

function statusTone(status: string) {
  if (status === 'REJECTED') return 'destructive';
  if (status === 'ENROLLED' || status === 'COMPLETED') return 'default';
  return 'secondary';
}

function getFormValue(form: HTMLFormElement, name: string) {
  return String(new FormData(form).get(name) || '').trim();
}

function getCheckbox(form: HTMLFormElement, name: string) {
  return Boolean(new FormData(form).get(name));
}

export function App() {
  const [view, setView] = useState<View>('overview');
  const [adminKey, setAdminKey] = useState(getStoredAdminKey);
  const [keyInput, setKeyInput] = useState(getStoredAdminKey);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [health, setHealth] = useState<'unknown' | 'healthy' | 'down'>('unknown');
  const [meta, setMeta] = useState<AdminMeta>(emptyMeta);
  const [schemas, setSchemas] = useState<DynamicSchemas | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [courseSearch, setCourseSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [editor, setEditor] = useState<Editor>(null);

  const api = useMemo(() => new ApiClient(() => adminKey), [adminKey]);

  const showMessage = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 3200);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const ok = await api.health().catch(() => false);
      setHealth(ok ? 'healthy' : 'down');

      if (!adminKey) return;
      const [nextMeta, nextSchemas, nextCourses, nextApplications, nextUsers, nextStats] = await Promise.all([
        api.meta(),
        api.schemas(),
        api.courses(),
        api.applications(),
        api.users(),
        api.stats()
      ]);
      setMeta(nextMeta);
      setSchemas(nextSchemas);
      setCourses(nextCourses);
      setApplications(nextApplications);
      setUsers(nextUsers);
      setStats(nextStats);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Unable to load admin data');
    } finally {
      setLoading(false);
    }
  }, [adminKey, api]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const statusLabel = (status: string) => meta.applicationStatusLabels[status] || status;
  const activeCourses = courses.filter((course) => course.isActive);
  const filteredCourses = courses.filter((course) => course.title.toLowerCase().includes(courseSearch.toLowerCase()));
  const filteredApplications = applications.filter((application) => {
    return (!statusFilter || application.status === statusFilter) && (!courseFilter || String(application.courseId) === courseFilter);
  });
  const statusCounts = new Map((stats?.byStatus || []).map((item) => [item.status, item._count._all]));
  const maxStatusCount = Math.max(1, ...Array.from(statusCounts.values()));

  async function connect() {
    setStoredAdminKey(keyInput.trim());
    setAdminKey(keyInput.trim());
    showMessage('Admin key saved');
  }

  async function saveCourse(form: HTMLFormElement) {
    const payload = {
      title: getFormValue(form, 'title'),
      educationType: getFormValue(form, 'educationType') || null,
      duration: getFormValue(form, 'duration') || null,
      format: getFormValue(form, 'format'),
      hasPractice: getCheckbox(form, 'hasPractice'),
      cost: getFormValue(form, 'cost') || null,
      canPayInInstallments: getCheckbox(form, 'canPayInInstallments'),
      ageMin: Number(getFormValue(form, 'ageMin') || 18),
      ageMax: Number(getFormValue(form, 'ageMax') || 45),
      additionalInfo: getFormValue(form, 'additionalInfo') || null,
      imageFileId: getFormValue(form, 'imageFileId') || null,
      isActive: getCheckbox(form, 'isActive')
    };
    if (editor?.type === 'course' && editor.item) await api.updateCourse(editor.item.id, payload);
    else await api.createCourse(payload);
    setEditor(null);
    await loadData();
    showMessage('Course saved');
  }

  async function saveApplication(form: HTMLFormElement) {
    if (editor?.type === 'application' && editor.item) {
      await api.updateApplication(editor.item.id, {
        courseId: Number(getFormValue(form, 'courseId')),
        experience: getFormValue(form, 'experience') || null,
        workplace: getFormValue(form, 'workplace') || null,
        educationType: getFormValue(form, 'educationType') || null,
        specialization: getFormValue(form, 'specialization') || null,
        learningGoal: getFormValue(form, 'learningGoal') || null,
        studyFormat: getFormValue(form, 'studyFormat') || null,
        studyTime: getFormValue(form, 'studyTime') || null,
        source: getFormValue(form, 'source') || 'admin',
        comment: getFormValue(form, 'comment') || null,
        status: getFormValue(form, 'status')
      });
    } else {
      await api.createApplication({
        telegramId: getFormValue(form, 'telegramId'),
        telegramUsername: getFormValue(form, 'telegramUsername'),
        fullName: getFormValue(form, 'fullName'),
        gender: getFormValue(form, 'gender'),
        birthDate: getFormValue(form, 'birthDate'),
        phone: getFormValue(form, 'phone'),
        city: getFormValue(form, 'city'),
        courseId: Number(getFormValue(form, 'courseId')),
        experience: getFormValue(form, 'experience') || null,
        workplace: getFormValue(form, 'workplace') || null,
        educationType: getFormValue(form, 'educationType') || null,
        specialization: getFormValue(form, 'specialization') || null,
        learningGoal: getFormValue(form, 'learningGoal'),
        studyFormat: getFormValue(form, 'studyFormat'),
        studyTime: getFormValue(form, 'studyTime'),
        source: getFormValue(form, 'source') || 'admin',
        comment: getFormValue(form, 'comment') || null
      });
    }
    setEditor(null);
    await loadData();
    showMessage('Application saved');
  }

  async function saveUser(form: HTMLFormElement) {
    if (editor?.type !== 'user') return;
    await api.updateUser(editor.item.id, {
      telegramId: getFormValue(form, 'telegramId'),
      username: getFormValue(form, 'username') || null,
      fullName: getFormValue(form, 'fullName'),
      phone: getFormValue(form, 'phone') || null,
      gender: getFormValue(form, 'gender') || null,
      age: Number(getFormValue(form, 'age') || 0),
      birthDate: getFormValue(form, 'birthDate') || null,
      city: getFormValue(form, 'city') || null
    });
    setEditor(null);
    await loadData();
    showMessage('Client saved');
  }

  async function submitEditor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      if (editor?.type === 'course') await saveCourse(form);
      if (editor?.type === 'application') await saveApplication(form);
      if (editor?.type === 'user') await saveUser(form);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Unable to save');
    }
  }

  async function saveSchemas() {
    if (!schemas) return;
    try {
      setSchemas(await api.saveSchemas(schemas));
      showMessage('Schema settings saved');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Unable to save schemas');
    }
  }

  async function searchUsers() {
    try {
      setUsers(await api.users(userSearch));
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Unable to search users');
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r bg-[#101719] p-5 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary text-lg font-black">U</div>
          <div>
            <div className="font-semibold">UMK Talim</div>
            <div className="text-xs text-white/55">Admin dashboard</div>
          </div>
        </div>
        <nav className="mt-9 grid gap-1">
          {navItems.map((item) => (
            <button
              key={item.view}
              className={cn('flex h-11 items-center gap-3 rounded-md px-3 text-sm text-white/75 transition hover:bg-white/10 hover:text-white', view === item.view && 'bg-white/12 text-white')}
              onClick={() => setView(item.view)}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-lg border border-white/10 p-3 text-sm text-white/65">
          {adminKey ? 'Connected with admin key' : 'Admin key required'}
        </div>
      </aside>

      <main className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-20 border-b bg-background/90 px-4 py-4 backdrop-blur md:px-7">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-primary">Management console</p>
              <h1 className="text-2xl font-semibold">{navItems.find((item) => item.view === view)?.label}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input className="w-64" type="password" value={keyInput} onChange={(event) => setKeyInput(event.target.value)} placeholder="Admin API key" />
              <Button onClick={connect}>Connect</Button>
              <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto lg:hidden">
            {navItems.map((item) => (
              <Button key={item.view} size="sm" variant={view === item.view ? 'default' : 'secondary'} onClick={() => setView(item.view)}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </div>
        </header>

        <div className="p-4 md:p-7">
          {message && <div className="mb-4 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">{message}</div>}
          {view === 'overview' && (
            <Overview
              courses={courses}
              users={users}
              applications={applications}
              stats={stats}
              meta={meta}
              statusCounts={statusCounts}
              maxStatusCount={maxStatusCount}
              statusLabel={statusLabel}
            />
          )}
          {view === 'courses' && (
            <CoursesView
              courses={filteredCourses}
              search={courseSearch}
              setSearch={setCourseSearch}
              onCreate={() => setEditor({ type: 'course' })}
              onEdit={(course) => setEditor({ type: 'course', item: course })}
              onDelete={async (course) => {
                if (!confirm('Delete this course? Courses with applications will be deactivated.')) return;
                await api.deleteCourse(course.id);
                await loadData();
                showMessage('Course removed or deactivated');
              }}
            />
          )}
          {view === 'applications' && (
            <ApplicationsView
              applications={filteredApplications}
              courses={courses}
              meta={meta}
              statusFilter={statusFilter}
              courseFilter={courseFilter}
              setStatusFilter={setStatusFilter}
              setCourseFilter={setCourseFilter}
              statusLabel={statusLabel}
              onCreate={() => setEditor({ type: 'application' })}
              onEdit={(application) => setEditor({ type: 'application', item: application })}
              onStatus={async (application, status) => {
                await api.updateApplicationStatus(application.id, status);
                await loadData();
                showMessage('Status updated');
              }}
              onDelete={async (application) => {
                if (!confirm('Delete this application?')) return;
                await api.deleteApplication(application.id);
                await loadData();
                showMessage('Application deleted');
              }}
            />
          )}
          {view === 'users' && (
            <UsersView
              users={users}
              search={userSearch}
              setSearch={setUserSearch}
              onSearch={searchUsers}
              onEdit={(user) => setEditor({ type: 'user', item: user })}
              onDelete={async (user) => {
                if (!confirm('Delete this client and related applications?')) return;
                await api.deleteUser(user.id);
                await loadData();
                showMessage('Client deleted');
              }}
            />
          )}
          {view === 'schemas' && schemas && (
            <SchemasView schemas={schemas} setSchemas={setSchemas} meta={meta} onSave={saveSchemas} />
          )}
          {view === 'bot' && <BotView health={health} adminKey={adminKey} setView={setView} />}
        </div>
      </main>

      <EditorDialog editor={editor} setEditor={setEditor} courses={courses} meta={meta} onSubmit={submitEditor} />
    </div>
  );
}

function Overview({
  courses,
  users,
  applications,
  stats,
  meta,
  statusCounts,
  maxStatusCount,
  statusLabel
}: {
  courses: Course[];
  users: User[];
  applications: Application[];
  stats: Stats | null;
  meta: AdminMeta;
  statusCounts: Map<string, number>;
  maxStatusCount: number;
  statusLabel: (status: string) => string;
}) {
  const metrics = [
    { label: 'Applications', value: stats?.total ?? applications.length, icon: ClipboardList },
    { label: 'Active courses', value: courses.filter((course) => course.isActive).length, icon: BookOpen },
    { label: 'Clients', value: users.length, icon: UserRound },
    { label: 'Average age', value: stats?.avgAge ? Math.round(stats.avgAge) : '-', icon: Activity }
  ];
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>{metric.label}</CardDescription>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Status pipeline</CardTitle>
            <CardDescription>Current application distribution by workflow status.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {meta.applicationStatuses.map((status) => {
              const count = statusCounts.get(status) || 0;
              return (
                <div key={status} className="grid grid-cols-[150px_1fr_42px] items-center gap-3">
                  <span className="text-sm text-muted-foreground">{statusLabel(status)}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(count / maxStatusCount) * 100}%` }} />
                  </div>
                  <strong className="text-right text-sm">{count}</strong>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent applications</CardTitle>
            <CardDescription>Latest clients submitted through the bot or admin.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {applications.slice(0, 6).map((application) => (
              <div key={application.id} className="rounded-lg border bg-muted/45 p-3">
                <div className="font-medium">{application.user?.fullName || 'Unknown client'}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {application.course?.title || 'No course'} · {statusLabel(application.status)} · {formatDate(application.createdAt)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CoursesView({
  courses,
  search,
  setSearch,
  onCreate,
  onEdit,
  onDelete
}: {
  courses: Course[];
  search: string;
  setSearch: (value: string) => void;
  onCreate: () => void;
  onEdit: (course: Course) => void;
  onDelete: (course: Course) => void;
}) {
  return (
    <Card>
      <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>Course catalog</CardTitle>
          <CardDescription>Create, update, deactivate, and delete bot courses.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="w-72 pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search courses" />
          </div>
          <Button onClick={onCreate}><Plus className="h-4 w-4" /> New course</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Course</TableHead><TableHead>Format</TableHead><TableHead>Age</TableHead><TableHead>Cost</TableHead><TableHead>Applications</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell><div className="font-medium">{course.title}</div><div className="text-sm text-muted-foreground">{course.duration || 'No duration'}</div></TableCell>
                <TableCell>{course.format}</TableCell>
                <TableCell>{course.ageMin}-{course.ageMax}</TableCell>
                <TableCell>{course.cost || '-'}</TableCell>
                <TableCell>{course._count?.applications ?? 0}</TableCell>
                <TableCell><Badge variant={course.isActive ? 'default' : 'secondary'}>{course.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                <TableCell className="text-right"><RowActions onEdit={() => onEdit(course)} onDelete={() => onDelete(course)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ApplicationsView(props: {
  applications: Application[];
  courses: Course[];
  meta: AdminMeta;
  statusFilter: string;
  courseFilter: string;
  setStatusFilter: (value: string) => void;
  setCourseFilter: (value: string) => void;
  statusLabel: (status: string) => string;
  onCreate: () => void;
  onEdit: (application: Application) => void;
  onStatus: (application: Application, status: string) => void;
  onDelete: (application: Application) => void;
}) {
  const exportParams = new URLSearchParams();
  if (props.statusFilter) exportParams.set('status', props.statusFilter);
  if (props.courseFilter) exportParams.set('courseId', props.courseFilter);
  return (
    <Card>
      <CardHeader className="gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <CardTitle>Applications</CardTitle>
          <CardDescription>Review applications, update fields, and move clients through statuses.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <NativeSelect className="w-48" value={props.statusFilter} onChange={(event) => props.setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            {props.meta.applicationStatuses.map((status) => <option key={status} value={status}>{props.statusLabel(status)}</option>)}
          </NativeSelect>
          <NativeSelect className="w-56" value={props.courseFilter} onChange={(event) => props.setCourseFilter(event.target.value)}>
            <option value="">All courses</option>
            {props.courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
          </NativeSelect>
          <Button onClick={props.onCreate}><Plus className="h-4 w-4" /> New application</Button>
          <Button asChild variant="outline">
            <a href={`/api/applications/export/excel?${exportParams.toString()}`}><Download className="h-4 w-4" /> Export</a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Course</TableHead><TableHead>Status</TableHead><TableHead>City</TableHead><TableHead>Created</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {props.applications.map((application) => (
              <TableRow key={application.id}>
                <TableCell><div className="font-medium">{application.user?.fullName || '-'}</div><div className="text-sm text-muted-foreground">{application.user?.phone || '-'}</div></TableCell>
                <TableCell>{application.course?.title || '-'}</TableCell>
                <TableCell>
                  <NativeSelect value={application.status} onChange={(event) => props.onStatus(application, event.target.value)}>
                    {props.meta.applicationStatuses.map((status) => <option key={status} value={status}>{props.statusLabel(status)}</option>)}
                  </NativeSelect>
                </TableCell>
                <TableCell>{application.user?.city || '-'}</TableCell>
                <TableCell>{formatDate(application.createdAt)}</TableCell>
                <TableCell className="text-right"><RowActions onEdit={() => props.onEdit(application)} onDelete={() => props.onDelete(application)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function UsersView(props: {
  users: User[];
  search: string;
  setSearch: (value: string) => void;
  onSearch: () => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}) {
  return (
    <Card>
      <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>Clients</CardTitle>
          <CardDescription>Manage Telegram users and client profile details.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Input className="w-72" value={props.search} onChange={(event) => props.setSearch(event.target.value)} placeholder="Name, phone, city, Telegram ID" />
          <Button variant="secondary" onClick={props.onSearch}><Search className="h-4 w-4" /> Search</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Telegram</TableHead><TableHead>Phone</TableHead><TableHead>City</TableHead><TableHead>Applications</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {props.users.map((user) => (
              <TableRow key={user.id}>
                <TableCell><div className="font-medium">{user.fullName}</div><div className="text-sm text-muted-foreground">{user.gender || '-'} · {user.age || '-'} years</div></TableCell>
                <TableCell>{user.username ? `@${user.username}` : user.telegramId}</TableCell>
                <TableCell>{user.phone || '-'}</TableCell>
                <TableCell>{user.city || '-'}</TableCell>
                <TableCell>{user._count?.applications ?? 0}</TableCell>
                <TableCell className="text-right"><RowActions onEdit={() => props.onEdit(user)} onDelete={() => props.onDelete(user)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SchemasView({
  schemas,
  setSchemas,
  meta,
  onSave
}: {
  schemas: DynamicSchemas;
  setSchemas: (schemas: DynamicSchemas) => void;
  meta: AdminMeta;
  onSave: () => void;
}) {
  const updateQuestion = (schemaName: keyof DynamicSchemas, index: number, patch: Partial<SchemaQuestion>) => {
    setSchemas({
      ...schemas,
      [schemaName]: {
        ...schemas[schemaName],
        questions: schemas[schemaName].questions.map((question, questionIndex) => questionIndex === index ? { ...question, ...patch } : question)
      }
    });
  };
  const addQuestion = (schemaName: keyof DynamicSchemas) => {
    const nextQuestion: SchemaQuestion = {
      key: `question${Date.now()}`,
      label: 'New question',
      questionType: 'text',
      responseType: 'string',
      required: false,
      helpText: null,
      placeholder: null,
      options: [],
      validation: {}
    };
    setSchemas({
      ...schemas,
      [schemaName]: { ...schemas[schemaName], questions: [...schemas[schemaName].questions, nextQuestion] }
    });
  };
  const removeQuestion = (schemaName: keyof DynamicSchemas, index: number) => {
    setSchemas({
      ...schemas,
      [schemaName]: { ...schemas[schemaName], questions: schemas[schemaName].questions.filter((_, itemIndex) => itemIndex !== index) }
    });
  };
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 xl:grid-cols-2">
        {(['course', 'application'] as const).map((schemaName) => (
          <Card key={schemaName}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>{schemas[schemaName].title}</CardTitle>
                <CardDescription>{schemas[schemaName].description}</CardDescription>
              </div>
              <Button variant="secondary" onClick={() => addQuestion(schemaName)}><Plus className="h-4 w-4" /> Add</Button>
            </CardHeader>
            <CardContent className="grid gap-3">
              {schemas[schemaName].questions.map((question, index) => (
                <div key={`${question.key}-${index}`} className="grid gap-3 rounded-lg border bg-muted/35 p-3 md:grid-cols-2">
                  <Field label="Key"><Input value={question.key} onChange={(event) => updateQuestion(schemaName, index, { key: event.target.value })} /></Field>
                  <Field label="Label"><Input value={question.label} onChange={(event) => updateQuestion(schemaName, index, { label: event.target.value })} /></Field>
                  <Field label="Question type">
                    <NativeSelect value={question.questionType} onChange={(event) => updateQuestion(schemaName, index, { questionType: event.target.value })}>
                      {meta.questionTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                    </NativeSelect>
                  </Field>
                  <Field label="Response type">
                    <NativeSelect value={question.responseType} onChange={(event) => updateQuestion(schemaName, index, { responseType: event.target.value })}>
                      {meta.responseTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                    </NativeSelect>
                  </Field>
                  <Field className="md:col-span-2" label="Placeholder"><Input value={question.placeholder || ''} onChange={(event) => updateQuestion(schemaName, index, { placeholder: event.target.value })} /></Field>
                  <Field className="md:col-span-2" label="Help text"><Input value={question.helpText || ''} onChange={(event) => updateQuestion(schemaName, index, { helpText: event.target.value })} /></Field>
                  <Field className="md:col-span-2" label="Options, comma separated"><Input value={question.options.join(', ')} onChange={(event) => updateQuestion(schemaName, index, { options: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></Field>
                  <div className="flex items-center justify-between md:col-span-2">
                    <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={question.required} onChange={(event) => updateQuestion(schemaName, index, { required: event.target.checked })} /> Required</label>
                    <Button variant="destructive" size="sm" onClick={() => removeQuestion(schemaName, index)}><Trash2 className="h-4 w-4" /> Remove</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="sticky bottom-4 flex justify-end"><Button onClick={onSave}><Save className="h-4 w-4" /> Save schema settings</Button></div>
    </div>
  );
}

function BotView({ health, adminKey, setView }: { health: string; adminKey: string; setView: (view: View) => void }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Operational health</CardTitle><CardDescription>Runtime status for admin operations.</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-[150px_1fr] gap-4">
          <span className="text-muted-foreground">API health</span><Badge variant={health === 'healthy' ? 'default' : 'destructive'}>{health}</Badge>
          <span className="text-muted-foreground">Protected API</span><Badge variant={adminKey ? 'default' : 'secondary'}>{adminKey ? 'Connected' : 'Waiting for key'}</Badge>
          <span className="text-muted-foreground">Excel reports</span><strong>Available</strong>
          <span className="text-muted-foreground">Notifications</span><strong>Backend configured</strong>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Admin workflows</CardTitle><CardDescription>Fast access to the most common bot management flows.</CardDescription></CardHeader>
        <CardContent className="grid gap-2">
          <Button variant="secondary" onClick={() => setView('applications')}>Review applications</Button>
          <Button variant="secondary" onClick={() => setView('courses')}>Manage course catalog</Button>
          <Button variant="secondary" onClick={() => setView('schemas')}>Adjust bot questions</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function EditorDialog({
  editor,
  setEditor,
  courses,
  meta,
  onSubmit
}: {
  editor: Editor;
  setEditor: (editor: Editor) => void;
  courses: Course[];
  meta: AdminMeta;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Dialog open={Boolean(editor)} onOpenChange={(open) => !open && setEditor(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editor?.item ? 'Edit' : 'New'} {editor?.type}</DialogTitle>
          <DialogDescription>Changes are saved through the protected admin API.</DialogDescription>
        </DialogHeader>
        <form id="editor-form" className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          {editor?.type === 'course' && <CourseForm course={editor.item} meta={meta} />}
          {editor?.type === 'application' && <ApplicationForm application={editor.item} courses={courses} meta={meta} />}
          {editor?.type === 'user' && <UserForm user={editor.item} />}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditor(null)}>Cancel</Button>
          <Button type="submit" form="editor-form">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CourseForm({ course, meta }: { course?: Course; meta: AdminMeta }) {
  return (
    <>
      <Field label="Title"><Input name="title" defaultValue={course?.title || ''} required /></Field>
      <Field label="Format"><NativeSelect name="format" defaultValue={course?.format || 'ONLINE'}>{Object.entries(meta.courseFormats).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></Field>
      <Field label="Education type"><Input name="educationType" defaultValue={course?.educationType || ''} /></Field>
      <Field label="Duration"><Input name="duration" defaultValue={course?.duration || ''} /></Field>
      <Field label="Cost"><Input name="cost" defaultValue={course?.cost || ''} /></Field>
      <Field label="Image file ID"><Input name="imageFileId" defaultValue={course?.imageFileId || ''} /></Field>
      <Field label="Minimum age"><Input name="ageMin" type="number" defaultValue={course?.ageMin ?? 18} /></Field>
      <Field label="Maximum age"><Input name="ageMax" type="number" defaultValue={course?.ageMax ?? 45} /></Field>
      <label className="flex items-center gap-2 text-sm font-medium"><input name="hasPractice" type="checkbox" defaultChecked={course?.hasPractice || false} /> Has practice</label>
      <label className="flex items-center gap-2 text-sm font-medium"><input name="canPayInInstallments" type="checkbox" defaultChecked={course?.canPayInInstallments || false} /> Installments</label>
      <label className="flex items-center gap-2 text-sm font-medium"><input name="isActive" type="checkbox" defaultChecked={course?.isActive ?? true} /> Active</label>
      <Field label="Additional info" className="md:col-span-2"><Textarea name="additionalInfo" defaultValue={course?.additionalInfo || ''} /></Field>
    </>
  );
}

function ApplicationForm({ application, courses, meta }: { application?: Application; courses: Course[]; meta: AdminMeta }) {
  return (
    <>
      {!application && (
        <>
          <Field label="Telegram ID"><Input name="telegramId" required /></Field>
          <Field label="Telegram username"><Input name="telegramUsername" /></Field>
          <Field label="Full name"><Input name="fullName" required /></Field>
          <Field label="Gender"><NativeSelect name="gender" defaultValue="MALE"><option value="MALE">Male</option><option value="FEMALE">Female</option></NativeSelect></Field>
          <Field label="Birth date, dd.mm.yyyy"><Input name="birthDate" placeholder="01.01.2000" required /></Field>
          <Field label="Phone"><Input name="phone" required /></Field>
          <Field label="City"><Input name="city" required /></Field>
        </>
      )}
      <Field label="Course"><NativeSelect name="courseId" defaultValue={application?.courseId || courses[0]?.id}>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</NativeSelect></Field>
      {application && <Field label="Status"><NativeSelect name="status" defaultValue={application.status}>{meta.applicationStatuses.map((status) => <option key={status} value={status}>{meta.applicationStatusLabels[status] || status}</option>)}</NativeSelect></Field>}
      <Field label="Experience"><Input name="experience" defaultValue={application?.experience || ''} /></Field>
      <Field label="Workplace"><Input name="workplace" defaultValue={application?.workplace || ''} /></Field>
      <Field label="Education type"><NativeSelect name="educationType" defaultValue={application?.educationType || ''}><option value="">Not set</option>{meta.educationTypes.map((type) => <option key={type} value={type}>{type}</option>)}</NativeSelect></Field>
      <Field label="Specialization"><Input name="specialization" defaultValue={application?.specialization || ''} /></Field>
      <Field label="Learning goal"><NativeSelect name="learningGoal" defaultValue={application?.learningGoal || meta.learningGoals[0]}>{meta.learningGoals.map((goal) => <option key={goal} value={goal}>{goal}</option>)}</NativeSelect></Field>
      <Field label="Study format"><NativeSelect name="studyFormat" defaultValue={application?.studyFormat || meta.studyFormats[0]}>{meta.studyFormats.map((format) => <option key={format} value={format}>{format}</option>)}</NativeSelect></Field>
      <Field label="Study time"><Input name="studyTime" defaultValue={application?.studyTime || ''} required /></Field>
      <Field label="Source"><Input name="source" defaultValue={application?.source || 'admin'} /></Field>
      <Field label="Comment" className="md:col-span-2"><Textarea name="comment" defaultValue={application?.comment || ''} /></Field>
    </>
  );
}

function UserForm({ user }: { user: User }) {
  return (
    <>
      <Field label="Telegram ID"><Input name="telegramId" defaultValue={user.telegramId} required /></Field>
      <Field label="Username"><Input name="username" defaultValue={user.username || ''} /></Field>
      <Field label="Full name"><Input name="fullName" defaultValue={user.fullName} required /></Field>
      <Field label="Phone"><Input name="phone" defaultValue={user.phone || ''} /></Field>
      <Field label="Gender"><NativeSelect name="gender" defaultValue={user.gender || ''}><option value="">Not set</option><option value="MALE">Male</option><option value="FEMALE">Female</option></NativeSelect></Field>
      <Field label="Age"><Input name="age" type="number" defaultValue={user.age || ''} /></Field>
      <Field label="Birth date"><Input name="birthDate" type="date" defaultValue={user.birthDate ? new Date(user.birthDate).toISOString().slice(0, 10) : ''} /></Field>
      <Field label="City"><Input name="city" defaultValue={user.city || ''} /></Field>
    </>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={cn('grid gap-2', className)}><Label>{label}</Label>{children}</div>;
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="secondary" size="sm" onClick={onEdit}>Edit</Button>
      <Button variant="destructive" size="sm" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
    </div>
  );
}
