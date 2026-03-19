# Review Replies API – Technical Plan

## 1. Database Schema Design

### Table: review_replies

This table stores provider replies to reviews. Each review can have at most one reply.

### Columns

| Column       | Type        | Constraints                                      | Description |
|-------------|------------|--------------------------------------------------|------------|
| id          | uuid       | PRIMARY KEY, DEFAULT uuid_generate_v4()          | Unique identifier for reply |
| review_id   | uuid       | NOT NULL, UNIQUE, FOREIGN KEY                    | Reference to provider_review |
| provider_id | uuid       | NOT NULL, FOREIGN KEY                            | Provider who authored reply |
| reply_text  | text       | NOT NULL                                         | Reply content (20–1000 chars) |
| created_at  | timestamp  | NOT NULL, DEFAULT now()                          | Creation timestamp |
| updated_at  | timestamp  | NOT NULL, DEFAULT now()                          | Last update timestamp |
| deleted_at  | timestamp  | NULLABLE                                         | Soft delete flag |

---

### Constraints

- PRIMARY KEY (id)
- UNIQUE (review_id)  
  → Ensures only one reply per review

- FOREIGN KEY (review_id) REFERENCES provider_reviews(id) ON DELETE CASCADE  
- FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE  

- CHECK (char_length(reply_text) BETWEEN 20 AND 1000)

---

### Indexes

- INDEX idx_review_replies_review_id ON review_replies(review_id)  
  → Fast lookup when fetching replies with reviews

- INDEX idx_review_replies_provider_id ON review_replies(provider_id)  
  → Efficient ownership validation

---

## 2. API Endpoints

---

### 2.1 Create Reply

**POST** `/api/reviews/:review_id/reply`

**Description:**  
Allows a provider to reply to a review written about them.

**Access Control:**  
- Only users with role `provider`

---

#### Request Body

```json
{
  "reply_text": "Thank you for your valuable feedback!"
}
Success Response (201 Created)
{
  "id": "uuid",
  "review_id": "uuid",
  "provider_id": "uuid",
  "reply_text": "Thank you for your valuable feedback!",
  "created_at": "2026-03-19T10:00:00Z",
  "updated_at": "2026-03-19T10:00:00Z"
}
Error Responses
Status	Description
400	Validation error (text length invalid)
403	User is not the provider of the review
404	Review not found
409	Reply already exists for this review
2.2 Update Reply

PUT /api/replies/:reply_id

Description:
Allows a provider to edit their reply within 48 hours.

Access Control:

Only reply author (provider)

Request Body
{
  "reply_text": "Updated reply content"
}
Success Response (200 OK)
{
  "message": "Reply updated successfully"
}
Error Responses
Status	Description
400	Validation error
403	Not the owner of the reply
404	Reply not found
410	Edit window expired (more than 48 hours)
2.3 Delete Reply

DELETE /api/replies/:reply_id

Description:
Allows a provider to soft delete their reply.

Access Control:

Only reply author

Success Response (204 No Content)

No response body

Error Responses
Status	Description
403	Not the owner
404	Reply not found
3. Business Logic
3.1 Enforcing One Reply Per Review

Database-level enforcement using:

UNIQUE constraint on review_id

Application-level validation:

Check if a reply already exists before creating a new one

If exists → throw ConflictException

3.2 Verifying Provider Ownership

Fetch the review using review_id

Compare:

review.provider_id with authenticated user.id

If mismatch:

Throw ForbiddenException

3.3 48-Hour Edit Window

When updating:

Calculate time difference between now() and created_at

If greater than 48 hours:

Throw GoneException

3.4 Soft Delete Implementation

Do NOT delete records physically

Instead:

Set deleted_at = current timestamp

Queries must always filter:

deleted_at IS NULL

4. Integration Points
4.1 Include Replies in Get Reviews Endpoint

Endpoint:
GET /api/providers/:provider_id/reviews

Implementation Changes

Modify reviews.service.ts

Use LEFT JOIN with review_replies

Only include replies where:

deleted_at IS NULL

Example Response
{
  "reviews": [
    {
      "id": "review_id",
      "rating": 5,
      "review_text": "Excellent service!",
      "created_at": "2026-03-18T10:00:00Z",
      "reply": {
        "reply_text": "Thank you for your support!",
        "created_at": "2026-03-19T10:00:00Z",
        "updated_at": "2026-03-19T10:00:00Z"
      }
    }
  ]
}
4.2 Required Code Changes

Add new entity:

review-reply.entity.ts

Create new module:

replies/

replies.controller.ts

replies.service.ts

dto/

Modify:

reviews.service.ts → include replies in queries

5. Edge Cases Considered

Duplicate reply attempts → prevented via UNIQUE constraint

Provider replying to someone else's review → forbidden

Editing after 48 hours → blocked

Deleted replies → excluded from API responses

Non-existent review/reply → handled with 404

6. Design Decisions

Replies only supported for provider_reviews (not traveler_reviews)

Soft delete used for auditability

No separate moderation for replies (MVP scope)

Data integrity prioritized using DB constraints + service validation