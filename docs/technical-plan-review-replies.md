# Technical Plan: Review Replies API

## 1. Database Schema Design

### Proposed Table
`provider_review_replies`

### Why a Separate Table
I will create a dedicated `provider_review_replies` table instead of adding reply columns directly to `provider_reviews`.

A reply is a separate resource with its own lifecycle, timestamps, and ownership rules. Keeping it in a separate table also matches the existing schema style.

### Schema Summary

| Column | Type | Constraints | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | `PRIMARY KEY`, `NOT NULL` | `uuid_generate_v4()` | Unique identifier for the reply record |
| `review_id` | `uuid` | `NOT NULL`, `UNIQUE`, `FOREIGN KEY` | None | References `provider_reviews(id)` with `ON DELETE CASCADE` |
| `provider_id` | `uuid` | `NOT NULL` | None | Stores the provider who authored the reply |
| `reply_text` | `text` | `NOT NULL` | None | Stores the provider's reply content |
| `status` | `review_replies_status_enum` | `NOT NULL` | `ACTIVE` | Supports soft delete |
| `created_at` | `timestamp` | `NOT NULL` | `now()` | Tracks reply creation time |
| `updated_at` | `timestamp` | `NOT NULL` | `now()` | Tracks last modification time |

### Key Design Decisions

#### Reply text validation in the DTO layer
The required 20-1000 character rule will be enforced at the DTO validation layer rather than with a database `CHECK`. That matches the current project pattern, where request validation is handled with class-validator in DTOs. The database will enforce only that the field is present.

#### Soft delete via `status`
I will use a reply status enum with values `ACTIVE` and `DELETED`. This follows the same overall soft-delete style already used in the reviews service, where reviews are marked `DELETED` rather than physically removed.

### Constraints

| Constraint Type | Definition | Why |
| --- | --- | --- |
| Primary key | `PRIMARY KEY (id)` | Gives each reply its own stable identity |
| Unique | `UNIQUE (review_id)` | Ensures each review can have at most one reply record in its lifetime |
| Foreign key | `FOREIGN KEY (review_id) REFERENCES provider_reviews(id) ON DELETE CASCADE` | Prevents replies from existing without a valid provider review |
| Not null | `id`, `review_id`, `provider_id`, `reply_text`, `status`, `created_at`, `updated_at` | Ensures required reply data is always present |
| Check | None planned for reply length | Length validation will be handled in DTO validation |

### Indexes Needed and Why

| Index | Type | Why |
| --- | --- | --- |
| `review_id` | Unique constraint-backed index | Enforces the "only one reply per review" rule and supports quick lookup when creating, updating, deleting, or joining replies by review |
| `provider_id` | Standard index | Supports ownership checks efficiently and helps if replies later need to be queried by provider |
| `status` | Standard index | Useful when fetching reviews with replies and excluding soft-deleted replies |

`review_id` will use a `UNIQUE` constraint only, not a separate standalone unique index. In PostgreSQL, the unique constraint already creates the supporting unique index internally, so adding another unique index on the same column would be redundant.

### Final Integrity Rules Guaranteed by the Schema
With this schema, the database guarantees that:

- a reply cannot exist without a valid provider review
- each review can have at most one reply record
- each reply is explicitly linked to both a review and a provider ID
- deleted replies remain stored but are no longer treated as active

## 2. API Endpoints

The reply API will follow the existing review API structure: reply write operations will be attached to a specific review, and replies will be returned through the existing provider reviews read endpoint. 

### 2.1 Create Reply

#### HTTP Method and Path
`POST /reviews/:review_id/reply`

#### Purpose
Create a provider reply for a specific provider review.

#### Who Can Access
Authenticated users with role `provider` only.  
The service must also verify that the logged-in provider is the provider being reviewed.

#### Request Body

```json
{
  "reply_text": "Thank you for your feedback. We appreciate your comments and will continue improving our service."
}
```

#### Response Body

```json
{
  "id": "b4c3d9f8-7a58-4d86-8be3-89cb7e6d0d9a",
  "review_id": "8b4d7b5e-1111-4444-9999-123456789abc",
  "provider_id": "11111111-1111-1111-1111-111111111111",
  "reply_text": "Thank you for your feedback. We appreciate your comments and will continue improving our service.",
  "status": "ACTIVE",
  "created_at": "2026-03-17T10:30:00.000Z",
  "updated_at": "2026-03-17T10:30:00.000Z"
}
```

#### HTTP Status Codes

- `201 Created` - reply created successfully
- `400 Bad Request` - invalid input or invalid `review_id`
- `401 Unauthorized` - user not authenticated
- `403 Forbidden` - user is not a provider or is not the reviewed provider
- `404 Not Found` - review does not exist
- `409 Conflict` - review already has a reply
- `500 Internal Server Error` - unexpected server error

#### Error Response Format

```json
{
  "statusCode": 409,
  "message": "This review already has a reply",
  "error": "Conflict"
}
```

### 2.2 Update Reply

#### HTTP Method and Path
`PATCH /reviews/:review_id/reply`

#### Purpose
Update the existing reply for a specific review.

#### Who Can Access
Authenticated users with role `provider` only.  
The service must verify that the logged-in provider is the reply author and that the 48-hour edit window has not expired.

#### Request Body

```json
{
  "reply_text": "Thank you for your feedback. We appreciate your comments and will work on improving the pickup timing."
}
```

#### Response Body

```json
{
  "id": "b4c3d9f8-7a58-4d86-8be3-89cb7e6d0d9a",
  "review_id": "8b4d7b5e-1111-4444-9999-123456789abc",
  "provider_id": "11111111-1111-1111-1111-111111111111",
  "reply_text": "Thank you for your feedback. We appreciate your comments and will work on improving the pickup timing.",
  "status": "ACTIVE",
  "created_at": "2026-03-17T10:30:00.000Z",
  "updated_at": "2026-03-17T14:10:00.000Z"
}
```

#### HTTP Status Codes

- `200 OK` - reply updated successfully
- `400 Bad Request` - invalid input or invalid `review_id`
- `401 Unauthorized` - user not authenticated
- `403 Forbidden` - user is not the reply author
- `404 Not Found` - review or reply does not exist
- `410 Gone` - 48-hour edit window has expired
- `500 Internal Server Error` - unexpected server error

#### Error Response Format

```json
{
  "statusCode": 410,
  "message": "Edit window has expired",
  "error": "Gone"
}
```

### 2.3 Delete Reply

#### HTTP Method and Path
`DELETE /reviews/:review_id/reply`

#### Purpose
Soft-delete the reply for a specific review.

#### Who Can Access
Authenticated users with role `provider` only.  
The service must verify that the logged-in provider is the reply author.

#### Request Body
No request body.

#### Response Body
No response body.

#### HTTP Status Codes

- `204 No Content` - reply deleted successfully
- `401 Unauthorized` - user not authenticated
- `403 Forbidden` - user is not the reply author
- `404 Not Found` - review or reply does not exist
- `500 Internal Server Error` - unexpected server error

#### Error Response Format

```json
{
  "statusCode": 404,
  "message": "Reply not found",
  "error": "Not Found"
}
```

### 2.4 View Replies Through Existing Reviews Endpoint

#### HTTP Method and Path
`GET /providers/:provider_id/reviews`

#### Purpose
Fetch provider reviews and include each non-deleted reply inside the corresponding review object.

#### Who Can Access
Any authenticated user. The endpoint is protected by the controller-level AuthGuard, but it is not further restricted by RolesGuard.

#### Request Body
No request body.

#### Response Body

```json
{
  "average_rating": 4.8,
  "total_reviews": 2,
  "reviews": [
    {
      "id": "8b4d7b5e-1111-4444-9999-123456789abc",
      "rating": 5,
      "review_text": "Great service and very professional.",
      "reviewer_name": "Alice",
      "is_verified": true,
      "created_at": "2026-03-17T08:00:00.000Z",
      "reply": {
        "reply_text": "Thank you for your feedback. We appreciate your comments and will continue improving our service.",
        "created_at": "2026-03-17T10:30:00.000Z",
        "updated_at": "2026-03-17T14:10:00.000Z"
      }
    },
    {
      "id": "9c6d1e2f-2222-5555-aaaa-abcdef123456",
      "rating": 4,
      "review_text": "Good trip overall.",
      "reviewer_name": "Bob",
      "is_verified": false,
      "created_at": "2026-03-10T09:00:00.000Z",
      "reply": null
    }
  ]
}
```

#### HTTP Status Codes

- `200 OK` - reviews fetched successfully
- `400 Bad Request` - invalid query parameters
- `500 Internal Server Error` - unexpected server error

#### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed for query parameters",
  "error": "Bad Request"
}
```

### Standard Error Response Shape

All reply endpoints will use the standard NestJS exception response format already used by the existing application:

```json
{
  "statusCode": 403,
  "message": "You can only reply to reviews about yourself",
  "error": "Forbidden"
}
```

## 3. Business Logic

### 3.1 Ensuring Only One Reply Per Review

The system will enforce the one-reply-per-review rule at both the database layer and the service layer.

At the database layer, `provider_review_replies.review_id` will have a `UNIQUE` constraint. This guarantees that only one reply record can exist for a given review.

At the service layer, before creating a reply, the service will first check whether a reply already exists for the given `review_id`. If a reply is found, the request will be rejected with a `409 Conflict` error instead of relying only on the database constraint.

This design follows the strict interpretation of the requirement: a review can have only one reply record in its lifetime, even if that reply is later soft-deleted.

### 3.2 Verifying the Provider Is the One Being Reviewed

The controller will restrict reply endpoints to users with the `provider` role, but role checking alone is not enough. The service must also verify ownership.

To do this, the service will load the target record from `provider_reviews` using `review_id` and compare:

- the authenticated user's id
- the `provider_id` stored on that review

A reply will only be allowed if both values match. This ensures that only the provider who was actually reviewed can create, update, or delete the reply.

### 3.3 Implementing the 48-Hour Edit Window

The 48-hour edit window will be enforced in the service layer.

When a provider attempts to update a reply, the service will:

- load the existing reply
- verify that the authenticated provider is the reply author
- calculate whether the current time is within 48 hours of `created_at`

If more than 48 hours have passed since the reply was created, the update request will be rejected with `410 Gone`.

The edit window will be based on `created_at`, not `updated_at`, so editing a reply does not reset or extend the allowed edit period.

### 3.4 Soft Delete Behavior

Reply deletion will be implemented as a soft delete.

Instead of removing the row from the database, the service will update the reply `status` from `ACTIVE` to `DELETED`. The record will remain stored for history and audit purposes, but it will no longer be treated as an active reply.

When reviews are fetched, only replies with status `ACTIVE` will be included in the response. Replies marked `DELETED` will be hidden from normal read operations.

Because the design uses a strict `UNIQUE(review_id)` rule, soft-deleting a reply does not allow the provider to create a new reply for the same review later.

## 4. Integration Points

### 4.1 How Replies Will Be Included in the Existing GET Reviews Endpoint

Replies will be included in the existing provider reviews read endpoint:

`GET /providers/:provider_id/reviews`

The route itself will not change. Instead, the response returned by this endpoint will be extended so that each review item includes a nested `reply` object.

If a review has an active reply, the response will include:

- `reply_text`
- `created_at`
- `updated_at`

If a review does not have a reply, or if the reply has been soft-deleted, the response will return:

```json
"reply": null
```

#### Example Response Shape

```json
{
  "average_rating": 4.8,
  "total_reviews": 2,
  "reviews": [
    {
      "id": "review-1",
      "rating": 5,
      "review_text": "Great service",
      "reviewer_name": "Alice",
      "is_verified": true,
      "created_at": "2026-03-17T08:00:00.000Z",
      "reply": {
        "reply_text": "Thank you for your feedback.",
        "created_at": "2026-03-17T10:30:00.000Z",
        "updated_at": "2026-03-17T11:00:00.000Z"
      }
    },
    {
      "id": "review-2",
      "rating": 4,
      "review_text": "Good trip overall.",
      "reviewer_name": "Bob",
      "is_verified": false,
      "created_at": "2026-03-10T09:00:00.000Z",
      "reply": null
    }
  ]
}
```

This keeps the existing endpoint unchanged while enriching each returned review with reply data.

### 4.2 What Changes Are Needed to Existing Code

To support this feature, the following changes are required:

#### Database

Add a new migration to create the `provider_review_replies` table with its constraints, defaults, and indexes.

#### Entity

Add a new TypeORM entity for `provider_review_replies`.

#### DTOs

Add new DTOs for:

- create reply
- update reply

These DTOs will validate that `reply_text` is required and must be between 20 and 1000 characters.

#### Service

Extend the service with reply-specific methods for:

- create reply
- update reply
- delete reply

Also update `getProviderReviews()` so it includes active reply data in the returned review list.

#### Controller

Add new reply endpoints to the reviews controller:

- `POST /reviews/:review_id/reply`
- `PATCH /reviews/:review_id/reply`
- `DELETE /reviews/:review_id/reply`

The existing read endpoint will remain:

- `GET /providers/:provider_id/reviews`

Only its response body will be extended to include replies.

### 4.3 Summary

This feature will be integrated into the existing reviews module rather than implemented as a separate standalone module.

The integration approach is:

- add new reply write endpoints
- keep the existing provider reviews read endpoint
- include reply data inside the existing review response
- reuse the current authentication, role-checking, validation, and service patterns already used by the reviews feature

This keeps the design consistent with the current codebase and avoids unnecessary duplication.

