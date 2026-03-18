import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load .env then .env.local so TypeORM CLI (migrations) matches app env precedence
config();
//config({ path: '.env.local', override: true });

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: 'postgresql://postgres:1234@127.0.0.1:5432/review_db',
  schema: process.env.DATABASE_SCHEMA ?? 'reviewdb',
  entities: [__dirname + '/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  ssl: false,
  synchronize: false,

});