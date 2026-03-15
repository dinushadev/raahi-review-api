# Assessment 1: Review Replies API

**Difficulty:** High  
**Estimated Time:** 5-7 hours  
**Priority:** High

---

## AI Tools Policy

You **may use AI tools** (GitHub Copilot, ChatGPT, Claude, etc.) for code assistance. However, you **must understand what has been written** and be prepared to explain and modify the code as needed. You will be asked questions about your implementation.

---

## Overview

Build an API that allows **providers** to respond to reviews written about them. Each review can have at most **one reply** from the provider being reviewed.

---

## Context

You are working on a Review System API built with:
- **Framework:** NestJS
- **Database:** PostgreSQL with TypeORM
- **Auth:** JWT-based with user context via middleware

### Existing Structure
```
src/
├── reviews/
│   ├── reviews.controller.ts
│   ├── reviews.service.ts
│   └── dto/
├── database/
│   ├── entities/
│   │   ├── provider-review.entity.ts
│   │   └── traveler-review.entity.ts
│   └── migrations/
└── common/
    ├── guards/
    └── decorators/
```

### Key Entities
- `ProviderReview` - Reviews about providers (written by travelers)
- `TravelerReview` - Reviews about travelers (written by providers)

---

## Requirements

### Functional Requirements

1. **Create Reply**
   - Provider can reply to a review about themselves
   - Only ONE reply allowed per review
   - Reply text is required (20-1000 characters)
   - Only the provider being reviewed can reply

2. **Update Reply**
   - Provider can edit their reply within 48 hours of creation
   - Only the reply author can update

3. **Delete Reply**
   - Provider can delete their own reply
   - Soft delete (mark as deleted, don't remove from DB)

4. **View Replies**
   - Replies should be included when fetching reviews
   - Only show non-deleted replies
   - Include reply metadata (created_at, updated_at)

### Non-Functional Requirements
- Replies must be linked to both the review and the provider
- Maintain data integrity with foreign keys
- Follow existing code patterns and conventions

---

## Part 1: Technical Plan (Submit Before Coding)

Before writing any code, you must create a **Technical Plan** document. Submit this for review before proceeding to implementation.

### Create file: `docs/technical-plan-review-replies.md`

Your technical plan **must include**:

### 1. Database Schema Design
- Table name and all columns
- Data types for each column
- Constraints (PRIMARY KEY, NOT NULL, UNIQUE, CHECK, FOREIGN KEY)
- Default values
- Indexes needed and why

### 2. API Endpoints
For each endpoint, document:
- HTTP method and path
- Purpose/description
- Who can access (roles/permissions)
- Request body (JSON example)
- Response body (JSON example with all fields)
- All possible HTTP status codes and when they occur
- Error response format

### 3. Business Logic
- How will you ensure only ONE reply per review?
- How will you verify the provider is the one being reviewed?
- How will you implement the 48-hour edit window?
- How will soft delete work?

### 4. Integration Points
- How will replies be included in the existing GET reviews endpoint?
- What changes are needed to existing code?

---

## Part 2: Implementation

After your technical plan is approved, implement the solution.

### Acceptance Criteria

#### Must Have
- [ ] Migration creates table with proper constraints
- [ ] Entity class with TypeORM decorators
- [ ] DTO with validation (class-validator)
- [ ] Service with business logic
- [ ] Controller with proper route handlers
- [ ] Only providers can reply to reviews about themselves
- [ ] One reply per review enforced (DB unique + application check)
- [ ] 48-hour edit window enforced
- [ ] Soft delete implemented
- [ ] Replies included in GET /providers/:id/reviews response

#### Should Have
- [ ] Unit tests for service methods
- [ ] Swagger/OpenAPI documentation
- [ ] Proper error messages

#### Nice to Have
- [ ] E2E tests
- [ ] Admin endpoint to moderate replies

---

## Getting Started

1. **Study the existing code first:**
   - `src/database/entities/provider-review.entity.ts` - entity patterns
   - `src/reviews/dto/create-review.dto.ts` - DTO validation patterns
   - `src/reviews/reviews.service.ts` - service patterns, edit window logic
   - `src/reviews/reviews.controller.ts` - controller patterns

2. **Create your technical plan** in `docs/technical-plan-review-replies.md`

3. **Submit for review** before coding

4. **After approval, implement:**
   ```bash
   npm run migration:generate -- src/database/migrations/AddReviewReplies
   ```

---

## Hints

1. Look at how `review_type` is used elsewhere - reviews can be about providers OR travelers

2. For the 48-hour edit window, see the existing pattern in `reviews.service.ts`

3. Consider: should replies work for both provider_reviews AND traveler_reviews tables?

4. Use the `@Roles('provider')` decorator to restrict endpoints

---

## Submission Checklist

### Part 1: Technical Plan
- [ ] Database schema documented with all columns and constraints
- [ ] All API endpoints documented with request/response examples
- [ ] Business logic decisions explained
- [ ] Edge cases identified and addressed
- [ ] Plan submitted for review

### Part 2: Implementation
- [ ] Code compiles without errors (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] Tests pass (`npm run test`)
- [ ] Migration runs successfully
- [ ] API tested manually with sample requests
- [ ] Code follows existing project conventions
