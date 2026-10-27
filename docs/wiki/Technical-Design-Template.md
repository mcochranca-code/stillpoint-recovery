# Technical Design Template

Copy this page for a feature proposal. Replace bracketed prompts, remove sections that do not apply, and link supporting research or designs. Keep decisions, assumptions, and unresolved questions explicit.

## Proposal

**Feature:** [Name]  
**Owner:** [Name or team]  
**Status:** [Draft | In review | Approved | Superseded]  
**Last updated:** [YYYY-MM-DD]

### Problem statement

- Who is affected, and what are they trying to do?
- What happens today, and where does it fall short?
- What evidence supports the problem (feedback, usage, incidents, or research)?
- What is in scope, and what is explicitly out of scope?

### Proposed solution

- Describe the user-visible behavior and the smallest solution that addresses the problem.
- What are the key user flows, states, and edge cases?
- What data, interfaces, dependencies, or migrations change?
- How will privacy, security, accessibility, and existing behavior be preserved?
- What assumptions or open questions remain?

### Alternatives considered

| Option | Benefits | Costs or risks | Why selected or rejected |
|---|---|---|---|
| [Proposed solution] | [Benefits] | [Tradeoffs] | [Reason] |
| [Alternative] | [Benefits] | [Tradeoffs] | [Reason] |

### Rollout plan

- **Preparation:** [Dependencies, migration, documentation, and test readiness]
- **Release:** [Stages, audience, feature flag, or compatibility strategy]
- **Monitoring:** [Signals, owner, and observation period]
- **Rollback:** [Trigger and safe steps to disable or reverse the change]

### Success metrics

| Metric | Baseline | Target | Measurement window and source | Guardrail |
|---|---|---|---|---|
| [Outcome or behavior] | [Current value or unknown] | [Measurable target] | [Window and source] | [What must not regress] |

State how the metric will be interpreted and who will review it. Prefer outcome measures over activity counts; do not claim causation from correlation alone.

## REST API design guide

Use this section when a proposal adds or changes an HTTP API. It is a language-agnostic design checklist, not a requirement that every feature have a server API.

### Resource and endpoint conventions

- Model URLs around resources using plural nouns, for example `/v1/projects` and `/v1/projects/{projectId}/items`; use HTTP methods for actions rather than verbs in paths.
- Keep names consistent, lowercase, and predictable. Use stable resource identifiers, and version the API in one documented way if compatibility requires it.
- Use `GET` for safe reads, `POST` to create or trigger a non-idempotent operation, `PUT` to replace, `PATCH` to partially update, and `DELETE` to remove. Document idempotency and retry behavior, especially for writes.
- Keep related resources in a clear hierarchy without making paths excessively deep. Use query parameters for selection and ordering rather than encoding them into path segments.
- Specify authentication and authorization separately from resource naming. Do not place credentials or sensitive values in URLs.

### Pagination, filtering, and sorting

- Paginate collection responses; define a default and maximum page size and reject invalid values clearly.
- Prefer opaque cursor pagination for large or frequently changing collections. A cursor should be stable for the query and treated as an implementation detail. Offset/page pagination can suit small, stable collections, but document its limits.
- Return pagination metadata consistently. Do not combine cursor and offset styles in one endpoint unless there is a clear, documented need.
- Accept filters as documented query parameters, allow-list fields and operators, and define how multiple filters combine. Use repeated parameters or a consistent operator syntax for multi-value/range filters.
- Allow-list sortable fields and define direction syntax, default ordering, and a stable tie-breaker so results do not shift unpredictably.
- Apply pagination after filtering and sorting. Document whether totals are returned; avoid expensive total counts when they are not needed.

Example request:

```http
GET /v1/resources?status=active&sort=-createdAt,name&limit=20&cursor=opaque-token HTTP/1.1
Accept: application/json
```

Example response:

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "data": [
    { "id": "res_123", "name": "Example", "status": "active", "createdAt": "2026-01-15T10:30:00Z" }
  ],
  "page": {
    "limit": 20,
    "nextCursor": "next-opaque-token"
  }
}
```

An absent or `null` `nextCursor` means there is no next page. Document the exact representation and keep it consistent.

### Errors and HTTP status codes

Use standard HTTP semantics and return a consistent machine-readable error body for failures. RFC 9457 Problem Details is a suitable format; extensions such as field errors may be added consistently. Do not expose stack traces, secrets, or internal implementation details.

Example validation error:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json
```

```json
{
  "type": "https://example.invalid/problems/invalid-query",
  "title": "Invalid query parameter",
  "status": 400,
  "detail": "The limit must be between 1 and 100.",
  "instance": "/v1/resources",
  "errors": [
    { "field": "limit", "code": "out_of_range" }
  ]
}
```

Choose codes consistently with the failure:

| Status | Use |
|---|---|
| `200 OK` | Successful read or update with a response body |
| `201 Created` | Resource created; include `Location` when useful |
| `202 Accepted` | Work accepted but not yet completed |
| `204 No Content` | Successful operation with no response body |
| `400 Bad Request` | Malformed request or invalid query/parameter syntax |
| `401 Unauthorized` | Authentication is missing or invalid |
| `403 Forbidden` | Authenticated caller is not permitted |
| `404 Not Found` | Resource does not exist or is not exposed to the caller |
| `409 Conflict` | Request conflicts with current resource state |
| `412 Precondition Failed` | A request precondition, such as an ETag, did not match |
| `415 Unsupported Media Type` | Request content type is unsupported |
| `422 Unprocessable Content` | Valid syntax but semantically invalid content |
| `429 Too Many Requests` | Rate limit exceeded; include `Retry-After` when known |
| `5xx` | Server or upstream failure; do not misreport it as a client error |

Document retry behavior, especially for `429` and transient `5xx` responses. Use the same status and error shape across endpoints for equivalent failures.
