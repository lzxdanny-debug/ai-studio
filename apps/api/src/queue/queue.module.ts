import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TaskPollingProcessor } from './processors/task-polling.processor';
import { TasksModule } from '../tasks/tasks.module';
import { CreditsModule } from '../credits/credits.module';
import { MountseaModule } from '../mountsea/mountsea.module';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { TASK_POLLING_QUEUE } from './queue.constants';

export { TASK_POLLING_QUEUE };

@Module({
  imports: [
    BullModule.registerQueue({
      name: TASK_POLLING_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
    TasksModule,
    CreditsModule,
    MountseaModule,
    AuthModule,
    StorageModule,
  ],
  providers: [TaskPollingProcessor],
  exports: [BullModule],
})
export class QueueModule {}
