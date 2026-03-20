import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewReplies1774003573968 implements MigrationInterface {
  name = 'AddReviewReplies1774003573968';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DATABASE_SCHEMA ?? 'reviewdb';
    await queryRunner.query(`SET search_path TO "${schema}", "public"`);

    await queryRunner.query(`
      CREATE TABLE "review_replies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "review_id" uuid NOT NULL,
        "provider_id" uuid NOT NULL,
        "reply_text" text NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "CHK_review_replies_reply_text_length" CHECK (char_length("reply_text") BETWEEN 20 AND 1000),
        CONSTRAINT "UQ_review_replies_review_id" UNIQUE ("review_id"),
        CONSTRAINT "PK_review_replies" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "review_replies"
      ADD CONSTRAINT "FK_review_replies_review"
      FOREIGN KEY ("review_id") REFERENCES "provider_reviews"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    // Add the provider foreign key only when the providers table exists in the schema.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = current_schema()
            AND table_name = 'providers'
        ) THEN
          ALTER TABLE "review_replies"
          ADD CONSTRAINT "FK_review_replies_provider"
          FOREIGN KEY ("provider_id") REFERENCES "providers"("id")
          ON DELETE CASCADE
          ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_review_replies_review_id" ON "review_replies" ("review_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_review_replies_provider_id" ON "review_replies" ("provider_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DATABASE_SCHEMA ?? 'reviewdb';
    await queryRunner.query(`SET search_path TO "${schema}", "public"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_review_replies_provider_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_review_replies_review_id"`);
    await queryRunner.query(`
      ALTER TABLE "review_replies"
      DROP CONSTRAINT IF EXISTS "FK_review_replies_provider"
    `);
    await queryRunner.query(`
      ALTER TABLE "review_replies"
      DROP CONSTRAINT IF EXISTS "FK_review_replies_review"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "review_replies"`);
  }
}
