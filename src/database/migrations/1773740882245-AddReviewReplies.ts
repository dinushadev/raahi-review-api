import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReviewReplies1773740882245 implements MigrationInterface {
    name = 'AddReviewReplies1773740882245'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "traveler_reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "traveler_id" uuid NOT NULL, "reviewer_id" uuid NOT NULL, "booking_id" uuid, "rating" smallint NOT NULL, "review_text" text, "reviewer_name" character varying(255), "status" character varying NOT NULL DEFAULT 'PENDING', "is_verified" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_a24cca37cb86d77a9c00d2843bf" UNIQUE ("traveler_id", "reviewer_id"), CONSTRAINT "PK_3c2cf6b45e1bfe37293ec0c152e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_traveler_reviews_booking_id" ON "traveler_reviews" ("booking_id") `);
        await queryRunner.query(`CREATE INDEX "idx_traveler_reviews_created_at" ON "traveler_reviews" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "idx_traveler_reviews_reviewer" ON "traveler_reviews" ("reviewer_id") `);
        await queryRunner.query(`CREATE INDEX "idx_traveler_reviews_traveler_status" ON "traveler_reviews" ("traveler_id", "status") `);
        await queryRunner.query(`CREATE TABLE "provider_reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "provider_id" uuid NOT NULL, "reviewer_id" uuid NOT NULL, "booking_id" uuid, "rating" smallint NOT NULL, "review_text" text, "reviewer_name" character varying(255), "status" character varying NOT NULL DEFAULT 'PENDING', "is_verified" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_419c09b62741a94689d3037bb08" UNIQUE ("provider_id", "reviewer_id"), CONSTRAINT "PK_d61b668c24910d63eb0ccffc90d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_provider_reviews_booking_id" ON "provider_reviews" ("booking_id") `);
        await queryRunner.query(`CREATE INDEX "idx_provider_reviews_created_at" ON "provider_reviews" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "idx_provider_reviews_reviewer" ON "provider_reviews" ("reviewer_id") `);
        await queryRunner.query(`CREATE INDEX "idx_provider_reviews_provider_status" ON "provider_reviews" ("provider_id", "status") `);
        await queryRunner.query(`CREATE TABLE "review_replies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "review_id" uuid NOT NULL, "provider_id" uuid NOT NULL, "reply_text" text NOT NULL, "is_deleted" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ba79cc5b487adc14fc3fe8b484d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_review_replies_provider_id" ON "review_replies" ("provider_id") `);
        await queryRunner.query(`CREATE INDEX "idx_review_replies_review_id" ON "review_replies" ("review_id") `);
        await queryRunner.query(`ALTER TABLE "review_replies" ADD CONSTRAINT "FK_4b343f41daa49ce42b5b07d77e3" FOREIGN KEY ("review_id") REFERENCES "provider_reviews"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "review_replies" DROP CONSTRAINT "FK_4b343f41daa49ce42b5b07d77e3"`);
        await queryRunner.query(`DROP INDEX "public"."idx_review_replies_review_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_review_replies_provider_id"`);
        await queryRunner.query(`DROP TABLE "review_replies"`);
        await queryRunner.query(`DROP INDEX "public"."idx_provider_reviews_provider_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_provider_reviews_reviewer"`);
        await queryRunner.query(`DROP INDEX "public"."idx_provider_reviews_created_at"`);
        await queryRunner.query(`DROP INDEX "public"."idx_provider_reviews_booking_id"`);
        await queryRunner.query(`DROP TABLE "provider_reviews"`);
        await queryRunner.query(`DROP INDEX "public"."idx_traveler_reviews_traveler_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_traveler_reviews_reviewer"`);
        await queryRunner.query(`DROP INDEX "public"."idx_traveler_reviews_created_at"`);
        await queryRunner.query(`DROP INDEX "public"."idx_traveler_reviews_booking_id"`);
        await queryRunner.query(`DROP TABLE "traveler_reviews"`);
    }

}
