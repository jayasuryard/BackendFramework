# RyoForge Runtime Framework (RRF)

A production-grade, **CLI-driven**, **metadata-driven**, **method-oriented** backend
framework for Node.js & Express. One codebase runs as an HTTP API, WebSocket
server, scheduler, AWS Lambda or Serverless deployment — with automatic routing,
validation, authentication, i18n, Swagger and Postman generation.

> **Everything is a Method. Everything runs through the Executor. Everything is
> discovered. Nothing is registered by hand.**

---

## Quick start

```bash
npm install          # install dependencies
npm start            # Express runtime  -> http://localhost:3000
npm run start:ws     # WebSocket runtime -> ws://localhost:4000
npm run start:cron   # Scheduler runtime
```

Then open:

- Swagger UI — http://localhost:3000/swagger
- Postman    — http://localhost:3000/postman
- Health     — http://localhost:3000/health
- Methods    — http://localhost:3000/methods

---

## The CLI

```bash
rrf create myapp              # scaffold a new project
rrf make:method user.create   # creates POST /user/create
rrf make:crud user            # library + 5 CRUD methods + migration
rrf make:lib user             # data-access library
rrf make:task dailyReward     # scheduled task
rrf make:socket room.join     # WebSocket-exposed method
rrf make:migration create_x   # SQL migration
rrf db:init postgres          # initialize DB layer
rrf migrate:up                # apply migrations
rrf postman:generate          # write Postman collection
rrf swagger:generate          # write OpenAPI spec
rrf list                      # list discovered methods & tasks
rrf serve                     # start Express runtime
```

Run `rrf help` for the full list. (Use `node bin/rrf.js <cmd>` inside this repo,
or `npm link` to expose the `rrf` command globally.)

---

## How it works

### 1. Everything is a Method

A method is a folder under `src/methods/`. Its **name defines its route**:

| Folder            | Route                    |
| ----------------- | ------------------------ |
| `user.create`     | `POST /user/create`      |
| `student.fee.pay` | `POST /student/fee/pay`  |
| `invoice.generate`| `POST /invoice/generate` |

Each method folder contains:

```
user.create/
├── init.js        # metadata: security, verbs, permissions, params, tags
├── action.js      # business logic only
├── schema.js      # (optional) richer schema docs
├── examples.json  # request/response examples (feeds Postman & Swagger)
└── README.md
```

### 2. The Executor pipeline

Every transport (HTTP, WebSocket, Lambda, Cron, Internal) builds an
`ExecutorContext` and hands it to the **single** Executor pipeline:

```
resolve route → load init → validate → authenticate → authorize →
rate limit → load action → execute → build response → log → return
```

### 3. Canonical response envelope

```jsonc
{
  "responseCode": 200,
  "responseMessage": "User created successfully",
  "responseData": { },
  "requestId": "ABC123"
}
```

Messages are defined once in `src/global/responses.js` and translated
automatically from the `Accept-Language` header (en, hi, kn, ar, es, fr).

---

## Project layout

```
├── lib/                  # the RRF framework itself
│   ├── core/             # Executor, loaders, base classes, validator, i18n
│   ├── db/               # SQLManager, pool, migrations, BaseLibrary
│   ├── runtimes/         # express, websocket, cron, lambda, serverless
│   ├── generators/       # postman, swagger
│   ├── security/         # jwt, rbac, rate limit
│   └── cli/              # CLI commands, templates, scaffolder
├── bin/rrf.js            # CLI entry point
├── src/                  # the demo application
│   ├── config/           # config.json, route.json
│   ├── global/           # constants, responses, i18n strings
│   ├── library/          # data-access libraries
│   ├── methods/          # every API / socket method
│   └── tasks/            # scheduled tasks
├── express.js  websocket.js  cron.js  lambda.js  serverless.js
├── postman.js  socketio.js
├── migrations/  logs/  storage/  postman/  Assets/
```

---

## Writing a method

`src/methods/user.create/init.js`

```js
class UserCreateInitialize extends BaseInitialize {
  constructor() {
    super();
    this.initializer = {
      ...this.initializer,
      isSecured: true,
      requestMethod: ['POST'],
      permissions: ['USER_CREATE'],
      tags: ['User'],
    };
  }
  getParameter() {
    return {
      name:  { type: 'string', required: true },
      email: { type: 'email',  required: true },
    };
  }
}
```

`src/methods/user.create/action.js`

```js
class UserCreateAction extends BaseAction {
  async executeMethod() {
    const user = await this.lib('user').create({ name: this.name, email: this.email });
    this.setResponse('USER_CREATED', user);
    return user;
  }
}
```

That's it — the route, validation, auth, rate limiting, Swagger entry, Postman
entry and logging are all handled automatically.

---

## Database & ORM

```js
SQLManager.find(table, { where, orderBy, limit })
SQLManager.findOne(table, where)
SQLManager.insert(table, data)
SQLManager.update(table, where, data)
SQLManager.delete(table, where)
SQLManager.raw(sql, params)
SQLManager.transaction(async (tx) => { ... })
```

Libraries (extending `BaseLibrary`) wrap these so **methods never write SQL**.

---

## Deployment modes

| Mode        | Entry file      |
| ----------- | --------------- |
| Express     | `express.js`    |
| WebSocket   | `websocket.js`  |
| Scheduler   | `cron.js`       |
| AWS Lambda  | `lambda.js`     |
| Serverless  | `serverless.js` |

The same methods run unchanged across all of them.

---

## License

MIT
