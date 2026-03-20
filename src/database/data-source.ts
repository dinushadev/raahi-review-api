import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,

  // Use default schema (public is recommended)
  schema: 'public',

  entities: [__dirname + '/entities/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],

  //  FIX: disable SSL for local PostgreSQL
  ssl: false,

  // ⚠️ OK for development only
  synchronize: false,
});