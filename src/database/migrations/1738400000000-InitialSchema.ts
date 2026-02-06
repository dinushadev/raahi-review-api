import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1738400000000 implements MigrationInterface {
  name = 'InitialSchema1738400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DATABASE_SCHEMA ?? 'reviewdb';
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA "${schema}"`);
    await queryRunner.query(`SET search_path TO "${schema}", "public"`);
    await queryRunner.query(`
      CREATE TYPE "travelers_status_enum" AS ENUM('ACTIVE', 'SUSPENDED')
    `);
    await queryRunner.query(`
      CREATE TABLE "travelers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "name" character varying,
        "status" "travelers_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_travelers_email" UNIQUE ("email"),
        CONSTRAINT "PK_travelers" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "providers_status_enum" AS ENUM('PENDING', 'APPROVED', 'SUSPENDED')
    `);
    await queryRunner.query(`
      CREATE TYPE "providers_service_type_enum" AS ENUM('GUIDE', 'DRIVER', 'SAFARI')
    `);
    await queryRunner.query(`
      CREATE TABLE "providers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "service_type" "providers_service_type_enum" NOT NULL,
        "location" character varying,
        "status" "providers_status_enum" NOT NULL DEFAULT 'PENDING',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_providers" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "reviews_status_enum" AS ENUM('PENDING', 'APPROVED', 'HIDDEN', 'DELETED')
    `);
    await queryRunner.query(`
      CREATE TABLE "reviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "provider_id" uuid NOT NULL,
        "traveler_id" uuid NOT NULL,
        "rating" smallint NOT NULL,
        "review_text" text,
        "status" "reviews_status_enum" NOT NULL DEFAULT 'PENDING',
        "is_verified" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_reviews_rating" CHECK ("rating" >= 1 AND "rating" <= 5),
        CONSTRAINT "UQ_reviews_provider_traveler" UNIQUE ("provider_id", "traveler_id"),
        CONSTRAINT "PK_reviews" PRIMARY KEY ("id"),
        CONSTRAINT "FK_reviews_provider" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_reviews_traveler" FOREIGN KEY ("traveler_id") REFERENCES "travelers"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_reviews_provider_status" ON "reviews" ("provider_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_reviews_traveler" ON "reviews" ("traveler_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_reviews_created_at" ON "reviews" ("created_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_reviews_created_at"`);
    await queryRunner.query(`DROP INDEX "idx_reviews_traveler"`);
    await queryRunner.query(`DROP INDEX "idx_reviews_provider_status"`);
    await queryRunner.query(`DROP TABLE "reviews"`);
    await queryRunner.query(`DROP TYPE "reviews_status_enum"`);
    await queryRunner.query(`DROP TABLE "providers"`);
    await queryRunner.query(`DROP TYPE "providers_service_type_enum"`);
    await queryRunner.query(`DROP TYPE "providers_status_enum"`);
    await queryRunner.query(`DROP TABLE "travelers"`);
    await queryRunner.query(`DROP TYPE "travelers_status_enum"`);
  }
}
