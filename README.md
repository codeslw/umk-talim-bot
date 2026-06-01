# Telegram Course Application Bot

Telegram-бот для приема заявок на учебные курсы, хранения данных в PostgreSQL, формирования Excel-отчетов и управления заявками через REST API.

## Возможности

- `/start` с меню и пошаговой анкетой.
- Сохранение пользователей, курсов и заявок в PostgreSQL.
- Уведомления администраторам о новой заявке.
- Excel-экспорт заявок.
- Статистика по заявкам.
- REST API для администрирования.

## Стек

- Node.js
- TypeScript
- Express.js
- PostgreSQL
- Prisma ORM
- Telegram Bot API
- ExcelJS
- dotenv
- Docker / docker-compose

## Быстрый запуск

1. Скопируйте `.env.example` в `.env`.
2. Укажите `BOT_TOKEN`, `DATABASE_URL`, `ADMIN_API_KEY`.
3. Установите зависимости:

```bash
npm install
```

4. Сгенерируйте Prisma client и примените миграции:

```bash
npx prisma generate
npx prisma migrate dev
```

5. Запустите сервер:

```bash
npm run dev
```

For production builds:

```bash
npm run build
npm start
```

## Docker

```bash
docker compose up --build
```

## Основные API endpoints

- `GET /health`
- `GET /api/courses`
- `POST /api/courses`
- `DELETE /api/courses/:id`
- `POST /api/applications`
- `GET /api/applications`
- `PATCH /api/applications/:id/status`
- `GET /api/applications/stats`
- `GET /api/applications/export/excel`

### Course payload

When creating a course with `POST /api/courses`, send:

```json
{
  "title": "Frontend Developer",
  "educationType": "RETRAINING_COURSES",
  "duration": "6 months",
  "format": "online",
  "hasPractice": true,
  "cost": "3 500 000 UZS",
  "canPayInInstallments": true,
  "ageMin": 18,
  "ageMax": 45,
  "additionalInfo": "Дополнительная информация про курс"
}
```

The bot shows these fields in the course card before the applicant starts filling out the form.

## Админ-доступ

Передавайте заголовок `x-admin-key: <ADMIN_API_KEY>`.
Для Telegram-доступа можно указать `ADMIN_IDS` с числовыми ID и `ADMIN_USERNAMES` с username без `@` или ссылкой `https://t.me/...`.

### Telegram admin commands

Admins can send `/help`, `/commands`, `/admin_help`, or `/admin_commands` in Telegram to see all available bot commands.

- `/start` - choose language and open the course menu.
- `/help` - show available commands.
- `/commands` - show available commands.
- `/stats` - show the total application count.
- `/cancel` - cancel the current application or wizard.
- `/course_create` - create a course through the step-by-step wizard.
- `/course_create {json}` - create a course from JSON.
- `/course_list` - list all courses with edit/delete actions.
- `/applications` - list applications.
- `/applications NEW` - list applications filtered by status.
- `/bot_stop` - stop Telegram polling in the current process.
- `/stop_bot`, `/quit_bot`, `/shutdown_bot` - aliases for stopping polling.

## Структура

```
src/
├── bot/
├── constants/
├── controllers/
├── http/
├── services/
├── repositories/
├── routes/
├── middlewares/
├── validators/
├── config/
├── utils/
└── app.js
```

## Prisma schema

Сущности:

- `User`
- `Course`
- `Application`

Связи:

- `User 1:N Application`
- `Course 1:N Application`
