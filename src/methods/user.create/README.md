# user.create

Creates a new user.

- **Route:** `POST /user/create`
- **Secured:** yes (JWT) — requires permission `USER_CREATE` and role `admin`
- **Rate limit:** 100 / window

## Parameters
| Field    | Type   | Required | Notes              |
| -------- | ------ | -------- | ------------------ |
| name     | string | yes      | 2–80 chars         |
| email    | email  | yes      | unique             |
| password | string | no       | min 6 chars        |
| roles    | array  | no       | defaults to `[user]` |

## Responses
- `USER_CREATED` (200)
- `EMAIL_TAKEN` (409)
- `VALIDATION_FAILED` (422)

See [init.js](./init.js) and [action.js](./action.js).
