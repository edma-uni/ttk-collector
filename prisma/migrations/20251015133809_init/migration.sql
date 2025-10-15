-- CreateTable
CREATE TABLE "TiktokEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "funnelStage" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TiktokEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TiktokEvent_eventId_key" ON "TiktokEvent"("eventId");

-- CreateIndex
CREATE INDEX "TiktokEvent_timestamp_idx" ON "TiktokEvent"("timestamp");

-- CreateIndex
CREATE INDEX "TiktokEvent_eventType_idx" ON "TiktokEvent"("eventType");
