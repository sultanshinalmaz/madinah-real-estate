/* Весь контент мини-аппа. Правьте здесь — код трогать не нужно.
   Квартиры взяты из канала t.me/MadinahDom (посты 36–56, сентябрь 2026).
   period: 'month' — цена за месяц, 'year' — за год; price: null — «цена по запросу».
   geo: точка на карте. Где в посте не было ссылки на карту — центр района (примерно). */
window.DATA = {
  brand: {
    name: 'Madinah Real Estate',
    sub: 'Недвижимость в Медине',
    tagline: 'Аренда · Квартиры · Дома',
    logo: 'assets/logo.jpg'
  },

  contacts: {
    telegram: 'abuishak_mada',          // ник риелтора без @
    channel: 'MadinahDom',              // канал с объявлениями
    whatsapp: '966547256674',           // номер для wa.me, только цифры
    phoneText: '+966 54 725 6674'
  },

  // Масджид ан-Набави — от неё считаем «сколько идти»
  haram: { name: 'Масджид ан-Набави', geo: [24.4672, 39.6112] },

  districts: {
    arid:   { name: 'Аль-Арид',   ar: 'العريض',  geo: [24.4787, 39.6428] },
    iskan:  { name: 'Аль-Искан',  ar: 'الإسكان', geo: [24.4593, 39.6474] },
    qurban: { name: 'Курбан',     ar: 'قربان',   geo: [24.4536, 39.6231] },
    suhman: { name: 'Сухман',     ar: '',        geo: [24.4850, 39.6160] }
  },

  listings: [
    {
      id: 56, district: 'suhman', title: 'Большая квартира у парка',
      rooms: 2, hall: true, baths: 1, price: 2400, period: 'month', fee: 600,
      furnished: true, utilities: true, wifi: true,
      walk: null, car: null,
      features: ['Большой зал', '2 большие комнаты', 'Небольшая кухня', 'Санузел', 'Рядом большой парк', 'Всё необходимое рядом'],
      media: [{ type: 'video', src: 'media/56_v0.mp4', poster: 'media/56_v0.jpg' }]
    },
    {
      id: 55, district: 'suhman', title: 'Квартира с уборкой каждую неделю',
      rooms: 1, hall: true, baths: 1, price: 1800, period: 'month', fee: 600,
      furnished: true, utilities: true, wifi: true,
      note: 'Рядом с Центральным банком Саудовской Аравии',
      features: ['1 комната', '1 зал', '1 ванная', 'Кухня', 'Интернет', 'Еженедельная уборка', 'Электричество и вода включены'],
      media: [{ type: 'video', src: 'media/55_v0.mp4', poster: 'media/55_v0.jpg' }]
    },
    {
      id: 54, district: 'arid', title: 'Квартира для семьи, оплата частями',
      rooms: 2, hall: false, baths: 1, price: 15500, period: 'year', fee: 1500,
      family: true, payments: 3,
      features: ['2 комнаты', 'Кухня', '1 санузел', 'Без гостиной', 'Оплата в 3 платежа'],
      media: [{ type: 'video', src: 'media/54_v0.mp4', poster: 'media/54_v0.jpg' }]
    },
    {
      id: 53, district: 'arid', title: 'Уютная квартира 2+1',
      rooms: 2, hall: true, baths: 1, price: 2500, period: 'month', fee: 600,
      furnished: true, utilities: true,
      features: ['Новая мебель', 'Большая кухня', 'Просторный зал', 'Просторные спальни', 'Санузел', 'Чистый, аккуратный район'],
      media: [{ type: 'video', src: 'media/53_v0.mp4', poster: 'media/53_v0.jpg' }]
    },
    {
      id: 52, district: 'arid', title: 'Уютная квартира 1+1 для сестёр',
      rooms: 1, hall: true, baths: 1, price: 2000, period: 'month', fee: 600,
      furnished: true, utilities: true, women: true,
      features: ['Новая мебель', 'Большая кухня', 'Просторный зал', 'Просторная спальня', 'Санузел', 'Только для женщин'],
      media: [{ type: 'video', src: 'media/52_v0.mp4', poster: 'media/52_v0.jpg' }]
    },
    {
      id: 50, district: 'arid', title: 'Квартира с личной террасой',
      rooms: 2, hall: true, baths: 1, price: 2800, period: 'month', fee: 600,
      furnished: true, utilities: true,
      features: ['Новая мебель', 'Большая кухня', 'Просторный зал', '2 комнаты', 'Личная терраса', 'Санузел'],
      media: [{ type: 'video', src: 'media/50_v0.mp4', poster: 'media/50_v0.jpg' }]
    },
    {
      id: 48, district: 'iskan', title: 'Новая квартира, всё включено',
      rooms: 2, hall: true, baths: 1, price: 2500, period: 'month', fee: 600,
      furnished: true, utilities: true, wifi: true, walk: '20–25 мин',
      features: ['2 комнаты', 'Зал', 'Кухня', 'Большой холодильник', 'Новая плита', 'Микроволновка', 'Стиральная машина-автомат', 'Новая мебель и техника'],
      media: [{ type: 'post', poster: 'media/48_t0.jpg' }]
    },
    {
      id: 47, district: 'iskan', title: 'Три комнаты с кондиционерами',
      rooms: 3, hall: true, baths: 2, price: 23000, period: 'year', fee: null,
      geo: [24.4690, 39.6450],
      features: ['3 комнаты', 'Зал', 'Меблированная кухня', '2 санузла', 'Кондиционеры во всех комнатах'],
      media: [{ type: 'post', poster: 'media/47_t0.jpg' }]
    },
    {
      id: 46, district: 'suhman', title: 'Меблированная квартира в Сухмане',
      rooms: 2, hall: false, baths: 1, price: 2700, period: 'month', fee: 600,
      furnished: true, walk: '20 мин', car: '5 мин',
      features: ['2 комнаты', '1 санузел', 'Оборудованная кухня', 'Полностью меблирована'],
      media: [{ type: 'video', src: 'media/46_v0.mp4', poster: 'media/46_v0.jpg' }]
    },
    {
      id: 45, district: 'arid', title: 'Семейная квартира на 2-м этаже',
      rooms: 2, hall: true, baths: 1, price: 16500, period: 'year', fee: 1500,
      family: true, payments: 3,
      features: ['2-й этаж, лифта нет', '2 комнаты', 'Зал', 'Кухня', '1 санузел', 'Оплата в 3 платежа'],
      media: [{ type: 'video', src: 'media/45_v0.mp4', poster: 'media/45_v0.jpg' }]
    },
    {
      id: 43, district: 'arid', title: 'Новые 4-комнатные квартиры',
      rooms: 4, hall: true, baths: 2, price: null, period: 'month', fee: null,
      isNew: true, geo: [24.4803302, 39.6339643], exact: true,
      note: 'В доме ровно 8 квартир, по 2 на этаже. Вы — первые жильцы.',
      features: ['4 комнаты', 'Просторный зал', 'Кухня', '2 санузла', 'Новое здание', 'Новый ремонт', 'Никто раньше не жил'],
      media: [
        { type: 'video', src: 'media/43_v0.mp4', poster: 'media/43_v0.jpg' },
        { type: 'video', src: 'media/43_v1.mp4', poster: 'media/43_v1.jpg' }
      ]
    },
    {
      id: 42, district: 'qurban', title: 'Квартира в тихом конце Курбана',
      rooms: 2, hall: true, baths: 1, price: 2600, period: 'month', fee: 600,
      furnished: true, walk: '≈15 мин',
      features: ['2 комнаты', 'Зал', 'Санузел', 'Кухня', 'Полностью меблирована', 'Чистая, готова к заселению'],
      media: [{ type: 'video', src: 'media/42_v0.mp4', poster: 'media/42_v0.jpg' }]
    },
    {
      id: 36, district: 'arid', title: 'Меблированная квартира в начале Арида',
      rooms: 2, hall: false, baths: 1, price: 2000, period: 'month', fee: 600,
      furnished: true, walk: '25 мин', car: '8 мин',
      geo: [24.4745, 39.6330],
      features: ['2 комнаты', 'Большая кухня', '1 санузел', 'Меблирована'],
      media: [0, 1, 2, 3, 4, 5].map(function (i) { return { type: 'photo', src: 'media/36_p' + i + '.jpg' }; })
    }
  ],

  steps: [
    'Выберите квартиру и нажмите «Забронировать».',
    'Укажите, кто будет жить и с какой даты, — сообщение соберётся само.',
    'Отправьте его в Telegram или WhatsApp — риелтор ответит лично и покажет квартиру.'
  ]
};
