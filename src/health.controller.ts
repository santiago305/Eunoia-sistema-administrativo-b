import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from '@nestjs/throttler';

@Controller("health")
export class HealthController {
  @Get()
  @SkipThrottle()
  check() {
    return {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
