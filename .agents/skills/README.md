# Каталог Agent Skills проекта `ocean`

В папке `.agents/skills/` собрано **30 скилов** в стандартном формате `SKILL.md`: **7 специализированных скилов** под архитектуру симулятора океана (`window.OC`, `OC.Biomes`, Three.js r128, Web Audio API, `build.py`) и **23 проверенных open-source скила** с GitHub для разработки, тестирования, дизайна и научного поиска.

Для быстрой валидации всех скилов:
```bash
python3 .agents/skills/validate_skills.py
```

---

## 1. Специализированные скилы проекта `ocean` (7 шт.)

| Скил | Назначение |
|---|---|
| [`marine-biome-researcher`](./marine-biome-researcher/SKILL.md) | Научный ресёрч морской географии, батиметрии (`Y = 0`), термоклинов, оптики воды, латинской таксономии, размеров и суточных циклов перед созданием биомов и видов |
| [`ocean-biome-architect`](./ocean-biome-architect/SKILL.md) | Архитектура и регистрация новых водных биомов планеты через `OC.Biomes` (`getHeight`, `safeSpotY`, `getOpticalProfile`, `generateChunkFlora`, `build.py`) |
| [`threejs-r128-procedural-mesh`](./threejs-r128-procedural-mesh/SKILL.md) | Процедурные кораллы, флора и фауна на Three.js r128: `OC.mergeGeometries`, патчи шейдеров `OC.enhanceMaterial`, `InstancedMesh`, `aSway`, `aSwim` |
| [`ecosystem-ai-simulator`](./ecosystem-ai-simulator/SKILL.md) | Экосистемный ИИ для `OC.FaunaEngine`: пространственный хэш для Boids-косяков, избегание хищников и батискафа, дневная/ночная смена поведения без лишних аллокаций |
| [`submersible-hud-design`](./submersible-hud-design/SKILL.md) | Дизайн стеклянного HUD поверх 3D-сцены (`template.html`, `src/ui/*`), батиметрическая мини-карта, Атлас видов и режим приборов батискафа |
| [`webaudio-underwater-soundscape`](./webaudio-underwater-soundscape/SKILL.md) | Процедурный синтез подводного звука в Web Audio API (`src/engine/audio.js`): фильтрация по глубине, биоакустика, сонар и профили новых биомов |
| [`ocean-qa-verification`](./ocean-qa-verification/SKILL.md) | Сборка и проверка: `build.py`, Node VM тесты `tests/verify.mjs`, проверка GLSL-патчей, стресс-тест пулов `InstancedMesh` на профиле `Ultra` |

---

## 2. Подключённые open-source скилы с GitHub (23 шт.)

### 3D, WebGL, шейдеры и производительность
| Скил | Источник | Лицензия | Примечание |
|---|---|---|---|
| [`webgl-shader-fx`](./webgl-shader-fx/SKILL.md) | `praveentewatia26/award-grade` | MIT | Бюджет draw calls / 60 FPS, GLSL-эффекты и фоллбэки |
| [`3d-graphics`](./3d-graphics/SKILL.md) | `samhvw8/dot-claude` | MIT | Справочник по Three.js (инстансинг, LOD, камеры, свет, материалы) |
| [`threejs`](./threejs/SKILL.md) | `MengTo/Skills` | MIT | Компактная шпаргалка по базовому жизненному циклу Three.js |
| [`threejs-3d`](./threejs-3d/SKILL.md) | `tp-job/agent_skill` | MIT | Современные паттерны Three.js r186+ (внутри добавлена пометка про текущий r128 стек `ocean`) |
| [`webgl`](./webgl/SKILL.md) | `Quegenx/agent-skills` | — | Аудит WebGL-контекста, бюджетов и запуска 3D-сцен на веб-страницах |
| [`web-performance`](./web-performance/SKILL.md) | `rbaumier/skills` | MIT | Профилирование, Core Web Vitals, длинные задачи и размер бандла |

### Архитектура кода, проверка, отладка и тесты
| Скил | Источник | Лицензия | Примечание |
|---|---|---|---|
| [`software-architecture`](./software-architecture/SKILL.md) | `Quegenx/agent-skills` | — | Границы модулей, направление зависимостей и владение состоянием |
| [`testing`](./testing/SKILL.md) | `Quegenx/agent-skills` | — | Проектирование юнит-, интеграционных и контрактных тестов |
| [`webapp-testing`](./webapp-testing/SKILL.md) | `anthropics/skills` | Apache-2.0 | Интерактивная проверка веб-приложения через Playwright и скриншоты |
| [`code-review`](./code-review/SKILL.md) | `Quegenx/agent-skills` | — | Структурное код-ревью по критичности P0–P3 и зоне влияния изменений |
| [`debugging`](./debugging/SKILL.md) | `Quegenx/agent-skills` | — | Воспроизведение сбоев, поиск первопричины и доказательная проверка фикса |
| [`refactoring`](./refactoring/SKILL.md) | `Quegenx/agent-skills` | — | Безопасный рефакторинг малыми шагами и упрощение интерфейсов модулей |

### Веб-дизайн, CSS, цвета, анимация и генеративное искусство
| Скил | Источник | Лицензия | Примечание |
|---|---|---|---|
| [`frontend-design`](./frontend-design/SKILL.md) | `anthropics/skills` | Apache-2.0 | Выразительный визуальный дизайн UI без шаблонных клише |
| [`design-taste-frontend`](./design-taste-frontend/SKILL.md) | `sickn33/agentic-awesome-skills` | MIT | Строгий дизайн-вкус, плотность данных и адаптивные сетки |
| [`ui-checker`](./ui-checker/SKILL.md) | `tp-job/agent_skill` | MIT | Аудит вёрстки, CSS-переменных, WCAG-контраста и Web Interface Guidelines |
| [`color-system`](./color-system/SKILL.md) | `Quegenx/agent-skills` | — | Калибровка палитр, контрастности и цветовых токенов |
| [`modern-css`](./modern-css/SKILL.md) | `Quegenx/agent-skills` | — | Современные приёмы CSS (custom properties, responsive, queries, transitions) |
| [`ui-animation`](./ui-animation/SKILL.md) | `Quegenx/agent-skills` | — | Плавные микровзаимодействия UI, физика переходов и `prefers-reduced-motion` |
| [`algorithmic-art`](./algorithmic-art/SKILL.md) | `anthropics/skills` | Apache-2.0 | Генеративные алгоритмы, поля шума и потоков |

### Научный поиск и разработка скилов
| Скил | Источник | Лицензия | Примечание |
|---|---|---|---|
| [`openalex-database`](./openalex-database/SKILL.md) | `K-Dense-AI/claude-scientific-skills` (через `Microck/ordinary-claude-skills`) | MIT | Поиск научных статей и морской литературы через OpenAlex API |
| [`literature-review`](./literature-review/SKILL.md) | `K-Dense-AI/claude-scientific-skills` (через `Microck/ordinary-claude-skills`) | MIT | Систематический обзор научных источников и проверка цитирований |
| [`scientific-critical-thinking`](./scientific-critical-thinking/SKILL.md) | `K-Dense-AI/claude-scientific-skills` (через `Microck/ordinary-claude-skills`) | MIT | Критическая оценка достоверности научных фактов и биологических данных |
| [`skill-creator`](./skill-creator/SKILL.md) | `anthropics/skills` | Apache-2.0 | Создание, тестирование и валидация новых скилов `SKILL.md` |
