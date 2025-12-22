---

## 🛠 Технический стек

*   **Backend:** Python 3.12, FastAPI (Async)
*   **Databases:** Neo4j 5.x, Qdrant, PostgreSQL 16, Redis
*   **Infrastructure:** Docker Compose, Traefik (Edge Router)
*   **AI/ML:** OpenAI/Claude API (via LangChain), Sentence-Transformers
*   **Frontend:** React, TypeScript, Vite (Optimistic UI patterns)

---

## 🚀 Быстрый старт

### Требования
*   Docker & Docker Compose
*   Python 3.12+ (для локальной разработки)
*   Make

### Установка

1.  **Клонирование репозитория:**
    ```bash
    git clone https://github.com/AndrewHakmi/KnowledgeBaseAI.git
    cd KnowledgeBaseAI
    ```

2.  **Настройка окружения:**
    Скопируйте пример конфига и заполните ключи (OpenAI, DB passwords):
    ```bash
    cp .env.example .env
    ```

3.  **Запуск инфраструктуры:**
    ```bash
    docker-compose up -d --build
    ```

4.  **Проверка статуса:**
    После запуска документация API будет доступна по адресу:
    `http://localhost:8000/docs`

## 📂 Структура проекта

```text
KnowledgeBaseAI/
├── backend/
│   ├── app/
│   │   ├── api/            # REST Endpoints
│   │   ├── core/           # Config, Security, Math Engines
│   │   ├── db/             # DAO Layers (Neo4j, Postgres, Qdrant)
│   │   ├── services/       # Business Logic (Ingestion, Roadmap)
│   │   └── workers/        # Async Tasks (Celery/ARQ)
│   └── tests/              # Pytest (Unit & Integration)
├── frontend/               # React Application
├── infra/                  # Docker & Terraform configs
└── docs/                   # Architecture & API Specs
```

---

## 🤝 Contribution (Внутреннее использование)

1.  Все изменения проходят через Pull Requests.
2.  Изменения в онтологии требуют обновления версии схемы (`schema_version`).
3.  При добавлении новых фич обязательно покрытие тестами (`tests/`).
4.  Соблюдайте Code Style: `ruff`, `black`, `mypy`.

---

## 📄 Лицензия

Данный проект распространяется под лицензией **BUSL-1.1 (Business Source License)**.
Код доступен для изучения, но коммерческое использование ограничено условиями лицензии.
См. файл [LICENSE](LICENSE) для подробностей.

---

**KnowledgeBaseAI** — *Engineering Knowledge. Deterministically.*
