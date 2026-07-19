# SiteOps AI

Нативное React Native приложение для преобразования свободного рабочего текста на русском, иврите или английском в структурированный отчёт строительного объекта.

## Что работает

- ввод отчёта на RU / HE / EN;
- извлечение работников, работ, этажей, материалов и задержек;
- финансовые последствия и задачи на следующий день;
- официальное сообщение руководителю на иврите;
- локальная история последних 100 отчётов;
- GPT-анализ через защищённый сервер;
- автоматический demo-режим, если сервер недоступен.

## Мобильное приложение

```bash
cd /Users/lilemmi/Projects/SiteOpsAI-native
npm install
bundle install
cd ios && bundle exec pod install && cd ..
npm start
```

Во втором терминале:

```bash
npm run ios
# или
npm run android
```

## GPT API

Ключ OpenAI хранится только на сервере и никогда не добавляется в приложение.

```bash
cd /Users/lilemmi/Projects/SiteOpsAI-native/server
cp .env.example .env
# Добавьте OPENAI_API_KEY в .env
npm install
npm run dev
```

По умолчанию используется `gpt-5.6-terra` и Structured Outputs через Responses API. iOS Simulator подключается к `127.0.0.1:8787`, Android Emulator — к `10.0.2.2:8787`. Для физического телефона укажите LAN-адрес компьютера или URL развёрнутого HTTPS API в `src/config.ts`.

## Проверки

```bash
npx tsc --noEmit
npm run lint
npm test -- --watch=false
cd server && npm run typecheck
```

Следующие этапы: сравнение отчётов и противоречия, журнал долгов и оплат, недельная сводка, экспорт PDF/CSV.
