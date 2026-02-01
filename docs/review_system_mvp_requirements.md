# Review System – MVP Requirements Document

## 1. Objective
Build a **trust-first, abuse-resistant review system** that allows travelers to share authentic feedback on service providers (guides, drivers, safari operators) and helps future travelers make confident decisions.

**Primary outcome:** Increase trust → increase contact/booking conversions.

---

## 2. Scope (MVP Only)
This document defines **only** the review system. Listings, booking, and payments are explicitly out of scope unless referenced for validation signals.

---

## 3. Actors & Permissions

### 3.1 Traveler
- Can create **one review per service provider**
- Can edit or delete own review within a limited window (e.g., 24 hours)
- Can flag a review (abuse/spam)

### 3.2 Service Provider
- Can **view** reviews on their profile
- Cannot edit, delete, or hide reviews
- Cannot reply to reviews (MVP constraint)

### 3.3 Admin
- Can approve/hide/delete reviews
- Can suspend reviewer or provider
- Can mark reviews as “verified” (manual)

---

## 4. Review Rules (Non-Negotiable)
These rules exist to prevent fake reviews and reputation gaming.

1. **Authentication required** – only logged-in travelers can post reviews
2. **One review per traveler per provider**
3. **Rating mandatory** (1–5 stars)
4. **Text optional but encouraged** (min 20 chars, max 500 chars if provided)
5. Reviews are **public by default**, pending admin moderation
6. Reviews cannot be anonymous

---

## 5. Review Data Model (Logical)

### Review Entity
- `id`
- `provider_id`
- `traveler_id`
- `rating` (integer: 1–5)
- `review_text` (nullable)
- `status` (PENDING | APPROVED | HIDDEN | DELETED)
- `is_verified` (boolean)
- `created_at`
- `updated_at`

### Derived Fields (Computed)
- `average_rating`
- `total_reviews`

---

## 6. Review Lifecycle

1. Traveler submits review
2. Review status = `PENDING`
3. Admin review:
   - Approve → visible on provider profile
   - Hide/Delete → not visible
4. Approved review contributes to provider rating

---

## 7. User Flows

### 7.1 Create Review
1. Traveler opens provider profile
2. Clicks “Leave a Review”
3. Selects star rating
4. (Optional) Writes short text feedback
5. Submits review
6. Sees confirmation message

### 7.2 View Reviews
- Reviews displayed on provider profile
- Sorted by:
  - Most recent (default)
  - Highest rating

Displayed fields:
- Star rating
- Review text
- Review date
- “Verified” badge (if applicable)

---

## 8. Moderation & Abuse Control (MVP Level)

### Admin Controls
- Hide review (soft delete)
- Permanently delete review
- Suspend traveler account
- Suspend provider account

### Basic Abuse Signals
- Multiple reviews from same traveler in short time
- Repeated low ratings for same provider
- Identical review text across providers

(No automation required in MVP – manual review is acceptable.)

---

## 9. Non-Functional Requirements

- Reviews must load within 500ms
- Review submission must be idempotent
- System must prevent duplicate reviews per traveler/provider
- Data must be auditable (soft deletes preferred)

---

## 10. Out of Scope (Explicitly Excluded)

- Provider replies to reviews
- Review likes or reactions
- Review comments or threads
- AI sentiment analysis
- Public reviewer profiles
- Incentivized reviews
- Third-party review imports

---

## 11. Success Metrics

- ≥60% of providers have at least one review
- ≥1 review per 3 completed bookings
- Review submission drop-off < 30%
- No major fake-review incidents in first 60 days

---

## 12. Future Enhancements (Post-MVP)

- Verified booking-based reviews
- Provider responses
- Review helpfulness voting
- Automated fraud detection
- Review reminders post-booking

---

## 13. API Requirements (MVP)

### 13.1 Authentication Assumptions
- All endpoints require authentication
- User context available as `traveler_id` or `admin_id`
- Role-based checks enforced at API layer

---

### 13.2 Create Review
**POST** `/api/reviews`

**Description:** Create a new review for a service provider.

**Request Body:**
- `provider_id` (string, required)
- `rating` (integer 1–5, required)
- `review_text` (string, optional, 20–500 chars)

**Validation Rules:**
- Traveler must not have an existing review for the provider
- Rating must be between 1 and 5

**Response:**
- `201 Created` → Review submitted (status = PENDING)
- `400 Bad Request` → Validation error
- `409 Conflict` → Duplicate review attempt

---

### 13.3 Update Own Review
**PUT** `/api/reviews/{review_id}`

**Description:** Update an existing review within edit window.

**Constraints:**
- Allowed only within 24 hours of creation
- Only review owner can update

**Request Body:**
- `rating` (integer 1–5)
- `review_text` (string)

**Response:**
- `200 OK`
- `403 Forbidden`
- `410 Gone` (edit window expired)

---

### 13.4 Delete Own Review
**DELETE** `/api/reviews/{review_id}`

**Description:** Soft-delete a review by the owner.

**Response:**
- `204 No Content`
- `403 Forbidden`

---

### 13.5 Get Reviews for Provider
**GET** `/api/providers/{provider_id}/reviews`

**Query Params:**
- `sort` = recent | rating
- `limit` (default 10)
- `offset`

**Response Body:**
- `average_rating`
- `total_reviews`
- `reviews[]`:
  - `rating`
  - `review_text`
  - `is_verified`
  - `created_at`

---

### 13.6 Admin: Moderate Review
**PATCH** `/api/admin/reviews/{review_id}`

**Request Body:**
- `status` = APPROVED | HIDDEN | DELETED
- `is_verified` (boolean, optional)

**Response:**
- `200 OK`
- `403 Forbidden`

---

### 13.7 Admin: List Reviews (Moderation Queue)
**GET** `/api/admin/reviews`

**Query Params:**
- `status` = PENDING | APPROVED | HIDDEN
- `provider_id` (optional)
- `traveler_id` (optional)

**Response:**
- Paginated list of reviews

---

### 13.8 Error Handling (Standardized)

**Error Response Format:**
- `code`
- `message`
- `details` (optional)

---

### 13.9 Idempotency
- Duplicate POST submissions must not create multiple reviews
- Enforced via unique constraint on (traveler_id, provider_id)

---

## 14. Database Schema (PostgreSQL – MVP)

> Design goals: integrity first, abuse resistance, simple queries, zero magic.

---

## 14.1 Tables

### travelers
- `id` (uuid, pk)
- `email` (varchar, unique, not null)
- `name` (varchar)
- `status` (ACTIVE | SUSPENDED)
- `created_at` (timestamp)

---

### providers
- `id` (uuid, pk)
- `name` (varchar, not null)
- `service_type` (GUIDE | DRIVER | SAFARI)
- `location` (varchar)
- `status` (PENDING | APPROVED | SUSPENDED)
- `created_at` (timestamp)

---

### reviews
- `id` (uuid, pk)
- `provider_id` (uuid, fk → providers.id, not null)
- `traveler_id` (uuid, fk → travelers.id, not null)
- `rating` (smallint, not null, check rating between 1 and 5)
- `review_text` (text)
- `status` (PENDING | APPROVED | HIDDEN | DELETED)
- `is_verified` (boolean, default false)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Constraints:**
- UNIQUE (`provider_id`, `traveler_id`)

---

## 14.2 Indexes (Critical)

- `idx_reviews_provider_status` on reviews(provider_id, status)
- `idx_reviews_traveler` on reviews(traveler_id)
- `idx_reviews_created_at` on reviews(created_at desc)

---

## 14.3 Aggregates (No Stored Counters in MVP)

### Provider Rating Calculation

Computed dynamically:
```
SELECT
  AVG(rating) AS average_rating,
  COUNT(*) AS total_reviews
FROM reviews
WHERE provider_id = :provider_id
  AND status = 'APPROVED';
```

> Do NOT denormalize in MVP. Correctness > speed.

---

## 14.4 Soft Delete Strategy

- `DELETED` status instead of physical delete
- Rows never removed in MVP
- Admin actions always auditable

---

## 14.5 State Transition Rules

| From | To | Allowed By |
|----|----|----|
| PENDING | APPROVED | Admin |
| PENDING | HIDDEN | Admin |
| APPROVED | HIDDEN | Admin |
| APPROVED | DELETED | Admin |
| PENDING | DELETED | Traveler (within edit window) |

---

## 14.6 Data Integrity Rules (Enforced)

- Reviews from suspended travelers are ignored in queries
- Reviews for suspended providers are hidden
- Only APPROVED reviews affect rating

---

**End of Document**

