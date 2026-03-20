import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReviewReplies1774003573968 implements MigrationInterface {
    name = 'AddReviewReplies1774003573968'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "review_replies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "review_id" uuid NOT NULL, "provider_id" uuid NOT NULL, "reply_text" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "UQ_4b343f41daa49ce42b5b07d77e3" UNIQUE ("review_id"), CONSTRAINT "PK_ba79cc5b487adc14fc3fe8b484d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "review_replies" ADD CONSTRAINT "FK_4b343f41daa49ce42b5b07d77e3" FOREIGN KEY ("review_id") REFERENCES "provider_reviews"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "review_replies" DROP CONSTRAINT "FK_4b343f41daa49ce42b5b07d77e3"`);
        await queryRunner.query(`DROP TABLE "review_replies"`);
    }

}
