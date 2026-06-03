import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  BookOpen,
  Bot,
  ClipboardList,
  Download,
  Languages,
  LayoutDashboard,
  Loader2,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserRound,
  Users
} from 'lucide-react';
import { ApiClient } from '@/lib/api';
import type { AdminMeta, AdminUser, Application, Course, DynamicSchemas, SchemaQuestion, Stats, User } from '@/lib/types';
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

type View = 'overview' | 'courses' | 'applications' | 'users' | 'admins' | 'schemas' | 'bot';
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
  { view: 'admins', labelKey: 'admins', icon: ShieldCheck },
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
      admins: 'Администраторы',
      schemas: 'Настройки схем',
      bot: 'Операции бота'
    },
    common: {
      brandSubtitle: 'Панель управления',
      connected: 'Администратор вошел',
      keyRequired: 'Нужен вход администратора',
      console: 'Консоль управления',
      adminKey: 'Пароль',
      displayName: 'Имя',
      connect: 'Войти',
      logout: 'Выйти',
      username: 'Логин',
      bootstrap: 'Создать администратора',
      createAdmin: 'Создать администратора',
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
      savedAdmin: 'Администратор сохранен',
      statusUpdated: 'Статус обновлен',
      courseDeleted: 'Курс удален или деактивирован',
      applicationDeleted: 'Заявка удалена',
      clientDeleted: 'Клиент удален',
      loadError: 'Не удалось загрузить данные',
      saveError: 'Не удалось сохранить',
      schemaSaveError: 'Не удалось сохранить схемы',
      userSearchError: 'Не удалось найти клиентов'
    },
    admins: {
      title: 'Администраторы',
      description: 'Создание администраторов и управление доступом к панели.',
      new: 'Новый администратор',
      account: 'Аккаунт',
      status: 'Статус',
      lastLogin: 'Последний вход',
      created: 'Создан',
      passwordHelp: 'Оставьте пустым, чтобы не менять пароль.'
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
      imageUpload: 'Загрузить изображение',
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
      admins: 'Adminlar',
      schemas: 'Sxema sozlamalari',
      bot: 'Bot amallari'
    },
    common: {
      brandSubtitle: 'Boshqaruv paneli',
      connected: 'Admin tizimga kirdi',
      keyRequired: 'Admin kirishi kerak',
      console: 'Boshqaruv konsoli',
      adminKey: 'Parol',
      displayName: 'Ism',
      connect: 'Kirish',
      logout: 'Chiqish',
      username: 'Login',
      bootstrap: 'Admin yaratish',
      createAdmin: 'Admin yaratish',
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
      savedAdmin: 'Admin saqlandi',
      statusUpdated: 'Status yangilandi',
      courseDeleted: 'Kurs o‘chirildi yoki deaktiv qilindi',
      applicationDeleted: 'Ariza o‘chirildi',
      clientDeleted: 'Mijoz o‘chirildi',
      loadError: 'Ma’lumotlarni yuklab bo‘lmadi',
      saveError: 'Saqlab bo‘lmadi',
      schemaSaveError: 'Sxemalarni saqlab bo‘lmadi',
      userSearchError: 'Mijozlarni qidirib bo‘lmadi'
    },
    admins: {
      title: 'Adminlar',
      description: 'Panelga kirish uchun admin yaratish va ruxsatlarni boshqarish.',
      new: 'Yangi admin',
      account: 'Akkaunt',
      status: 'Status',
      lastLogin: 'Oxirgi kirish',
      created: 'Yaratilgan',
      passwordHelp: 'Parolni o‘zgartirmaslik uchun bo‘sh qoldiring.'
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
      imageUpload: 'Rasm yuklash',
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
      admins: 'Admins',
      schemas: 'Schema settings',
      bot: 'Bot operations'
    },
    common: {
      brandSubtitle: 'Admin dashboard',
      connected: 'Admin signed in',
      keyRequired: 'Admin login required',
      console: 'Management console',
      adminKey: 'Password',
      displayName: 'Display name',
      connect: 'Sign in',
      logout: 'Logout',
      username: 'Username',
      bootstrap: 'Create admin',
      createAdmin: 'Create admin',
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
      savedAdmin: 'Admin saved',
      statusUpdated: 'Status updated',
      courseDeleted: 'Course removed or deactivated',
      applicationDeleted: 'Application deleted',
      clientDeleted: 'Client deleted',
      loadError: 'Unable to load admin data',
      saveError: 'Unable to save',
      schemaSaveError: 'Unable to save schemas',
      userSearchError: 'Unable to search users'
    },
    admins: {
      title: 'Admins',
      description: 'Create dashboard admins and manage panel access.',
      new: 'New admin',
      account: 'Account',
      status: 'Status',
      lastLogin: 'Last login',
      created: 'Created',
      passwordHelp: 'Leave blank to keep the current password.'
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
      imageUpload: 'Upload image',
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

function SignInPage({
  username,
  password,
  displayName,
  needsBootstrap,
  loading,
  message,
  health,
  setUsername,
  setPassword,
  setDisplayName,
  onSubmit,
  t
}: {
  username: string;
  password: string;
  displayName: string;
  needsBootstrap: boolean;
  loading: boolean;
  message: string | null;
  health: 'unknown' | 'healthy' | 'down';
  setUsername: (value: string) => void;
  setPassword: (value: string) => void;
  setDisplayName: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  t: Translation;
}) {
  return (
    <div className="grid min-h-screen bg-[radial-gradient(circle_at_20%_20%,hsl(248_100%_96%),transparent_32%),linear-gradient(135deg,hsl(220_35%_98%),hsl(214_34%_94%))] p-4 lg:grid-cols-[minmax(320px,460px)_1fr] lg:p-6">
      <section className="relative flex min-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-lg border bg-card p-6 shadow-premium lg:p-10">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-primary text-lg font-black text-primary-foreground">U</div>
          <div>
            <div className="font-semibold tracking-normal">UMK Talim</div>
            <div className="text-xs text-muted-foreground">{t.common.brandSubtitle}</div>
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold">{needsBootstrap ? t.common.bootstrap : t.common.connect}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t.common.keyRequired}</p>
          </div>
          {message && <div className="mb-4 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">{message}</div>}
          <form className="grid gap-4 rounded-md border bg-background/80 p-5 shadow-sm" onSubmit={onSubmit}>
            <Field label={t.common.username}>
              <Input value={username} autoComplete="username" onChange={(event) => setUsername(event.target.value)} required />
            </Field>
            {needsBootstrap && (
              <Field label={t.common.displayName}>
                <Input value={displayName} autoComplete="name" onChange={(event) => setDisplayName(event.target.value)} />
              </Field>
            )}
            <Field label={t.common.adminKey}>
              <Input value={password} type="password" autoComplete={needsBootstrap ? 'new-password' : 'current-password'} onChange={(event) => setPassword(event.target.value)} required />
            </Field>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {needsBootstrap ? t.common.bootstrap : t.common.connect}
            </Button>
          </form>
        </div>
        <div className="mt-auto flex items-center gap-3 rounded-md border bg-muted/45 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>API: {health === 'healthy' ? t.common.healthy : health === 'down' ? t.common.down : t.common.unknown}</span>
        </div>
      </section>
      <section className="hidden min-h-[calc(100vh-3rem)] px-8 py-4 lg:block">
        <div className="grid h-full grid-rows-[auto_1fr_auto] rounded-lg border bg-card/80 shadow-premium">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="relative w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search anything..." />
            </div>
            <div className="flex items-center gap-3">
              <Button size="icon" variant="ghost"><Bell className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost"><Mail className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="grid content-start gap-5 p-6">
            <div>
              <h2 className="text-2xl font-semibold">Dashboard</h2>
              <p className="text-sm text-muted-foreground">Applications, courses, clients, and bot operations in one place.</p>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[t.overview.applications, t.overview.activeCourses, t.overview.clients, t.bot.notifications].map((label, index) => (
                <div key={label} className="rounded-md border bg-card p-4 shadow-sm">
                  <div className="mb-4 h-8 w-8 rounded-md bg-primary/10" />
                  <div className="text-2xl font-semibold">{[248, 12, 843, 99][index]}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_320px] gap-5">
              <div className="rounded-md border bg-card p-5 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <strong>{t.overview.pipeline}</strong>
                  <Badge variant="secondary">Daily</Badge>
                </div>
                <div className="flex h-56 items-end gap-3">
                  {[36, 62, 48, 78, 44, 69, 58, 83, 64, 90, 76, 82].map((height, index) => (
                    <div key={index} className="flex-1 rounded-t-md bg-primary/15" style={{ height: `${height}%` }}>
                      <div className="h-full rounded-t-md bg-primary/45" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-md border bg-card p-5 shadow-sm">
                <strong>{t.overview.recentApplications}</strong>
                <div className="mt-5 grid gap-3">
                  {[t.applications.new, t.common.statusUpdated, t.common.savedClient, t.common.savedCourse].map((label) => (
                    <div key={label} className="flex items-center gap-3 rounded-md bg-muted/60 p-3 text-sm">
                      <div className="h-8 w-8 rounded-md bg-primary/10" />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="border-t px-6 py-4 text-xs text-muted-foreground">UMK Talim admin console</div>
        </div>
      </section>
    </div>
  );
}

export function App() {
  const [view, setView] = useState<View>('overview');
  const [lang, setLang] = useState<Lang>(getStoredLang);
  const [authUser, setAuthUser] = useState<AdminUser | null>(null);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginDisplayName, setLoginDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [health, setHealth] = useState<'unknown' | 'healthy' | 'down'>('unknown');
  const [meta, setMeta] = useState<AdminMeta>(emptyMeta);
  const [schemas, setSchemas] = useState<DynamicSchemas | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [courseSearch, setCourseSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [editor, setEditor] = useState<Editor>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const api = useMemo(() => new ApiClient(), []);
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
      const authStatus = await api.authStatus();
      setAuthUser(authStatus.user);
      setNeedsBootstrap(authStatus.needsBootstrap);
      if (!authStatus.user) return;
      const [nextMeta, nextSchemas, nextCourses, nextApplications, nextUsers, nextStats, nextAdmins] = await Promise.all([
        api.meta(),
        api.schemas(),
        api.courses(),
        api.applications(),
        api.users(),
        api.stats(),
        api.admins()
      ]);
      setMeta(nextMeta);
      setSchemas(nextSchemas);
      setCourses(nextCourses);
      setApplications(nextApplications);
      setUsers(nextUsers);
      setStats(nextStats);
      setAdmins(nextAdmins.filter(Boolean) as AdminUser[]);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : t.common.loadError);
    } finally {
      setLoading(false);
    }
  }, [api, t.common.loadError]);

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

  if (!authUser) {
    return (
      <SignInPage
        username={loginUsername}
        password={loginPassword}
        displayName={loginDisplayName}
        needsBootstrap={needsBootstrap}
        loading={false}
        message={message}
        health={health}
        setUsername={setLoginUsername}
        setPassword={setLoginPassword}
        setDisplayName={setLoginDisplayName}
        onSubmit={connect}
        t={t}
      />
    );
  }

  async function connect(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const payload = { username: loginUsername.trim(), password: loginPassword };
    const result = needsBootstrap
      ? await api.bootstrap({ ...payload, displayName: loginDisplayName.trim() || loginUsername.trim() })
      : await api.login(payload);
    setAuthUser(result.user);
    setLoginPassword('');
    setLoginDisplayName('');
    showMessage(needsBootstrap ? t.common.bootstrap : t.common.connected);
    await loadData();
  }

  async function logout() {
    await api.logout();
    setAuthUser(null);
    setCourses([]);
    setApplications([]);
    setUsers([]);
    setAdmins([]);
    setStats(null);
    setSchemas(null);
  }

  async function saveCourse(form: HTMLFormElement) {
    const imageInput = form.elements.namedItem('courseImage') as HTMLInputElement | null;
    let imageFileId = getFormValue(form, 'imageFileId') || null;
    if (imageInput?.files?.length) {
      const uploadResult = await api.uploadCourseImage(imageInput.files[0]);
      imageFileId = uploadResult.fileId;
    }
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
      imageFileId,
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
      <aside className={cn(
        'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-white/5 bg-slate-950/40 text-foreground shadow-2xl backdrop-blur-xl transition-[width,padding] duration-200 lg:flex',
        sidebarCollapsed ? 'w-20 p-3' : 'w-72 p-6'
      )}>
        <div className={cn('flex items-center gap-3 font-heading', sidebarCollapsed && 'justify-center')}>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-primary to-accent text-lg font-black text-white shadow-lg shadow-primary/20 animate-pulse-slow">
            U
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="truncate bg-gradient-to-r from-white to-white/70 bg-clip-text text-md font-bold tracking-tight text-transparent">UMK Ta'lim</div>
              <div className="truncate text-xs font-medium text-muted-foreground">{t.common.brandSubtitle}</div>
            </div>
          )}
        </div>
        <nav className="mt-9 grid gap-1.5">
          {navItems.map((item) => {
            const isActive = view === item.view;
            return (
              <button
                key={item.view}
                aria-label={t.nav[item.labelKey]}
                title={sidebarCollapsed ? t.nav[item.labelKey] : undefined}
                className={cn(
                  'group relative flex h-11 items-center gap-3 rounded-lg px-4 text-sm font-medium transition-all duration-300',
                  isActive
                    ? 'border-l-2 border-primary bg-primary/10 font-semibold text-primary shadow-[inset_0_0_12px_rgba(99,102,241,0.05)]'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                  sidebarCollapsed && 'justify-center px-0'
                )}
                onClick={() => setView(item.view)}
              >
                <item.icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                {!sidebarCollapsed && t.nav[item.labelKey]}
              </button>
            );
          })}
        </nav>
        {!sidebarCollapsed && (
          <div className="mt-auto flex items-center gap-2.5 rounded-xl border border-white/5 bg-muted/20 p-4 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-glow-accent animate-pulse" />
            <span className="truncate font-medium">{`${t.common.connected}: ${authUser.username}`}</span>
          </div>
        )}
      </aside>

      <main className={cn('min-h-screen transition-[padding] duration-200', sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72')}>
        <header className="sticky top-0 z-20 border-b border-white/5 bg-card/40 px-6 py-4 shadow-sm backdrop-blur-xl md:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <Button
                className="hidden rounded-xl border-white/5 bg-muted/40 hover:bg-muted/80 lg:inline-flex"
                variant="outline"
                size="icon"
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                onClick={() => setSidebarCollapsed((value) => !value)}
              >
                {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
              <div className="relative hidden w-80 md:block">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input className="h-10 rounded-xl border-white/5 bg-background/50 pl-10 text-sm focus:border-primary/50 focus:ring-primary/20 focus:ring-offset-0" placeholder="Search anything..." />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">{t.common.console}</p>
                <h1 className="mt-0.5 text-2xl font-bold tracking-tight font-heading text-white">{t.nav[view]}</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-10 items-center gap-2 rounded-xl border border-white/5 bg-background/45 px-3">
                <Languages className="h-4 w-4 text-muted-foreground" />
                <NativeSelect className="h-8 w-20 border-0 bg-transparent px-1 text-xs font-semibold focus:ring-0 focus:outline-none" value={lang} onChange={(event) => changeLang(event.target.value as Lang)}>
                  {languages.map((language) => <option key={language.value} value={language.value} className="bg-card text-foreground">{language.label}</option>)}
                </NativeSelect>
              </div>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted/70" aria-label="Notifications" title="Notifications"><Bell className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted/70" aria-label="Messages" title="Messages"><Mail className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="flex h-10 w-10 items-center justify-center rounded-xl border-white/5 bg-muted/40 hover:bg-muted/80" onClick={loadData} disabled={loading} aria-label="Refresh dashboard" title="Refresh dashboard">
                {loading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <RefreshCcw className="h-4 w-4" />}
              </Button>
              <div className="ml-1 flex items-center gap-3 border-l pl-3">
                <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
                  {(authUser.displayName || authUser.username).slice(0, 1).toUpperCase()}
                </div>
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-semibold">{authUser.displayName || authUser.username}</div>
                  <div className="text-xs text-muted-foreground">{authUser.username}</div>
                </div>
                <Button variant="outline" onClick={logout}>{t.common.logout}</Button>
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 lg:hidden">
            {navItems.map((item) => (
              <Button key={item.view} size="sm" className="rounded-lg text-xs font-semibold" variant={view === item.view ? 'default' : 'secondary'} onClick={() => setView(item.view)}>
                <item.icon className="h-3.5 w-3.5" />
                {t.nav[item.labelKey]}
              </Button>
            ))}
          </div>
        </header>

        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
          {message && (
            <div className="mb-6 rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm font-semibold text-primary-foreground backdrop-blur-md animate-fade-in shadow-glow">
              {message}
            </div>
          )}

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
          {view === 'admins' && (
            <AdminsView
              admins={admins}
              currentAdminId={authUser.id}
              onCreate={async (form) => {
                await api.createAdmin({
                  username: getFormValue(form, 'username'),
                  password: getFormValue(form, 'password'),
                  displayName: getFormValue(form, 'displayName') || undefined,
                  isActive: getCheckbox(form, 'isActive')
                });
                await loadData();
                showMessage(t.common.savedAdmin);
              }}
              onUpdate={async (admin, form) => {
                const password = getFormValue(form, 'password');
                await api.updateAdmin(admin.id, {
                  displayName: getFormValue(form, 'displayName') || null,
                  isActive: admin.id === authUser.id ? admin.isActive : getCheckbox(form, 'isActive'),
                  ...(password ? { password } : {})
                });
                await loadData();
                showMessage(t.common.savedAdmin);
              }}
              t={t}
              lang={lang}
            />
          )}
          {view === 'schemas' && schemas && (
            <SchemasView schemas={schemas} setSchemas={setSchemas} meta={meta} onSave={saveSchemas} t={t} />
          )}
          {view === 'bot' && <BotView health={health} authUser={authUser} setView={setView} t={t} />}
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
    <div className="grid gap-6">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, idx) => {
          const gradients = [
            'from-violet-500/10 to-indigo-500/5 hover:border-violet-500/30',
            'from-cyan-500/10 to-blue-500/5 hover:border-cyan-500/30',
            'from-emerald-500/10 to-teal-500/5 hover:border-emerald-500/30',
            'from-amber-500/10 to-orange-500/5 hover:border-amber-500/30'
          ];
          const iconColors = [
            'bg-violet-500/10 text-violet-400',
            'bg-cyan-500/10 text-cyan-400',
            'bg-emerald-500/10 text-emerald-400',
            'bg-amber-500/10 text-amber-400'
          ];
          return (
            <Card key={metric.label} className={cn("overflow-hidden relative bg-gradient-to-br border border-white/5 hover:shadow-glow transition-all duration-300 group", gradients[idx % gradients.length])}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-4 -mt-4 transition-all duration-500 group-hover:scale-150" />
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">{metric.label}</CardDescription>
                <div className={cn("p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110", iconColors[idx % iconColors.length])}>
                  <metric.icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10 pt-1">
                <div className="text-3xl font-extrabold tracking-tight font-heading text-white">{metric.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border border-white/5 bg-card/25 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="font-heading text-xl font-bold tracking-tight text-white">{t.overview.pipeline}</CardTitle>
            <CardDescription>{t.overview.pipelineDescription}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4.5">
            {meta.applicationStatuses.map((status) => {
              const count = statusCounts.get(status) || 0;
              return (
                <div key={status} className="grid grid-cols-[150px_1fr_48px] items-center gap-4 py-1 group/bar">
                  <span className="text-sm font-semibold text-muted-foreground group-hover/bar:text-white transition-colors">{statusLabel(status)}</span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-900/60 border border-white/5 relative">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-out shadow-glow-accent"
                      style={{ width: `${(count / maxStatusCount) * 100}%` }}
                    />
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold font-heading text-white bg-white/5 border border-white/5 px-2 py-0.5 rounded-md">{count}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <Card className="border border-white/5 bg-card/25 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="font-heading text-xl font-bold tracking-tight text-white">{t.overview.recentApplications}</CardTitle>
            <CardDescription>{t.overview.recentDescription}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3.5">
            {applications.slice(0, 6).map((application) => {
              const isNew = application.status === 'NEW' || application.status === 'new';
              return (
                <div key={application.id} className="group/item flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/20 p-4 transition-all duration-300 hover:bg-slate-950/40 hover:border-white/10">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="font-bold text-sm truncate text-white group-hover/item:text-primary transition-colors">{application.user?.fullName || t.overview.unknownClient}</div>
                    <div className="mt-1 text-xs text-muted-foreground truncate flex items-center gap-2">
                      <span className="text-white/70 font-semibold">{application.course?.title || t.overview.noCourse}</span>
                      <span>·</span>
                      <span>{formatDate(application.createdAt, lang)}</span>
                    </div>
                  </div>
                  <div>
                    <Badge className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-lg border shadow-sm uppercase tracking-wide",
                      isNew ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/75 text-muted-foreground border-white/5"
                    )}>
                      {statusLabel(application.status)}
                    </Badge>
                  </div>
                </div>
              );
            })}
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
    <Card className="border border-white/5 bg-card/25 backdrop-blur-md">
      <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between pb-6">
        <div>
          <CardTitle className="font-heading text-xl font-bold tracking-tight text-white">{t.courses.title}</CardTitle>
          <CardDescription>{t.courses.description}</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="w-72 pl-10 rounded-xl border-white/5 bg-background/50 text-sm h-10 focus:border-primary/50 focus:ring-primary/20 focus:ring-offset-0" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.courses.search} />
          </div>
          <Button onClick={onCreate} className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 h-10 text-xs font-bold"><Plus className="h-4 w-4" /> {t.courses.new}</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-white/5"><TableRow><TableHead className="text-white">{t.courses.course}</TableHead><TableHead className="text-white">{t.courses.format}</TableHead><TableHead className="text-white">{t.courses.age}</TableHead><TableHead className="text-white">{t.courses.cost}</TableHead><TableHead className="text-white">{t.courses.applications}</TableHead><TableHead className="text-white">{t.courses.status}</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course.id} className="border-b border-white/5 hover:bg-white/5 transition-all duration-200">
                <TableCell>
                  <div className="font-bold text-white text-sm">{course.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{course.duration || t.courses.noDuration}</div>
                </TableCell>
                <TableCell className="text-sm font-semibold text-white/90">{course.format}</TableCell>
                <TableCell className="text-sm text-muted-foreground font-medium">{course.ageMin}-{course.ageMax}</TableCell>
                <TableCell className="text-sm font-semibold text-white/90">{course.cost || '-'}</TableCell>
                <TableCell className="text-sm font-bold font-heading text-white">{course._count?.applications ?? 0}</TableCell>
                <TableCell>
                  <Badge className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-lg border uppercase tracking-wide",
                    course.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                  )}>
                    {course.isActive ? t.common.active : t.common.inactive}
                  </Badge>
                </TableCell>
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
    <Card className="border border-white/5 bg-card/25 backdrop-blur-md">
      <CardHeader className="gap-4 xl:flex-row xl:items-center xl:justify-between pb-6">
        <div>
          <CardTitle className="font-heading text-xl font-bold tracking-tight text-white">{props.t.applications.title}</CardTitle>
          <CardDescription>{props.t.applications.description}</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <NativeSelect className="w-48 rounded-xl border-white/5 bg-background/50 text-xs h-10 focus:border-primary/50 focus:ring-primary/20" value={props.statusFilter} onChange={(event) => props.setStatusFilter(event.target.value)}>
            <option value="" className="bg-card text-foreground">{props.t.common.allStatuses}</option>
            {props.meta.applicationStatuses.map((status) => <option key={status} value={status} className="bg-card text-foreground">{props.statusLabel(status)}</option>)}
          </NativeSelect>
          <NativeSelect className="w-56 rounded-xl border-white/5 bg-background/50 text-xs h-10 focus:border-primary/50 focus:ring-primary/20" value={props.courseFilter} onChange={(event) => props.setCourseFilter(event.target.value)}>
            <option value="" className="bg-card text-foreground">{props.t.common.allCourses}</option>
            {props.courses.map((course) => <option key={course.id} value={course.id} className="bg-card text-foreground">{course.title}</option>)}
          </NativeSelect>
          <Button onClick={props.onCreate} className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 h-10 text-xs font-bold"><Plus className="h-4 w-4" /> {props.t.applications.new}</Button>
          <Button asChild variant="outline" className="rounded-xl border-white/5 bg-muted/40 hover:bg-muted/80 h-10 text-xs font-bold text-white">
            <a href={`/api/applications/export/excel?${exportParams.toString()}`} className="flex items-center gap-1.5"><Download className="h-4 w-4" /> {props.t.common.export}</a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-white/5"><TableRow><TableHead className="text-white">{props.t.applications.client}</TableHead><TableHead className="text-white">{props.t.applications.course}</TableHead><TableHead className="text-white">{props.t.applications.status}</TableHead><TableHead className="text-white">{props.t.applications.city}</TableHead><TableHead className="text-white">{props.t.applications.created}</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {props.applications.map((application) => (
              <TableRow key={application.id} className="border-b border-white/5 hover:bg-white/5 transition-all duration-200">
                <TableCell>
                  <div className="font-bold text-white text-sm">{application.user?.fullName || '-'}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{application.user?.phone || '-'}</div>
                </TableCell>
                <TableCell className="text-sm font-semibold text-white/90">{application.course?.title || '-'}</TableCell>
                <TableCell>
                  <NativeSelect className="h-9 rounded-lg border-white/5 bg-background/50 text-xs font-semibold w-36" value={application.status} onChange={(event) => props.onStatus(application, event.target.value)}>
                    {props.meta.applicationStatuses.map((status) => <option key={status} value={status} className="bg-card text-foreground">{props.statusLabel(status)}</option>)}
                  </NativeSelect>
                </TableCell>
                <TableCell className="text-sm text-white/80 font-medium">{application.user?.city || '-'}</TableCell>
                <TableCell className="text-sm text-muted-foreground font-medium">{formatDate(application.createdAt, props.lang)}</TableCell>
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
    <Card className="border border-white/5 bg-card/25 backdrop-blur-md">
      <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between pb-6">
        <div>
          <CardTitle className="font-heading text-xl font-bold tracking-tight text-white">{props.t.users.title}</CardTitle>
          <CardDescription>{props.t.users.description}</CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <Input className="w-72 rounded-xl border-white/5 bg-background/50 text-sm h-10" value={props.search} onChange={(event) => props.setSearch(event.target.value)} placeholder={props.t.users.search} />
          <Button variant="secondary" className="rounded-xl h-10 text-xs font-bold" onClick={props.onSearch}><Search className="h-4 w-4" /> {props.t.common.search}</Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-white/5"><TableRow><TableHead className="text-white">{props.t.users.client}</TableHead><TableHead className="text-white">{props.t.users.telegram}</TableHead><TableHead className="text-white">{props.t.users.phone}</TableHead><TableHead className="text-white">{props.t.users.city}</TableHead><TableHead className="text-white">{props.t.users.applications}</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {props.users.map((user) => (
              <TableRow key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-all duration-200">
                <TableCell>
                  <div className="font-bold text-white text-sm">{user.fullName}</div>
                  <div className="text-xs text-muted-foreground mt-1 font-medium">{user.gender || '-'} · {user.age || '-'} {props.t.common.years}</div>
                </TableCell>
                <TableCell className="text-sm font-semibold text-white/90">{user.username ? `@${user.username}` : user.telegramId}</TableCell>
                <TableCell className="text-sm font-semibold text-white/90">{user.phone || '-'}</TableCell>
                <TableCell className="text-sm text-white/80 font-medium">{user.city || '-'}</TableCell>
                <TableCell className="text-sm font-bold font-heading text-white">{user._count?.applications ?? 0}</TableCell>
                <TableCell className="text-right"><RowActions onEdit={() => props.onEdit(user)} onDelete={() => props.onDelete(user)} t={props.t} /></TableCell>
              </TableRow>

            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AdminsView(props: {
  admins: AdminUser[];
  currentAdminId: number;
  onCreate: (form: HTMLFormElement) => Promise<void>;
  onUpdate: (admin: AdminUser, form: HTMLFormElement) => Promise<void>;
  t: Translation;
  lang: Lang;
}) {
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>, admin?: AdminUser) {
    event.preventDefault();
    setSaving(true);
    try {
      if (admin) await props.onUpdate(admin, event.currentTarget);
      else await props.onCreate(event.currentTarget);
      setEditingId(null);
      event.currentTarget.reset();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>{props.t.admins.title}</CardTitle>
            <CardDescription>{props.t.admins.description}</CardDescription>
          </div>
          <Button onClick={() => setEditingId(editingId === 'new' ? null : 'new')}><UserPlus className="h-4 w-4" /> {props.t.admins.new}</Button>
        </CardHeader>
        {editingId === 'new' && (
          <CardContent>
            <form className="grid gap-3 rounded-md border bg-muted/35 p-4 md:grid-cols-4" onSubmit={(event) => submit(event)}>
              <Field label={props.t.common.username}><Input name="username" required /></Field>
              <Field label={props.t.common.displayName}><Input name="displayName" /></Field>
              <Field label={props.t.common.adminKey}><Input name="password" type="password" required /></Field>
              <div className="flex items-end justify-between gap-3">
                <label className="mb-2 flex items-center gap-2 text-sm font-medium"><input name="isActive" type="checkbox" defaultChecked /> {props.t.common.active}</label>
                <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {props.t.common.save}</Button>
              </div>
            </form>
          </CardContent>
        )}
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>{props.t.admins.account}</TableHead><TableHead>{props.t.admins.status}</TableHead><TableHead>{props.t.admins.lastLogin}</TableHead><TableHead>{props.t.admins.created}</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {props.admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell>
                    <div className="font-medium">{admin.displayName || admin.username}</div>
                    <div className="text-sm text-muted-foreground">@{admin.username}</div>
                  </TableCell>
                  <TableCell><Badge variant={admin.isActive ? 'default' : 'secondary'}>{admin.isActive ? props.t.common.active : props.t.common.inactive}</Badge></TableCell>
                  <TableCell>{formatDate(admin.lastLoginAt, props.lang)}</TableCell>
                  <TableCell>{formatDate(admin.createdAt, props.lang)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="secondary" size="sm" onClick={() => setEditingId(editingId === admin.id ? null : admin.id)}>{props.t.common.edit}</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {props.admins.map((admin) => editingId === admin.id ? (
        <Card key={`edit-${admin.id}`}>
          <CardHeader>
            <CardTitle>{props.t.common.edit}: {admin.username}</CardTitle>
            <CardDescription>{props.t.admins.passwordHelp}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-4" onSubmit={(event) => submit(event, admin)}>
              <Field label={props.t.common.displayName}><Input name="displayName" defaultValue={admin.displayName || ''} /></Field>
              <Field label={props.t.common.adminKey}><Input name="password" type="password" /></Field>
              <div className="flex items-end">
                <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <input name="isActive" type="checkbox" defaultChecked={admin.isActive} disabled={admin.id === props.currentAdminId} />
                  {props.t.common.active}
                </label>
              </div>
              <div className="flex items-end justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setEditingId(null)}>{props.t.common.cancel}</Button>
                <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {props.t.common.save}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null)}
    </div>
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
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-2">
        {(['course', 'application'] as const).map((schemaName) => (
          <Card key={schemaName} className="border border-white/5 bg-card/25 backdrop-blur-md">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-6 border-b border-white/5">
              <div>
                <CardTitle className="font-heading text-lg font-bold text-white">{schemas[schemaName].title}</CardTitle>
                <CardDescription className="text-xs">{schemas[schemaName].description}</CardDescription>
              </div>
              <Button variant="secondary" className="rounded-xl h-9 text-xs font-bold" onClick={() => addQuestion(schemaName)}><Plus className="h-4 w-4" /> {t.common.add}</Button>
            </CardHeader>
            <CardContent className="grid gap-4.5 pt-6">
              {schemas[schemaName].questions.map((question, index) => (
                <div key={`${question.key}-${index}`} className="grid gap-4 rounded-xl border border-white/5 bg-slate-950/20 p-4 hover:bg-slate-950/30 transition-all duration-300 md:grid-cols-2">
                  <Field label={t.schemas.key}><Input className="rounded-xl border-white/5 bg-background/50 h-10 text-xs" value={question.key} onChange={(event) => updateQuestion(schemaName, index, { key: event.target.value })} /></Field>
                  <Field label={t.schemas.label}><Input className="rounded-xl border-white/5 bg-background/50 h-10 text-xs" value={question.label} onChange={(event) => updateQuestion(schemaName, index, { label: event.target.value })} /></Field>
                  <Field label={t.schemas.questionType}>
                    <NativeSelect className="rounded-xl border-white/5 bg-background/50 h-10 text-xs focus:ring-1 focus:ring-primary/20" value={question.questionType} onChange={(event) => updateQuestion(schemaName, index, { questionType: event.target.value })}>
                      {meta.questionTypes.map((type) => <option key={type} value={type} className="bg-card text-foreground">{type}</option>)}
                    </NativeSelect>
                  </Field>
                  <Field label={t.schemas.responseType}>
                    <NativeSelect className="rounded-xl border-white/5 bg-background/50 h-10 text-xs focus:ring-1 focus:ring-primary/20" value={question.responseType} onChange={(event) => updateQuestion(schemaName, index, { responseType: event.target.value })}>
                      {meta.responseTypes.map((type) => <option key={type} value={type} className="bg-card text-foreground">{type}</option>)}
                    </NativeSelect>
                  </Field>
                  <Field className="md:col-span-2" label={t.schemas.placeholder}><Input className="rounded-xl border-white/5 bg-background/50 h-10 text-xs" value={question.placeholder || ''} onChange={(event) => updateQuestion(schemaName, index, { placeholder: event.target.value })} /></Field>
                  <Field className="md:col-span-2" label={t.schemas.helpText}><Input className="rounded-xl border-white/5 bg-background/50 h-10 text-xs" value={question.helpText || ''} onChange={(event) => updateQuestion(schemaName, index, { helpText: event.target.value })} /></Field>
                  <Field className="md:col-span-2" label={t.schemas.options}><Input className="rounded-xl border-white/5 bg-background/50 h-10 text-xs" value={(question.options || []).join(', ')} onChange={(event) => updateQuestion(schemaName, index, { options: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></Field>
                  <div className="flex items-center justify-between md:col-span-2 mt-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-white/80 cursor-pointer select-none">
                      <input type="checkbox" className="rounded border-white/20 bg-slate-950/50 text-primary focus:ring-primary/20 cursor-pointer" checked={question.required} onChange={(event) => updateQuestion(schemaName, index, { required: event.target.checked })} />
                      {t.schemas.required}
                    </label>
                    <Button variant="destructive" className="rounded-lg h-8 px-3 text-[10px] font-bold" onClick={() => removeQuestion(schemaName, index)}><Trash2 className="h-3 w-3" /> {t.common.remove}</Button>
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

function BotView({ health, authUser, setView, t }: { health: string; authUser: AdminUser | null; setView: (view: View) => void; t: Translation }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="border border-white/5 bg-card/25 backdrop-blur-md">
        <CardHeader><CardTitle className="font-heading text-lg font-bold text-white">{t.bot.health}</CardTitle><CardDescription>{t.bot.healthDescription}</CardDescription></CardHeader>
        <CardContent className="pt-2">
          <div className="flex flex-col divide-y divide-white/5 text-sm">
            <div className="flex items-center justify-between py-3">
              <span className="font-semibold text-muted-foreground">{t.bot.apiHealth}</span>
              <Badge className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-lg border uppercase tracking-wide",
                health === 'healthy' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : health === 'down' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"
              )}>
                {health === 'healthy' ? t.common.healthy : health === 'down' ? t.common.down : t.common.unknown}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="font-semibold text-muted-foreground">{t.bot.protectedApi}</span>
              <Badge className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-lg border uppercase tracking-wide",
                authUser ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"
              )}>
                {authUser ? t.common.connected : t.bot.waitingKey}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="font-semibold text-muted-foreground">{t.bot.excel}</span>
              <span className="text-xs font-bold text-white bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg">{t.bot.available}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="font-semibold text-muted-foreground">{t.bot.notifications}</span>
              <span className="text-xs font-bold text-white bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg">{t.bot.configured}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="border border-white/5 bg-card/25 backdrop-blur-md">
        <CardHeader><CardTitle className="font-heading text-lg font-bold text-white">{t.bot.workflows}</CardTitle><CardDescription>{t.bot.workflowsDescription}</CardDescription></CardHeader>
        <CardContent className="grid gap-3 pt-2">
          <Button variant="secondary" className="rounded-xl h-11 justify-start px-4 hover:scale-[1.01] hover:bg-white/5 transition-all duration-300 font-semibold" onClick={() => setView('applications')}>{t.bot.reviewApplications}</Button>
          <Button variant="secondary" className="rounded-xl h-11 justify-start px-4 hover:scale-[1.01] hover:bg-white/5 transition-all duration-300 font-semibold" onClick={() => setView('courses')}>{t.bot.manageCourses}</Button>
          <Button variant="secondary" className="rounded-xl h-11 justify-start px-4 hover:scale-[1.01] hover:bg-white/5 transition-all duration-300 font-semibold" onClick={() => setView('schemas')}>{t.bot.adjustQuestions}</Button>
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
      <DialogContent className="border border-white/5 bg-card/95 backdrop-blur-xl rounded-2xl max-w-lg shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold text-white">{editor?.item ? t.form.edit : t.form.new} {editor?.type}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground/80">{t.form.changesProtected}</DialogDescription>
        </DialogHeader>
        <form id="editor-form" className="grid gap-4 md:grid-cols-2 py-4" onSubmit={onSubmit}>
          {editor?.type === 'course' && <CourseForm course={editor.item} meta={meta} t={t} />}
          {editor?.type === 'application' && <ApplicationForm application={editor.item} courses={courses} meta={meta} t={t} />}
          {editor?.type === 'user' && <UserForm user={editor.item} t={t} />}
        </form>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-xl border-white/5 bg-muted/40 hover:bg-muted/80 text-xs font-semibold h-10 px-5" onClick={() => setEditor(null)}>{t.common.cancel}</Button>
          <Button type="submit" form="editor-form" className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 text-xs font-bold h-10 px-5">{t.common.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CourseForm({ course, meta, t }: { course?: Course; meta: AdminMeta; t: Translation }) {
  return (
    <>
      <Field label={t.form.title}><Input name="title" defaultValue={course?.title || ''} required /></Field>
      <Field label={t.form.format}><NativeSelect name="format" defaultValue={course?.format || 'ONLINE'}>{Object.entries(meta.courseFormats).map(([key, label]) => <option key={key} value={key} className="bg-card text-foreground">{label}</option>)}</NativeSelect></Field>
      <Field label={t.form.educationType}><Input name="educationType" defaultValue={course?.educationType || ''} /></Field>
      <Field label={t.form.duration}><Input name="duration" defaultValue={course?.duration || ''} /></Field>
      <Field label={t.form.cost}><Input name="cost" defaultValue={course?.cost || ''} /></Field>
      <Field label={t.form.imageFileId}><Input name="imageFileId" defaultValue={course?.imageFileId || ''} /></Field>
      <Field label={t.form.imageUpload}>
        <Input name="courseImage" type="file" accept="image/*" className="file:text-white file:font-semibold file:bg-white/5 file:border-0 file:rounded-lg file:px-2.5 file:py-1 cursor-pointer" />
      </Field>
      <Field label={t.form.ageMin}><Input name="ageMin" type="number" defaultValue={course?.ageMin ?? 18} /></Field>
      <Field label={t.form.ageMax}><Input name="ageMax" type="number" defaultValue={course?.ageMax ?? 45} /></Field>
      <div className="flex flex-col gap-2.5 md:col-span-2 pt-2">
        <label className="flex items-center gap-2.5 text-xs font-semibold text-white/80 cursor-pointer select-none"><input name="hasPractice" type="checkbox" className="rounded border-white/20 bg-slate-950/50 text-primary focus:ring-primary/20 cursor-pointer" defaultChecked={course?.hasPractice || false} /> {t.form.hasPractice}</label>
        <label className="flex items-center gap-2.5 text-xs font-semibold text-white/80 cursor-pointer select-none"><input name="canPayInInstallments" type="checkbox" className="rounded border-white/20 bg-slate-950/50 text-primary focus:ring-primary/20 cursor-pointer" defaultChecked={course?.canPayInInstallments || false} /> {t.form.installments}</label>
        <label className="flex items-center gap-2.5 text-xs font-semibold text-white/80 cursor-pointer select-none"><input name="isActive" type="checkbox" className="rounded border-white/20 bg-slate-950/50 text-primary focus:ring-primary/20 cursor-pointer" defaultChecked={course?.isActive ?? true} /> {t.form.active}</label>
      </div>
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
          <Field label={t.form.gender}><NativeSelect name="gender" defaultValue="MALE"><option value="MALE" className="bg-card text-foreground">{t.form.male}</option><option value="FEMALE" className="bg-card text-foreground">{t.form.female}</option></NativeSelect></Field>
          <Field label={t.form.birthDateText}><Input name="birthDate" placeholder="01.01.2000" required /></Field>
          <Field label={t.form.phone}><Input name="phone" required /></Field>
          <Field label={t.form.city}><Input name="city" required /></Field>
        </>
      )}
      <Field label={t.form.course}><NativeSelect name="courseId" defaultValue={application?.courseId || courses[0]?.id}>{courses.map((course) => <option key={course.id} value={course.id} className="bg-card text-foreground">{course.title}</option>)}</NativeSelect></Field>
      {application && <Field label={t.form.status}><NativeSelect name="status" defaultValue={application.status}>{meta.applicationStatuses.map((status) => <option key={status} value={status} className="bg-card text-foreground">{meta.applicationStatusLabels[status] || status}</option>)}</NativeSelect></Field>}
      <Field label={t.form.experience}><Input name="experience" defaultValue={application?.experience || ''} /></Field>
      <Field label={t.form.workplace}><Input name="workplace" defaultValue={application?.workplace || ''} /></Field>
      <Field label={t.form.educationType}><NativeSelect name="educationType" defaultValue={application?.educationType || ''}><option value="" className="bg-card text-foreground">{t.common.notSet}</option>{meta.educationTypes.map((type) => <option key={type} value={type} className="bg-card text-foreground">{type}</option>)}</NativeSelect></Field>
      <Field label={t.form.specialization}><Input name="specialization" defaultValue={application?.specialization || ''} /></Field>
      <Field label={t.form.learningGoal}><NativeSelect name="learningGoal" defaultValue={application?.learningGoal || meta.learningGoals[0]}>{meta.learningGoals.map((goal) => <option key={goal} value={goal} className="bg-card text-foreground">{goal}</option>)}</NativeSelect></Field>
      <Field label={t.form.studyFormat}><NativeSelect name="studyFormat" defaultValue={application?.studyFormat || meta.studyFormats[0]}>{meta.studyFormats.map((format) => <option key={format} value={format} className="bg-card text-foreground">{format}</option>)}</NativeSelect></Field>
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
      <Field label={t.form.gender}><NativeSelect name="gender" defaultValue={user.gender || ''}><option value="" className="bg-card text-foreground">{t.common.notSet}</option><option value="MALE" className="bg-card text-foreground">{t.form.male}</option><option value="FEMALE" className="bg-card text-foreground">{t.form.female}</option></NativeSelect></Field>
      <Field label={t.form.age}><Input name="age" type="number" defaultValue={user.age || ''} /></Field>
      <Field label={t.form.birthDate}><Input name="birthDate" type="date" defaultValue={user.birthDate ? new Date(user.birthDate).toISOString().slice(0, 10) : ''} /></Field>
      <Field label={t.form.city}><Input name="city" defaultValue={user.city || ''} /></Field>
    </>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={cn('grid gap-1.5', className)}><Label className="text-xs font-semibold text-white/80">{label}</Label>{children}</div>;
}

function RowActions({ onEdit, onDelete, t }: { onEdit: () => void; onDelete: () => void; t: Translation }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" className="h-8 rounded-lg border-white/5 bg-muted/40 px-2.5 text-xs font-semibold hover:bg-muted/80" onClick={onEdit}>{t.common.edit}</Button>
      <Button variant="destructive" size="sm" className="flex h-8 w-8 items-center justify-center rounded-lg p-0" onClick={onDelete} aria-label={t.common.remove} title={t.common.remove}><Trash2 className="h-3.5 w-3.5" /></Button>
    </div>
  );
}
