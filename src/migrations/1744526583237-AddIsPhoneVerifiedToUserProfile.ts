import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsPhoneVerifiedToUserProfile1744526583237
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE user_profiles 
            ADD COLUMN is_phone_verified BOOLEAN DEFAULT FALSE NOT NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE user_profiles 
            DROP COLUMN is_phone_verified
        `);
  }
}
