# Configuration

`config.json` holds app-level settings (name, version, languages, base URL).
`route.json` holds optional route overrides — rarely needed because routes are
generated automatically from method folder names.

| Folder name        | Generated route        |
| ------------------ | ---------------------- |
| `user.create`      | `POST /user/create`    |
| `student.fee.pay`  | `POST /student/fee/pay`|
| `invoice.generate` | `POST /invoice/generate`|

The HTTP verb comes from each method's `init.js` (`requestMethod`).
