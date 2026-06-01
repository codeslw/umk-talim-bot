const { BOT_APPLICATION_STATUS_LABELS } = require('../constants/application');

type Command = readonly [string, string];
type CommandSection = readonly [string, readonly Command[]];

const PUBLIC_COMMANDS: readonly Command[] = Object.freeze([
  ['/start', 'выбрать язык и открыть меню курсов'],
  ['/help', 'показать доступные команды'],
  ['/commands', 'показать доступные команды'],
  ['/stats', 'показать общее количество заявок'],
  ['/cancel', 'отменить текущую заявку или мастер']
]);

const ADMIN_COMMANDS: readonly Command[] = Object.freeze([
  ['/course_create', 'создать курс через пошаговый мастер'],
  ['/course_create {json}', 'создать курс из JSON'],
  ['/course_list', 'показать все курсы с управлением'],
  ['/applications', 'показать заявки'],
  ['/applications NEW', 'показать заявки с выбранным статусом'],
  ['/admin_help', 'показать эту справку для администраторов'],
  ['/admin_commands', 'показать эту справку для администраторов'],
  ['/bot_stop', 'остановить Telegram polling в текущем процессе'],
  ['/stop_bot, /quit_bot, /shutdown_bot', 'алиасы для остановки polling']
]);

function formatAvailableCommands(isAdmin: boolean): string {
  const sections: CommandSection[] = [
    ['Команды пользователя', PUBLIC_COMMANDS]
  ];

  if (isAdmin) {
    sections.push(['Команды администратора', ADMIN_COMMANDS]);
    sections.push([
      'Статусы заявок для /applications',
      Object.entries(BOT_APPLICATION_STATUS_LABELS).map(([status, label]) => [status, String(label)] as const)
    ]);
  }

  return sections
    .map(([title, commands]) => [
      title,
      ...commands.map(([command, description]) => `${command} - ${description}`)
    ].join('\n'))
    .join('\n\n');
}

module.exports = { formatAvailableCommands };
