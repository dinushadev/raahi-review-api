import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingIdToReviews1738700000000 implements MigrationInterface {
  name = 'AddBookingIdToReviews1738700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DATABASE_SCHEMA ?? 'reviewdb';
    await queryRunner.query(`SET search_path TO "${schema}", "public"`);

    await queryRunner.query(`
      ALTER TABLE "provider_reviews"
      ADD COLUMN "booking_id" uuid NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_provider_reviews_booking_id" ON "provider_reviews" ("booking_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "traveler_reviews"
      ADD COLUMN "booking_id" uuid NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_traveler_reviews_booking_id" ON "traveler_reviews" ("booking_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const schema = process.env.DATABASE_SCHEMA ?? 'reviewdb';
    await queryRunner.query(`SET search_path TO "${schema}", "public"`);

    await queryRunner.query(`DROP INDEX "idx_traveler_reviews_booking_id"`);
    await queryRunner.query(`
      ALTER TABLE "traveler_reviews"
      DROP COLUMN "booking_id"
    `);

    await queryRunner.query(`DROP INDEX "idx_provider_reviews_booking_id"`);
    await queryRunner.query(`
      ALTER TABLE "provider_reviews"
      DROP COLUMN "booking_id"
    `);
  }
}
