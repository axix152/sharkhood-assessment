import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RunsService, TriggerRunDto } from './runs.service';

@Controller('runs')
export class RunsController {
  constructor(private readonly runsService: RunsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerRun(@Body() body: TriggerRunDto) {
    return this.runsService.triggerRun(body);
  }

  @Get(':id')
  async getRun(@Param('id') id: string) {
    return this.runsService.getRun(id);
  }

  @Get(':id/errors')
  async getRunErrors(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('stage') stage?: string,
  ) {
    return this.runsService.getRunErrors(id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      stage,
    });
  }
}
