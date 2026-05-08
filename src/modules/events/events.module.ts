import { Module } from "@danet/core";
import { FreemiusModule } from "../freemius/freemius.module.ts";
import { EventsController } from "./events.controller.ts";

@Module({
  imports: [FreemiusModule],
  controllers: [EventsController],
})
export class EventsModule {}
