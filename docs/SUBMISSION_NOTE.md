# Submission Note

I implemented the Review Replies feature for provider reviews, including:

- migration for `provider_review_replies`
- reply entity and reply status enum
- create/update reply DTOs
- service logic for create, update, and soft-delete reply
- controller routes for create, update, and delete reply
- provider reviews read integration so `GET /providers/:provider_id/reviews` returns nested reply data
- service-level tests covering the reply flow

For local execution, I made small setup-related adjustments in `src/app.module.ts` and `src/database/data-source.ts`. Those changes were only to make the project run and test correctly in my local environment and are separate from the reply feature implementation itself.

Validation:

- `npm test` passed
- `npm run build` passed
