import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProviderReviewReplies1738800000000 implements MigrationInterface {
  name = 'AddProviderReviewReplies1738800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DATABASE_SCHEMA ?? 'reviewdb';
    await queryRunner.query(`SET search_path TO "${schema}", "public"`);

    await queryRunner.query(`
      CREATE TYPE "provider_review_replies_status_enum" AS ENUM('ACTIVE', 'DELETED')
    `);
    await queryRunner.query(`
      CREATE TABLE "provider_review_replies" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "review_id" uuid NOT NULL,
        "provider_id" uuid NOT NULL,
        "reply_text" text NOT NULL,
        "status" "provider_review_replies_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_provider_review_replies" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_provider_review_replies_review_id" UNIQUE ("review_id"),
        CONSTRAINT "FK_provider_review_replies_review_id" FOREIGN KEY ("review_id") REFERENCES "provider_reviews"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_provider_review_replies_provider_id" ON "provider_review_replies" ("provider_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_provider_review_replies_status" ON "provider_review_replies" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DATABASE_SCHEMA ?? 'reviewdb';
    await queryRunner.query(`SET search_path TO "${schema}", "public"`);

    await queryRunner.query(`DROP INDEX "idx_provider_review_replies_status"`);
    await queryRunner.query(`DROP INDEX "idx_provider_review_replies_provider_id"`);
    await queryRunner.query(`DROP TABLE "provider_review_replies"`);
    await queryRunner.query(`DROP TYPE "provider_review_replies_status_enum"`);
  }
}
