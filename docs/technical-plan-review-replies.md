# Technical Plan: Provider Review Replies

**Feature:** Allow providers to reply to reviews written about them  

---

## 1. Database Schema Design

### Table: `review_replies`

| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY | `gen_random_uuid()` | |
| `review_id` | `uuid` | NOT NULL, FK → `provider_reviews.id` ON DELETE CASCADE | — | The review being replied to |
| `provider_id` | `uuid` | NOT NULL, FK → `providers.id` ON DELETE CASCADE | — | The provider authoring the reply |
| `reply_text` | `text` | NOT NULL, CHECK (length 20–1000) | — | |
| `is_deleted` | `boolean` | NOT NULL | `false` | Soft delete flag |
| `created_at` | `TIMESTAMP` | NOT NULL | `now()` | Matches TypeORM `@CreateDateColumn` type |
| `updated_at` | `TIMESTAMP` | NOT NULL | `now()` | Auto-updated on every write |

**Constraints:**

```sql
-- One active reply per review (partial unique index — allows re-reply after soft-delete)
CREATE UNIQUE INDEX uq_review_replies_active_review
  ON review_replies (review_id)
  WHERE is_deleted = false;

-- Text length
CONSTRAINT chk_reply_text_length
  CHECK (char_length(reply_text) >= 20 AND char_length(reply_text) <= 1000)

-- Foreign keys (with CASCADE so orphans are never left behind)
CONSTRAINT fk_review_replies_review   FOREIGN KEY (review_id)   REFERENCES provider_reviews(id) ON DELETE CASCADE
CONSTRAINT fk_review_replies_provider FOREIGN KEY (provider_id) REFERENCES providers(id)        ON DELETE CASCADE
```

**Indexes:**

| Index | Type | Columns | Reason |
|---|---|---|---|
| `uq_review_replies_active_review` | Partial unique | `review_id` WHERE `is_deleted = false` | Enforces one active reply per review; allows re-reply after delete |
| `idx_review_replies_review_id` | Regular | `review_id` | Fast lookup for LEFT JOIN in GET reviews query |
| `idx_review_replies_provider_id` | Regular | `provider_id` | Supports future "all replies by provider" queries |

> **Why a partial unique index instead of a plain `UNIQUE (review_id)` constraint?** A plain constraint would permanently block a second reply even after the first is soft-deleted. The partial index (`WHERE is_deleted = false`) enforces uniqueness only among active rows, so a provider can re-reply after deleting their first reply.

---

## 2. API Endpoints

### 2.1 Create Reply

**POST** `/api/reviews/:reviewId/reply`

**Access:** Authenticated provider only (JWT role = `provider`)

**Request Body:**
```json
{
  "reply_text": "Thank you for your kind words! We look forward to hosting you again."
}
```

**Success Response – 201 Created:**
```json
{
  "id": "d1e2f3a4-...",
  "review_id": "a1b2c3d4-...",
  "provider_id": "e5f6a7b8-...",
  "reply_text": "Thank you for your kind words! We look forward to hosting you again.",
  "is_deleted": false,
  "created_at": "2025-06-01T10:00:00Z",
  "updated_at": "2025-06-01T10:00:00Z"
}
```

**Status Codes:**

| Code | Scenario |
|---|---|
| `201 Created` | Reply successfully created |
| `400 Bad Request` | `reply_text` missing, too short (< 20 chars), or too long (> 1000 chars) |
| `401 Unauthorized` | No valid JWT |
| `403 Forbidden` | Authenticated user is not the provider being reviewed |
| `404 Not Found` | `reviewId` does not exist |
| `409 Conflict` | A reply already exists for this review |

**Error Response Format:**
```json
{
  "code": "REPLY_ALREADY_EXISTS",
  "message": "A reply already exists for this review.",
  "details": null
}
```

---

### 2.2 Update Reply

**PUT** `/api/reviews/:reviewId/reply`

**Access:** The provider who authored the reply only

**Request Body:**
```json
{
  "reply_text": "Updated response with more detail about the experience."
}
```

**Success Response – 200 OK:**
```json
{
  "id": "d1e2f3a4-...",
  "review_id": "a1b2c3d4-...",
  "provider_id": "e5f6a7b8-...",
  "reply_text": "Updated response with more detail about the experience.",
  "is_deleted": false,
  "created_at": "2025-06-01T10:00:00Z",
  "updated_at": "2025-06-01T12:30:00Z"
}
```

**Status Codes:**

| Code | Scenario |
|---|---|
| `200 OK` | Reply updated successfully |
| `400 Bad Request` | Validation failure on `reply_text` |
| `401 Unauthorized` | No valid JWT |
| `403 Forbidden` | Requester is not the reply author |
| `404 Not Found` | Review or reply not found |
| `410 Gone` | 48-hour edit window has expired |

---

### 2.3 Delete Reply

**DELETE** `/api/reviews/:reviewId/reply`

**Access:** The provider who authored the reply only

**Success Response – 204 No Content** (empty body)

**Status Codes:**

| Code | Scenario |
|---|---|
| `204 No Content` | Reply soft-deleted successfully |
| `401 Unauthorized` | No valid JWT |
| `403 Forbidden` | Requester is not the reply author |
| `404 Not Found` | Review or reply not found |

---

### 2.4 View Reply (via Existing Get Reviews Endpoint)

No new dedicated endpoint required. The existing `GET /api/providers/:providerId/reviews` response is extended to include an optional `reply` field on each review object.

**Extended Review Object:**
```json
{
  "id": "a1b2c3d4-...",
  "rating": 5,
  "review_text": "Excellent service!",
  "reviewer_name": "Alice",
  "is_verified": true,
  "created_at": "2025-05-20T08:00:00Z",
  "reply": {
    "id": "d1e2f3a4-...",
    "reply_text": "Thank you! We hope to see you again.",
    "created_at": "2025-05-21T09:00:00Z",
    "updated_at": "2025-05-21T09:00:00Z"
  }
}
```

`reply` is `null` when no reply exists or the reply has been soft-deleted.

---

## 3. Business Logic

### 3.1 One Reply Per Review

**DB layer:** A **partial unique index** on `(review_id) WHERE is_deleted = false` is the hard guarantee. A concurrent `INSERT` for the same active `review_id` will throw a `23505` unique-violation, which the service layer catches and converts to a `409 Conflict` response. A plain `UNIQUE (review_id)` constraint was rejected because it would permanently block a new reply even after the first one is soft-deleted.

**Service layer:** Before inserting, query for an existing non-deleted reply (`WHERE review_id = ? AND is_deleted = false`). Return `409` early rather than relying solely on the DB exception — this gives a cleaner, deterministic error code. The DB index remains the final race-condition guard.

### 3.2 Verifying the Provider is the One Being Reviewed

On every write operation (create, update, delete):

1. Load the review by `reviewId`.  
   - If not found → `404`.
2. Check `review.provider_id === req.user.id` (provider from JWT context).  
   - If mismatch → `403 Forbidden`.  

This links the authenticated provider directly to the review entity rather than trusting the client to pass a `provider_id` in the request body.

### 3.3 48-Hour Edit Window

On `PUT /api/reviews/:reviewId/reply`:

1. Load the existing reply.
2. Compute: `const editDeadline = reply.created_at + 48 hours`.
3. If `Date.now() > editDeadline` → return `410 Gone`.

No cron job or background task needed. The check is pure in-memory arithmetic at request time. `created_at` is stored as `timestamptz` (UTC) to avoid timezone bugs.

### 3.4 Soft Delete

`DELETE` sets `is_deleted = true` and updates `updated_at`. The row is never removed from the database.

All queries that read replies filter by `is_deleted = false`. This applies to:

- The GET reviews list — reply is omitted (returns `null`) when `is_deleted = true`
- The 409 duplicate-check on create — a deleted reply does **not** block a new one

Re-replying after a soft-delete is explicitly supported. The partial unique index (`WHERE is_deleted = false`) makes this work at the DB level without any extra service logic.

---

## 4. Integration Points

### 4.1 Changes to `GET /api/providers/:providerId/reviews`

**In `reviews.service.ts`:** The query that fetches provider reviews was rewritten as a raw `QueryBuilder` call with an explicit LEFT JOIN on `review_replies`, filtering `rr.is_deleted = false` in the join condition. This retrieves reviews and their replies in a single round-trip rather than N+1 queries.

```typescript
// In reviews.service.ts — getProviderReviews
const rows = await this.providerReviewRepo
  .createQueryBuilder('r')
  .leftJoin(
    ReviewReply,
    'rr',
    'rr.review_id = r.id AND rr.is_deleted = false',
  )
  .select([
    'r.id', 'r.rating', 'r.review_text', 'r.reviewer_name',
    'r.is_verified', 'r.created_at',
    'rr.id', 'rr.reply_text', 'rr.created_at', 'rr.updated_at',
  ])
  .where('r.provider_id = :providerId', { providerId })
  .andWhere('r.status = :status', { status: ReviewStatus.APPROVED })
  .orderBy(order)
  .offset(offset)
  .limit(limit)
  .getRawMany();
```

`reply` is mapped to `null` in the response when `rr.id` is `null` (no active reply).

**In `provider-review.entity.ts`:** Added a `@OneToOne` back-relation to `ReviewReply` (used for the relation metadata; actual data loading uses the query above):

```typescript
@OneToOne(() => ReviewReply, (reply) => reply.review, { nullable: true, eager: false })
reply: ReviewReply | null;
```

**In `review-reply.entity.ts`:** The entity holds the owning side via `@ManyToOne` with `@JoinColumn({ name: 'review_id' })` and `ON DELETE CASCADE`.

### 4.2 New Files should Created

| File | Purpose |
|---|---|
| `src/database/entities/review-reply.entity.ts` | TypeORM entity for `review_replies` |
| `src/database/migrations/1700000000000-AddReviewReplies.ts` | Creates table, partial unique index, and lookup indexes |
| `src/reviews/dto/create-reply.dto.ts` | Validates `reply_text` (`@IsString`, `@MinLength(20)`, `@MaxLength(1000)`) + Swagger |
| `src/reviews/dto/update-reply.dto.ts` | Same validation shape as create |
| `src/reviews/replies.service.ts` | All business logic: create, update, delete, auth checks, edit window |
| `src/reviews/replies.controller.ts` | Route handlers: `POST/PUT/DELETE reviews/:reviewId/reply`, `@Roles('provider')` |
| `src/reviews/__tests__/replies.service.spec.ts` | 12 unit tests covering all happy paths and error branches |

### 4.3 Existing Files Modified

| File | Change |
|---|---|
| `src/reviews/reviews.module.ts` | Registers `ReviewReply` repo, `RepliesService`, `RepliesController` |
| `src/database/entities/provider-review.entity.ts` | Added `@OneToOne` back-relation to `ReviewReply` |
| `src/reviews/reviews.service.ts` | `getProviderReviews` rewritten with LEFT JOIN to include `reply` per review; `ReviewReply` repo injected; `id` and `reviewer_name` added to review response shape |

