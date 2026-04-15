import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { UserEntity } from './entities/user.entity';
import { UserCreditEntity } from './entities/user-credit.entity';
import { CreditTransactionEntity } from './entities/credit-transaction.entity';
import { TaskEntity } from './entities/task.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [UserEntity, UserCreditEntity, CreditTransactionEntity, TaskEntity],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
