import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load .env then .env.local so TypeORM CLI (migrations) matches app env precedence
config();
//config({ path: '.env.local', override: true });

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  schema: process.env.DATABASE_SCHEMA ?? 'reviewdb',
  entities: [__dirname + '/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  // ssl: true,
  ssl: process.env.DATABASE_SSL !== 'false',
  // extra: {
  //   ssl: {
  //     rejectUnauthorized: false,
  //   },
  // },
  extra:
  process.env.DATABASE_SSL !== 'false'
    ? {
        ssl: {
          rejectUnauthorized: false,
        },
      }
    : {},
  synchronize: true,
});
