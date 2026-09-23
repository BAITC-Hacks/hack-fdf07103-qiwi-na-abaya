import "dotenv/config";
import { PrismaClient, TaskStatus } from "@prisma/client";
import { calculateReadiness, type ScoringFields } from "../src/lib/scoring.ts";

const db = new PrismaClient();
const empty: ScoringFields = {
  context: "", need: "", users: "", dataMaterials: "", expectedResult: "",
  successCriteria: "", constraints: "", businessContact: "",
};
const contact = "Алия, координатор Qadam Market: demo@qadam.example. Созвон по средам, обратная связь в течение двух рабочих дней.";

const teams = [
  { id: "team-steppe", name: "Steppe Digital", description: "Четыре студента КБТУ: создаём веб-сервисы для малого бизнеса и проверяем решения с пользователями.", interests: ["Ритейл", "Автоматизация"], skills: ["Frontend", "UX/UI"], technologies: ["TypeScript", "React", "Next.js"] },
  { id: "team-data", name: "Data Nomads", description: "Команда аналитиков из Алматы. Работаем с табличными данными, прогнозами и понятными дашбордами.", interests: ["Аналитика", "Логистика"], skills: ["Анализ данных", "Визуализация"], technologies: ["Python", "SQL", "Pandas"] },
  { id: "team-orbit", name: "Orbit Lab", description: "Три разработчика и дизайнер. Быстро собираем интерактивные прототипы и Telegram-ботов.", interests: ["Клиентский сервис", "Ритейл"], skills: ["Backend", "Прототипирование"], technologies: ["Node.js", "TypeScript", "Telegram API"] },
  { id: "team-sana", name: "Sana Design", description: "Студенческая дизайн-команда: исследования, доступность интерфейсов и тестирование гипотез.", interests: ["Образование", "Пользовательский опыт"], skills: ["UX-исследования", "UX/UI"], technologies: ["Figma", "React"] },
  { id: "team-green", name: "Green Code", description: "Делаем инструменты для сокращения отходов и улучшения операционных процессов небольших компаний.", interests: ["Устойчивое развитие", "Ритейл"], skills: ["Full-stack", "Анализ данных"], technologies: ["Next.js", "SQLite", "Python"] },
];

const published = [
  {
    id: "task-feedback", title: "Собрать отзывы покупателей в одном месте", industry: "Ритейл",
    rawDescription: "Отзывы приходят в разные чаты, хотим собирать их вместе и видеть частые жалобы.",
    skills: ["UX-исследования", "React"],
    fields: { context: "У Qadam Market три магазина у дома. Отзывы покупателей сейчас остаются в личных чатах администраторов.", need: "Нужен единый способ собирать отзывы, чтобы повторяющиеся проблемы не терялись.", users: "Администраторы трёх магазинов и операционный менеджер." },
  },
  {
    id: "task-shifts", title: "Упростить согласование смен продавцов", industry: "Ритейл",
    rawDescription: "Менеджеры вручную согласуют смены в мессенджере. Хотим понятный график и заявки на замену.",
    skills: ["React", "UX/UI"],
    fields: { context: "В трёх магазинах работают 18 продавцов; график хранится в таблице, замены обсуждаются в чате.", need: "Сократить потерянные заявки на замену и убрать конфликтующие версии расписания.", users: "Продавцы подают заявки, управляющие подтверждают изменения.", expectedResult: "Веб-прототип недельного расписания с созданием заявки на замену смены.", businessContact: contact },
  },
  {
    id: "task-stock", title: "Показать товары с риском дефицита", industry: "Аналитика",
    rawDescription: "Хотим видеть, какие товары скоро закончатся. Есть выгрузка продаж и остатков за последние восемь недель.",
    skills: ["Python", "SQL", "Визуализация"],
    fields: { context: "Закупщик вручную проверяет остатки 240 популярных товаров в трёх магазинах.", need: "Раньше замечать риск отсутствия товара на полке и формировать список для проверки закупщиком.", users: "Закупщик и управляющие магазинами.", dataMaterials: "Учебная CSV-выгрузка: дата, код товара, магазин, продажи, остаток за восемь недель. Координатор предоставит файл на первой встрече.", expectedResult: "Дашборд с фильтром магазина и списком товаров с предполагаемым запасом менее трёх дней.", businessContact: contact },
  },
  {
    id: "task-onboarding", title: "Превратить обучение новых продавцов в короткие квесты", industry: "Образование",
    rawDescription: "Новички читают длинную инструкцию и забывают правила. Нужны короткие учебные сценарии с вопросами.",
    skills: ["UX/UI", "Next.js", "TypeScript"],
    fields: { context: "За месяц Qadam Market нанимает до шести продавцов. Наставники повторяют вводный инструктаж каждому новичку.", need: "Помочь новичкам освоить кассу, возвраты и правила выкладки в первые три смены.", users: "Новые продавцы проходят обучение, наставник проверяет завершённые модули.", dataMaterials: "Координатор передаст учебную инструкцию из 12 страниц и пять типовых ситуаций без персональных данных.", expectedResult: "Мобильный веб-прототип из трёх учебных квестов с вопросами и сохранением прогресса.", successCriteria: "Пять тестовых пользователей завершают квест за десять минут; минимум четыре правильно отвечают на 80% вопросов.", businessContact: contact },
  },
  {
    id: "task-waste", title: "Сократить списания свежей выпечки", industry: "Устойчивое развитие",
    rawDescription: "Вечером списываем выпечку. Нужно сравнить продажи по дням недели и предложить объём заказа на следующий день.",
    skills: ["Python", "Анализ данных", "Next.js"],
    fields: { context: "Три магазина Qadam Market ежедневно заказывают выпечку. Объём заказа сейчас выбирают по опыту администратора.", need: "Сделать ежедневный заказ более обоснованным и уменьшить остатки к закрытию.", users: "Администраторы магазинов и менеджер закупок.", dataMaterials: "Учебный CSV за 60 дней: магазин, дата, позиция, заказано, продано, списано. Файл предоставит координатор; персональных данных нет.", expectedResult: "Дашборд списаний и расчёт рекомендуемого заказа на завтра с объяснением расчёта.", successCriteria: "Импортируются все строки тестового файла; суммы совпадают с контрольной таблицей; рекомендация выводится для каждой позиции и магазина.", constraints: "Прототип за две недели, без платных сервисов и интеграции с кассой. Итоговый заказ подтверждает менеджер.", businessContact: contact },
  },
];

const drafts = [
  { id: "draft-queue", title: "Очереди на кассе по вечерам", rawDescription: "По вечерам очередь. Хотим понять, когда открывать вторую кассу.", industry: "Ритейл" },
  { id: "draft-loyalty", title: "Вернуть постоянных покупателей", rawDescription: "Нужна программа лояльности, но ещё не решили, что давать покупателям.", industry: "Маркетинг" },
  { id: "draft-delivery", title: "Сделать доставку предсказуемой", rawDescription: "Курьеры иногда опаздывают. Хотим удобнее планировать маршруты.", industry: "Логистика" },
  { id: "draft-suppliers", title: "Сравнение условий поставщиков", rawDescription: "Прайсы поставщиков приходят в разных форматах. Сложно быстро сравнить цены.", industry: "Закупки" },
  { id: "draft-energy", title: "Понять расходы на электричество", rawDescription: "Счета за электричество растут. Нужна наглядная статистика по магазинам.", industry: "Устойчивое развитие" },
];

async function main() {
  await db.$transaction(async (tx) => {
    await tx.business.upsert({ where: { id: "business-qadam" }, update: {}, create: {
      id: "business-qadam", name: "Qadam Market", contactName: "Алия Садыкова", contact,
    } });
    for (const team of teams) await tx.team.upsert({ where: { id: team.id }, update: {}, create: team });
    for (const item of published) {
      const { fields: provided, ...details } = item;
      const fields = { ...empty, ...provided };
      const { score, readinessLevel } = calculateReadiness(fields);
      await tx.task.upsert({ where: { id: item.id }, update: {}, create: {
        ...details, ...fields, score, readinessLevel, businessId: "business-qadam",
        status: TaskStatus.PUBLISHED, confirmedAt: new Date("2026-09-23T06:00:00Z"), publishedAt: new Date("2026-09-23T06:00:00Z"),
      } });
    }
    for (const draft of drafts) await tx.task.upsert({ where: { id: draft.id }, update: {}, create: {
      ...draft, businessId: "business-qadam", status: TaskStatus.DRAFT,
    } });
    const ideas = [
      { taskId: "task-feedback", teamId: "team-sana", solutionIdea: "QR-форма отзыва и экран повторяющихся тем для администратора.", plan: "Провести три интервью, собрать прототип формы, проверить его с пятью покупателями.", estimatedTime: "7 дней" },
      { taskId: "task-shifts", teamId: "team-steppe", solutionIdea: "Недельный календарь смен с заявками и ручным подтверждением менеджера.", plan: "Уточнить правила замен, сделать календарь и форму заявки, провести тест с двумя управляющими.", estimatedTime: "10 дней" },
      { taskId: "task-stock", teamId: "team-data", solutionIdea: "Рассчитать запас в днях по средней скорости продаж и выделить товары для проверки.", plan: "Проверить CSV, рассчитать показатели, собрать дашборд и сравнить итоги с закупщиком.", estimatedTime: "12 дней" },
      { taskId: "task-onboarding", teamId: "team-orbit", solutionIdea: "Три интерактивных учебных сценария с прогрессом и обратной связью после вопроса.", plan: "Разобрать инструкцию, согласовать вопросы, создать веб-прототип, протестировать на новичках.", estimatedTime: "14 дней" },
      { taskId: "task-waste", teamId: "team-green", solutionIdea: "Показать списания по дням недели и дать объяснимый прогноз объёма заказа.", plan: "Загрузить CSV, проверить итоги, реализовать расчёт и ручную корректировку, провести демонстрацию.", estimatedTime: "14 дней" },
    ];
    for (const [index, proposal] of ideas.entries()) await tx.proposal.upsert({
      where: { taskId_teamId: { taskId: proposal.taskId, teamId: proposal.teamId } }, update: {},
      create: { id: `proposal-demo-${index + 1}`, ...proposal, prototypeUrl: `https://example.com/prototypes/${proposal.teamId}` },
    });
    const questions = [
      { field: "users", question: "Кто будет пользоваться решением и принимать решение об открытии второй кассы?" },
      { field: "dataMaterials", question: "Есть ли данные о времени покупок, длине очереди или расписании кассиров?" },
      { field: "successCriteria", question: "Какое время ожидания вы считаете приемлемым и как его измерите?" },
    ];
    for (const [position, question] of questions.entries()) await tx.clarification.upsert({
      where: { taskId_position: { taskId: "draft-queue", position } }, update: {},
      create: { id: `clarification-queue-${position}`, taskId: "draft-queue", position, ...question },
    });
  });
  console.log("Seed готов: 1 бизнес, 5 команд, 5 публикаций (30/55/75/90/100), 5 черновиков, 5 предложений. Существующие записи сохранены.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());

