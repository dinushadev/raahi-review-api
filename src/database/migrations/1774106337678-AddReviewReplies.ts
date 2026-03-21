import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReviewReplies1774106337678 implements MigrationInterface {
    name = 'AddReviewReplies1774106337678'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviewdb"."traveler_reviews" DROP CONSTRAINT "CHK_traveler_reviews_rating"`);
        await queryRunner.query(`ALTER TABLE "reviewdb"."provider_reviews" DROP CONSTRAINT "CHK_provider_reviews_rating"`);
        await queryRunner.query(`ALTER TABLE "reviewdb"."traveler_reviews" DROP CONSTRAINT "UQ_traveler_reviews_traveler_reviewer"`);
        await queryRunner.query(`ALTER TABLE "reviewdb"."provider_reviews" DROP CONSTRAINT "UQ_provider_reviews_provider_reviewer"`);
        await queryRunner.query(`CREATE TABLE "reviewdb"."review_replies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "review_id" uuid NOT NULL, "provider_id" uuid NOT NULL, "reply_text" text NOT NULL, "is_deleted" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "CHK_60b84734204dafbe1466f3c91c" CHECK (char_length("reply_text") >= 20 AND char_length("reply_text") <= 1000), CONSTRAINT "PK_ba79cc5b487adc14fc3fe8b484d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_review_replies_provider_id" ON "reviewdb"."review_replies" ("provider_id") `);
        await queryRunner.query(`DROP INDEX "reviewdb"."idx_traveler_reviews_traveler_status"`);
        await queryRunner.query(`ALTER TABLE "reviewdb"."traveler_reviews" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "reviewdb"."reviews_status_enum"`);
        await queryRunner.query(`ALTER TABLE "reviewdb"."traveler_reviews" ADD "status" character varying NOT NULL DEFAULT 'PENDING'`);
        await queryRunner.query(`DROP INDEX "reviewdb"."idx_provider_reviews_provider_status"`);
        await queryRunner.query(`ALTER TABLE "reviewdb"."provider_reviews" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "reviewdb"."reviews_status_enum"`);
        await queryRunner.query(`ALTER TABLE "reviewdb"."provider_reviews" ADD "status" character varying NOT NULL DEFAULT 'PENDING'`);
        await queryRunner.query(`CREATE INDEX "idx_traveler_reviews_traveler_status" ON "reviewdb"."traveler_reviews" ("traveler_id", "status") `);
        await queryRunner.query(`CREATE INDEX "idx_provider_reviews_provider_status" ON "reviewdb"."provider_reviews" ("provider_id", "status") `);
        await queryRunner.query(`ALTER TABLE "reviewdb"."traveler_reviews" ADD CONSTRAINT "UQ_a24cca37cb86d77a9c00d2843bf" UNIQUE ("traveler_id", "reviewer_id")`);
        await queryRunner.query(`ALTER TABLE "reviewdb"."provider_reviews" ADD CONSTRAINT "UQ_419c09b62741a94689d3037bb08" UNIQUE ("provider_id", "reviewer_id")`);
        await queryRunner.query(`ALTER TABLE "reviewdb"."review_replies" ADD CONSTRAINT "FK_4b343f41daa49ce42b5b07d77e3" FOREIGN KEY ("review_id") REFERENCES "reviewdb"."provider_reviews"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviewdb"."review_replies" DROP CONSTRAINT "FK_4b343f41daa49ce42b5b07d77e3"`);
        await queryRunner.query(`ALTER TABLE "reviewdb"."provider_reviews" DROP CONSTRAINT "UQ_419c09b62741a94689d3037bb08"`);
        await queryRunner.query(`ALTER TABLE "reviewdb"."traveler_reviews" DROP CONSTRAINT "UQ_a24cca37cb86d77a9c00d2843bf"`);
        await queryRunner.query(`DROP INDEX "reviewdb"."idx_provider_reviews_provider_status"`);
        await queryRunner.query(`DROP INDEX "reviewdb"."idx_traveler_reviews_traveler_status"`);
        await queryRunner.query(`ALTER TABLE "reviewdb"."provider_reviews" DROP COLUMN "status"`);
        await queryRunner.query(`CREATE TYPE "reviewdb"."reviews_status_enum" AS ENUM('PENDING', 'APPROVED', 'HIDDEN', 'DELETED')`);
        await queryRunner.query(`ALTER TABLE "reviewdb"."provider_reviews" ADD "status" "reviewdb"."reviews_status_enum" NOT NULL DEFAULT 'PENDING'`);
        await queryRunner.query(`CREATE INDEX "idx_provider_reviews_provider_status" ON "reviewdb"."provider_reviews" ("provider_id", "status") `);
        await queryRunner.query(`ALTER TABLE "reviewdb"."traveler_reviews" DROP COLUMN "status"`);
        await queryRunner.query(`CREATE TYPE "reviewdb"."reviews_status_enum" AS ENUM('PENDING', 'APPROVED', 'HIDDEN', 'DELETED')`);
        await queryRunner.query(`ALTER TABLE "reviewdb"."traveler_reviews" ADD "status" "reviewdb"."reviews_status_enum" NOT NULL DEFAULT 'PENDING'`);
        await queryRunner.query(`CREATE INDEX "idx_traveler_reviews_traveler_status" ON "reviewdb"."traveler_reviews" ("status", "traveler_id") `);
        await queryRunner.query(`DROP INDEX "reviewdb"."idx_review_replies_provider_id"`);
        await queryRunner.query(`DROP TABLE "reviewdb"."review_replies"`);
        await queryRunner.query(`ALTER TABLE "reviewdb"."provider_reviews" ADD CONSTRAINT "UQ_provider_reviews_provider_reviewer" UNIQUE ("provider_id", "reviewer_id")`);
        await queryRunner.query(`ALTER TABLE "reviewdb"."traveler_reviews" ADD CONSTRAINT "UQ_traveler_reviews_traveler_reviewer" UNIQUE ("traveler_id", "reviewer_id")`);
        await queryRunner.query(`ALTER TABLE "reviewdb"."provider_reviews" ADD CONSTRAINT "CHK_provider_reviews_rating" CHECK (((rating >= 1) AND (rating <= 5)))`);
        await queryRunner.query(`ALTER TABLE "reviewdb"."traveler_reviews" ADD CONSTRAINT "CHK_traveler_reviews_rating" CHECK (((rating >= 1) AND (rating <= 5)))`);
    }

}
