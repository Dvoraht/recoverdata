import { Controller, Get, Res, Query } from '@nestjs/common';
import { RecoverdataService } from './recoverdata.service';
import { Response } from 'express';

@Controller('recoverdata')
export class RecoverdataController {
  constructor(private readonly recoverdataService: RecoverdataService) {}

  @Get('download')
  async downloadCsv(@Res() res: Response, @Query('country') country: string, @Query('startDate') startDate: string, @Query('endDate') endDate: string): Promise<void> {
    try {
      const csvBuffer = await this.recoverdataService.generateCsv(country, startDate, endDate);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="data.csv"');
      res.send(csvBuffer);
    } catch (error) {
      console.error('Error during CSV download:', error);
      res.status(400).send('Error generating CSV');
    }
  }
}
