import { Module } from '@nestjs/common';
import { RecoverdataController } from './recoverdata.controller';
import { RecoverdataService } from './recoverdata.service';

@Module({
  controllers: [RecoverdataController],
  providers: [RecoverdataService],
})
export class RecoverdataModule {}
