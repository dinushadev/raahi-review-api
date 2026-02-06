import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewerNameToReviews1738500000000 implements MigrationInterface {
  name = 'AddReviewerNameToReviews1738500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reviews"
      ADD COLUMN "reviewer_name" character varying(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reviews"
      DROP COLUMN "reviewer_name"
    `);
  }
}
