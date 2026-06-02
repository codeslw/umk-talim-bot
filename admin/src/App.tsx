import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BookOpen,
  Bot,
  ClipboardList,
  Download,
  Languages,
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
type Lang = 'ru' | 'uz' | 'en';
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

const navItems: Array<{ view: View; labelKey: View; icon: typeof LayoutDashboard }> = [
  { view: 'overview', labelKey: 'overview', icon: LayoutDashboard },
  { view: 'courses', labelKey: 'courses', icon: BookOpen },
  { view: 'applications', labelKey: 'applications', icon: ClipboardList },
  { view: 'users', labelKey: 'users', icon: Users },
  { view: 'schemas', labelKey: 'schemas', icon: Settings2 },
  { view: 'bot', labelKey: 'bot', icon: Bot }
];

const languages: Array<{ value: Lang; label: string }> = [
  { value: 'ru', label: 'RU' },
  { value: 'uz', label: 'UZ' },
  { value: 'en', label: 'EN' }
];

const translations = {
  ru: {
    nav: {
      overview: 'Обзор',
      courses: 'Курсы',
      applications: 'Заявки',
      users: 'Клиенты',
      schemas: 'Настройки схем',
      bot: 'Операции бота'
    },
    common: {
      brandSubtitle: 'Панель управления',
      connected: 'Ключ администратора подключен',
      keyRequired: 'Нужен ключ администратора',
      console: 'Консоль управления',
      adminKey: 'Ключ администратора',
      connect: 'Подключить',
      save: 'Сохранить',
      cancel: 'Отмена',
      edit: 'Изменить',
      add: 'Добавить',
      remove: 'Удалить',
      search: 'Поиск',
      export: 'Экспорт',
      allStatuses: 'Все статусы',
      allCourses: 'Все курсы',
      active: 'Активен',
      inactive: 'Неактивен',
      notSet: 'Не указано',
      healthy: 'Работает',
      down: 'Недоступно',
      unknown: 'Неизвестно',
      years: 'лет',
      savedKey: 'Ключ администратора сохранен',
      savedCourse: 'Курс сохранен',
      savedApplication: 'Заявка сохранена',
      savedClient: 'Клиент сохранен',
      savedSchemas: 'Настройки схем сохранены',
      statusUpdated: 'Статус обновлен',
      courseDeleted: 'Курс удален или деактивирован',
      applicationDeleted: 'Заявка удалена',
      clientDeleted: 'Клиент удален',
      loadError: 'Не удалось загрузить данные',
      saveError: 'Не удалось сохранить',
      schemaSaveError: 'Не удалось сохранить схемы',
      userSearchError: 'Не удалось найти клиентов'
    },
    overview: {
      applications: 'Заявки',
      activeCourses: 'Активные курсы',
      clients: 'Клиенты',
      averageAge: 'Средний возраст',
      pipeline: 'Воронка статусов',
      pipelineDescription: 'Текущее распределение заявок по этапам обработки.',
      recentApplications: 'Последние заявки',
      recentDescription: 'Новые клиенты, добавленные через бота или админ-панель.',
      unknownClient: 'Неизвестный клиент',
      noCourse: 'Курс не выбран'
    },
    courses: {
      title: 'Каталог курсов',
      description: 'Создание, обновление, деактивация и удаление курсов для бота.',
      search: 'Поиск курсов',
      new: 'Новый курс',
      course: 'Курс',
      format: 'Формат',
      age: 'Возраст',
      cost: 'Стоимость',
      applications: 'Заявки',
      status: 'Статус',
      noDuration: 'Без длительности',
      deleteConfirm: 'Удалить курс? Курсы с заявками будут деактивированы.'
    },
    applications: {
      title: 'Заявки',
      description: 'Просмотр заявок, обновление данных и управление статусами клиентов.',
      new: 'Новая заявка',
      client: 'Клиент',
      course: 'Курс',
      status: 'Статус',
      city: 'Город',
      created: 'Создано',
      deleteConfirm: 'Удалить эту заявку?'
    },
    users: {
      title: 'Клиенты',
      description: 'Управление пользователями Telegram и профилями клиентов.',
      search: 'Имя, телефон, город, Telegram ID',
      client: 'Клиент',
      telegram: 'Telegram',
      phone: 'Телефон',
      city: 'Город',
      applications: 'Заявки',
      deleteConfirm: 'Удалить клиента и связанные заявки?'
    },
    schemas: {
      key: 'Ключ',
      label: 'Название',
      questionType: 'Тип вопроса',
      responseType: 'Тип ответа',
      placeholder: 'Подсказка',
      helpText: 'Текст помощи',
      options: 'Опции через запятую',
      required: 'Обязательное поле',
      newQuestion: 'Новый вопрос',
      save: 'Сохранить схемы'
    },
    bot: {
      health: 'Состояние системы',
      healthDescription: 'Статус сервисов для административных операций.',
      apiHealth: 'API',
      protectedApi: 'Защищенный API',
      excel: 'Excel-отчеты',
      notifications: 'Уведомления',
      available: 'Доступно',
      configured: 'Настроено в backend',
      waitingKey: 'Ожидает ключ',
      workflows: 'Рабочие процессы',
      workflowsDescription: 'Быстрый доступ к основным сценариям управления ботом.',
      reviewApplications: 'Проверить заявки',
      manageCourses: 'Управлять курсами',
      adjustQuestions: 'Настроить вопросы'
    },
    form: {
      new: 'Новый',
      edit: 'Редактировать',
      changesProtected: 'Изменения сохраняются через защищенный admin API.',
      title: 'Название',
      format: 'Формат',
      educationType: 'Тип образования',
      duration: 'Длительность',
      cost: 'Стоимость',
      imageFileId: 'ID изображения',
      ageMin: 'Минимальный возраст',
      ageMax: 'Максимальный возраст',
      hasPractice: 'Есть практика',
      installments: 'Рассрочка',
      active: 'Активен',
      additionalInfo: 'Дополнительная информация',
      telegramId: 'Telegram ID',
      telegramUsername: 'Telegram username',
      fullName: 'ФИО',
      gender: 'Пол',
      male: 'Мужской',
      female: 'Женский',
      birthDateText: 'Дата рождения, дд.мм.гггг',
      birthDate: 'Дата рождения',
      phone: 'Телефон',
      city: 'Город',
      course: 'Курс',
      status: 'Статус',
      experience: 'Опыт',
      workplace: 'Место работы',
      specialization: 'Специализация',
      learningGoal: 'Цель обучения',
      studyFormat: 'Формат обучения',
      studyTime: 'Время обучения',
      source: 'Источник',
      comment: 'Комментарий',
      username: 'Username',
      age: 'Возраст'
    }
  },
  uz: {
    nav: {
      overview: 'Umumiy',
      courses: 'Kurslar',
      applications: 'Arizalar',
      users: 'Mijozlar',
      schemas: 'Sxema sozlamalari',
      bot: 'Bot amallari'
    },
    common: {
      brandSubtitle: 'Boshqaruv paneli',
      connected: 'Admin kaliti ulangan',
      keyRequired: 'Admin kaliti kerak',
      console: 'Boshqaruv konsoli',
      adminKey: 'Admin API kaliti',
      connect: 'Ulanish',
      save: 'Saqlash',
      cancel: 'Bekor qilish',
      edit: 'Tahrirlash',
      add: 'Qo‘shish',
      remove: 'O‘chirish',
      search: 'Qidirish',
      export: 'Eksport',
      allStatuses: 'Barcha statuslar',
      allCourses: 'Barcha kurslar',
      active: 'Faol',
      inactive: 'Nofaol',
      notSet: 'Ko‘rsatilmagan',
      healthy: 'Ishlayapti',
      down: 'Ishlamayapti',
      unknown: 'Noma’lum',
      years: 'yosh',
      savedKey: 'Admin kaliti saqlandi',
      savedCourse: 'Kurs saqlandi',
      savedApplication: 'Ariza saqlandi',
      savedClient: 'Mijoz saqlandi',
      savedSchemas: 'Sxema sozlamalari saqlandi',
      statusUpdated: 'Status yangilandi',
      courseDeleted: 'Kurs o‘chirildi yoki deaktiv qilindi',
      applicationDeleted: 'Ariza o‘chirildi',
      clientDeleted: 'Mijoz o‘chirildi',
      loadError: 'Ma’lumotlarni yuklab bo‘lmadi',
      saveError: 'Saqlab bo‘lmadi',
      schemaSaveError: 'Sxemalarni saqlab bo‘lmadi',
      userSearchError: 'Mijozlarni qidirib bo‘lmadi'
    },
    overview: {
      applications: 'Arizalar',
      activeCourses: 'Faol kurslar',
      clients: 'Mijozlar',
      averageAge: 'O‘rtacha yosh',
      pipeline: 'Status voronkasi',
      pipelineDescription: 'Arizalarning ish jarayoni bo‘yicha taqsimoti.',
      recentApplications: 'So‘nggi arizalar',
      recentDescription: 'Bot yoki admin orqali qo‘shilgan so‘nggi mijozlar.',
      unknownClient: 'Noma’lum mijoz',
      noCourse: 'Kurs tanlanmagan'
    },
    courses: {
      title: 'Kurslar katalogi',
      description: 'Bot kurslarini yaratish, yangilash, deaktiv qilish va o‘chirish.',
      search: 'Kurslarni qidirish',
      new: 'Yangi kurs',
      course: 'Kurs',
      format: 'Format',
      age: 'Yosh',
      cost: 'Narx',
      applications: 'Arizalar',
      status: 'Status',
      noDuration: 'Davomiylik yo‘q',
      deleteConfirm: 'Kurs o‘chirilsinmi? Arizalari bor kurslar deaktiv qilinadi.'
    },
    applications: {
      title: 'Arizalar',
      description: 'Arizalarni ko‘rish, maydonlarni yangilash va statuslarni boshqarish.',
      new: 'Yangi ariza',
      client: 'Mijoz',
      course: 'Kurs',
      status: 'Status',
      city: 'Shahar',
      created: 'Yaratilgan',
      deleteConfirm: 'Ushbu ariza o‘chirilsinmi?'
    },
    users: {
      title: 'Mijozlar',
      description: 'Telegram foydalanuvchilari va mijoz profillarini boshqarish.',
      search: 'Ism, telefon, shahar, Telegram ID',
      client: 'Mijoz',
      telegram: 'Telegram',
      phone: 'Telefon',
      city: 'Shahar',
      applications: 'Arizalar',
      deleteConfirm: 'Mijoz va bog‘langan arizalar o‘chirilsinmi?'
    },
    schemas: {
      key: 'Kalit',
      label: 'Nomi',
      questionType: 'Savol turi',
      responseType: 'Javob turi',
      placeholder: 'Placeholder',
      helpText: 'Yordam matni',
      options: 'Variantlar, vergul bilan',
      required: 'Majburiy',
      newQuestion: 'Yangi savol',
      save: 'Sxemalarni saqlash'
    },
    bot: {
      health: 'Tizim holati',
      healthDescription: 'Admin amallari uchun servislar holati.',
      apiHealth: 'API',
      protectedApi: 'Himoyalangan API',
      excel: 'Excel hisobotlar',
      notifications: 'Bildirishnomalar',
      available: 'Mavjud',
      configured: 'Backendda sozlangan',
      waitingKey: 'Kalit kutilmoqda',
      workflows: 'Ish jarayonlari',
      workflowsDescription: 'Bot boshqaruvi uchun asosiy amallarga tez kirish.',
      reviewApplications: 'Arizalarni ko‘rish',
      manageCourses: 'Kurslarni boshqarish',
      adjustQuestions: 'Savollarni sozlash'
    },
    form: {
      new: 'Yangi',
      edit: 'Tahrirlash',
      changesProtected: 'O‘zgarishlar himoyalangan admin API orqali saqlanadi.',
      title: 'Nomi',
      format: 'Format',
      educationType: 'Ta’lim turi',
      duration: 'Davomiylik',
      cost: 'Narx',
      imageFileId: 'Rasm file ID',
      ageMin: 'Minimal yosh',
      ageMax: 'Maksimal yosh',
      hasPractice: 'Amaliyot bor',
      installments: 'Bo‘lib to‘lash',
      active: 'Faol',
      additionalInfo: 'Qo‘shimcha ma’lumot',
      telegramId: 'Telegram ID',
      telegramUsername: 'Telegram username',
      fullName: 'F.I.Sh.',
      gender: 'Jins',
      male: 'Erkak',
      female: 'Ayol',
      birthDateText: 'Tug‘ilgan sana, dd.mm.yyyy',
      birthDate: 'Tug‘ilgan sana',
      phone: 'Telefon',
      city: 'Shahar',
      course: 'Kurs',
      status: 'Status',
      experience: 'Tajriba',
      workplace: 'Ish joyi',
      specialization: 'Mutaxassislik',
      learningGoal: 'O‘qish maqsadi',
      studyFormat: 'O‘qish formati',
      studyTime: 'O‘qish vaqti',
      source: 'Manba',
      comment: 'Izoh',
      username: 'Username',
      age: 'Yosh'
    }
  },
  en: {
    nav: {
      overview: 'Overview',
      courses: 'Courses',
      applications: 'Applications',
      users: 'Clients',
      schemas: 'Schema settings',
      bot: 'Bot operations'
    },
    common: {
      brandSubtitle: 'Admin dashboard',
      connected: 'Connected with admin key',
      keyRequired: 'Admin key required',
      console: 'Management console',
      adminKey: 'Admin API key',
      connect: 'Connect',
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      add: 'Add',
      remove: 'Remove',
      search: 'Search',
      export: 'Export',
      allStatuses: 'All statuses',
      allCourses: 'All courses',
      active: 'Active',
      inactive: 'Inactive',
      notSet: 'Not set',
      healthy: 'Healthy',
      down: 'Down',
      unknown: 'Unknown',
      years: 'years',
      savedKey: 'Admin key saved',
      savedCourse: 'Course saved',
      savedApplication: 'Application saved',
      savedClient: 'Client saved',
      savedSchemas: 'Schema settings saved',
      statusUpdated: 'Status updated',
      courseDeleted: 'Course removed or deactivated',
      applicationDeleted: 'Application deleted',
      clientDeleted: 'Client deleted',
      loadError: 'Unable to load admin data',
      saveError: 'Unable to save',
      schemaSaveError: 'Unable to save schemas',
      userSearchError: 'Unable to search users'
    },
    overview: {
      applications: 'Applications',
      activeCourses: 'Active courses',
      clients: 'Clients',
      averageAge: 'Average age',
      pipeline: 'Status pipeline',
      pipelineDescription: 'Current application distribution by workflow status.',
      recentApplications: 'Recent applications',
      recentDescription: 'Latest clients submitted through the bot or admin.',
      unknownClient: 'Unknown client',
      noCourse: 'No course'
    },
    courses: {
      title: 'Course catalog',
      description: 'Create, update, deactivate, and delete bot courses.',
      search: 'Search courses',
      new: 'New course',
      course: 'Course',
      format: 'Format',
      age: 'Age',
      cost: 'Cost',
      applications: 'Applications',
      status: 'Status',
      noDuration: 'No duration',
      deleteConfirm: 'Delete this course? Courses with applications will be deactivated.'
    },
    applications: {
      title: 'Applications',
      description: 'Review applications, update fields, and move clients through statuses.',
      new: 'New application',
      client: 'Client',
      course: 'Course',
      status: 'Status',
      city: 'City',
      created: 'Created',
      deleteConfirm: 'Delete this application?'
    },
    users: {
      title: 'Clients',
      description: 'Manage Telegram users and client profile details.',
      search: 'Name, phone, city, Telegram ID',
      client: 'Client',
      telegram: 'Telegram',
      phone: 'Phone',
      city: 'City',
      applications: 'Applications',
      deleteConfirm: 'Delete this client and related applications?'
    },
    schemas: {
      key: 'Key',
      label: 'Label',
      questionType: 'Question type',
      responseType: 'Response type',
      placeholder: 'Placeholder',
      helpText: 'Help text',
      options: 'Options, comma separated',
      required: 'Required',
      newQuestion: 'New question',
      save: 'Save schema settings'
    },
    bot: {
      health: 'Operational health',
      healthDescription: 'Runtime status for admin operations.',
      apiHealth: 'API health',
      protectedApi: 'Protected API',
      excel: 'Excel reports',
      notifications: 'Notifications',
      available: 'Available',
      configured: 'Backend configured',
      waitingKey: 'Waiting for key',
      workflows: 'Admin workflows',
      workflowsDescription: 'Fast access to the most common bot management flows.',
      reviewApplications: 'Review applications',
      manageCourses: 'Manage course catalog',
      adjustQuestions: 'Adjust bot questions'
    },
    form: {
      new: 'New',
      edit: 'Edit',
      changesProtected: 'Changes are saved through the protected admin API.',
      title: 'Title',
      format: 'Format',
      educationType: 'Education type',
      duration: 'Duration',
      cost: 'Cost',
      imageFileId: 'Image file ID',
      ageMin: 'Minimum age',
      ageMax: 'Maximum age',
      hasPractice: 'Has practice',
      installments: 'Installments',
      active: 'Active',
      additionalInfo: 'Additional info',
      telegramId: 'Telegram ID',
      telegramUsername: 'Telegram username',
      fullName: 'Full name',
      gender: 'Gender',
      male: 'Male',
      female: 'Female',
      birthDateText: 'Birth date, dd.mm.yyyy',
      birthDate: 'Birth date',
      phone: 'Phone',
      city: 'City',
      course: 'Course',
      status: 'Status',
      experience: 'Experience',
      workplace: 'Workplace',
      specialization: 'Specialization',
      learningGoal: 'Learning goal',
      studyFormat: 'Study format',
      studyTime: 'Study time',
      source: 'Source',
      comment: 'Comment',
      username: 'Username',
      age: 'Age'
    }
  }
};

type Translation = (typeof translations)['ru'];

function getStoredLang(): Lang {
  const stored = window.localStorage.getItem('umkAdminLang');
  return stored === 'ru' || stored === 'uz' || stored === 'en' ? stored : 'ru';
}

function formatDate(value?: string | null, lang: Lang = 'ru') {
  if (!value) return '-';
  const locales: Record<Lang, string> = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-GB' };
  return new Intl.DateTimeFormat(locales[lang], { dateStyle: 'medium' }).format(new Date(value));
}

function getFormValue(form: HTMLFormElement, name: string) {
  return String(new FormData(form).get(name) || '').trim();
}

function getCheckbox(form: HTMLFormElement, name: string) {
  return Boolean(new FormData(form).get(name));
}

export function App() {
  const [view, setView] = useState<View>('overview');
  const [lang, setLang] = useState<Lang>(getStoredLang);
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
  const t = translations[lang];

  const showMessage = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 3200);
  };

  const changeLang = (nextLang: Lang) => {
    window.localStorage.setItem('umkAdminLang', nextLang);
    setLang(nextLang);
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
      showMessage(error instanceof Error ? error.message : t.common.loadError);
    } finally {
      setLoading(false);
    }
  }, [adminKey, api, t.common.loadError]);

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
    showMessage(t.common.savedKey);
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
    showMessage(t.common.savedCourse);
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
    showMessage(t.common.savedApplication);
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
    showMessage(t.common.savedClient);
  }

  async function submitEditor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      if (editor?.type === 'course') await saveCourse(form);
      if (editor?.type === 'application') await saveApplication(form);
      if (editor?.type === 'user') await saveUser(form);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : t.common.saveError);
    }
  }

  async function saveSchemas() {
    if (!schemas) return;
    try {
      setSchemas(await api.saveSchemas(schemas));
      showMessage(t.common.savedSchemas);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : t.common.schemaSaveError);
    }
  }

  async function searchUsers() {
    try {
      setUsers(await api.users(userSearch));
    } catch (error) {
      showMessage(error instanceof Error ? error.message : t.common.userSearchError);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-white/10 bg-[linear-gradient(165deg,#10201f_0%,#18332e_55%,#211b15_100%)] p-5 text-white shadow-2xl lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] text-lg font-black shadow-lg shadow-black/20">U</div>
          <div>
            <div className="font-semibold">UMK Talim</div>
            <div className="text-xs text-white/55">{t.common.brandSubtitle}</div>
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
              {t.nav[item.labelKey]}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-lg border border-white/10 p-3 text-sm text-white/65">
          {adminKey ? t.common.connected : t.common.keyRequired}
        </div>
      </aside>

      <main className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-20 border-b bg-card/80 px-4 py-4 shadow-sm backdrop-blur md:px-7">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t.common.console}</p>
              <h1 className="text-2xl font-semibold">{t.nav[view]}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-10 items-center gap-2 rounded-md border bg-background/70 px-2">
                <Languages className="h-4 w-4 text-muted-foreground" />
                <NativeSelect className="h-8 w-20 border-0 bg-transparent px-1" value={lang} onChange={(event) => changeLang(event.target.value as Lang)}>
                  {languages.map((language) => <option key={language.value} value={language.value}>{language.label}</option>)}
                </NativeSelect>
              </div>
              <Input className="w-64" type="password" value={keyInput} onChange={(event) => setKeyInput(event.target.value)} placeholder={t.common.adminKey} />
              <Button onClick={connect}>{t.common.connect}</Button>
              <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto lg:hidden">
            {navItems.map((item) => (
              <Button key={item.view} size="sm" variant={view === item.view ? 'default' : 'secondary'} onClick={() => setView(item.view)}>
                <item.icon className="h-4 w-4" />
                {t.nav[item.labelKey]}
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
              t={t}
              lang={lang}
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
                if (!confirm(t.courses.deleteConfirm)) return;
                await api.deleteCourse(course.id);
                await loadData();
                showMessage(t.common.courseDeleted);
              }}
              t={t}
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
                showMessage(t.common.statusUpdated);
              }}
              onDelete={async (application) => {
                if (!confirm(t.applications.deleteConfirm)) return;
                await api.deleteApplication(application.id);
                await loadData();
                showMessage(t.common.applicationDeleted);
              }}
              t={t}
              lang={lang}
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
                if (!confirm(t.users.deleteConfirm)) return;
                await api.deleteUser(user.id);
                await loadData();
                showMessage(t.common.clientDeleted);
              }}
              t={t}
            />
          )}
          {view === 'schemas' && schemas && (
            <SchemasView schemas={schemas} setSchemas={setSchemas} meta={meta} onSave={saveSchemas} t={t} />
          )}
          {view === 'bot' && <BotView health={health} adminKey={adminKey} setView={setView} t={t} />}
        </div>
      </main>

      <EditorDialog editor={editor} setEditor={setEditor} courses={courses} meta={meta} onSubmit={submitEditor} t={t} />
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
  statusLabel,
  t,
  lang
}: {
  courses: Course[];
  users: User[];
  applications: Application[];
  stats: Stats | null;
  meta: AdminMeta;
  statusCounts: Map<string, number>;
  maxStatusCount: number;
  statusLabel: (status: string) => string;
  t: Translation;
  lang: Lang;
}) {
  const metrics = [
    { label: t.overview.applications, value: stats?.total ?? applications.length, icon: ClipboardList },
    { label: t.overview.activeCourses, value: courses.filter((course) => course.isActive).length, icon: BookOpen },
    { label: t.overview.clients, value: users.length, icon: UserRound },
    { label: t.overview.averageAge, value: stats?.avgAge ? Math.round(stats.avgAge) : '-', icon: Activity }
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
            <CardTitle>{t.overview.pipeline}</CardTitle>
            <CardDescription>{t.overview.pipelineDescription}</CardDescription>
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
            <CardTitle>{t.overview.recentApplications}</CardTitle>
            <CardDescription>{t.overview.recentDescription}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {applications.slice(0, 6).map((application) => (
              <div key={application.id} className="rounded-lg border bg-muted/45 p-3">
                <div className="font-medium">{application.user?.fullName || t.overview.unknownClient}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {application.course?.title || t.overview.noCourse} · {statusLabel(application.status)} · {formatDate(application.createdAt, lang)}
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
  onDelete,
  t
}: {
  courses: Course[];
  search: string;
  setSearch: (value: string) => void;
  onCreate: () => void;
  onEdit: (course: Course) => void;
  onDelete: (course: Course) => void;
  t: Translation;
}) {
  return (
    <Card>
      <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>{t.courses.title}</CardTitle>
          <CardDescription>{t.courses.description}</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="w-72 pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.courses.search} />
          </div>
          <Button onClick={onCreate}><Plus className="h-4 w-4" /> {t.courses.new}</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>{t.courses.course}</TableHead><TableHead>{t.courses.format}</TableHead><TableHead>{t.courses.age}</TableHead><TableHead>{t.courses.cost}</TableHead><TableHead>{t.courses.applications}</TableHead><TableHead>{t.courses.status}</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell><div className="font-medium">{course.title}</div><div className="text-sm text-muted-foreground">{course.duration || t.courses.noDuration}</div></TableCell>
                <TableCell>{course.format}</TableCell>
                <TableCell>{course.ageMin}-{course.ageMax}</TableCell>
                <TableCell>{course.cost || '-'}</TableCell>
                <TableCell>{course._count?.applications ?? 0}</TableCell>
                <TableCell><Badge variant={course.isActive ? 'default' : 'secondary'}>{course.isActive ? t.common.active : t.common.inactive}</Badge></TableCell>
                <TableCell className="text-right"><RowActions onEdit={() => onEdit(course)} onDelete={() => onDelete(course)} t={t} /></TableCell>
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
  t: Translation;
  lang: Lang;
}) {
  const exportParams = new URLSearchParams();
  if (props.statusFilter) exportParams.set('status', props.statusFilter);
  if (props.courseFilter) exportParams.set('courseId', props.courseFilter);
  return (
    <Card>
      <CardHeader className="gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <CardTitle>{props.t.applications.title}</CardTitle>
          <CardDescription>{props.t.applications.description}</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <NativeSelect className="w-48" value={props.statusFilter} onChange={(event) => props.setStatusFilter(event.target.value)}>
            <option value="">{props.t.common.allStatuses}</option>
            {props.meta.applicationStatuses.map((status) => <option key={status} value={status}>{props.statusLabel(status)}</option>)}
          </NativeSelect>
          <NativeSelect className="w-56" value={props.courseFilter} onChange={(event) => props.setCourseFilter(event.target.value)}>
            <option value="">{props.t.common.allCourses}</option>
            {props.courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
          </NativeSelect>
          <Button onClick={props.onCreate}><Plus className="h-4 w-4" /> {props.t.applications.new}</Button>
          <Button asChild variant="outline">
            <a href={`/api/applications/export/excel?${exportParams.toString()}`}><Download className="h-4 w-4" /> {props.t.common.export}</a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>{props.t.applications.client}</TableHead><TableHead>{props.t.applications.course}</TableHead><TableHead>{props.t.applications.status}</TableHead><TableHead>{props.t.applications.city}</TableHead><TableHead>{props.t.applications.created}</TableHead><TableHead /></TableRow></TableHeader>
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
                <TableCell>{formatDate(application.createdAt, props.lang)}</TableCell>
                <TableCell className="text-right"><RowActions onEdit={() => props.onEdit(application)} onDelete={() => props.onDelete(application)} t={props.t} /></TableCell>
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
  t: Translation;
}) {
  return (
    <Card>
      <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>{props.t.users.title}</CardTitle>
          <CardDescription>{props.t.users.description}</CardDescription>
        </div>
        <div className="flex gap-2">
          <Input className="w-72" value={props.search} onChange={(event) => props.setSearch(event.target.value)} placeholder={props.t.users.search} />
          <Button variant="secondary" onClick={props.onSearch}><Search className="h-4 w-4" /> {props.t.common.search}</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>{props.t.users.client}</TableHead><TableHead>{props.t.users.telegram}</TableHead><TableHead>{props.t.users.phone}</TableHead><TableHead>{props.t.users.city}</TableHead><TableHead>{props.t.users.applications}</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {props.users.map((user) => (
              <TableRow key={user.id}>
                <TableCell><div className="font-medium">{user.fullName}</div><div className="text-sm text-muted-foreground">{user.gender || '-'} · {user.age || '-'} {props.t.common.years}</div></TableCell>
                <TableCell>{user.username ? `@${user.username}` : user.telegramId}</TableCell>
                <TableCell>{user.phone || '-'}</TableCell>
                <TableCell>{user.city || '-'}</TableCell>
                <TableCell>{user._count?.applications ?? 0}</TableCell>
                <TableCell className="text-right"><RowActions onEdit={() => props.onEdit(user)} onDelete={() => props.onDelete(user)} t={props.t} /></TableCell>
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
  onSave,
  t
}: {
  schemas: DynamicSchemas;
  setSchemas: (schemas: DynamicSchemas) => void;
  meta: AdminMeta;
  onSave: () => void;
  t: Translation;
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
      label: t.schemas.newQuestion,
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
              <Button variant="secondary" onClick={() => addQuestion(schemaName)}><Plus className="h-4 w-4" /> {t.common.add}</Button>
            </CardHeader>
            <CardContent className="grid gap-3">
              {schemas[schemaName].questions.map((question, index) => (
                <div key={`${question.key}-${index}`} className="grid gap-3 rounded-lg border bg-muted/35 p-3 md:grid-cols-2">
                  <Field label={t.schemas.key}><Input value={question.key} onChange={(event) => updateQuestion(schemaName, index, { key: event.target.value })} /></Field>
                  <Field label={t.schemas.label}><Input value={question.label} onChange={(event) => updateQuestion(schemaName, index, { label: event.target.value })} /></Field>
                  <Field label={t.schemas.questionType}>
                    <NativeSelect value={question.questionType} onChange={(event) => updateQuestion(schemaName, index, { questionType: event.target.value })}>
                      {meta.questionTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                    </NativeSelect>
                  </Field>
                  <Field label={t.schemas.responseType}>
                    <NativeSelect value={question.responseType} onChange={(event) => updateQuestion(schemaName, index, { responseType: event.target.value })}>
                      {meta.responseTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                    </NativeSelect>
                  </Field>
                  <Field className="md:col-span-2" label={t.schemas.placeholder}><Input value={question.placeholder || ''} onChange={(event) => updateQuestion(schemaName, index, { placeholder: event.target.value })} /></Field>
                  <Field className="md:col-span-2" label={t.schemas.helpText}><Input value={question.helpText || ''} onChange={(event) => updateQuestion(schemaName, index, { helpText: event.target.value })} /></Field>
                  <Field className="md:col-span-2" label={t.schemas.options}><Input value={question.options.join(', ')} onChange={(event) => updateQuestion(schemaName, index, { options: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></Field>
                  <div className="flex items-center justify-between md:col-span-2">
                    <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={question.required} onChange={(event) => updateQuestion(schemaName, index, { required: event.target.checked })} /> {t.schemas.required}</label>
                    <Button variant="destructive" size="sm" onClick={() => removeQuestion(schemaName, index)}><Trash2 className="h-4 w-4" /> {t.common.remove}</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="sticky bottom-4 flex justify-end"><Button onClick={onSave}><Save className="h-4 w-4" /> {t.schemas.save}</Button></div>
    </div>
  );
}

function BotView({ health, adminKey, setView, t }: { health: string; adminKey: string; setView: (view: View) => void; t: Translation }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>{t.bot.health}</CardTitle><CardDescription>{t.bot.healthDescription}</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-[150px_1fr] gap-4">
          <span className="text-muted-foreground">{t.bot.apiHealth}</span><Badge variant={health === 'healthy' ? 'default' : 'destructive'}>{health === 'healthy' ? t.common.healthy : health === 'down' ? t.common.down : t.common.unknown}</Badge>
          <span className="text-muted-foreground">{t.bot.protectedApi}</span><Badge variant={adminKey ? 'default' : 'secondary'}>{adminKey ? t.common.connected : t.bot.waitingKey}</Badge>
          <span className="text-muted-foreground">{t.bot.excel}</span><strong>{t.bot.available}</strong>
          <span className="text-muted-foreground">{t.bot.notifications}</span><strong>{t.bot.configured}</strong>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t.bot.workflows}</CardTitle><CardDescription>{t.bot.workflowsDescription}</CardDescription></CardHeader>
        <CardContent className="grid gap-2">
          <Button variant="secondary" onClick={() => setView('applications')}>{t.bot.reviewApplications}</Button>
          <Button variant="secondary" onClick={() => setView('courses')}>{t.bot.manageCourses}</Button>
          <Button variant="secondary" onClick={() => setView('schemas')}>{t.bot.adjustQuestions}</Button>
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
  onSubmit,
  t
}: {
  editor: Editor;
  setEditor: (editor: Editor) => void;
  courses: Course[];
  meta: AdminMeta;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  t: Translation;
}) {
  return (
    <Dialog open={Boolean(editor)} onOpenChange={(open) => !open && setEditor(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editor?.item ? t.form.edit : t.form.new} {editor?.type}</DialogTitle>
          <DialogDescription>{t.form.changesProtected}</DialogDescription>
        </DialogHeader>
        <form id="editor-form" className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          {editor?.type === 'course' && <CourseForm course={editor.item} meta={meta} t={t} />}
          {editor?.type === 'application' && <ApplicationForm application={editor.item} courses={courses} meta={meta} t={t} />}
          {editor?.type === 'user' && <UserForm user={editor.item} t={t} />}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditor(null)}>{t.common.cancel}</Button>
          <Button type="submit" form="editor-form">{t.common.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CourseForm({ course, meta, t }: { course?: Course; meta: AdminMeta; t: Translation }) {
  return (
    <>
      <Field label={t.form.title}><Input name="title" defaultValue={course?.title || ''} required /></Field>
      <Field label={t.form.format}><NativeSelect name="format" defaultValue={course?.format || 'ONLINE'}>{Object.entries(meta.courseFormats).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></Field>
      <Field label={t.form.educationType}><Input name="educationType" defaultValue={course?.educationType || ''} /></Field>
      <Field label={t.form.duration}><Input name="duration" defaultValue={course?.duration || ''} /></Field>
      <Field label={t.form.cost}><Input name="cost" defaultValue={course?.cost || ''} /></Field>
      <Field label={t.form.imageFileId}><Input name="imageFileId" defaultValue={course?.imageFileId || ''} /></Field>
      <Field label={t.form.ageMin}><Input name="ageMin" type="number" defaultValue={course?.ageMin ?? 18} /></Field>
      <Field label={t.form.ageMax}><Input name="ageMax" type="number" defaultValue={course?.ageMax ?? 45} /></Field>
      <label className="flex items-center gap-2 text-sm font-medium"><input name="hasPractice" type="checkbox" defaultChecked={course?.hasPractice || false} /> {t.form.hasPractice}</label>
      <label className="flex items-center gap-2 text-sm font-medium"><input name="canPayInInstallments" type="checkbox" defaultChecked={course?.canPayInInstallments || false} /> {t.form.installments}</label>
      <label className="flex items-center gap-2 text-sm font-medium"><input name="isActive" type="checkbox" defaultChecked={course?.isActive ?? true} /> {t.form.active}</label>
      <Field label={t.form.additionalInfo} className="md:col-span-2"><Textarea name="additionalInfo" defaultValue={course?.additionalInfo || ''} /></Field>
    </>
  );
}

function ApplicationForm({ application, courses, meta, t }: { application?: Application; courses: Course[]; meta: AdminMeta; t: Translation }) {
  return (
    <>
      {!application && (
        <>
          <Field label={t.form.telegramId}><Input name="telegramId" required /></Field>
          <Field label={t.form.telegramUsername}><Input name="telegramUsername" /></Field>
          <Field label={t.form.fullName}><Input name="fullName" required /></Field>
          <Field label={t.form.gender}><NativeSelect name="gender" defaultValue="MALE"><option value="MALE">{t.form.male}</option><option value="FEMALE">{t.form.female}</option></NativeSelect></Field>
          <Field label={t.form.birthDateText}><Input name="birthDate" placeholder="01.01.2000" required /></Field>
          <Field label={t.form.phone}><Input name="phone" required /></Field>
          <Field label={t.form.city}><Input name="city" required /></Field>
        </>
      )}
      <Field label={t.form.course}><NativeSelect name="courseId" defaultValue={application?.courseId || courses[0]?.id}>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</NativeSelect></Field>
      {application && <Field label={t.form.status}><NativeSelect name="status" defaultValue={application.status}>{meta.applicationStatuses.map((status) => <option key={status} value={status}>{meta.applicationStatusLabels[status] || status}</option>)}</NativeSelect></Field>}
      <Field label={t.form.experience}><Input name="experience" defaultValue={application?.experience || ''} /></Field>
      <Field label={t.form.workplace}><Input name="workplace" defaultValue={application?.workplace || ''} /></Field>
      <Field label={t.form.educationType}><NativeSelect name="educationType" defaultValue={application?.educationType || ''}><option value="">{t.common.notSet}</option>{meta.educationTypes.map((type) => <option key={type} value={type}>{type}</option>)}</NativeSelect></Field>
      <Field label={t.form.specialization}><Input name="specialization" defaultValue={application?.specialization || ''} /></Field>
      <Field label={t.form.learningGoal}><NativeSelect name="learningGoal" defaultValue={application?.learningGoal || meta.learningGoals[0]}>{meta.learningGoals.map((goal) => <option key={goal} value={goal}>{goal}</option>)}</NativeSelect></Field>
      <Field label={t.form.studyFormat}><NativeSelect name="studyFormat" defaultValue={application?.studyFormat || meta.studyFormats[0]}>{meta.studyFormats.map((format) => <option key={format} value={format}>{format}</option>)}</NativeSelect></Field>
      <Field label={t.form.studyTime}><Input name="studyTime" defaultValue={application?.studyTime || ''} required /></Field>
      <Field label={t.form.source}><Input name="source" defaultValue={application?.source || 'admin'} /></Field>
      <Field label={t.form.comment} className="md:col-span-2"><Textarea name="comment" defaultValue={application?.comment || ''} /></Field>
    </>
  );
}

function UserForm({ user, t }: { user: User; t: Translation }) {
  return (
    <>
      <Field label={t.form.telegramId}><Input name="telegramId" defaultValue={user.telegramId} required /></Field>
      <Field label={t.form.username}><Input name="username" defaultValue={user.username || ''} /></Field>
      <Field label={t.form.fullName}><Input name="fullName" defaultValue={user.fullName} required /></Field>
      <Field label={t.form.phone}><Input name="phone" defaultValue={user.phone || ''} /></Field>
      <Field label={t.form.gender}><NativeSelect name="gender" defaultValue={user.gender || ''}><option value="">{t.common.notSet}</option><option value="MALE">{t.form.male}</option><option value="FEMALE">{t.form.female}</option></NativeSelect></Field>
      <Field label={t.form.age}><Input name="age" type="number" defaultValue={user.age || ''} /></Field>
      <Field label={t.form.birthDate}><Input name="birthDate" type="date" defaultValue={user.birthDate ? new Date(user.birthDate).toISOString().slice(0, 10) : ''} /></Field>
      <Field label={t.form.city}><Input name="city" defaultValue={user.city || ''} /></Field>
    </>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={cn('grid gap-2', className)}><Label>{label}</Label>{children}</div>;
}

function RowActions({ onEdit, onDelete, t }: { onEdit: () => void; onDelete: () => void; t: Translation }) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="secondary" size="sm" onClick={onEdit}>{t.common.edit}</Button>
      <Button variant="destructive" size="sm" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
    </div>
  );
}
