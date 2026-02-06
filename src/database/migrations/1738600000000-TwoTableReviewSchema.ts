import { MigrationInterface, QueryRunner } from 'typeorm';

export class TwoTableReviewSchema1738600000000 implements MigrationInterface {
  name = 'TwoTableReviewSchema1738600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DATABASE_SCHEMA ?? 'reviewdb';
    await queryRunner.query(`SET search_path TO "${schema}", "public"`);

    // Drop old review table and its indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_traveler"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_provider_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "reviews_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "providers"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "providers_service_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "providers_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "travelers"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "travelers_status_enum"`);

    // Create shared status enum and two review tables (no FKs)
    await queryRunner.query(`
      CREATE TYPE "reviews_status_enum" AS ENUM('PENDING', 'APPROVED', 'HIDDEN', 'DELETED')
    `);
    await queryRunner.query(`
      CREATE TABLE "provider_reviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "provider_id" uuid NOT NULL,
        "reviewer_id" uuid NOT NULL,
        "rating" smallint NOT NULL,
        "review_text" text,
        "reviewer_name" character varying(255),
        "status" "reviews_status_enum" NOT NULL DEFAULT 'PENDING',
        "is_verified" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_provider_reviews_rating" CHECK ("rating" >= 1 AND "rating" <= 5),
        CONSTRAINT "UQ_provider_reviews_provider_reviewer" UNIQUE ("provider_id", "reviewer_id"),
        CONSTRAINT "PK_provider_reviews" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_provider_reviews_provider_status" ON "provider_reviews" ("provider_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_provider_reviews_reviewer" ON "provider_reviews" ("reviewer_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_provider_reviews_created_at" ON "provider_reviews" ("created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE TABLE "traveler_reviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "traveler_id" uuid NOT NULL,
        "reviewer_id" uuid NOT NULL,
        "rating" smallint NOT NULL,
        "review_text" text,
        "reviewer_name" character varying(255),
        "status" "reviews_status_enum" NOT NULL DEFAULT 'PENDING',
        "is_verified" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_traveler_reviews_rating" CHECK ("rating" >= 1 AND "rating" <= 5),
        CONSTRAINT "UQ_traveler_reviews_traveler_reviewer" UNIQUE ("traveler_id", "reviewer_id"),
        CONSTRAINT "PK_traveler_reviews" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_traveler_reviews_traveler_status" ON "traveler_reviews" ("traveler_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_traveler_reviews_reviewer" ON "traveler_reviews" ("reviewer_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_traveler_reviews_created_at" ON "traveler_reviews" ("created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DATABASE_SCHEMA ?? 'reviewdb';
    await queryRunner.query(`SET search_path TO "${schema}", "public"`);

    await queryRunner.query(`DROP INDEX "idx_traveler_reviews_created_at"`);
    await queryRunner.query(`DROP INDEX "idx_traveler_reviews_reviewer"`);
    await queryRunner.query(`DROP INDEX "idx_traveler_reviews_traveler_status"`);
    await queryRunner.query(`DROP TABLE "traveler_reviews"`);
    await queryRunner.query(`DROP INDEX "idx_provider_reviews_created_at"`);
    await queryRunner.query(`DROP INDEX "idx_provider_reviews_reviewer"`);
    await queryRunner.query(`DROP INDEX "idx_provider_reviews_provider_status"`);
    await queryRunner.query(`DROP TABLE "provider_reviews"`);
    await queryRunner.query(`DROP TYPE "reviews_status_enum"`);
  }
}
